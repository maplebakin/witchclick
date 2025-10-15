// dev-api.js (ESM)
// Minimal local API for WitchClick admin with safe YAML quoting.
// Endpoints:
//   POST /ping
//   POST /genprompt    {topic, words, ads:'on'|'off', kofi:'on'|'off'}
//   POST /ingest       (PostSpec v2 JSON)
//   POST /bundle       (runs linker -> go:build)
//   POST /entities/list
//   POST /entities/get {type, slug}
//   POST /entities/save {type, slug, name, summary, properties, related[]}
//   POST /posts/save   {title, slug?, excerpt, metaDescription, tags, includeAds, includeKofi, entities, markdown}

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import generatorPresets from './server/lib/generatorPresets.js';
import generatorStyles from './server/lib/generatorStyles.js';
import { STRICT_JSON_RULES } from './server/lib/strictJsonRules.js';
import { buildMasterPrompt } from './server/lib/promptBuilder.js';
import { buildCursePrompt } from './server/lib/cursePromptBuilder.js';
import { CURSE_TARGETS, CURSE_TONES, CURSE_TYPES } from './server/lib/curseSpecSchema.js';
import { resolvePostsDirectories } from './scripts/lib/contentPaths.js';
import { frontmatterString, parseFrontmatter, readFrontmatter } from './scripts/lib/frontmatter.js';
import { collectPostMetadata } from './scripts/lib/postInventory.js';
import { readSlugHistory, writeSlugHistory } from './scripts/lib/slugHistory.js';
import { isValidSlug, slugify } from './shared/slugify.js';
import {
  prepareSpecForPersistence,
  persistPreparedSpec,
} from './server/lib/specPreparation.js';
import {
  prepareCurseForPersistence,
  persistPreparedCurse,
} from './server/lib/cursePreparation.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const CWD = process.cwd();

function listPostDirsForCollisions() {
  return resolvePostsDirectories({ root: CWD });
}

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

const HERO_IMAGE_ROOT = path.join(CWD, 'public', 'images', 'hero');
const DOWNLOADS_ROOT = path.join(CWD, 'public', 'downloads');

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function normalizeExtension(ext, fallback) {
  if (!ext) return fallback;
  const lower = ext.toLowerCase();
  if (lower === '.jpeg') return '.jpg';
  if (lower === '.jpg' || lower === '.png' || lower === '.webp') return lower;
  return fallback;
}

function sanitizeHeroFilename(rawName, fallbackExt) {
  const safeFallback = fallbackExt && fallbackExt.startsWith('.') ? fallbackExt : '.jpg';
  let value = String(rawName || '').toLowerCase().trim();
  value = value.replace(/[^a-z0-9-_.]+/g, '-');
  value = value.replace(/-+/g, '-');
  value = value.replace(/^[.-]+/, '').replace(/[.-]+$/, '');
  let ext = path.extname(value);
  let base = ext ? value.slice(0, -ext.length) : value;
  ext = normalizeExtension(ext, safeFallback);
  base = base.replace(/\.+/g, '-').replace(/-+/g, '-');
  if (!base) base = 'hero-image';
  return { base, ext: ext || safeFallback };
}

function ensureUniqueFilename(dir, base, ext) {
  let attempt = `${base}${ext}`;
  let counter = 2;
  while (fs.existsSync(path.join(dir, attempt))) {
    attempt = `${base}-${counter++}${ext}`;
  }
  return attempt;
}

function parseImageDataUrl(value) {
  const str = String(value || '');
  if (!str.startsWith('data:image/')) return null;
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(str);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = match[2] ? match[2].trim() : '';
  if (!base64) return null;
  return { mime, base64: base64.replace(/\s+/g, '') };
}

function parseDataUrl(value) {
  const str = String(value || '');
  const match = /^data:([a-z0-9.+-\/]+);base64,(.*)$/i.exec(str);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = (match[2] || '').trim().replace(/\s+/g, '');
  if (!base64) return null;
  return { mime, base64 };
}

