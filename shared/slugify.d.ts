export const VALID_SLUG_PATTERN: RegExp;

export function slugify(value: unknown): string;

export function isValidSlug(value: unknown): boolean;

export function analyzeSlug(
  value: unknown,
): { raw: string; trimmed: string; slug: string; valid: boolean; changed: boolean };

export function slugifyId(value: unknown, fallback: string): string;

declare const _default: {
  slugify: typeof slugify;
  analyzeSlug: typeof analyzeSlug;
  isValidSlug: typeof isValidSlug;
  slugifyId: typeof slugifyId;
  VALID_SLUG_PATTERN: typeof VALID_SLUG_PATTERN;
};
export default _default;
