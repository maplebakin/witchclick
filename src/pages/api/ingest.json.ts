// src/pages/api/ingest.json.ts

export type { PostSpecV2 } from '../../lib/postSpecSchema';

import path from 'node:path';

import { executeIngest } from '../../../server/lib/ingestExecutor.js';
import { json, jsonError, requireMutatingAccess } from './_mutating';

type ParseResult =
  | { ok: true; input: unknown; requestUrl: URL; isDryRun: boolean; isDraftMode: boolean }
  | { ok: false; response: Response };

interface IngestErrorLike {
  code?: string;
  message?: string;
  errors?: unknown;
  warnings?: unknown;
  normalizations?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toRelativePath(filePath: string, cwd: string): string {
  const trimmed = String(filePath || '').trim();
  if (!trimmed) return '';
  const absolute = path.isAbsolute(trimmed) ? trimmed : path.join(cwd, trimmed);
  return path.relative(cwd, absolute).replace(/\\/g, '/');
}

function formatPostStubs(stubs: unknown, cwd: string) {
  if (!Array.isArray(stubs)) return [];
  return stubs.map((stub) => {
    const record = stub && typeof stub === 'object' ? (stub as Record<string, unknown>) : {};
    const file = toRelativePath(String(record.file || ''), cwd);
    const slug = String(record.slug || '').trim();
    const title = String(record.title || '').trim();
    return {
      slug,
      title: title || slug,
      path: file,
      source: 'internal-link',
      status: 'stub',
    };
  });
}

function formatEntityStubs(stubs: unknown, cwd: string) {
  if (!Array.isArray(stubs)) return [];
  return stubs.map((stub) => {
    const record = stub && typeof stub === 'object' ? (stub as Record<string, unknown>) : {};
    const payload =
      record.payload && typeof record.payload === 'object'
        ? (record.payload as Record<string, unknown>)
        : {};
    const file = toRelativePath(String(record.file || ''), cwd);
    const type = String(payload.type || '').trim();
    const slug = String(payload.slug || '').trim();
    const name = String(payload.name || '').trim();

    return {
      type,
      slug,
      name: name || slug,
      path: file,
      source: 'post-spec',
      status: 'stub',
    };
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as IngestErrorLike).message || '');
  }
  return String(error || 'Unknown error');
}

function deriveErrorResponse(error: unknown) {
  const asRecord = (error ?? {}) as IngestErrorLike;
  const errors = asStringArray(asRecord.errors);
  const warnings = asStringArray(asRecord.warnings);
  const normalizations = asStringArray(asRecord.normalizations);

  const status =
    asRecord.code === 'SLUG_CONFLICT'
      ? 409
      : errors.length > 0 || warnings.length > 0 || normalizations.length > 0
        ? 400
        : 500;

  const code =
    asRecord.code === 'SLUG_CONFLICT'
      ? 'SLUG_CONFLICT'
      : status === 400
        ? 'VALIDATION_ERROR'
        : 'INTERNAL_ERROR';

  const message = errors[0] || getErrorMessage(error) || 'Ingest failed';

  return jsonError(status, code, message, {
    errors,
    warnings,
    normalizations,
    normalizationReport: normalizations,
  });
}

