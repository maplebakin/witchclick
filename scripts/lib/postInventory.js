// scripts/lib/postInventory.js
// Utilities for enumerating existing posts across all known directories.
import fs from 'node:fs';
import path from 'node:path';

import { resolvePostsDirectories, slugify } from './contentPaths.js';
import { parseFrontmatter } from './frontmatter.js';

/**
 * Collect titles and slugs for all posts under the project root.
 * @param {string} root
 * @returns {{ title: string; slug: string; file: string }[]}
 */
export function collectPostMetadata(root) {
  const projectRoot = path.resolve(root);
  const directories = resolvePostsDirectories({ root: projectRoot });
  const seen = new Set();
  const entries = [];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      let raw;
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }
      const parsed = parseFrontmatter(raw);
      const title = frontmatterTitle(parsed, raw);
      const slug = frontmatterSlug(parsed, raw, filePath);
      if (!slug) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      entries.push({ title: title || slug, slug, file: filePath });
    }
  }

  return entries;
}

function frontmatterTitle(parsed, raw) {
  const value = parsed?.data?.title;
  if (typeof value === 'string') return value.trim();
  const inline = matchInlineField(raw, 'title');
  if (inline) return inline;
  return '';
}

function frontmatterSlug(parsed, raw, filePath) {
  const fmSlug = parsed?.data?.slug;
  if (typeof fmSlug === 'string' && fmSlug.trim()) {
    return slugify(fmSlug.trim());
  }
  const inlineSlug = matchInlineField(raw, 'slug');
  if (inlineSlug) return slugify(inlineSlug);
  const title = frontmatterTitle(parsed, raw);
  if (title) return slugify(title);
  const basename = path.basename(filePath, path.extname(filePath));
  return slugify(basename);
}

function matchInlineField(raw, key) {
  if (typeof raw !== 'string') return '';
  const re = new RegExp(`^${key}:\s*(.+)$`, 'mi');
  const match = raw.match(re);
  if (!match) return '';
  const value = match[1]?.trim() ?? '';
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

export default {
  collectPostMetadata,
};
