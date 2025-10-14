// server/lib/specPreparation.js
// Shared helpers to normalize, validate, and persist PostSpec payloads.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { ensureUniqueSlug, slugify } from '../../scripts/lib/slug.js';
import { normalizePostSpec } from './ingestionAdapter.js';
import { PostSpecV2Schema } from './postSpecSchema.js';
import { validatePostSpec } from './postSpecValidator.js';
import { validateStructure } from './structureValidation.js';

const DEFAULT_WORD_COUNT = 1200;

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readingMinutes(words) {
  const count = Number.isFinite(words) ? Number(words) : 0;
  return Math.max(1, Math.round(count / 200));
}

function toFrontmatterYAML(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      lines.push(`${key}: null`);
      continue;
    }
    if (typeof value === 'string') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  return lines.join('\n');
}

function buildMarkdownBody(sections) {
  if (!Array.isArray(sections)) return '';
  const chunks = [];
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    const heading = String(section.heading || '').trim();
    const markdown = String(section.markdown || '').trim();
    if (!heading && !markdown) continue;
    const body = markdown ? `${markdown}\n` : '';
    chunks.push(`## ${heading}\n\n${body}`.trimEnd());
  }
  if (!chunks.length) return '';
  return `${chunks.join('\n\n')}\n`;
}

function normalizeAffiliateAnchors(hints) {
  if (!Array.isArray(hints)) return [];
  return hints.map((hint) => ({
    key: String(hint.key),
    text: String(hint.anchor),
    insertedCount: 0,
  }));
}

