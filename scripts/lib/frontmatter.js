// scripts/lib/frontmatter.js
// Thin wrappers around gray-matter so Node and browser tooling share the same parsing rules.
import fs from 'node:fs';

import matter from 'gray-matter';

/**
 * Parse frontmatter from raw Markdown content.
 * @param {string} raw
 * @returns {{ data: Record<string, any>; content: string; lines: string[]; rest: string }}
 */
export function parseFrontmatter(raw) {
  const parsed = matter(raw ?? '');
  const frontmatterBlock = parsed.matter ? parsed.matter.replace(/^---\n?|\n?---$/g, '') : '';
  const lines = frontmatterBlock
    ? frontmatterBlock.replace(/\r\n?/g, '\n').split('\n')
    : [];
  return {
    data: parsed.data ?? {},
    content: parsed.content ?? '',
    lines,
    rest: parsed.content ?? '',
  };
}

/**
 * Read and parse frontmatter from a Markdown file.
 * @param {string} file
 * @returns {{ raw: string; data: Record<string, any>; content: string; lines: string[]; rest: string }}
 */
export function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content, lines, rest } = parseFrontmatter(raw);
  return { raw, data, content, lines, rest };
}

/**
 * Extract a string field from a frontmatter object.
 * Arrays become comma-joined strings; other values are stringified.
 * @param {Record<string, any>} data
 * @param {string} key
 * @returns {string}
 */
export function frontmatterString(data, key) {
  const value = data?.[key];
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ');
  if (value == null) return '';
  return String(value).trim();
}

export default {
  parseFrontmatter,
  readFrontmatter,
  frontmatterString,
};
