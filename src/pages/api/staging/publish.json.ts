// src/pages/api/staging/publish.json.ts
// Publish a draft post (remove draft status)

import fs from 'node:fs';
import {
  readAllPostRecords,
  getCanonicalPostDisplayPath,
  resolveCanonicalPostsDirectory,
} from '../../../utils/postFiles';
import { json, jsonError, parseJsonBody, readValidatedSlug, requireStagingAccess } from '../_mutating';
import { getStagingReadiness, getVisibilityBlockers } from '../../../utils/adminQueues';

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

export async function POST({ request }: { request: Request }) {
  const denied = requireStagingAccess(request);
  if (denied) return denied;

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