async function listPostsForHero() {
  const postsDir = resolvePrimaryPostsDir();
  let entries = [];
  try {
    entries = await fsp.readdir(postsDir, { withFileTypes: true });
  } catch {
    entries = [];
  }
  const items = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const file = path.join(postsDir, entry.name);
    const fileSlug = path.basename(entry.name, path.extname(entry.name));
    let slug = fileSlug;
    let title = fileSlug;
    try {
      const raw = await fsp.readFile(file, 'utf8');
      const parsed = parseFrontmatter(raw);
      const fmSlug = frontmatterString(parsed.data, 'slug');
      if (fmSlug && isValidSlug(fmSlug)) slug = fmSlug;
      const fmTitle = frontmatterString(parsed.data, 'title');
      if (fmTitle) title = fmTitle;
      const fmPrompt = frontmatterString(parsed.data, 'heroImagePrompt');
      const fmHeroAlt = frontmatterString(parsed.data, 'heroAlt');
      const fmLegacyAlt = frontmatterString(parsed.data, 'heroImageAlt');
      const fmHeroImage = frontmatterString(parsed.data, 'heroImage');
      const fmLegacyImage = frontmatterString(parsed.data, 'heroImageSrc');
      if (!isValidSlug(slug)) continue;
      items.push({
        slug,
        title,
        heroImagePrompt: fmPrompt || null,
        heroAlt: fmHeroAlt || null,
        heroImageAlt: fmLegacyAlt || null,
        heroImage: fmHeroImage || fmLegacyImage || null,
      });
      continue;
    } catch {
      /* ignore unreadable file */
    }
    if (!isValidSlug(slug)) continue;
    items.push({ slug, title, heroImagePrompt: null, heroAlt: null, heroImageAlt: null, heroImage: null });
  }
  items.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return items;
}

function findPostFileBySlug(slug) {
  const dirs = listPostDirsForCollisions();
  for (const dir of dirs) {
    const direct = path.join(dir, `${slug}.md`);
    if (fs.existsSync(direct)) {
      const parsed = readFrontmatter(direct);
      if (!Array.isArray(parsed.lines)) throw new Error('Frontmatter missing');
      return { file: direct, lines: parsed.lines, rest: parsed.rest, raw: parsed.raw, data: parsed.data };
    }
  }
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const candidates = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of candidates) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
      const file = path.join(dir, entry.name);
      try {
        const parsed = readFrontmatter(file);
        const fmSlug = frontmatterString(parsed.data, 'slug');
        if (fmSlug && fmSlug === slug) {
          return { file, lines: parsed.lines, rest: parsed.rest, raw: parsed.raw, data: parsed.data };
        }
      } catch {
        /* ignore read errors */
      }
    }
  }
  return null;
}

function resolvePrimaryPostsDir() {
  const [first] = listPostDirsForCollisions();
  return first || path.join(CWD, 'content', 'posts');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => {
      if (!buf.trim()) return resolve(null);

      // Helper: remove backslashes before []{} only when OUTSIDE strings
      function deBackslashOutsideStrings(s) {
        let out = '', inStr = false, esc = false;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inStr) {
            out += ch;
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === '"') { inStr = false; }
          } else {
            if (ch === '"') {
              inStr = true; out += ch;
            } else if (ch === '\\') {
              const next = s[i + 1];
              if (next === '[' || next === ']' || next === '{' || next === '}') {
                // drop this backslash (it shouldn't be here at top level)
                continue;
              }
              out += ch;
            } else {
              out += ch;
            }
          }
        }
        return out;
      }

      // Existing cleanups: BOM + trailing commas (keep these)
      const base = buf.replace(/^\uFEFF/, '').replace(/,\s*([}\]])/g, '$1');

      // Strategy 1: normal parse
      try { return resolve(JSON.parse(base)); } catch {}

      // Strategy 2: fix stray backslashes outside strings (e.g. "tags":\[)
      const fixed = deBackslashOutsideStrings(base);
      try { return resolve(JSON.parse(fixed)); } catch {}

      // Strategy 3: double-encoded body (JSON string containing JSON)
      try {
        const maybe = JSON.parse(base);
        if (typeof maybe === 'string') {
          return resolve(JSON.parse(maybe));
        }
      } catch {}

      // Last resort: show a concise preview to help debug
      return reject(new Error('Invalid JSON after cleanup. Starts with: ' + base.slice(0, 120)));
    });
  });
}


// ---------- YAML-ish helpers ----------
const yq = (v) => JSON.stringify(String(v ?? '').replace(/\r\n?/g, '\n')); // JSON string literal (YAML 1.2-valid)
const ya = (arr) =>
  '[' + (Array.isArray(arr) ? arr : []).map((s) => JSON.stringify(String(s))).join(', ') + ']';

function markdownToPlainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\\*_#>~`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  const sentences = [];
  const re = /[^.!?]+[.!?]*/g;
  let match;
  while ((match = re.exec(text))) {
    const sentence = match[0].trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}

