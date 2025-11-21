import { Buffer } from 'node:buffer';
import path from 'node:path';

import { prepareSpecForPersistence, persistPreparedSpec } from './specPreparation.js';
import { resolvePostsDirectories } from '../../scripts/lib/contentPaths.js';

/**
 * Shared ingestion executor for CLI, dev API, and admin flows.
 * Normalizes preparation/persistence into a single promise.
 * @param {unknown} rawSpec
 * @param {{
 *   cwd?: string;
 *   postsDirectories?: string[];
 *   dryRun?: boolean;
 *   sourcePath?: string | null;
 *   generatedAt?: string;
 *   draft?: boolean;
 *   forceCategory?: string;
 *   targetWordCount?: number;
 * }} options
 */
export async function executeIngest(rawSpec, options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const postsDirectories = Array.isArray(options.postsDirectories) && options.postsDirectories.length
    ? options.postsDirectories
    : resolvePostsDirectories({ root: cwd });
  const dryRun = Boolean(options.dryRun);

  const prepared = prepareSpecForPersistence(rawSpec || {}, {
    cwd,
    postsDirectories,
    sourcePath: options.sourcePath ?? null,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    draft: options.draft,
    forceCategory: options.forceCategory,
    targetWordCount: options.targetWordCount,
  });

  let persistence = null;
  if (!dryRun) {
    persistence = await persistPreparedSpec(prepared);
  }

  const postPath = prepared.post?.filePath || '';
  const bytesWritten = prepared.post?.contents ? Buffer.byteLength(prepared.post.contents, 'utf8') : 0;

  return {
    prepared,
    persistence,
    dryRun,
    postPath,
    bytesWritten,
  };
}

export default { executeIngest };
