// shared/slugify.js
// Browser + Node friendly helpers for preparing URL slugs.

/** @type {RegExp} */
export const VALID_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
 * Determine if the provided slug is already safe to use.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidSlug(value) {
  if (typeof value !== 'string') return false;
  if (!value) return false;
  return VALID_SLUG_PATTERN.test(value);
}

/**
 * Analyse a slug input and report how it will be normalized.
 * @param {unknown} value
 * @returns {{ raw: string; trimmed: string; slug: string; valid: boolean; changed: boolean }}
 */
export function analyzeSlug(value) {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const trimmed = raw.trim();
  const normalized = slugify(trimmed);
  const valid = normalized ? isValidSlug(normalized) : false;
  const changed = trimmed.length > 0 && normalized !== trimmed;
  return { raw, trimmed, slug: normalized, valid, changed };
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
  analyzeSlug,
  isValidSlug,
  slugifyId,
  VALID_SLUG_PATTERN,
};
