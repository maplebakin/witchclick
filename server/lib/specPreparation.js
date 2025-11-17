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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  return '';
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeToggle(value, fallback) {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : null;
  if (lower === 'on' || lower === 'off') return lower;
  if (lower === 'true' || lower === 'yes' || lower === '1') return 'on';
  if (lower === 'false' || lower === 'no' || lower === '0') return 'off';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  return fallback;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0') return false;
  }
  return null;
}

function sanitizeIsoDate(value, fallback) {
  const attempt = (candidate) => {
    if (typeof candidate !== 'string') return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    const timestamp = Date.parse(trimmed);
    if (Number.isNaN(timestamp)) return null;
    return new Date(timestamp).toISOString();
  };

  return attempt(value) || attempt(fallback) || new Date().toISOString();
}

function extractPromptMetadataCandidate(raw) {
  if (!isPlainObject(raw)) return null;
  const directKeys = [
    'promptMetadata',
    'promptMeta',
    'prompt',
    'generatorMetadata',
    'generator',
    '__prompt',
    '__wcPrompt',
  ];
  for (const key of directKeys) {
    const candidate = raw[key];
    if (isPlainObject(candidate)) return candidate;
  }
  if (isPlainObject(raw.meta) && isPlainObject(raw.meta.prompt)) return raw.meta.prompt;
  if (isPlainObject(raw.metadata) && isPlainObject(raw.metadata.prompt)) return raw.metadata.prompt;
  return null;
}

function mergeFocusSignals(target, addition, keyFn) {
  if (!addition || !Array.isArray(addition)) return;
  for (const item of addition) {
    if (!item) continue;
    const key = keyFn(item);
    if (!key) continue;
    if (!target.has(key)) {
      target.set(key, { ...item });
      continue;
    }
    const existing = target.get(key);
    if (!existing.reason && item.reason) existing.reason = item.reason;
    if (item.score !== undefined && (existing.score === undefined || item.score > existing.score)) {
      existing.score = item.score;
    }
    if (
      item.recencyDays !== undefined &&
      (existing.recencyDays === undefined || item.recencyDays > existing.recencyDays)
    ) {
      existing.recencyDays = item.recencyDays;
    }
  }
}

function normalizeEngagementFocus(raw, fallback) {
  const tagMap = new Map();
  const entityMap = new Map();

  const sources = [];
  if (raw !== undefined) sources.push(raw);
  if (fallback !== undefined) sources.push(fallback);

  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      mergeFocusSignals(tagMap, source.map(normalizeTagFocus), (item) => item && item.tag.toLowerCase());
      continue;
    }
    if (!isPlainObject(source)) continue;
    if (isPlainObject(source.underserved)) {
      const underserved = source.underserved;
      if (Array.isArray(underserved.tags)) {
        mergeFocusSignals(tagMap, underserved.tags.map(normalizeTagFocus), (item) => item && item.tag.toLowerCase());
      }
      if (Array.isArray(underserved.entities)) {
        mergeFocusSignals(entityMap, underserved.entities.map(normalizeEntityFocus), (item) => item && `${item.type || 'entity'}:${item.slug}`.toLowerCase());
      }
    }
    if (Array.isArray(source.tags)) {
      mergeFocusSignals(tagMap, source.tags.map(normalizeTagFocus), (item) => item && item.tag.toLowerCase());
    }
    if (Array.isArray(source.entities)) {
      mergeFocusSignals(entityMap, source.entities.map(normalizeEntityFocus), (item) => item && `${item.type || 'entity'}:${item.slug}`.toLowerCase());
    }
    if (source.tag || source.name || source.value) {
      mergeFocusSignals(tagMap, [normalizeTagFocus(source)], (item) => item && item.tag.toLowerCase());
    }
    if (source.slug || source.id) {
      mergeFocusSignals(entityMap, [normalizeEntityFocus(source)], (item) => item && `${item.type || 'entity'}:${item.slug}`.toLowerCase());
    }
  }

  const tags = Array.from(tagMap.values()).filter(Boolean).slice(0, 5);
  const entities = Array.from(entityMap.values()).filter(Boolean).slice(0, 5);

  if (!tags.length && !entities.length) return null;
  return { tags, entities };
}