function listAllowedAffiliateKeys(cwd) {
  const productsPath = path.join(cwd, 'content', 'products.json');
  const products = readJSON(productsPath);
  if (!products || !Array.isArray(products.products)) return [];
  return products.products
    .map((product) => String(product?.key || '').trim())
    .filter(Boolean);
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function createEntityStubRecords(cwd, entities) {
  if (!Array.isArray(entities) || !entities.length) return [];
  return entities.map((entity) => {
    const type = String(entity?.type || '').trim();
    const slug = String(entity?.slug || '').trim();
    const entityDir = path.join(cwd, 'content', 'entities', type);
    const file = path.join(entityDir, `${slug}.json`);
    const payload = {
      type,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      slug,
      summary: `${slug.replace(/-/g, ' ')} — stub entity`,
      properties: {},
      related: [],
    };
    return { file, payload };
  });
}

export function prepareSpecForPersistence(rawSpec, options = {}) {
  const cwd = options.cwd || process.cwd();
  const postsDirectories = Array.isArray(options.postsDirectories) && options.postsDirectories.length
    ? options.postsDirectories
    : [path.join(cwd, 'content', 'posts')];
  const primaryPostsDir = postsDirectories[0];
  const targetWordCount = options.targetWordCount || DEFAULT_WORD_COUNT;

  const allowedAffiliateKeys = Array.isArray(options.allowedAffiliateKeys)
    ? options.allowedAffiliateKeys
    : listAllowedAffiliateKeys(cwd);

  const { spec: normalizedSpec, report, warnings: normalizationWarnings } = normalizePostSpec(rawSpec, {
    allowedAffiliateKeys,
  });
  const normalizationReport = Array.isArray(report) ? [...report] : [];
  const normalizationWarningsList = Array.isArray(normalizationWarnings) ? [...normalizationWarnings] : [];

  const parsed = PostSpecV2Schema.safeParse(normalizedSpec);
  if (!parsed.success) {
    const issues = parsed.error.issues || [];
    const schemaErrors = issues.map((issue) => {
      const pathLabel = issue.path && issue.path.length ? issue.path.join('.') : 'root';
      return `${pathLabel}: ${issue.message}`;
    });
    const error = new Error(schemaErrors[0] || 'Invalid PostSpec payload.');
    error.errors = schemaErrors;
    error.warnings = normalizationWarningsList;
    error.normalizations = normalizationReport;
    throw error;
  }

  const spec = parsed.data;

  const enforcement = validatePostSpec(spec, {
    targetWordCount,
    allowedAffiliateKeys,
  });
  if (!enforcement.valid) {
    const error = new Error(enforcement.errors[0] || 'PostSpec validation failed.');
    error.errors = enforcement.errors;
    error.warnings = dedupe([...normalizationWarningsList, ...enforcement.warnings]);
    error.normalizations = normalizationReport;
    throw error;
  }

  const structure = validateStructure(spec, enforcement.wordCount);
  if (structure.errors.length) {
    const error = new Error(structure.errors[0] || 'Structural validation failed.');
    error.errors = structure.errors;
    error.warnings = dedupe([...normalizationWarningsList, ...enforcement.warnings, ...structure.warnings]);
    error.normalizations = normalizationReport;
    throw error;
  }

  const combinedWarnings = dedupe([...normalizationWarningsList, ...enforcement.warnings, ...structure.warnings]);

  const baseSlug = slugify(spec.slug || spec.title);
  const uniqueSlug = ensureUniqueSlug(baseSlug, postsDirectories, { fallback: 'post' });
  if (uniqueSlug !== spec.slug) {
    normalizationReport.push(`slug→${uniqueSlug}`);
    spec.slug = uniqueSlug;
  }

  const settingsPath = path.join(cwd, 'content', 'settings.json');
  const settings = readJSON(settingsPath) || { siteUrl: 'https://example.com', brandName: 'WitchClick' };
  const siteUrl = String(settings.siteUrl || 'https://example.com').replace(/\/$/, '');

  const frontmatter = {
    title: spec.title,
    slug: spec.slug,
    excerpt: spec.excerpt,
    metaTitle: spec.title,
    metaDescription: spec.metaDescription,
    tags: spec.tags,
    outline: spec.outline.map((item) => item.heading),
    wordCount: enforcement.wordCount,
    readingMinutes: readingMinutes(enforcement.wordCount),
    entities: spec.entities,
    includeAds: Array.isArray(spec.adPlacements) && spec.adPlacements.length > 0,
    includeKofi: spec.cta?.type === 'kofi',
    downloadId: spec.cta?.type === 'download' ? spec.cta?.id ?? '' : undefined,
    affiliateAnchors: normalizeAffiliateAnchors(spec.affiliateHints),
    internalLinkHints: (Array.isArray(spec.internalLinkHints)
      ? spec.internalLinkHints.map((hint) => String(hint?.anchor || '').trim()).filter(Boolean)
      : []),
    internalLinks: [],
    publishedAt: new Date().toISOString(),
    canonicalUrl: `${siteUrl}/post/${spec.slug}`,
    specVersion: 2,
  };

  const markdownBody = buildMarkdownBody(spec.sections).trimEnd();
  const postContents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n${markdownBody}\n`;
  const postFilePath = path.join(primaryPostsDir, `${spec.slug}.md`);

  const entityStubs = createEntityStubRecords(cwd, spec.entities);

  return {
    spec,
    normalizationReport,
    warnings: combinedWarnings,
    wordCount: enforcement.wordCount,
    post: {
      filePath: postFilePath,
      contents: postContents,
    },
    frontmatter,
    entityStubs,
  };
}

export async function persistPreparedSpec(prepared) {
  ensureDirSync(path.dirname(prepared.post.filePath));
  fs.writeFileSync(prepared.post.filePath, prepared.post.contents, 'utf8');

  const createdEntities = [];
  for (const stub of prepared.entityStubs) {
    ensureDirSync(path.dirname(stub.file));
    if (!fs.existsSync(stub.file)) {
      await fsp.writeFile(stub.file, JSON.stringify(stub.payload, null, 2), 'utf8');
      createdEntities.push(stub.file);
    }
  }

  return {
    postPath: prepared.post.filePath,
    createdEntities,
  };
}

export default {
  prepareSpecForPersistence,
  persistPreparedSpec,
};