function buildSummary(text, maxLength) {
  const plain = text.trim();
  if (!plain) return '';
  const sentences = splitSentences(plain);
  let summary = '';
  for (const sentence of sentences) {
    const candidate = summary ? `${summary} ${sentence}`.trim() : sentence;
    if (candidate.length > maxLength) break;
    summary = candidate;
  }
  if (!summary) summary = plain.slice(0, maxLength).trim();
  summary = summary.replace(/\s+/g, ' ').trim();
  if (summary.length > maxLength) {
    const truncated = summary.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    summary = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim();
  }
  if (summary.length < plain.length && summary.length + 1 <= maxLength) {
    summary = summary.replace(/[.!?…]+$/g, '').trim();
    if (summary.length + 1 <= maxLength) summary += '…';
  }
  return summary;
}

function generateExcerpt(markdown, providedExcerpt) {
  const manual = String(providedExcerpt || '').trim();
  if (manual) return { value: manual, auto: false };
  const plain = markdownToPlainText(markdown);
  if (!plain) return { value: '', auto: false };
  return { value: buildSummary(plain, 220), auto: true };
}

function generateMetaDescription(markdown, providedMeta, excerptFallback) {
  const manual = String(providedMeta || '').trim();
  if (manual) return { value: manual, auto: false };
  const plain = markdownToPlainText(markdown);
  if (!plain) {
    const fallbackPlain = markdownToPlainText(excerptFallback || '');
    if (!fallbackPlain) return { value: '', auto: true };
    return { value: buildSummary(fallbackPlain, 155), auto: true };
  }
  return { value: buildSummary(plain, 155), auto: true };
}

function normalizeTags(input) {
  const items = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const seen = new Set();
  const tags = [];
  for (const tag of items) {
    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(tag);
  }
  return tags;
}

// ---------- GENPROMPT (shared with CLI) ----------
function buildGenprompt({ topic, words, ads, kofi }) {
  const settings =
    readJSON(path.join(CWD, 'content', 'settings.json')) ||
    { brandName: 'WitchClick', siteUrl: 'https://example.com' };
  const products = readJSON(path.join(CWD, 'content', 'products.json')) || { products: [] };
  const allowed = Array.isArray(products.products)
    ? products.products
        .map((p) => String(p?.key || '').trim())
        .filter(Boolean)
    : [];

  const metadata = collectPostMetadata(CWD);
  const existingTitles = metadata.map((item) => item.title).filter(Boolean);
  const currentSlugs = metadata.map((item) => item.slug).filter(Boolean);
  const historicSlugs = readSlugHistory(CWD);
  const mergedSlugSet = new Set([...historicSlugs, ...currentSlugs]);
  const mergedSlugs = Array.from(mergedSlugSet);
  writeSlugHistory(CWD, mergedSlugs);

  return buildMasterPrompt({
    topic,
    words,
    ads,
    kofi,
    brandName: settings.brandName ?? 'WitchClick',
    siteUrl: settings.siteUrl ?? 'https://example.com',
    existingPostTitles: existingTitles,
    existingPostSlugs: mergedSlugs,
    allowedAffiliateKeys: allowed,
  });
}

function buildPresetPrompt({ preset, topic, strict, styleDirective }) {
  const lines = [`SYSTEM ROLE: ${preset.system}`];

  if (styleDirective) {
    lines.push(`STYLE DIRECTIVE: ${styleDirective}`);
  }

  lines.push(`Goal: ${preset.goal}`, '', `Topic: ${topic}`, '');

  const contractLines = strict
    ? preset.strictOutputContract
    : preset.looseOutputContract;

  lines.push(strict ? 'STRICT JSON CONTRACT:' : 'LOOSE JSON CONTRACT:');
  lines.push(contractLines.join('\n'));

  if (!contractLines.includes('STRICT JSON OUTPUT RULES (do all of these):')) {
    lines.push('');
    lines.push(...STRICT_JSON_RULES);
  }

  return lines.join('\n');
}

// ---------- POSTS ----------
function wordCount(md) {
  return String(md||'')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\*_#>~\-]+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;
}