function normalizeTagFocus(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const tag = value.trim();
    return tag ? { tag } : null;
  }
  if (!isPlainObject(value)) return null;
  const tag = toTrimmedString(value.tag ?? value.name ?? value.value ?? '');
  if (!tag) return null;
  const entry = { tag };
  const reason = toTrimmedString(value.reason ?? value.note ?? value.notes ?? '');
  if (reason) entry.reason = reason;
  const score = toNumber(value.score ?? value.weight ?? value.priority ?? value.interest ?? null);
  if (score !== null) entry.score = score;
  const recency = toNumber(value.recencyDays ?? value.daysSince ?? value.daysSinceMention ?? null);
  if (recency !== null) entry.recencyDays = recency;
  return entry;
}

function normalizeEntityFocus(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const slug = value.trim();
    if (!slug) return null;
    return { slug };
  }
  if (!isPlainObject(value)) return null;
  const slug = toTrimmedString(value.slug ?? value.id ?? '');
  const name = toTrimmedString(value.name ?? value.label ?? value.title ?? '');
  if (!slug && !name) return null;
  const entry = { slug: slug || name };
  if (name && name !== entry.slug) entry.name = name;
  const type = toTrimmedString(value.type ?? value.kind ?? value.category ?? '');
  if (type) entry.type = type;
  const reason = toTrimmedString(value.reason ?? value.note ?? value.notes ?? '');
  if (reason) entry.reason = reason;
  const score = toNumber(value.score ?? value.weight ?? value.priority ?? value.interest ?? null);
  if (score !== null) entry.score = score;
  const recency = toNumber(value.recencyDays ?? value.daysSince ?? value.daysSinceMention ?? null);
  if (recency !== null) entry.recencyDays = recency;
  return entry;
}

