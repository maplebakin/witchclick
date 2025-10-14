// scripts/lib/slug.js
// Normalized slug helpers shared across Node and browser builds.
import fs from 'node:fs';
import path from 'node:path';

/**
 * Normalize any string value into a URL-safe slug.
 * @param {unknown} value
 * @returns {string}
 */
export function slugify(value) {
  const base = typeof value === 'string' ? value : String(value ?? '');
  return base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

/**
 * Convert arbitrary input into a slug suitable for section ids.
 * Falls back to the provided default when empty.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function slugifyId(value, fallback) {
  const slug = slugify(value);
  return slug || fallback;
}

export default {
  slugify,
  ensureUniqueSlug,
  slugifyId,
};
