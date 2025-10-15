// scripts/lib/slug.js
// Normalized slug helpers shared across Node and browser builds.
import fs from 'node:fs';
import path from 'node:path';
import { slugify, slugifyId } from '../../shared/slugify.js';

export { slugify, slugifyId } from '../../shared/slugify.js';
export { analyzeSlug, isValidSlug, VALID_SLUG_PATTERN } from '../../shared/slugify.js';

/**
 * Ensure a slug is unique across a list of post directories.
 * @param {string} candidate
 * @param {string[]} directories
 * @param {{ fallback?: string }} [options]
 * @returns {string}
 */
export function ensureUniqueSlug(candidate, directories, options = {}) {
  const fallback = options.fallback || 'post';
  const safeBase = slugify(candidate || fallback);
  const base = safeBase || slugify(fallback) || 'post';
  let attempt = base;
  let counter = 2;

  const exists = (value) =>
    directories.some((dir) => dir && fs.existsSync(path.join(dir, `${value}.md`)));

  while (exists(attempt)) {
    attempt = `${base}-${counter++}`;
  }

  return attempt;
}

export default {
  slugify,
  ensureUniqueSlug,
  slugifyId,
};
