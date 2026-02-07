// src/pages/api/staging/publish.json.ts
// Publish a draft post (remove draft status)

import fs from 'node:fs';
import {
  findPostRecordBySlug,
  getCanonicalPostDisplayPath,
  resolveCanonicalPostsDirectory,
} from '../../../utils/postFiles';
import { json, jsonError, parseJsonBody, readValidatedSlug, requireMutatingAccess } from '../_mutating';

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
  const denied = requireMutatingAccess(request);
  if (denied) return denied;

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
    const { filePath, fileName, data, content: markdown } = record;

    if (data.draft !== true) {
      return jsonError(400, 'INVALID_STATE', 'Post is not a draft');
    }

    // Remove draft status and update publishedAt to now
    data.draft = false;
    data.publishedAt = new Date().toISOString();

    // Rebuild the file
    const newContent = `---\n${toFrontmatterYAML(data)}\n---\n${markdown}`;
    fs.writeFileSync(filePath, newContent, 'utf8');

    return json({
      ok: true,
      slug,
      title: data.title,
      publishedAt: data.publishedAt,
      path: getCanonicalPostDisplayPath(fileName),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}