async function savePostFromWrite(payload) {
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('title is required');
  const desiredSlug = payload.slug ? slugify(payload.slug) : slugify(title);
  if (!desiredSlug) throw new Error('slug could not be derived');

  const postsDir = resolvePrimaryPostsDir();
  ensureDir(postsDir);
  const collisionDirs = listPostDirsForCollisions();

  const slugTaken = (candidate) =>
    collisionDirs.some((dir) => fs.existsSync(path.join(dir, `${candidate}.md`)));

  let slug = desiredSlug;
  let i = 2;
  while (slugTaken(slug)) slug = `${desiredSlug}-${i++}`;

  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { siteUrl: 'https://example.com' };
  const site = String(settings.siteUrl || 'https://example.com').replace(/\/$/, '');
  const canonical = `${site}/post/${slug}`;

  const tags = normalizeTags(payload.tags);

  const entitiesInput = payload.entities;
  const entities = [];
  let invalidEntities = 0;
  if (typeof entitiesInput === 'string') {
    for (const chunk of entitiesInput.split(',')) {
      const part = chunk.trim();
      if (!part) continue;
      const colon = part.indexOf(':');
      if (colon === -1) {
        invalidEntities++;
        continue;
      }
      const rawType = part.slice(0, colon).trim();
      const rawSlug = part.slice(colon + 1).trim();
      const type = rawType;
      const slug = slugify(rawSlug);
      if (!type || !slug) {
        invalidEntities++;
        continue;
      }
      entities.push({ type, slug });
    }
  } else if (entitiesInput != null && entitiesInput !== '') {
    invalidEntities++;
  }

  const serializeEntities = (list) => {
    if (!Array.isArray(list) || !list.length) return 'entities: []';
    const lines = ['entities:'];
    for (const item of list) {
      lines.push(`  - type: ${JSON.stringify(String(item.type))}`);
      lines.push(`    slug: ${JSON.stringify(String(item.slug))}`);
    }
    return lines.join('\n');
  };

  const includeAds = !!payload.includeAds;
  const includeKofi = !!payload.includeKofi;
  const markdown = String(payload.markdown||'').trim();
  if (!markdown) throw new Error('markdown is required');

  const warnings = [];
  const { value: excerpt, auto: excerptAuto } = generateExcerpt(markdown, payload.excerpt);
  const { value: metaDescription, auto: metaAuto } = generateMetaDescription(
    markdown,
    payload.metaDescription,
    excerpt || markdown,
  );
  if (excerptAuto && excerpt) warnings.push('Excerpt auto-generated from Markdown.');
  if (metaAuto && metaDescription) warnings.push('Meta description auto-generated from Markdown.');
  if (tags.length < 4 || tags.length > 7) warnings.push(`Tags ideal range is 4–7 (currently ${tags.length}).`);

  const readingMinutes = Math.max(1, Math.round(wordCount(markdown)/200));

  const fm = [
    '---',
    `title: ${yq(title)}`,
    `slug: ${slug}`,
    `description: ${yq(excerpt)}`,
    `metaTitle: ${yq(title)}`,
    `metaDescription: ${yq(metaDescription)}`,
    `tags: ${ya(tags)}`,
    `readingMinutes: ${readingMinutes}`,
    serializeEntities(entities),
    `includeAds: ${includeAds ? 'true' : 'false'}`,
    `includeKofi: ${includeKofi ? 'true' : 'false'}`,
    `affiliateAnchors: []`,
    `internalLinks: []`,
    `publishedAt: ${yq(new Date().toISOString())}`,
    `canonicalUrl: ${yq(canonical)}`,
    'specVersion: 2',
    '---'
  ].join('\n');

  const filePath = path.join(postsDir, `${slug}.md`);
  await fsp.writeFile(filePath, fm + '\n' + markdown + '\n', 'utf8');

  const result = { slug, path: path.relative(CWD, filePath) };
  if (entities.length) {
    result.entities = entities;
  }
  if (invalidEntities) {
    warnings.push(`Dropped ${invalidEntities} invalid entity entr${invalidEntities === 1 ? 'y' : 'ies'}.`);
  }
  if (warnings.length) {
    result.warnings = warnings;
  }
  return result;
}


function run(cmd, args, cwd = CWD) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => resolve({ cmd: [cmd, ...args].join(' '), code, out, err }));
  });
}

// ---------- DOWNLOADS ----------
async function listDownloads() {
  const base = path.join(CWD, 'content', 'downloads');
  const items = [];
  if (!fs.existsSync(base)) return { items };

  const files = fs.readdirSync(base).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
      const slug = data.slug || f.replace(/\.json$/, '');
      const name = data.name || slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
      items.push({
        ...data,
        slug,
        name
      });
    } catch { /* ignore malformed download */ }
  }

  items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return { items };
}

async function getDownload({ slug }) {
  if (!slug) throw new Error('slug is required');
  const file = path.join(CWD, 'content', 'downloads', `${String(slug)}.json`);
  if (!fs.existsSync(file)) throw new Error('not found');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { data };
}

async function saveDownload({ slug, name, price, currency, summary, cover, file, url, features, tags }) {
  if (!slug && !name) throw new Error('slug or name required');
  const s = slugify(slug || name);
  if (!s) throw new Error('invalid slug');
  const filePath = path.join(CWD, 'content', 'downloads', `${s}.json`);
  ensureDir(path.dirname(filePath));

  const payload = {
    slug: s,
    name: String(name || '').trim() || s.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase()),
    price: price == null ? '' : String(price),
    currency: String(currency || 'USD').trim() || 'USD',
    summary: String(summary || ''),
    cover: String(cover || ''),
    file: String(file || ''),
    url: String(url || ''),
    features: Array.isArray(features) ? features.map(v => String(v)).filter(Boolean) : [],
    tags: Array.isArray(tags) ? tags.map(v => String(v)).filter(Boolean) : []
  };

  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { path: `content/downloads/${s}.json`, slug: s };
}

