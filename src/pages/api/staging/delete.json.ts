// src/pages/api/staging/delete.json.ts
// Delete a draft post

import fs from 'node:fs';
import { findPostRecordBySlug, resolveCanonicalPostsDirectory } from '../../../utils/postFiles';
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
