// src/pages/api/staging/preview.json.ts
// Get full content of a draft post for preview/comparison

import { findPostRecordBySlug, getCanonicalPostDisplayPath, resolveCanonicalPostsDirectory } from '../../../utils/postFiles';
import { json, jsonError, parseJsonBody, readValidatedSlug, requireMutatingAccess } from '../_mutating';

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