// ---------- ENTITIES ----------
async function listEntities() {
  const base = path.join(CWD, 'content', 'entities');
  const result = {};
  if (!fs.existsSync(base)) return { items: result };

  const types = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const type of types) {
    const dir = path.join(base, type);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items = [];
    for (const f of files) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        items.push({
          type: j.type || type,
          slug: j.slug || f.replace(/\.json$/, ''),
          name: j.name || '',
          summary: j.summary || ''
        });
      } catch { /* ignore broken file */ }
    }
    items.sort((a,b)=> a.name.localeCompare(b.name));
    result[type] = items;
  }
  return { items: result };
}

async function getEntity({ type, slug }) {
  if (!type || !slug) throw new Error('type and slug are required');
  const file = path.join(CWD, 'content', 'entities', String(type), `${String(slug)}.json`);
  if (!fs.existsSync(file)) throw new Error('not found');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { data: j };
}

async function saveEntity({ type, slug, name, summary, properties, related }) {
  if (!type) throw new Error('type required');
  if (!slug && !name) throw new Error('slug or name required');
  const s = slugify(slug || name);
  if (!s) throw new Error('invalid slug');
  const file = path.join(CWD, 'content', 'entities', String(type), `${s}.json`);
  ensureDir(path.dirname(file));
  const payload = {
    type: String(type),
    slug: s,
    name: String(name || '').trim() || s.replace(/-/g,' ').replace(/\b\w/g, m=>m.toUpperCase()),
    summary: String(summary || ''),
    properties: properties && typeof properties === 'object' ? properties : {},
    related: Array.isArray(related) ? related.map(String) : []
  };
  await fsp.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return { path: `content/entities/${type}/${s}.json`, slug: s, type };
}