async function parseIngestRequest(request: Request): Promise<ParseResult> {
  const requestUrl = new URL(request.url);
  const isDryRun = requestUrl.searchParams.get('dryRun') === 'true';

  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  let input: unknown = null;

  if (contentType.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch (error) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_FORM_DATA',
          'Invalid multipart form data payload.',
          { reason: getErrorMessage(error) },
        ),
      };
    }

    const raw = form.get('json') ?? form.get('body');
    if (typeof raw !== 'string' || !raw.trim()) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_JSON',
          'No JSON body provided. Paste a PostSpec v2 object.',
        ),
      };
    }

    try {
      input = JSON.parse(raw);
    } catch (error) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_JSON',
          'Invalid JSON in multipart payload.',
          { reason: getErrorMessage(error) },
        ),
      };
    }
  } else {
    let rawBody = '';
    try {
      rawBody = await request.text();
    } catch (error) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_JSON',
          'Unable to read request body.',
          { reason: getErrorMessage(error) },
        ),
      };
    }

    if (!rawBody.trim()) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_JSON',
          'No JSON body provided. Paste a PostSpec v2 object.',
        ),
      };
    }

    try {
      input = JSON.parse(rawBody);
    } catch (error) {
      return {
        ok: false,
        response: jsonError(
          400,
          'INVALID_JSON',
          'Invalid JSON body provided.',
          { reason: getErrorMessage(error) },
        ),
      };
    }
  }

  if (!input) {
    return {
      ok: false,
      response: jsonError(400, 'INVALID_JSON', 'No JSON body provided. Paste a PostSpec v2 object.'),
    };
  }

  const isDraftMode =
    requestUrl.searchParams.get('draft') === 'true' ||
    (input && typeof input === 'object' && (input as Record<string, unknown>)._draft === true);

  return {
    ok: true,
    input,
    requestUrl,
    isDryRun,
    isDraftMode,
  };
}

/* ---------- handler ---------- */

export async function POST({ request }: { request: Request }) {
  const denied = requireMutatingAccess(request);
  if (denied) return denied;

  const parsed = await parseIngestRequest(request);
  if (!parsed.ok) return parsed.response;

  try {
    const cwd = process.cwd();
    const result = await executeIngest(parsed.input, {
      cwd,
      dryRun: parsed.isDryRun,
      draft: parsed.isDraftMode,
      targetWordCount: 1200,
    });

    const prepared = result.prepared;
    const normalizationReport = uniqueStrings(asStringArray(prepared.normalizationReport));
    const baseWarnings = uniqueStrings(asStringArray(prepared.warnings));
    const postPath = toRelativePath(prepared.post?.filePath || result.postPath || '', cwd);

    const preparedRecord = prepared as unknown as Record<string, unknown>;
    const postStubs = formatPostStubs(preparedRecord.postStubs, cwd);
    const entityStubs = formatEntityStubs(prepared.entityStubs, cwd);

    if (result.dryRun) {
      return json({
        ok: true,
        slug: prepared.spec.slug,
        spec: prepared.spec,
        path: postPath,
        words: prepared.wordCount,
        warnings: baseWarnings,
        normalizationReport,
        normalizations: normalizationReport,
        postStubs,
        entityStubs,
        saved: false,
      });
    }

    const persistenceRecord = (result.persistence ?? {}) as Record<string, unknown>;
    const rawCreatedPosts = Array.isArray(persistenceRecord.createdPosts)
      ? persistenceRecord.createdPosts
      : [];
    const rawCreatedEntities = Array.isArray(persistenceRecord.createdEntities)
      ? persistenceRecord.createdEntities
      : [];

    const createdPosts = uniqueStrings(rawCreatedPosts.map((filePath) => toRelativePath(String(filePath), cwd)));
    const createdEntityStubs = uniqueStrings(
      rawCreatedEntities.map((filePath) => toRelativePath(String(filePath), cwd)),
    );

    const creationNotes: string[] = [];
    if (createdPosts.length) {
      creationNotes.push(`Created ${createdPosts.length} placeholder post stub(s).`);
    }
    if (createdEntityStubs.length) {
      creationNotes.push(`Created ${createdEntityStubs.length} placeholder entity stub(s).`);
    }

    return json({
      ok: true,
      slug: prepared.spec.slug,
      path: postPath,
      words: prepared.wordCount,
      warnings: uniqueStrings([...baseWarnings, ...creationNotes]),
      normalizationReport,
      normalizations: normalizationReport,
      createdPostStubs: createdPosts,
      createdPosts,
      createdEntityStubs,
      saved: true,
    });
  } catch (error: unknown) {
    return deriveErrorResponse(error);
  }
}