function buildPromptMetadata(rawSpec, spec, context) {
  const candidate = extractPromptMetadataCandidate(rawSpec);
  const topicSource = candidate?.topic ?? rawSpec?.topic ?? rawSpec?.headline ?? rawSpec?.title ?? '';
  const topic = toTrimmedString(topicSource) || spec.title || spec.slug;
  const requested = toNumber(
    candidate?.words ?? candidate?.wordCount ?? candidate?.targetWordCount ?? rawSpec?.wordCount ?? context.targetWordCount,
  );
  const delivered = Number.isFinite(context.wordCount) ? Number(context.wordCount) : undefined;

  const defaultAds = Array.isArray(spec.adPlacements) && spec.adPlacements.length ? 'on' : 'off';
  const defaultKofi = spec.cta?.type === 'kofi' ? 'on' : 'off';
  const toggles = {
    ads: normalizeToggle(candidate?.ads ?? candidate?.includeAds ?? candidate?.toggles?.ads, defaultAds),
    kofi: normalizeToggle(candidate?.kofi ?? candidate?.includeKofi ?? candidate?.toggles?.kofi ?? candidate?.cta, defaultKofi),
  };
  const mode = toTrimmedString(candidate?.mode ?? candidate?.preset ?? candidate?.contentType ?? context.mode);
  if (mode) toggles.mode = mode;
  const style = toTrimmedString(candidate?.style ?? candidate?.styleDirective ?? context.style);
  if (style) toggles.style = style;
  const strictValue = candidate?.strict ?? candidate?.strictMode ?? candidate?.toggles?.strict ?? context.strict;
  const strictBool = parseBoolean(strictValue);
  if (typeof strictBool === 'boolean') toggles.strict = strictBool;

  const generatedAt = sanitizeIsoDate(candidate?.generatedAt ?? candidate?.timestamp, context.generatedAt);

  const focus = normalizeEngagementFocus(candidate?.engagementFocus ?? candidate?.focus, context.engagementFocus);

  const metadata = {
    topic,
    requestedWords: requested ?? context.targetWordCount ?? undefined,
    deliveredWords: delivered,
    toggles,
    generatedAt,
  };

  if (focus) metadata.engagementFocus = focus;
  if (context.sourcePath) metadata.source = context.sourcePath;
  if (candidate?.notes) {
    const notes = toTrimmedString(candidate.notes);
    if (notes) metadata.notes = notes;
  }

  if (metadata.requestedWords === undefined && Number.isFinite(context.targetWordCount)) {
    metadata.requestedWords = Number(context.targetWordCount);
  }

  return metadata;
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

function createPostStubRecords(cwd, postsDirectories, internalLinkHints, siteUrl) {
  if (!Array.isArray(internalLinkHints) || !internalLinkHints.length) return [];
  const stubs = [];

  for (const hint of internalLinkHints) {
    const anchor = String(hint?.anchor || '').trim();
    if (!anchor) continue;

    // Convert anchor text to slug
    const candidateSlug = slugify(anchor);
    if (!candidateSlug) continue;

    // Check if a post with this slug already exists
    const exists = postsDirectories.some((dir) =>
      fs.existsSync(path.join(dir, `${candidateSlug}.md`))
    );

    if (exists) continue;

    // Create stub post
    const primaryPostsDir = postsDirectories[0];
    const file = path.join(primaryPostsDir, `${candidateSlug}.md`);
    const title = anchor.replace(/\b\w/g, (m) => m.toUpperCase());

    const frontmatter = {
      title,
      slug: candidateSlug,
      excerpt: `Placeholder post for "${title}".`,
      metaTitle: title,
      metaDescription: `This is a placeholder post that was auto-generated from an internal link reference. Content coming soon.`,
      tags: ['placeholder', 'stub'],
      outline: ['Placeholder'],
      wordCount: 50,
      readingMinutes: 1,
      entities: [],
      includeAds: false,
      includeKofi: false,
      affiliateAnchors: [],
      internalLinkHints: [],
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${siteUrl}/post/${candidateSlug}`,
      specVersion: 2,
      draft: true,
    };

    const contents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n## Placeholder\n\nThis post was automatically created as a stub from an internal link reference. Please replace this content.\n`;

    stubs.push({ file, contents, slug: candidateSlug, title });
  }

  return stubs;
}

export function prepareSpecForPersistence(rawSpec, options = {}) {
  const cwd = options.cwd || process.cwd();
  const postsDirectories = Array.isArray(options.postsDirectories) && options.postsDirectories.length
    ? options.postsDirectories
    : [path.join(cwd, 'content', 'posts')];
  const primaryPostsDir = postsDirectories[0];
  const targetWordCount = options.targetWordCount || DEFAULT_WORD_COUNT;
  const generationTimestamp = sanitizeIsoDate(options.generatedAt, null);
  const absoluteSourcePath = typeof options.sourcePath === 'string' && options.sourcePath
    ? path.resolve(cwd, options.sourcePath)
    : null;
  const relativeSourcePath = absoluteSourcePath ? path.relative(cwd, absoluteSourcePath) : null;

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

  const promptMetadata = buildPromptMetadata(rawSpec, spec, {
    targetWordCount,
    wordCount: enforcement.wordCount,
    generatedAt: generationTimestamp,
    sourcePath: relativeSourcePath,
    engagementFocus: options.engagementSignals,
  });

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

  // Add draft field if specified
  if (options.draft === true) {
    frontmatter.draft = true;
  }

  // Force category if specified, otherwise use spec category
  if (options.forceCategory) {
    frontmatter.category = options.forceCategory;
  } else if (spec.category) {
    frontmatter.category = spec.category;
  }
  if (spec.contentType) {
    frontmatter.contentType = spec.contentType;
  }

  if (promptMetadata) {
    frontmatter.promptMetadata = promptMetadata;
  }

  const markdownBody = buildMarkdownBody(spec.sections).trimEnd();
  const postContents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n${markdownBody}\n`;
  const postFilePath = path.join(primaryPostsDir, `${spec.slug}.md`);

  const entityStubs = createEntityStubRecords(cwd, spec.entities);
  const postStubs = createPostStubRecords(cwd, postsDirectories, spec.internalLinkHints, siteUrl);

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
    postStubs,
    promptMetadata,
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

  const createdPosts = [];
  for (const stub of prepared.postStubs || []) {
    ensureDirSync(path.dirname(stub.file));
    if (!fs.existsSync(stub.file)) {
      await fsp.writeFile(stub.file, stub.contents, 'utf8');
      createdPosts.push(stub.file);
    }
  }

  return {
    postPath: prepared.post.filePath,
    createdEntities,
    createdPosts,
  };
}

export default {
  prepareSpecForPersistence,
  persistPreparedSpec,
};
