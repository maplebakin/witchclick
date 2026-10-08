// Shared staging operations. Each server applies its own access policy before calling these.
import fs from 'node:fs';
import path from 'node:path';
import { getCanonicalPostDisplayPath, readAllPostRecords, resolveCanonicalPostsDirectory, findPostRecordBySlug } from './postFiles';
import { json, jsonError, parseJsonBody, readValidatedSlug } from '../pages/api/_mutating';
import { getStagingReadiness, getVisibilityBlockers, type StagingReadiness } from './adminQueues';

interface DraftPost extends StagingReadiness {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readingMinutes: number;
  publishedAt: string;
  createdAt: string;
  filePath: string;
  promptMetadata?: {
    topic?: string;
    requestedWords?: number;
    deliveredWords?: number;
    generatedAt?: string;
  };
}

function toFrontmatterYAML(obj: Record<string, unknown>) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) {
      lines.push(`${k}: null`);
      continue;
    }
    if (typeof v === 'string') {
      lines.push(`${k}: ${JSON.stringify(v)}`);
      continue;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
      continue;
    }
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

function creationTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function listStagingDrafts() {
  try {
    const postsDir = resolveCanonicalPostsDirectory();
    const drafts: DraftPost[] = [];
    const records = readAllPostRecords(postsDir);
    const readiness = getStagingReadiness(records);

    for (const record of records) {
      const { data, slug, fileName } = record;

      // Only include drafts
      if (data.draft === true) {
        const filePath = path.join(postsDir, fileName);
        const creationDateCandidates = [
          data.createdAt,
          data.generatedAt,
          data.promptMetadata?.generatedAt,
        ];
        let createdAt = '';
        for (const candidate of creationDateCandidates) {
          if (typeof candidate !== 'string' || !candidate.trim()) continue;
          const timestamp = Date.parse(candidate);
          if (!Number.isNaN(timestamp)) {
            createdAt = new Date(timestamp).toISOString();
            break;
          }
        }
        if (!createdAt) {
          try {
            const stats = fs.statSync(filePath);
            createdAt = new Date(stats.birthtimeMs || stats.mtimeMs).toISOString();
          } catch {
            createdAt = '';
          }
        }
        if (!createdAt) {
          const contentDate = [data.publishedAt, data.publishDate, data.date].find(
            (candidate) => typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate)),
          );
          if (typeof contentDate === 'string') createdAt = new Date(Date.parse(contentDate)).toISOString();
        }
        drafts.push({
          ...readiness.get(slug)!,
          slug,
          title: data.title || 'Untitled',
          excerpt: data.excerpt || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          wordCount: data.wordCount || 0,
          readingMinutes: data.readingMinutes || 1,
          publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : '',
          createdAt,
          filePath: getCanonicalPostDisplayPath(fileName),
          promptMetadata: data.promptMetadata,
        });
      }
    }

    // Sort by article creation time, with missing dates after timestamped drafts.
    drafts.sort((a, b) => creationTimestamp(b.createdAt) - creationTimestamp(a.createdAt)
      || a.title.localeCompare(b.title));

    return json({ ok: true, drafts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}

export async function previewStagingDraft(request: Request) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as Record<string, unknown>;

    const slugResult = readValidatedSlug(body);
    if (!slugResult.ok) return slugResult.response;
    const slug = slugResult.slug;

    const postsDir = resolveCanonicalPostsDirectory();
    const record = findPostRecordBySlug(slug, postsDir);
    if (!record) {
      return jsonError(404, 'NOT_FOUND', `Post not found: ${slug}`);
    }
    const { data, content: markdown, fileName } = record;

    return json({
      ok: true,
      slug,
      frontmatter: data,
      markdown: markdown.trim(),
      filePath: getCanonicalPostDisplayPath(fileName),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}

export async function publishStagingDraft(request: Request) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as Record<string, unknown>;

    const slugResult = readValidatedSlug(body);
    if (!slugResult.ok) return slugResult.response;
    const slug = slugResult.slug;

    const postsDir = resolveCanonicalPostsDirectory();
    let records: ReturnType<typeof readAllPostRecords>;
    try {
      records = readAllPostRecords(postsDir);
    } catch {
      const reason = 'Readiness unknown: current post records could not be read or parsed. Nothing was written.';
      return jsonError(409, 'READINESS_UNKNOWN', reason, { state: 'unknown', reasons: [reason], blockers: [reason] });
    }
    const record = records.find((candidate) => candidate.slug === slug);
    if (!record) {
      return jsonError(404, 'NOT_FOUND', `Post not found: ${slug}`);
    }
    const { filePath, fileName, data, content: markdown } = record;

    if (data.draft !== true) {
      return jsonError(400, 'INVALID_STATE', 'Post is not a draft');
    }

    // Recompute from the current file and artwork. Browser claims are never used.
    const readiness = getStagingReadiness(records).get(slug)!;
    if (!readiness.canPublish) {
      return jsonError(409, 'NOT_READY', readiness.reasons.join('; '), readiness);
    }
    if (readiness.state === 'missing-hero' && body.acknowledgeMissingHero !== true) {
      return jsonError(409, 'HERO_ACK_REQUIRED', 'Confirm publishing without a hero image or complete hero metadata.', readiness);
    }

    // Remove draft status and update publishedAt to now
    data.draft = false;
    data.publishedAt = new Date().toISOString();
    const visibilityBlockers = getVisibilityBlockers(data);
    const publiclyEligibleLocally = visibilityBlockers.length === 0;

    // Rebuild the file
    const newContent = `---\n${toFrontmatterYAML(data)}\n---\n${markdown}`;
    fs.writeFileSync(filePath, newContent, 'utf8');

    return json({
      ok: true,
      slug,
      title: data.title,
      publishedAt: data.publishedAt,
      path: getCanonicalPostDisplayPath(fileName),
      warnings: readiness.artworkWarnings,
      missingHero: readiness.state === 'missing-hero',
      visibilityBlockers,
      publiclyEligibleLocally,
      message: publiclyEligibleLocally
        ? 'Saved: publicly eligible locally. The site has not been built or deployed.'
        : `Saved, but not publicly eligible locally: ${visibilityBlockers.join('; ')}. The site has not been built or deployed.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}

export async function deleteStagingDraft(request: Request) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as Record<string, unknown>;

    const slugResult = readValidatedSlug(body);
    if (!slugResult.ok) return slugResult.response;
    const slug = slugResult.slug;

    const postsDir = resolveCanonicalPostsDirectory();
    const record = findPostRecordBySlug(slug, postsDir);
    if (!record) {
      return jsonError(404, 'NOT_FOUND', `Post not found: ${slug}`);
    }
    const { filePath, data } = record;

    if (data.draft !== true) {
      return jsonError(
        400,
        'INVALID_STATE',
        'Cannot delete published post. Only drafts can be deleted from staging.',
      );
    }

    // Delete the file
    fs.unlinkSync(filePath);

    return json({
      ok: true,
      slug,
      title: data.title,
      deleted: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}
