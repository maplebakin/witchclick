// server/lib/cursePreparation.js
// Normalize and persist CurseSpec payloads.

import fs from 'node:fs';
import path from 'node:path';

import CurseSpecSchema, {
  CURSE_TAGS,
} from './curseSpecSchema.js';
import { slugify } from '../../shared/slugify.js';

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureUniqueSlug(baseSlug, directory) {
  const safe = baseSlug || 'curse';
  let attempt = safe;
  let counter = 2;
  while (fs.existsSync(path.join(directory, `${attempt}.md`))) {
    attempt = `${safe}-${counter++}`;
  }
  return attempt;
}

function toFrontmatterYAML(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      lines.push(`${key}: null`);
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
      continue;
    }
    if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [innerKey, innerValue] of Object.entries(value)) {
        if (innerValue === undefined) continue;
        lines.push(`  ${innerKey}: ${JSON.stringify(innerValue)}`);
      }
      continue;
    }
    if (typeof value === 'string') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
      continue;
    }
    lines.push(`${key}: ${value}`);
  }
  return lines.join('\n');
}

function buildMarkdownBody(spec) {
  const chunks = [];
  chunks.push('## Opening Reflection');
  chunks.push('');
  chunks.push(spec.openingReflection.trim());

  chunks.push('');
  chunks.push('## Invocation');
  chunks.push('');
  chunks.push(spec.invocation.trim());

  chunks.push('');
  chunks.push('## Method');
  chunks.push('');
  chunks.push(spec.method.trim());

  chunks.push('');
  chunks.push('## Closure & Aftercare');
  chunks.push('');
  chunks.push(spec.closure.trim());

  if (spec.safetyNotes) {
    chunks.push('');
    chunks.push('## Safety Notes');
    chunks.push('');
    chunks.push(spec.safetyNotes.trim());
  }

  return `${chunks.join('\n')}\n`;
}

export function prepareCurseForPersistence(rawSpec, options = {}) {
  const cwd = options.cwd || process.cwd();
  const directory = options.directory || path.join(cwd, 'archive', 'curses');

  const parsed = CurseSpecSchema.safeParse({
    ...rawSpec,
    tags: Array.isArray(rawSpec?.tags) && rawSpec.tags.length ? rawSpec.tags : [...CURSE_TAGS],
  });

  if (!parsed.success) {
    const issues = parsed.error.issues || [];
    const errors = issues.map((issue) => {
      const pathLabel = issue.path && issue.path.length ? issue.path.join('.') : 'root';
      return `${pathLabel}: ${issue.message}`;
    });
    const err = new Error(errors[0] || 'Invalid CurseSpec payload.');
    err.errors = errors;
    throw err;
  }

  const spec = parsed.data;
  const baseSlug = slugify(spec.slug || spec.title);
  const uniqueSlug = ensureUniqueSlug(baseSlug, directory);
  if (uniqueSlug !== spec.slug) {
    spec.slug = uniqueSlug;
  }

  const frontmatter = {
    title: spec.title,
    slug: spec.slug,
    invocation: spec.invocation,
    tags: spec.tags,
    generator: spec.generator,
    specVersion: spec.specVersion,
  };

  const markdownBody = buildMarkdownBody(spec);
  const filePath = path.join(directory, `${spec.slug}.md`);
  const contents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n${markdownBody}`;

  return {
    spec,
    frontmatter,
    markdown: {
      filePath,
      contents,
    },
    warnings: [],
  };
}

export async function persistPreparedCurse(prepared) {
  ensureDirSync(path.dirname(prepared.markdown.filePath));
  fs.writeFileSync(prepared.markdown.filePath, prepared.markdown.contents, 'utf8');
  return {
    cursePath: prepared.markdown.filePath,
  };
}

export default {
  prepareCurseForPersistence,
  persistPreparedCurse,
};