// ---------- HTTP SERVER ----------
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, { ok: true });

    if (req.method === 'POST' && req.url === '/ping') {
      return send(res, 200, { ok: true, got: null });
    }

    if (req.method === 'POST' && req.url === '/genprompt') {
      const body = (await parseBody(req)) || {};
      const topic = String(body.topic || 'tea ritual for focus').trim();
      const rawWords = Number(body.words || 1200);
      const words = Number.isFinite(rawWords) ? Math.max(600, Math.min(4000, Math.round(rawWords))) : 1200;
      const ads = String(body.ads || 'off') === 'on' ? 'on' : 'off';
      const kofi = String(body.kofi || 'on') === 'on' ? 'on' : 'off';
      const rawMode = typeof body.mode === 'string' ? body.mode.trim() : '';
      const modeKey = rawMode.toLowerCase();
      const rawStyle = typeof body.style === 'string' ? body.style.trim() : '';
      const styleKey = rawStyle.toLowerCase();
      const styleDirective = generatorStyles[styleKey] || generatorStyles.cozy;
      const resolvedStyleKey = generatorStyles[styleKey] ? styleKey : 'cozy';
      const strict = body.strict === true || body.strict === 'true';
      const preset = modeKey ? generatorPresets[modeKey] : undefined;
      const prompt = preset
        ? buildPresetPrompt({ preset, topic, strict, styleDirective })
        : buildGenprompt({ topic, words, ads, kofi });

      // loud guard so stale prompts never slip through
      if (!preset && (!prompt.includes('opening-reflection') || !prompt.includes('The FIRST outline item must be exactly {"heading":"Opening Reflection","id":"opening-reflection"}'))) {
        return send(res, 500, { ok: false, error: 'Stale prompt detected (missing Opening Reflection guards). Check dev-api.js.' });
      }
      return send(res, 200, {
        ok: true,
        prompt,
        options: { topic, mode: rawMode || null, style: resolvedStyleKey, strict }
      });
    }

    if (req.method === 'POST' && req.url === '/curses/prompt') {
      const body = (await parseBody(req)) || {};
      const select = (value, allowed, fallback) => {
        const text = typeof value === 'string' ? value.trim() : '';
        return allowed.includes(text) ? text : fallback;
      };

      const type = select(body.type, CURSE_TYPES, 'mirror');
      const target = select(body.target, CURSE_TARGETS, 'person');
      const tone = select(body.tone, CURSE_TONES, 'poetic');
      const sigilName = typeof body.sigilName === 'string' && body.sigilName.trim() ? body.sigilName.trim() : undefined;
      const altarItem = typeof body.altarItem === 'string' && body.altarItem.trim() ? body.altarItem.trim() : undefined;
      const journalingFollowUp = typeof body.journalingFollowUp === 'string' && body.journalingFollowUp.trim()
        ? body.journalingFollowUp.trim()
        : undefined;

      const prompt = buildCursePrompt({
        type,
        target,
        tone,
        sigilName,
        altarItem,
        journalingFollowUp,
      });

      if (!prompt.includes('WHITE MAGIC CURSE GENERATOR') || !prompt.includes('CurseSpec v1')) {
        return send(res, 500, {
          ok: false,
          error: 'Stale curse prompt detected (missing guard phrases).',
        });
      }

      return send(res, 200, {
        ok: true,
        prompt,
        options: { type, target, tone, sigilName: sigilName ?? null, altarItem: altarItem ?? null, journalingFollowUp: journalingFollowUp ?? null },
      });
    }

    if (req.method === 'POST') {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (parsedUrl.pathname === '/ingest') {
        const payload = await parseBody(req);
        if (!payload) {
          return send(res, 400, {
            ok: false,
            error: 'No JSON body provided. Paste a PostSpec v2 object.'
          });
        }

        const queryDryRun = (() => {
          const flag = parsedUrl.searchParams.get('dryRun');
          return flag === 'true' || flag === '1';
        })();
        const bodyDryRun = typeof payload === 'object' && payload
          ? payload.dryRun === true || payload.dryRun === 'true'
          : false;
        const dryRun = queryDryRun || bodyDryRun;

        let rawSpec;
        if (payload && typeof payload === 'object' && payload.spec && typeof payload.spec === 'object') {
          rawSpec = payload.spec;
        } else if (payload && typeof payload === 'object') {
          const clone = { ...payload };
          delete clone.dryRun;
          rawSpec = clone;
        } else {
          rawSpec = payload;
        }

        if (rawSpec && typeof rawSpec === 'object' && !Array.isArray(rawSpec) && 'dryRun' in rawSpec) {
          rawSpec = { ...rawSpec };
          delete rawSpec.dryRun;
        }

        try {
          const prepared = prepareSpecForPersistence(rawSpec || {}, {
            cwd: CWD,
            postsDirectories: listPostDirsForCollisions(),
          });
          if (!dryRun) {
            await persistPreparedSpec(prepared);
          }
          const relativePath = path.relative(CWD, prepared.post.filePath).replace(/\\/g, '/');
          return send(res, 200, {
            ok: true,
            spec: prepared.spec,
            normalizationReport: prepared.normalizationReport,
            normalizations: prepared.normalizationReport,
            warnings: prepared.warnings,
            validationWarnings: prepared.warnings,
            wordCount: prepared.wordCount,
            saved: !dryRun,
            slug: prepared.spec.slug,
            path: relativePath,
          });
        } catch (e) {
          const status = Array.isArray(e?.errors) ? 400 : 500;
          return send(res, status, {
            ok: false,
            error: e?.message || String(e),
            errors: e?.errors,
            warnings: e?.warnings || [],
            normalizations: e?.normalizations || [],
          });
        }
      } else if (parsedUrl.pathname === '/curses/ingest') {
        const payload = await parseBody(req);
        if (!payload) {
          return send(res, 400, {
            ok: false,
            error: 'No JSON body provided. Paste a CurseSpec object.'
          });
        }

        const queryDryRun = (() => {
          const flag = parsedUrl.searchParams.get('dryRun');
          return flag === 'true' || flag === '1';
        })();
        const bodyDryRun = typeof payload === 'object' && payload
          ? payload.dryRun === true || payload.dryRun === 'true'
          : false;
        const dryRun = queryDryRun || bodyDryRun;

        let rawSpec = payload && typeof payload === 'object' && payload.spec ? payload.spec : payload;

        if (rawSpec && typeof rawSpec === 'object' && 'dryRun' in rawSpec) {
          rawSpec = { ...rawSpec };
          delete rawSpec.dryRun;
        }

        try {
          const prepared = prepareCurseForPersistence(rawSpec || {}, { cwd: CWD });
          if (!dryRun) {
            await persistPreparedCurse(prepared);
          }
          const relativePath = path.relative(CWD, prepared.markdown.filePath).replace(/\\/g, '/');
          return send(res, 200, {
            ok: true,
            spec: prepared.spec,
            warnings: prepared.warnings,
            saved: !dryRun,
            slug: prepared.spec.slug,
            path: relativePath,
          });
        } catch (e) {
          const status = Array.isArray(e?.errors) ? 400 : 500;
          return send(res, status, {
            ok: false,
            error: e?.message || String(e),
            errors: e?.errors,
          });
        }
      }
    }

    if (req.method === 'POST' && req.url === '/bundle') {
      const steps = [];
      steps.push(await run('node', ['tools/wc.js', 'linker']));
      steps.push(await run('node', ['tools/wc.js', 'go:build']));
      const ok = steps.every(s => s.code === 0);
      return send(res, ok ? 200 : 500, {
        ok,
        steps: steps.map(s => ({ cmd: s.cmd, code: s.code, out: s.out, err: s.err }))
      });
    }

    if (req.method === 'POST' && req.url === '/posts/list') {
      try {
        const items = await listPostsForHero();
        return send(res, 200, { ok: true, items });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/upload/hero') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const slug = String(body.slug || '').trim();
        if (!isValidSlug(slug)) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const parsed = parseImageDataUrl(body.contentBase64);
        if (!parsed) {
          return send(res, 400, { ok: false, error: 'contentBase64 must be a data:image/… URL' });
        }
        const fallbackExt = MIME_EXTENSION_MAP[parsed.mime];
        if (!fallbackExt) {
          return send(res, 400, { ok: false, error: 'Unsupported image mime type' });
        }
        const sanitized = sanitizeHeroFilename(body.filename, fallbackExt);
        const base = sanitized.base;
        const ext = fallbackExt;
        const buffer = Buffer.from(parsed.base64, 'base64');
        if (!buffer.length) {
          return send(res, 400, { ok: false, error: 'Image data was empty' });
        }
        const targetDir = path.join(HERO_IMAGE_ROOT, slug);
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        const relativePath = `/images/hero/${slug}/${finalName}`.replace(/\\+/g, '/');
        await fsp.writeFile(filePath, buffer);
        return send(res, 200, { ok: true, path: relativePath });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/posts/attach-hero') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const slug = String(body.slug || '').trim();
        if (!isValidSlug(slug)) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const heroImage = String(body.heroImage || '').trim();
        if (!heroImage || !heroImage.startsWith(`/images/hero/${slug}/`)) {
          return send(res, 400, { ok: false, error: 'heroImage must point to the hero directory for this slug' });
        }
        const heroAlt = body.heroAlt == null ? '' : String(body.heroAlt).trim();
        const found = findPostFileBySlug(slug);
        if (!found) {
          return send(res, 404, { ok: false, error: 'Post not found' });
        }
        const lines = Array.isArray(found.lines) ? [...found.lines] : [];
        const specIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('specVersion:'));
        const heroImageLine = `heroImage: ${yq(heroImage)}`;
        const heroAltLine = `heroAlt: ${yq(heroAlt)}`;
        let heroImageIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('heroImage:'));
        if (heroImageIndex !== -1) {
          lines[heroImageIndex] = heroImageLine;
        } else {
          const insertIndex = specIndex === -1 ? lines.length : specIndex;
          lines.splice(insertIndex, 0, heroImageLine);
          heroImageIndex = insertIndex;
        }
        let heroAltIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('heroAlt:'));
        if (heroAltIndex !== -1) {
          lines[heroAltIndex] = heroAltLine;
        } else {
          const insertIndex = heroImageIndex >= 0 ? heroImageIndex + 1 : (specIndex === -1 ? lines.length : specIndex);
          lines.splice(insertIndex, 0, heroAltLine);
          heroAltIndex = insertIndex;
        }
        const frontMatter = ['---', ...lines, '---'].join('\n');
        let next = `${frontMatter}\n${found.rest}`;
        if (!next.endsWith('\n')) next += '\n';
        await fsp.writeFile(found.file, next, 'utf8');
        return send(res, 200, { ok: true, path: path.relative(CWD, found.file) });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    // POST /upload/download-file
    // Body: { slug, filename, contentBase64 } where contentBase64 is a data: URL
    // Accepts: application/pdf, image/png, image/jpg, image/webp (maps via MIME_EXTENSION_MAP)
    // Writes to: public/downloads/<slug>/files/<unique>.<ext>
    if (req.method === 'POST' && req.url === '/upload/download-file') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') return send(res, 400, { ok: false, error: 'Invalid JSON body' });

        const slug = String(body.slug || '').trim();
        if (!isValidSlug(slug)) return send(res, 400, { ok: false, error: 'Invalid slug' });

        const parsed = parseDataUrl(body.contentBase64);
        if (!parsed) return send(res, 400, { ok: false, error: 'contentBase64 must be a base64 data: URL' });

        const fallbackExt = MIME_EXTENSION_MAP[parsed.mime];
        if (!fallbackExt || !['.pdf', '.png', '.jpg', '.webp'].includes(fallbackExt)) {
          return send(res, 400, { ok: false, error: 'Unsupported mime; allowed: PDF or PNG/JPG/WEBP images' });
        }

        const { base, ext } = sanitizeHeroFilename(body.filename, fallbackExt);
        const buffer = Buffer.from(parsed.base64, 'base64');
        if (!buffer.length) return send(res, 400, { ok: false, error: 'File data was empty' });

        const targetDir = path.join(DOWNLOADS_ROOT, slug, 'files');
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        await fsp.writeFile(filePath, buffer);

        const relativePath = `/downloads/${slug}/files/${finalName}`.replace(/\\+/g, '/');
        return send(res, 200, { ok: true, path: relativePath });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    // POST /upload/download-cover
    // Body: { slug, filename, contentBase64 } where contentBase64 is a data:image/... URL
    // Writes to: public/downloads/<slug>/cover/<unique>.<ext>
    if (req.method === 'POST' && req.url === '/upload/download-cover') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') return send(res, 400, { ok: false, error: 'Invalid JSON body' });

        const slug = String(body.slug || '').trim();
        if (!isValidSlug(slug)) return send(res, 400, { ok: false, error: 'Invalid slug' });

        const parsed = parseDataUrl(body.contentBase64);
        if (!parsed || !parsed.mime.startsWith('image/')) {
          return send(res, 400, { ok: false, error: 'contentBase64 must be a data:image/... URL' });
        }

        const fallbackExt = MIME_EXTENSION_MAP[parsed.mime];
        if (!fallbackExt) return send(res, 400, { ok: false, error: 'Unsupported image mime type' });

        const { base, ext } = sanitizeHeroFilename(body.filename, fallbackExt);
        const buffer = Buffer.from(parsed.base64, 'base64');
        if (!buffer.length) return send(res, 400, { ok: false, error: 'Image data was empty' });

        const targetDir = path.join(DOWNLOADS_ROOT, slug, 'cover');
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        await fsp.writeFile(filePath, buffer);

        const relativePath = `/downloads/${slug}/cover/${finalName}`.replace(/\\+/g, '/');
        return send(res, 200, { ok: true, path: relativePath });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    /*
     * Admin UI usage:
     * 1) Cover upload flow:
     *    - Convert selected image to a base64 data URL in the browser (FileReader.readAsDataURL).
     *    - POST to /upload/download-cover with { slug, filename, contentBase64 }.
     *    - Take response.path and set it into the 'cover' field when calling /downloads/save.
     *
     * 2) File upload flow (PDF preferred):
     *    - Convert the PDF (or image) to a base64 data URL (FileReader.readAsDataURL).
     *    - POST to /upload/download-file with { slug, filename, contentBase64 }.
     *    - Take response.path and set it into the 'file' field when calling /downloads/save.
     *
     * 3) Static serving:
     *    - Astro serves files from /public. These will be accessible at /downloads/<slug>/... in production.
     */

    // ---- Downloads
    if (req.method === 'POST' && req.url === '/downloads/list') {
      try {
        const data = await listDownloads();
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/downloads/get') {
      try {
        const body = await parseBody(req);
        const data = await getDownload({ slug: body?.slug });
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 404, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/downloads/save') {
      try {
        const body = await parseBody(req);
        const data = await saveDownload(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Entities
    if (req.method === 'POST' && req.url === '/entities/list') {
      try {
        const data = await listEntities();
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/entities/get') {
      try {
        const body = await parseBody(req);
        const data = await getEntity({ type: body?.type, slug: body?.slug });
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 404, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/entities/save') {
      try {
        const body = await parseBody(req);
        const data = await saveEntity(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Write page
    if (req.method === 'POST' && req.url === '/posts/save') {
      try {
        const body = await parseBody(req);
        const data = await savePostFromWrite(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    return send(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || String(e) });
  }
});

if (process.env.VITEST !== 'true') {
  server.listen(PORT, () => {
    console.log(`[dev-api] listening on http://localhost:${PORT}`);
  });
}

// ---- Admin helpers (for admin UI / tests)
const adminPipelineHelpers = {
  savePostFromWrite,
  slugify,
  markdownToPlainText,
  generateExcerpt,
  generateMetaDescription,
  normalizeTags,
  buildGenprompt,
  prepareSpecForPersistence,
  persistPreparedSpec,
};

export {
  savePostFromWrite,
  slugify,
  markdownToPlainText,
  generateExcerpt,
  generateMetaDescription,
  normalizeTags,
  buildGenprompt,
  prepareSpecForPersistence,
  persistPreparedSpec,
  adminPipelineHelpers,
};
