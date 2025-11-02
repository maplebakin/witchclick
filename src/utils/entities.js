// src/utils/entities.js — no TypeScript syntax, ESM only
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'entities');
const MAX_SUMMARY_LENGTH = 240;
const STUB_PATTERN = /stub entity/i;

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEntity(type, raw) {
  const slug = typeof raw?.slug === 'string' ? raw.slug.trim() : '';
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const summary = typeof raw?.summary === 'string' ? raw.summary : '';
  const properties = isRecord(raw?.properties) ? raw.properties : {};
  const related = Array.isArray(raw?.related) ? raw.related : [];

  return {
    type: typeof raw?.type === 'string' && raw.type.trim() ? raw.type.trim() : type,
    slug: slug || inferSlugFromName(name) || inferSlugFromName(type),
    name,
    summary,
    properties,
    related,
  };
}

function inferSlugFromName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function stripHtml(value) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ');
}

function clampSummary(summary) {
  const plain = stripHtml(summary).replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  if (plain.length <= MAX_SUMMARY_LENGTH) return plain;
  const truncated = plain.slice(0, MAX_SUMMARY_LENGTH);
  const safe = truncated.replace(/\s+\S*$/, '').trimEnd();
  return safe ? `${safe}…` : `${plain.slice(0, MAX_SUMMARY_LENGTH - 1)}…`;
}

function collectFromValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectFromValue(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;/]|\s&\s|\band\b/i)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function extractTags(properties) {
  if (!isRecord(properties)) return [];
  const tagSources = [
    properties.tags,
    properties.keywords,
    properties.aspects,
    properties.vibes,
    properties.talismans,
    properties.uses,
    properties.tools,
    properties.intentions,
    properties.idealTimes,
    properties.element,
    properties.planet,
    properties.color,
    properties.chakra,
  ];

  const tags = new Map();
  for (const source of tagSources) {
    for (const tag of collectFromValue(source)) {
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!tags.has(key)) {
        tags.set(key, capitalize(tag));
      }
    }
  }
  return Array.from(tags.values());
}

function extractCorrespondenceKeywords(properties) {
  if (!isRecord(properties) || !isRecord(properties.correspondences)) return [];
  const keywords = new Map();
  for (const value of Object.values(properties.correspondences)) {
    for (const entry of collectFromValue(value)) {
      if (!entry) continue;
      const key = entry.toLowerCase();
      if (!keywords.has(key)) {
        keywords.set(key, capitalize(entry));
      }
    }
  }
  return Array.from(keywords.values());
}

function capitalize(value) {
  if (!value) return '';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function safeName(entity) {
  if (typeof entity.name === 'string' && entity.name.trim()) {
    return capitalize(entity.name.trim());
  }
  if (typeof entity.slug === 'string' && entity.slug.trim()) {
    return capitalize(entity.slug.trim().replace(/-/g, ' '));
  }
  return 'Untitled Entity';
}

export function readAllEntities() {
  const result = {};
  if (!fs.existsSync(CONTENT_ROOT)) return result;

  const types = fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const type of types) {
    const dir = path.join(CONTENT_ROOT, type);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const items = [];
    for (const f of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        items.push(normalizeEntity(type, raw));
      } catch {
        // ignore malformed JSON files
      }
    }
    items.sort((a, b) => safeName(a).localeCompare(safeName(b)));
    result[type] = items;
  }
  return result;
}

export function readEntity(type, slug) {
  const file = path.join(CONTENT_ROOT, type, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return normalizeEntity(type, raw);
  } catch {
    return null;
  }
}

export function flattenEntitySlug(entity) {
  if (!entity) return '';
  const slug = typeof entity.slug === 'string' ? entity.slug.trim().toLowerCase() : '';
  if (!slug) return '';
  if (typeof entity.type === 'string') {
    const prefix = `${entity.type.trim().toLowerCase()}-`;
    if (slug.startsWith(prefix)) {
      return slug.slice(prefix.length);
    }
  }
  return slug;
}

export function resolveEntityByFlatSlug(slug) {
  const target = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!target) return null;
  const all = readAllEntities();
  for (const entries of Object.values(all)) {
    if (!Array.isArray(entries)) continue;
    for (const entity of entries) {
      if (flattenEntitySlug(entity) === target) {
        return entity;
      }
    }
  }
  return null;
}

export function computeFacets(entities) {
  const types = {};
  const tags = {};
  for (const entity of entities) {
    const type = typeof entity.type === 'string' ? entity.type : '';
    if (type) {
      types[type] = (types[type] ?? 0) + 1;
    }
    const entityTags = Array.isArray(entity.tags) ? entity.tags : [];
    for (const tag of entityTags) {
      const key = typeof tag === 'string' ? tag.trim() : '';
      if (!key) continue;
      tags[key] = (tags[key] ?? 0) + 1;
    }
  }
  return { types, tags };
}

export function buildEntityIndex(source) {
  const collection = source ?? readAllEntities();
  const items = [];

  for (const [type, entries] of Object.entries(collection)) {
    if (!Array.isArray(entries)) continue;
    for (const raw of entries) {
      const entity = normalizeEntity(type, raw);
      const flatSlug = flattenEntitySlug(entity);
      if (!flatSlug) continue;
      const name = safeName(entity);
      const summary = STUB_PATTERN.test(entity.summary)
        ? 'Lore is still crystallizing. Check back soon.'
        : clampSummary(entity.summary);
      const tags = extractTags(entity.properties);
      const keywords = extractCorrespondenceKeywords(entity.properties);
      items.push({
        slug: flatSlug,
        type: entity.type,
        name,
        summary,
        tags,
        keywords,
      });
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  const facets = computeFacets(items);
  return { items, facets };
}
