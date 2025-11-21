// scripts/lib/contentPaths.js
// Shared helpers for resolving post directories and slug normalization.
import fs from "node:fs";
import path from "node:path";

import { slugify as sharedSlugify } from "./slug.js";

/**
 * Build the list of candidate post directories for a project root.
 * @param {string} root
 * @returns {string[]}
 */
export function createPostsDirectoryCandidates(root) {
  const projectRoot = path.resolve(root);
  return [path.join(projectRoot, "src", "content", "posts")];
}

/**
 * Determine whether a path is a directory.
 * @param {string} candidate
 * @returns {boolean}
 */
export function isDirectory(candidate) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Determine whether a directory contains at least one Markdown file.
 * @param {string} candidate
 * @returns {boolean}
 */
export function directoryHasMarkdown(candidate) {
  if (!isDirectory(candidate)) return false;

  try {
    const entries = fs.readdirSync(candidate, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md")
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the primary post directory, preferring the one with Markdown files.
 * @param {{ root?: string }} [options]
 * @returns {string}
 */
export function resolvePrimaryPostsDir(options = {}) {
  const projectRoot = options.root
    ? path.resolve(options.root)
    : process.cwd();
  const candidates = createPostsDirectoryCandidates(projectRoot);

  for (const candidate of candidates) {
    if (directoryHasMarkdown(candidate)) return candidate;
  }
  for (const candidate of candidates) {
    if (isDirectory(candidate)) return candidate;
  }
  return candidates[0];
}

/**
 * Resolve the ordered list of post directories to consult.
 * Preferred directories are returned first, followed by existing candidates.
 * @param {{ root?: string; preferred?: string | null }} [options]
 * @returns {string[]}
 */
export function resolvePostsDirectories(options = {}) {
  const { preferred = null } = options;
  const projectRoot = options.root
    ? path.resolve(options.root)
    : process.cwd();
  const candidates = createPostsDirectoryCandidates(projectRoot);

  if (preferred) {
    const resolvedPreferred = path.resolve(projectRoot, preferred);
    return [resolvedPreferred];
  }

  return candidates;
}

/**
 * Normalize a string into a URL-safe slug.
 * @param {string} value
 * @returns {string}
 */
export const slugify = sharedSlugify;

export { ensureUniqueSlug, slugifyId } from "./slug.js";
