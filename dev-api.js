// dev-api.js (ESM)
// Minimal local API for WitchClick admin with safe YAML quoting.
// Endpoints:
//   POST /ping
//   POST /genprompt    {topic, words, ads:'on'|'off', kofi:'on'|'off'}
//   POST /ingest       (PostSpec v2 JSON)
//   POST /bundle       (runs linker -> go:build)
//   POST /tumblr-push  {slug, title, excerpt, url, heroImage, tags}
//   POST /entities/list
//   POST /entities/get {type, slug}
//   POST /entities/save {type, slug, name, summary, properties, related[]}
//   POST /entities/delete {type, slug}
//   POST /staging/list
//   POST /posts/save   {title, slug?, excerpt, metaDescription, tags, includeAds, includeKofi, entities, markdown}
//   POST /settings/get
//   POST /settings/save {siteUrl, brandName, disclosure, kofiUsername, showAccountLink, analytics*, ads*, observability*, clientErrorEndpoint}
//   POST /products/list
//   POST /products/save {products[]}
//   POST /home/get
//   POST /home/save {cta, testimonials[]}
//   POST /partners/get
//   POST /partners/save {sections[], affiliateHighlights[]}
//   POST /calendar/get
//   POST /calendar/save {seasons[]}
//   POST /authors/list
//   POST /authors/get {slug}
//   POST /authors/save {slug, name, title, pronouns, bio, focus, specialties[], links[]}
//   POST /authors/delete {slug}

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pushToTumblr } from './tools/tumblr-push.js';

import { resolveGeneratorPresetKey } from './server/lib/generatorPresets.js';
import generatorStyles from './server/lib/generatorStyles.js';
import { buildMasterPrompt } from './server/lib/promptBuilder.js';
import { buildCursePrompt } from './server/lib/cursePromptBuilder.js';
import { CURSE_TARGETS, CURSE_TONES, CURSE_TYPES } from './server/lib/curseSpecSchema.js';
import { loadPromptContext } from './server/lib/promptContext.js';
import {
  generateStubPrompts,
  serializeStubEntries,
  generatePostStubPrompts,
  serializePostStubEntries,
} from './server/lib/stubPromptGenerator.js';
import { executeIngest } from './server/lib/ingestExecutor.js';
import { resolvePostsDirectories } from './scripts/lib/contentPaths.js';
import { frontmatterString, parseFrontmatter, readFrontmatter } from './scripts/lib/frontmatter.js';
import { isValidSlug, slugify } from './shared/slugify.js';
import { resetThemeCache } from './shared/theme-cache.js';
import {
  prepareSpecForPersistence,
  persistPreparedSpec,
} from './server/lib/specPreparation.js';
import {
  prepareCurseForPersistence,
  persistPreparedCurse,
} from './server/lib/cursePreparation.js';

const MAX_BODY_BYTES = Number.parseInt(process.env.DEV_API_MAX_BODY_BYTES || '', 10) || 5 * 1024 * 1024; // 5MB default
const MAX_UPLOAD_BYTES = Number.parseInt(process.env.DEV_API_MAX_UPLOAD_BYTES || '', 10) || 10 * 1024 * 1024; // 10MB default
const DEV_API_TOKEN = process.env.DEV_API_TOKEN || '';
const DEV_API_CORS_ORIGIN = process.env.DEV_API_CORS_ORIGIN || '*';
const DEV_API_LOG = process.env.DEV_API_LOG !== 'false';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const rawPort = process.env.DEV_API_PORT ?? process.env.PORT;
const PORT = rawPort && Number.parseInt(rawPort, 10) > 0 ? Number.parseInt(rawPort, 10) : 8787;
const HOST = process.env.HOST ?? process.env.DEV_API_HOST ?? '127.0.0.1';
const CWD = process.cwd();
let parsedUrl = null;
const writeLocks = new Map();
const ENTITY_SUBSCRIPTIONS_PATH = path.join(CWD, 'content', 'notifications', 'entity-subscriptions.json');
const ENTITY_NOTIFICATIONS_PATH = path.join(CWD, 'content', 'notifications', 'entity-notifications.json');
const rateBuckets = new Map();

const PUBLIC_ENDPOINTS = new Set([
  '/ping',
  '/entities/subscribe',
]);

const RATE_LIMITS = [
  { route: '/genprompt', windowMs: 60_000, max: 20 },
  { route: '/ingest', windowMs: 60_000, max: 6 },
  { route: '/bundle', windowMs: 60_000, max: 4 },
  { route: '/tumblr-push', windowMs: 60_000, max: 8 },
  { route: '/posts/save', windowMs: 60_000, max: 20 },
  { route: '/posts/update', windowMs: 60_000, max: 20 },
  { route: '/posts/delete', windowMs: 60_000, max: 10 },
  { route: '/entities/save', windowMs: 60_000, max: 30 },
  { route: '/entities/subscribe', windowMs: 60_000, max: 60 },
  { route: '/curses/prompt', windowMs: 60_000, max: 20 },
  { route: '/curses/ingest', windowMs: 60_000, max: 6 },
];

function listPostDirsForCollisions() {
  return resolvePostsDirectories({ root: CWD });
}

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': DEV_API_CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WC-Dev-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeFileAtomic(filePath, contents, encoding = 'utf8') {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${Date.now()}.tmp`);
  return fsp.writeFile(tmp, contents, encoding).then(() => fsp.rename(tmp, filePath));
}

function withLock(key, fn) {
  const prev = writeLocks.get(key) || Promise.resolve();
  const next = prev.then(() => fn()).finally(() => {
    if (writeLocks.get(key) === next) writeLocks.delete(key);
  });
  writeLocks.set(key, next);
  return next;
}

function getRateLimitConfig(route) {
  if (!route) return null;
  return RATE_LIMITS.find((limit) => limit.route === route) || null;
}

function checkRateLimit(ip, route) {
  const config = getRateLimitConfig(route);
  if (!config) return { ok: true };
  const key = `${ip}:${route}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { ok: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }
  if (entry.count >= config.max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  rateBuckets.set(key, entry);
  return { ok: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

function logRequest(req, statusCode, durationMs) {
  if (!DEV_API_LOG) return;
  const method = req.method || 'UNKNOWN';
  const route = req.url || '';
  const remote = req.socket?.remoteAddress || 'unknown';
  const size = getObservedSize(req);
  console.log('[dev-api]', {
    method,
    route,
    statusCode,
    durationMs,
    remote,
    inputSize: size,
  });
}

function listCurseDirectories() {
  return [CURSE_ARCHIVE_DIR, CURSE_LEGACY_DIR];
}

function findCurseFile(slug) {
  if (!slug) return null;
  const candidates = listCurseDirectories();
  for (const dir of candidates) {
    const direct = path.join(dir, `${slug}.md`);
    if (fs.existsSync(direct)) {
      try {
        const parsed = readFrontmatter(direct);
        return { file: direct, ...parsed };
      } catch {
        /* ignore */
      }
    }
  }
  for (const dir of candidates) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
        const file = path.join(dir, entry.name);
        try {
          const parsed = readFrontmatter(file);
          const fmSlug = frontmatterString(parsed.data, 'slug');
          if (fmSlug && fmSlug === slug) {
            return { file, ...parsed };
          }
        } catch {
          /* ignore parse errors */
        }
      }
    } catch {
      /* ignore missing directories */
    }
  }
  return null;
}

function listCursesForEditor() {
  const seen = new Set();
  const items = [];
  const dirs = listCurseDirectories();
  for (const dir of dirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
      const file = path.join(dir, entry.name);
      try {
        const parsed = readFrontmatter(file);
        const slug = frontmatterString(parsed.data, 'slug') || entry.name.replace(/\.md$/i, '');
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        const title = frontmatterString(parsed.data, 'title') || slug;
        items.push({
          slug,
          title,
          path: path.relative(CWD, file).replace(/\\/g, '/'),
        });
      } catch {
        /* ignore */
      }
    }
  }
  items.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return items;
}

async function loadCurseForEditor(slug) {
  if (!isValidSlug(slug)) {
    throw new Error('Invalid slug');
  }
  const found = findCurseFile(slug);
  if (!found) {
    const err = new Error('Curse not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const relativePath = path.relative(CWD, found.file).replace(/\\/g, '/');
  const newline = /\r\n/.test(found.raw || '') ? '\r\n' : '\n';
  const frontmatter = Array.isArray(found.lines) ? found.lines.join('\n') : '';
  const markdown = typeof found.rest === 'string' ? found.rest.replace(/\r\n?/g, '\n') : '';
  let stats = null;
  try {
    stats = await fsp.stat(found.file);
  } catch {
    stats = null;
  }
  return {
    slug,
    title: frontmatterString(found.data, 'title') || slug,
    frontmatter,
    markdown,
    path: relativePath,
    newline,
    updatedAt: stats?.mtime ? stats.mtime.toISOString() : null,
  };
}

async function saveCurseFromEditor(payload) {
  const originalSlug = slugify(String(payload?.originalSlug || payload?.slug || ''));
  if (!originalSlug) {
    throw new Error('originalSlug is required');
  }
  const frontmatterInput = typeof payload?.frontmatter === 'string' ? payload.frontmatter : '';
  const markdownInput = typeof payload?.markdown === 'string' ? payload.markdown : '';

  const frontmatterNormalized = frontmatterInput.replace(/\r\n?/g, '\n').trimEnd();
  const markdownNormalized = markdownInput.replace(/\r\n?/g, '\n');

  let parsed;
  try {
    parsed = parseFrontmatter(`---\n${frontmatterNormalized}\n---\n${markdownNormalized}`);
  } catch (err) {
    const error = new Error(`Frontmatter parse failed: ${err?.message || String(err)}`);
    error.code = 'PARSE_ERROR';
    throw error;
  }

  const rawSlug = frontmatterString(parsed.data, 'slug') || originalSlug;
  const normalizedSlug = slugify(rawSlug);
  if (!normalizedSlug) throw new Error('Frontmatter slug is required');
  if (!isValidSlug(normalizedSlug)) throw new Error(`Frontmatter slug is invalid: ${normalizedSlug}`);

  const existing = findCurseFile(originalSlug);
  const targetDir = CURSE_ARCHIVE_DIR;
  ensureDir(targetDir);
  const targetFile = path.join(targetDir, `${normalizedSlug}.md`);

  const legacyFile = path.join(CURSE_LEGACY_DIR, `${normalizedSlug}.md`);
  if (
    (fs.existsSync(targetFile) && (!existing || path.resolve(targetFile) !== path.resolve(existing.file))) ||
    (fs.existsSync(legacyFile) && (!existing || path.resolve(legacyFile) !== path.resolve(existing.file)))
  ) {
    const err = new Error(`Another curse already uses the slug "${normalizedSlug}".`);
    err.code = 'SLUG_CONFLICT';
    throw err;
  }

  const newline = existing && /\r\n/.test(existing.raw || '') ? '\r\n' : '\n';
  const fmLines = parsed.lines || [];
  const slugLine = `slug: ${normalizedSlug}`;
  const slugIndex = fmLines.findIndex((line) => line.trim().toLowerCase().startsWith('slug:'));
  if (slugIndex === -1) {
    const titleIndex = fmLines.findIndex((line) => line.trim().toLowerCase().startsWith('title:'));
    const insertAt = titleIndex === -1 ? 0 : titleIndex + 1;
    fmLines.splice(insertAt, 0, slugLine);
  } else {
    const indent = fmLines[slugIndex].match(/^\s*/)?.[0] || '';
    fmLines[slugIndex] = `${indent}${slugLine}`;
  }

  const fmBlock = fmLines.join('\n').replace(/\s+$/, '');
  let bodyBlock = parsed.rest ? String(parsed.rest) : '';
  bodyBlock = bodyBlock.replace(/\r\n?/g, '\n');
  if (bodyBlock && !bodyBlock.endsWith('\\n')) bodyBlock += '\\n';

  const fileContents = `---${newline}${fmBlock ? `${fmBlock}${newline}` : ''}---${newline}${bodyBlock ? bodyBlock.replace(/\n/g, newline) : ''}`;
  await withLock(`curse:${normalizedSlug}`, () => writeFileAtomic(targetFile, fileContents, 'utf8'));

  if (existing && path.resolve(existing.file) !== path.resolve(targetFile) && fs.existsSync(existing.file)) {
    try { await fsp.rm(existing.file); } catch { /* ignore */ }
  }

  return {
    slug: normalizedSlug,
    path: path.relative(CWD, targetFile).replace(/\\\\/g, '/'),
    newline,
  };
}

async function deleteCurseBySlug(slug) {
  const normalizedSlug = slugify(slug || '');
  if (!normalizedSlug) {
    const err = new Error('Invalid slug');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const found = findCurseFile(normalizedSlug);
  if (!found) {
    const err = new Error('Curse not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  try {
    await fsp.rm(found.file);
  } catch (e) {
    const err = new Error(e?.message || 'Failed to delete curse');
    err.code = 'DELETE_FAILED';
    throw err;
  }
  return {
    slug: normalizedSlug,
    path: path.relative(CWD, found.file).replace(/\\\\/g, '/'),
  };
}

const HERO_IMAGE_ROOT = path.join(CWD, 'public', 'images', 'hero');
const DOWNLOADS_ROOT = path.join(CWD, 'public', 'downloads');
const THEME_BACKGROUNDS_ROOT = path.join(CWD, 'public', 'images', 'theme-backgrounds');
const THEMES_DIR = path.join(CWD, 'content', 'themes');
const ACTIVE_THEME_FILE = path.join(THEMES_DIR, 'active.json');
const CURSE_ARCHIVE_DIR = path.join(CWD, 'archive', 'curses');
const CURSE_LEGACY_DIR = path.join(CWD, 'content', 'white-magic-curses');
ensureDir(CURSE_ARCHIVE_DIR);

const THEME_REQUIRED_FIELDS = ['primary', 'accent', 'background', 'fontSerif', 'fontScript'];
const THEME_EXTRA_FIELDS = [
  'colorMidnight', 'colorNight', 'colorIris', 'colorAmethyst', 'colorDusk', 'colorGold', 'colorRune', 'colorFog', 'colorInk',
  'colorMuted', 'colorBorder', 'colorBorderStrong', 'colorOverlay', 'colorOverlayStrong',
  'surfacePlain', 'surfacePlainBorder', 'cardPanelSurface', 'cardPanelSurfaceStrong', 'cardPanelBorder', 'cardPanelBorderStrong', 'cardPanelBorderSoft',
  'glassSurface', 'glassSurfaceStrong', 'glassCard', 'glassHover', 'glassBorder', 'glassBorderStrong', 'glassHighlight', 'glassGlow', 'glassShadowSoft', 'glassShadowStrong', 'glassBlur', 'glassNoiseOpacity',
  'textSecondary', 'textTertiary', 'textStrong', 'textHint', 'textDisabled', 'textBody', 'textSubtle', 'textAccent', 'textAccentStrong',
  'inkBody', 'inkStrong', 'inkMuted', 'linkColor',
  'cardBadgeBg', 'cardBadgeBorder', 'cardBadgeText', 'cardTagBg', 'cardTagBorder', 'cardTagText', 'cardSpoonBg', 'cardSpoonBorder', 'cardSpoonText',
  'focusRingColor', 'cardFocusOutline',
  'fontHeading', 'fontAccent',
  'shadowSoft', 'shadowStrong',
  'success', 'warning', 'error', 'info',
  'entityCardBorder', 'entityCardGlow', 'entityCardHighlight', 'entityCardSurfaceTop', 'entityCardSurfaceBottom',
  'entityCardHeading', 'entityCardText', 'entityCardLabel', 'entityCardCta', 'entityCardCtaHover', 'entityCardIcon', 'entityCardIconShadow',
  'headerBackground', 'headerBorder', 'headerText', 'headerTextHover',
  'footerBackground', 'footerBorder', 'footerText', 'footerTextMuted',
  'backgroundImage',
  'textPrimary', 'textHeading', 'textMuted'
];
const THEME_OPTIONAL_FIELDS = ['textPrimary', 'textHeading', 'textMuted', 'backgroundImage', 'fontHeading', 'fontAccent', ...THEME_EXTRA_FIELDS];
const THEME_ALL_FIELDS = Array.from(new Set([...THEME_REQUIRED_FIELDS, ...THEME_OPTIONAL_FIELDS]));
const DEFAULT_THEME_SETTINGS = {
  midnight: {
    primary: '#6b21a8',
    accent: '#d9b2c4',
    background: '#faf7f5',
    textPrimary: '#1f1630',
    textHeading: '#120725',
    textMuted: '#6b5d70',
    fontSerif: 'Literata',
    fontScript: 'Parisienne'
  },
  dawn: {
    primary: '#9b86c8',
    accent: '#caa043',
    background: '#f6f0e8',
    textPrimary: '#1f1630',
    textHeading: '#120725',
    textMuted: '#6b5d70',
    fontSerif: 'Literata',
    fontScript: 'Parisienne'
  }
};

const COLOR_TOKENS_FILE = path.join(CWD, 'content', 'color-tokens.json');
const COLOR_TOKEN_CSS_FILE = path.join(CWD, 'src', 'styles', 'color-tokens.generated.css');
const COLOR_TOKEN_KEYS = [
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'textHint',
  'textDisabled',
  'textBody',
  'textSubtle',
  'textAccent',
  'textAccentStrong',
  'textStrong',
  'textMuted',
  'linkColor'
];
const DEFAULT_COLOR_TOKENS = {
  midnight: {
    textPrimary: '#f4f1ff',
    textSecondary: '#f4f1ff',
    textTertiary: '#f4f1ff',
    textHint: '#f4f1ff',
    textDisabled: '#f4f1ff',
    textBody: '#f9f5ff',
    textSubtle: '#f9f5ff',
    textAccent: '#d4af37',
    textAccentStrong: '#d4af37',
    textStrong: '#f9f5ff',
    textMuted: '#f9f5ff',
    linkColor: '#e0c07d'
  },
  dawn: {
    textPrimary: '#2c1b3d',
    textSecondary: '#2c1b3d',
    textTertiary: '#2c1b3d',
    textHint: '#2c1b3d',
    textDisabled: '#2c1b3d',
    textBody: '#573f73',
    textSubtle: '#573f73',
    textAccent: '#9b86c8',
    textAccentStrong: '#573f73',
    textStrong: '#3a2854',
    textMuted: '#573f73',
    linkColor: '#caa043'
  }
};

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function cloneDefaultColorTokens() {
  return {
    midnight: { ...DEFAULT_COLOR_TOKENS.midnight },
    dawn: { ...DEFAULT_COLOR_TOKENS.dawn },
  };
}

function toCssVarName(key) {
  return `--${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

function normalizeColorTokenState(raw) {
  const defaults = cloneDefaultColorTokens();
  const tokens = {
    midnight: { ...defaults.midnight },
    dawn: { ...defaults.dawn },
  };

  if (raw && typeof raw === 'object') {
    const sourceTokens = raw.tokens && typeof raw.tokens === 'object' ? raw.tokens : {};
    ['midnight', 'dawn'].forEach((mode) => {
      const values = sourceTokens[mode];
      if (!values || typeof values !== 'object') return;
      COLOR_TOKEN_KEYS.forEach((key) => {
        const value = values[key];
        if (typeof value === 'string' && value.trim()) {
          tokens[mode][key] = value.trim();
        }
      });
    });
  }

  const updatedAt = typeof raw?.updatedAt === 'string' && raw.updatedAt.trim()
    ? raw.updatedAt.trim()
    : new Date().toISOString();

  return {
    schemaVersion: 1,
    updatedAt,
    tokens,
  };
}

async function writeColorTokenCss(state) {
  const defaults = cloneDefaultColorTokens();
  const tokens = {
    midnight: { ...defaults.midnight, ...(state?.tokens?.midnight || {}) },
    dawn: { ...defaults.dawn, ...(state?.tokens?.dawn || {}) },
  };
  const timestamp = state?.updatedAt || new Date().toISOString();

  const midnightLines = COLOR_TOKEN_KEYS.map((key) => {
    const value = tokens.midnight[key] ?? defaults.midnight[key] ?? '';
    return `  ${toCssVarName(key)}: ${value};`;
  });
  const dawnLines = COLOR_TOKEN_KEYS.map((key) => {
    const value = tokens.dawn[key] ?? defaults.dawn[key] ?? '';
    return `  ${toCssVarName(key)}: ${value};`;
  });

  const css = `/**\n * AUTO-GENERATED COLOR TOKENS\n * Generated: ${timestamp}\n * Source: content/color-tokens.json\n */\n\n:root {\n${midnightLines.join('\n')}\n}\n\n:root[data-comfort-theme="dawn"] {\n${dawnLines.join('\n')}\n}\n`;

  ensureDir(path.dirname(COLOR_TOKEN_CSS_FILE));
  await fsp.writeFile(COLOR_TOKEN_CSS_FILE, css, 'utf8');
}

async function loadColorTokens() {
  const raw = readJSON(COLOR_TOKENS_FILE);
  const state = normalizeColorTokenState(raw);
  await writeColorTokenCss(state);
  return state;
}

async function saveColorTokens(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.tokens !== 'object') {
    throw new Error('tokens object required');
  }

  const state = normalizeColorTokenState({ tokens: payload.tokens });
  state.updatedAt = new Date().toISOString();

  ensureDir(path.dirname(COLOR_TOKENS_FILE));
  await fsp.writeFile(COLOR_TOKENS_FILE, JSON.stringify(state, null, 2), 'utf8');
  await writeColorTokenCss(state);
  return state;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

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

function resolveTumblrHeroImagePath(heroImage) {
  const raw = String(heroImage || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const pathname = decodeURIComponent(parsed.pathname || '').replace(/^\/+/, '');
      if (!pathname) return '';
      return path.join(CWD, 'public', pathname);
    } catch {
      return '';
    }
  }

  if (path.isAbsolute(raw)) return raw;
  if (raw.startsWith('/')) {
    return path.join(CWD, 'public', raw.replace(/^\/+/, ''));
  }

  return path.resolve(CWD, raw);
}

function sniffImageHeader(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
    buffer.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
  ) {
    return 'image/webp';
  }
  return null;
}

async function listPostsForHero() {
  const directories = resolvePostsDirectories({ root: CWD });
  const itemsBySlug = new Map();

  for (const postsDir of directories) {
    let entries = [];
    try {
      entries = await fsp.readdir(postsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.md')) continue;

      const file = path.join(postsDir, entry.name);
      const fileSlug = path.basename(entry.name, path.extname(entry.name));
      let slug = fileSlug;
      let title = fileSlug;

      try {
        const stats = await fsp.stat(file).catch(() => null);
        const createdMs =
          stats && Number.isFinite(stats.birthtimeMs) && stats.birthtimeMs > 0
            ? stats.birthtimeMs
            : stats && Number.isFinite(stats.mtimeMs)
            ? stats.mtimeMs
            : null;
        const createdAt =
          typeof createdMs === 'number' && Number.isFinite(createdMs)
            ? new Date(createdMs).toISOString()
            : null;
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
        const fmExcerpt = frontmatterString(parsed.data, 'excerpt');
        const fmMetaDescription = frontmatterString(parsed.data, 'metaDescription');
        const fmMood = frontmatterString(parsed.data, 'mood');
        const fmPublishedAt = frontmatterString(parsed.data, 'publishedAt');
        const fmPubDate = frontmatterString(parsed.data, 'pubDate');
        const fmTags = toStringArray(parsed.data?.tags);
        const fmDraft = parsed.data?.draft === true;

        if (!isValidSlug(slug)) continue;
        if (itemsBySlug.has(slug)) continue;

        itemsBySlug.set(slug, {
          slug,
          title,
          heroImagePrompt: fmPrompt || null,
          heroAlt: fmHeroAlt || null,
          heroImageAlt: fmLegacyAlt || null,
          heroImage: fmHeroImage || fmLegacyImage || null,
          excerpt: fmExcerpt || fmMetaDescription || '',
          metaDescription: fmMetaDescription || '',
          mood: fmMood || '',
          draft: fmDraft,
          publishedAt: fmPublishedAt || fmPubDate || null,
          pubDate: fmPubDate || fmPublishedAt || null,
          createdAt,
          tags: fmTags,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  const items = Array.from(itemsBySlug.values());
  items.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return items;
}

async function listDraftPosts() {
  const directories = resolvePostsDirectories({ root: CWD });
  const draftsBySlug = new Map();

  for (const postsDir of directories) {
    let entries = [];
    try {
      entries = await fsp.readdir(postsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.md')) continue;

      const file = path.join(postsDir, entry.name);
      const fileSlug = path.basename(entry.name, path.extname(entry.name));

      try {
        const raw = await fsp.readFile(file, 'utf8');
        const parsed = parseFrontmatter(raw);
        if (parsed?.data?.draft !== true) continue;

        const fmSlug = frontmatterString(parsed.data, 'slug');
        const slug = fmSlug && isValidSlug(fmSlug) ? fmSlug : fileSlug;
        if (!isValidSlug(slug) || draftsBySlug.has(slug)) continue;

        const excerpt = frontmatterString(parsed.data, 'excerpt');
        const publishedAt =
          frontmatterString(parsed.data, 'publishedAt') ||
          frontmatterString(parsed.data, 'pubDate') ||
          new Date().toISOString();
        const promptMetadata =
          parsed.data && typeof parsed.data.promptMetadata === 'object' && parsed.data.promptMetadata !== null
            ? parsed.data.promptMetadata
            : undefined;

        draftsBySlug.set(slug, {
          slug,
          title: frontmatterString(parsed.data, 'title') || 'Untitled',
          excerpt: excerpt || '',
          tags: toStringArray(parsed.data?.tags),
          wordCount: Number(parsed.data?.wordCount || 0),
          readingMinutes: Number(parsed.data?.readingMinutes || 1),
          publishedAt,
          filePath: path.relative(CWD, file).replace(/\\/g, '/'),
          promptMetadata,
        });
      } catch {
        // Skip unreadable draft files
      }
    }
  }

  const drafts = Array.from(draftsBySlug.values());
  drafts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return drafts;
}

async function attachHeroToPost({ slug, heroImage, heroAlt }) {
  const normalizedSlug = String(slug || '').trim();
  if (!isValidSlug(normalizedSlug)) {
    const err = new Error('Invalid slug');
    err.code = 'INVALID_SLUG';
    throw err;
  }

  const heroPath = String(heroImage || '').trim();
  if (!heroPath || !heroPath.startsWith(`/images/hero/${normalizedSlug}/`)) {
    const err = new Error('heroImage must point to the hero directory for this slug');
    err.code = 'INVALID_IMAGE';
    throw err;
  }

  const heroAltText = heroAlt == null ? '' : String(heroAlt).trim();
  const heroDiskPath = path.join(CWD, 'public', heroPath.replace(/^\//, ''));
  if (!fs.existsSync(heroDiskPath)) {
    const err = new Error('Hero image file was not found on disk');
    err.code = 'MISSING_FILE';
    throw err;
  }

  const found = findPostFileBySlug(normalizedSlug);
  if (!found) {
    const err = new Error('Post not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const raw = typeof found.raw === 'string' ? found.raw : await fsp.readFile(found.file, 'utf8');
  const fmMatch = /^---\s*?\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!fmMatch) {
    const err = new Error('Frontmatter missing from post');
    err.code = 'MISSING_FRONTMATTER';
    throw err;
  }

  const block = fmMatch[0];
  const frontmatterBody = fmMatch[1] ?? '';
  const newline = block.includes('\r\n') ? '\r\n' : '\n';
  const remainder = raw.slice(block.length);

  if (!block.startsWith('---')) {
    const err = new Error('Frontmatter opening delimiter is malformed');
    err.code = 'INVALID_FRONTMATTER';
    throw err;
  }

  const closingMarker = `${newline}---`;
  if (!block.endsWith('---') || block.lastIndexOf(closingMarker) === -1) {
    const err = new Error('Frontmatter closing delimiter is malformed');
    err.code = 'INVALID_FRONTMATTER';
    throw err;
  }

  const lines = frontmatterBody ? frontmatterBody.split(newline) : [];

  // Remove trailing empty strings that result from split() on strings ending with newlines
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  // Find specVersion to know where to insert hero fields (should go before specVersion if it exists)
  const specIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('specVersion:'));

  // Prepare the hero field lines to insert/update
  const heroImageLine = `heroImage: ${yq(heroPath)}`;
  const heroImageSrcLine = `heroImageSrc: ${yq(heroPath)}`;
  const heroAltLine = `heroAlt: ${yq(heroAltText)}`;

  function indentOf(line) {
    const match = typeof line === 'string' ? /^\s*/.exec(line) : null;
    return match ? match[0] : '';
  }

  // Find or create heroImage field
  let heroImageIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('heroImage:'));
  const heroImageIndent = heroImageIndex !== -1 ? indentOf(lines[heroImageIndex]) : '';

  if (heroImageIndex !== -1) {
    // Update existing heroImage line
    lines[heroImageIndex] = `${heroImageIndent}${heroImageLine}`;
  } else {
    // Insert new heroImage line before specVersion (if exists) or at end
    const insertIndex = specIndex === -1 ? lines.length : specIndex;
    lines.splice(insertIndex, 0, `${heroImageIndent}${heroImageLine}`);
    heroImageIndex = insertIndex;
  }

  let heroImageSrcIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('heroImageSrc:'));
  const heroImageSrcIndent = heroImageSrcIndex !== -1 ? indentOf(lines[heroImageSrcIndex]) : heroImageIndent;
  if (heroImageSrcIndex !== -1) {
    lines[heroImageSrcIndex] = `${heroImageSrcIndent}${heroImageSrcLine}`;
  } else {
    const baseIndex = heroImageIndex >= 0 ? heroImageIndex + 1 : (specIndex === -1 ? lines.length : specIndex);
    lines.splice(baseIndex, 0, `${heroImageSrcIndent}${heroImageSrcLine}`);
    heroImageSrcIndex = baseIndex;
  }

  let heroAltIndex = lines.findIndex((line) => typeof line === 'string' && line.trim().startsWith('heroAlt:'));
  const heroAltIndent = heroAltIndex !== -1 ? indentOf(lines[heroAltIndex]) : heroImageIndent;
  if (heroAltIndex !== -1) {
    lines[heroAltIndex] = `${heroAltIndent}${heroAltLine}`;
  } else {
    const insertIndex = heroImageSrcIndex >= 0 ? heroImageSrcIndex + 1 : (specIndex === -1 ? lines.length : specIndex);
    lines.splice(insertIndex, 0, `${heroAltIndent}${heroAltLine}`);
    heroAltIndex = insertIndex;
  }

  const updatedFrontmatter = lines.join(newline);

  // Validate that we still have essential frontmatter (title should not be lost)
  const hasTitle = lines.some((line) => typeof line === 'string' && line.trim().startsWith('title:'));
  const hasSlug = lines.some((line) => typeof line === 'string' && line.trim().startsWith('slug:'));

  if (!hasTitle && found.data?.title) {
    const err = new Error('Critical error: title field would be lost during hero image update');
    err.code = 'FRONTMATTER_CORRUPTION';
    throw err;
  }

  if (!hasSlug && found.data?.slug) {
    const err = new Error('Critical error: slug field would be lost during hero image update');
    err.code = 'FRONTMATTER_CORRUPTION';
    throw err;
  }

  const nextBlock = `---${newline}${updatedFrontmatter}${newline}---`;

  // Ensure remainder starts with proper newline spacing
  // The regex captures everything after the closing ---, which should start with a newline
  // If remainder doesn't start with newline, add one to separate frontmatter from content
  const cleanRemainder = remainder.startsWith('\n') || remainder.startsWith('\r') ? remainder : `${newline}${remainder}`;
  const next = `${nextBlock}${cleanRemainder}`;

  if (next !== raw) {
    await withLock(`post:${normalizedSlug}`, () => writeFileAtomic(found.file, next, 'utf8'));
  }

  return { path: path.relative(CWD, found.file).replace(/\\/g, '/') };
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

async function loadPostForEditor(slug) {
  if (!isValidSlug(slug)) {
    throw new Error('Invalid slug');
  }
  const found = findPostFileBySlug(slug);
  if (!found) {
    const err = new Error('Post not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const relativePath = path.relative(CWD, found.file).replace(/\\/g, '/');
  const newline = /\r\n/.test(found.raw || '') ? '\r\n' : '\n';
  const frontmatter = Array.isArray(found.lines) ? found.lines.join('\n') : '';
  const markdown = typeof found.rest === 'string' ? found.rest.replace(/\r\n?/g, '\n') : '';
  let stats = null;
  try {
    stats = await fsp.stat(found.file);
  } catch {
    stats = null;
  }
  return {
    slug,
    title: frontmatterString(found.data, 'title') || slug,
    frontmatter,
    markdown,
    path: relativePath,
    newline,
    updatedAt: stats?.mtime ? stats.mtime.toISOString() : null,
  };
}

async function updatePostFromEditor(payload) {
  const originalSlug = slugify(String(payload?.originalSlug || ''));
  if (!originalSlug) {
    throw new Error('originalSlug is required');
  }

  const found = findPostFileBySlug(originalSlug);
  if (!found) {
    const err = new Error('Post not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const newline = /\r\n/.test(found.raw || '') ? '\r\n' : '\n';
  const frontmatterInput = typeof payload.frontmatter === 'string' ? payload.frontmatter : '';
  const markdownInput = typeof payload.markdown === 'string' ? payload.markdown : '';

  const frontmatterNormalized = frontmatterInput.replace(/\r\n?/g, '\n').trimEnd();
  const markdownNormalized = markdownInput.replace(/\r\n?/g, '\n');

  let parsed;
  try {
    parsed = parseFrontmatter(`---\n${frontmatterNormalized}\n---\n${markdownNormalized}`);
  } catch (err) {
    const error = new Error(`Frontmatter parse failed: ${err?.message || String(err)}`);
    error.code = 'PARSE_ERROR';
    throw error;
  }

  const rawSlug = frontmatterString(parsed.data, 'slug');
  const normalizedSlug = slugify(rawSlug);
  if (!normalizedSlug) {
    throw new Error('Frontmatter slug is required');
  }
  if (!isValidSlug(normalizedSlug)) {
    throw new Error(`Frontmatter slug is invalid: ${normalizedSlug}`);
  }

  const slugWarnings = [];
  if (rawSlug !== normalizedSlug) {
    slugWarnings.push(`Slug normalized to ${normalizedSlug}`);
  }

  const directories = listPostDirsForCollisions();
  if (normalizedSlug !== originalSlug) {
    for (const dir of directories) {
      const candidate = path.join(dir, `${normalizedSlug}.md`);
      if (fs.existsSync(candidate) && path.resolve(candidate) !== path.resolve(found.file)) {
        const err = new Error(`Another post already uses the slug "${normalizedSlug}".`);
        err.code = 'SLUG_CONFLICT';
        throw err;
      }
    }
  }

  const fmLines = frontmatterNormalized.split('\n');
  const slugLine = `slug: ${normalizedSlug}`;
  const slugIndex = fmLines.findIndex((line) => line.trim().toLowerCase().startsWith('slug:'));
  if (slugIndex === -1) {
    const titleIndex = fmLines.findIndex((line) => line.trim().toLowerCase().startsWith('title:'));
    const insertAt = titleIndex === -1 ? 0 : titleIndex + 1;
    fmLines.splice(insertAt, 0, slugLine);
  } else {
    const indent = fmLines[slugIndex].match(/^\s*/)?.[0] || '';
    fmLines[slugIndex] = `${indent}${slugLine}`;
  }

  const frontmatterForWrite = fmLines.join('\n').replace(/\s+$/, '');
  let bodyForWrite = markdownNormalized;
  if (bodyForWrite && !bodyForWrite.endsWith('\n')) {
    bodyForWrite += '\n';
  }
  const fmBlock = frontmatterForWrite.replace(/\n/g, newline);
  const bodyBlock = bodyForWrite.replace(/\n/g, newline);
  const fileContents = `---${newline}${fmBlock ? `${fmBlock}${newline}` : ''}---${newline}${bodyBlock}`;

  const nextSlug = normalizedSlug;
  let targetFile = found.file;
  if (nextSlug !== originalSlug) {
    const nextFile = path.join(path.dirname(found.file), `${nextSlug}.md`);
    await withLock(`post:${nextSlug}`, () => writeFileAtomic(nextFile, fileContents, 'utf8'));
    await fsp.unlink(found.file);
    targetFile = nextFile;
  } else {
    await withLock(`post:${nextSlug}`, () => writeFileAtomic(found.file, fileContents, 'utf8'));
  }

  const relativePath = path.relative(CWD, targetFile).replace(/\\/g, '/');
  return {
    slug: nextSlug,
    title: frontmatterString(parsed.data, 'title') || nextSlug,
    path: relativePath,
    renamed: targetFile !== found.file,
    warnings: slugWarnings,
  };
}

async function deletePostBySlug(slug) {
  if (!isValidSlug(slug)) {
    throw new Error('Invalid slug');
  }
  const found = findPostFileBySlug(slug);
  if (!found) {
    const err = new Error('Post not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await fsp.unlink(found.file);
  return {
    slug,
    path: path.relative(CWD, found.file).replace(/\\/g, '/'),
  };
}

function resolvePrimaryPostsDir() {
  const [first] = listPostDirsForCollisions();
  return first || path.join(CWD, 'content', 'posts');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        const err = new Error(`Payload too large (${size} > ${MAX_BODY_BYTES})`);
        err.status = 413;
        return reject(err);
      }
      buf += typeof chunk === 'string' ? chunk : chunk.toString();
    });
    req.on('end', () => {
      req._observedBodySize = size;
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

function assertMaxLen(label, value, max) {
  if (typeof value === 'string' && value.length > max) {
    throw new Error(`${label} exceeds ${max} characters`);
  }
}

// ---------- GENPROMPT (shared with CLI) ----------
function buildGenprompt({ topic, words, ads, kofi, contentType, styleDirective }) {
  const context = loadPromptContext({ cwd: CWD });
  const allowed = Array.isArray(context.allowedAffiliateKeys)
    ? context.allowedAffiliateKeys
    : [];
  const existingTitles = Array.isArray(context.existingPostTitles)
    ? context.existingPostTitles
    : [];
  const mergedSlugs = Array.isArray(context.existingPostSlugs)
    ? context.existingPostSlugs
    : [];

  return buildMasterPrompt({
    topic,
    words,
    contentType,
    styleDirective,
    ads,
    kofi,
    brandName: context.brandName ?? 'WitchClick',
    siteUrl: context.siteUrl ?? 'https://example.com',
    existingPostTitles: existingTitles,
    existingPostSlugs: mergedSlugs,
    allowedAffiliateKeys: allowed,
    engagementSignals: context.engagementSignals,
  });
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
  assertMaxLen('title', title, 140);
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
  if (tags.length < 4 || tags.length > 7) {
    throw new Error(`tags count must be between 4 and 7 (got ${tags.length})`);
  }
  tags.forEach((tag) => assertMaxLen('tag', tag, 40));

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
  assertMaxLen('markdown', markdown, 20000);

  const warnings = [];
  const { value: excerpt, auto: excerptAuto } = generateExcerpt(markdown, payload.excerpt);
  const { value: metaDescription, auto: metaAuto } = generateMetaDescription(
    markdown,
    payload.metaDescription,
    excerpt || markdown,
  );
  assertMaxLen('excerpt', excerpt, 300);
  assertMaxLen('metaDescription', metaDescription, 300);
  if (excerptAuto && excerpt) warnings.push('Excerpt auto-generated from Markdown.');
  if (metaAuto && metaDescription) warnings.push('Meta description auto-generated from Markdown.');

  const readingMinutes = Math.max(1, Math.round(wordCount(markdown)/200));
  const category = String(payload.category || 'meandering').trim();
  const tldr = payload.tldr ? String(payload.tldr).trim() : '';
  const spoons = payload.spoons ? String(payload.spoons).trim() : '';

  const fm = [
    '---',
    `title: ${yq(title)}`,
    `slug: ${slug}`,
    `description: ${yq(excerpt)}`,
    `metaTitle: ${yq(title)}`,
    `metaDescription: ${yq(metaDescription)}`,
    `tags: ${ya(tags)}`,
    `category: ${category}`,
    `readingMinutes: ${readingMinutes}`,
    tldr ? `tldr: ${yq(tldr)}` : null,
    spoons ? `spoons: ${spoons}` : null,
    serializeEntities(entities),
    `includeAds: ${includeAds ? 'true' : 'false'}`,
    `includeKofi: ${includeKofi ? 'true' : 'false'}`,
    `affiliateAnchors: []`,
    `internalLinks: []`,
    `publishedAt: ${yq(new Date().toISOString())}`,
    `canonicalUrl: ${yq(canonical)}`,
    'specVersion: 2',
    '---'
  ].filter(line => line !== null).join('\n');

  const filePath = path.join(postsDir, `${slug}.md`);
  const contents = `${fm}\n${markdown}\n`;
  await withLock(`post:${slug}`, () => writeFileAtomic(filePath, contents, 'utf8'));

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

// ---------- THEMES ----------
async function listThemes() {
  ensureDir(THEMES_DIR);
  let files = [];
  try {
    files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json') && f !== 'active.json');
  } catch {
    files = [];
  }

  const items = { midnight: [], dawn: [] };
  for (const file of files) {
    const filePath = path.join(THEMES_DIR, file);
    try {
      const theme = readThemeRecord(filePath);
      items[theme.mode].push(theme);
    } catch {
      // ignore malformed theme files
    }
  }

  items.midnight.sort((a, b) => {
    // Sort by category first, then by label
    const catCompare = (a.category || 'custom').localeCompare(b.category || 'custom');
    if (catCompare !== 0) return catCompare;
    return a.label.localeCompare(b.label);
  });
  items.dawn.sort((a, b) => {
    const catCompare = (a.category || 'custom').localeCompare(b.category || 'custom');
    if (catCompare !== 0) return catCompare;
    return a.label.localeCompare(b.label);
  });

  const active = readActiveThemeMapping();
  return { items, active };
}

async function saveThemeRecord(payload) {
  const mode = normalizeThemeMode(payload?.mode);
  const label = typeof payload?.label === 'string' ? payload.label.trim() : '';
  const slugInput = typeof payload?.slug === 'string' ? payload.slug : '';
  const slug = slugify(slugInput || label);
  if (!slug) throw new Error('label or slug required');

  const category = typeof payload?.category === 'string' ? payload.category.trim() : 'custom';

  const settingsSource = {
    ...extractThemeValues(payload),
    ...extractThemeValues(payload?.settings),
  };

  const settings = mergeThemeSettings(settingsSource, mode, `theme payload (${slug})`);

  // Extract and validate overrides if provided
  let overrides;
  if (payload?.overrides && Array.isArray(payload.overrides)) {
    overrides = payload.overrides
      .filter((override) => override && typeof override.scope === 'string' && override.scope.trim())
      .map((override) => ({
        scope: override.scope.trim(),
        variables: extractThemeValues(override.variables || {}),
      }))
      .filter((override) => Object.keys(override.variables).length > 0);

    // Only include overrides if there are any valid ones
    if (overrides.length === 0) {
      overrides = undefined;
    }
  }

  const record = {
    slug,
    label: label || toTitleCase(slug),
    mode,
    category,
    settings,
  };

  // Add overrides to record if they exist
  if (overrides) {
    record.overrides = overrides;
  }

  ensureDir(THEMES_DIR);
  const filePath = path.join(THEMES_DIR, `${slug}.json`);
  await fsp.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');

  const _active = readActiveThemeMapping();
  resetThemeCache();
  return record;
}

async function setActiveThemeRecord(payload) {
  const mode = normalizeThemeMode(payload?.mode);
  const slug = typeof payload?.slug === 'string' ? payload.slug.trim() : '';
  if (!slug) throw new Error('slug required');

  const filePath = path.join(THEMES_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) throw new Error('theme not found');

  const theme = readThemeRecord(filePath);
  if (theme.mode !== mode) {
    throw new Error(`Theme ${theme.slug} is configured for ${theme.mode}, not ${mode}.`);
  }

  const active = readActiveThemeMapping();
  const next = {
    midnight: active.midnight,
    dawn: active.dawn,
  };
  next[mode] = theme.slug;

  ensureDir(THEMES_DIR);
  await fsp.writeFile(ACTIVE_THEME_FILE, JSON.stringify(next, null, 2), 'utf8');

  resetThemeCache();
  return { active: next, theme };
}

async function deleteThemeRecord(payload) {
  const slug = typeof payload?.slug === 'string' ? payload.slug.trim() : '';
  if (!slug) throw new Error('slug required');

  const filePath = path.join(THEMES_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) throw new Error('theme not found');

  const theme = readThemeRecord(filePath);
  await fsp.unlink(filePath);

  const active = readActiveThemeMapping();
  const next = {
    midnight: active.midnight,
    dawn: active.dawn,
  };

  if (next.midnight === slug && theme.mode === 'midnight') {
    next.midnight = null;
  }
  if (next.dawn === slug && theme.mode === 'dawn') {
    next.dawn = null;
  }

  if (next.midnight !== active.midnight || next.dawn !== active.dawn) {
    ensureDir(THEMES_DIR);
    await fsp.writeFile(ACTIVE_THEME_FILE, JSON.stringify(next, null, 2), 'utf8');
  }

  resetThemeCache();
  return { slug, mode: theme.mode, active: next };
}

function readThemeRecord(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('Invalid theme file');

  const slugRaw = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  const slug = slugRaw || path.basename(filePath, path.extname(filePath));
  const mode = normalizeThemeMode(raw.mode);
  const labelRaw = typeof raw.label === 'string' ? raw.label.trim() : '';
  const label = labelRaw || toTitleCase(slug);
  const category = typeof raw.category === 'string' ? raw.category.trim() : 'custom';
  const settingsSource = {
    ...extractThemeValues(raw),
    ...extractThemeValues(raw.settings),
  };
  const settings = mergeThemeSettings(settingsSource, mode, filePath);

  const record = { slug, label, mode, category, settings };

  // Include overrides if they exist in the file
  if (raw.overrides && Array.isArray(raw.overrides) && raw.overrides.length > 0) {
    record.overrides = raw.overrides;
  }

  return record;
}

function readActiveThemeMapping() {
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIVE_THEME_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return { midnight: null, dawn: null };
    const midnight = typeof raw.midnight === 'string' ? raw.midnight.trim() : '';
    const dawn = typeof raw.dawn === 'string' ? raw.dawn.trim() : '';
    return {
      midnight: midnight || null,
      dawn: dawn || null,
    };
  } catch {
    return { midnight: null, dawn: null };
  }
}

function extractThemeValues(source) {
  const values = {};
  if (!source || typeof source !== 'object') return values;
  const allFields = THEME_ALL_FIELDS;
  for (const key of allFields) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      values[key] = value;
    }
  }
  return values;
}

function mergeThemeSettings(raw, mode, sourceName) {
  const base = { ...DEFAULT_THEME_SETTINGS[mode] };
  if (!base) {
    throw new Error(`Unknown theme mode: ${mode}`);
  }

  const allFields = THEME_ALL_FIELDS;
  const entries = raw && typeof raw === 'object' ? Object.entries(raw) : [];
  for (const [key, value] of entries) {
    if (!allFields.includes(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') {
      throw new Error(`[themes] ${key} in ${sourceName} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      if (THEME_REQUIRED_FIELDS.includes(key)) {
        throw new Error(`[themes] ${key} in ${sourceName} cannot be empty.`);
      }
      continue; // Skip empty optional fields
    }
    base[key] = trimmed;
  }

  const missing = THEME_REQUIRED_FIELDS.filter((key) => !base[key] || !String(base[key]).trim());
  if (missing.length) {
    throw new Error(`[themes] Missing values for ${missing.join(', ')} in ${sourceName}.`);
  }

  const result = {
    primary: base.primary,
    accent: base.accent,
    background: base.background,
    fontSerif: base.fontSerif,
    fontScript: base.fontScript,
  };

  // Add optional fields if present
  THEME_OPTIONAL_FIELDS.forEach((key) => {
    if (base[key] && String(base[key]).trim()) {
      result[key] = base[key];
    }
  });

  return result;
}

function normalizeThemeMode(value) {
  return value === 'dawn' ? 'dawn' : 'midnight';
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  assertMaxLen('download name', name || s, 140);
  assertMaxLen('download summary', summary || '', 400);
  const filePath = path.join(CWD, 'content', 'downloads', `${s}.json`);
  ensureDir(path.dirname(filePath));

  const coverPath = String(cover || '').trim();
  if (coverPath && !coverPath.startsWith(`/downloads/${s}/`)) {
    throw new Error('cover path must live under /downloads/<slug>/');
  }
  if (coverPath) {
    const disk = path.join(CWD, 'public', coverPath.replace(/^\//, ''));
    if (!fs.existsSync(disk)) throw new Error('cover file missing on disk');
  }

  const fileRef = String(file || '').trim();
  if (fileRef && !fileRef.startsWith(`/downloads/${s}/`)) {
    throw new Error('file path must live under /downloads/<slug>/');
  }
  if (fileRef) {
    const disk = path.join(CWD, 'public', fileRef.replace(/^\//, ''));
    if (!fs.existsSync(disk)) throw new Error('download file missing on disk');
  }

  const payload = {
    slug: s,
    name: String(name || '').trim() || s.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase()),
    price: price == null ? '' : String(price),
    currency: String(currency || 'USD').trim() || 'USD',
    summary: String(summary || ''),
    cover: coverPath,
    file: fileRef,
    url: String(url || ''),
    features: Array.isArray(features) ? features.map(v => String(v)).filter(Boolean) : [],
    tags: Array.isArray(tags) ? tags.map(v => String(v)).filter(Boolean) : []
  };

  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { path: `content/downloads/${s}.json`, slug: s };
}

async function deleteDownload({ slug, archive }) {
  if (!slug) throw new Error('slug is required');
  const s = slugify(slug);
  if (!s) throw new Error('invalid slug');
  const filePath = path.join(CWD, 'content', 'downloads', `${s}.json`);
  if (!fs.existsSync(filePath)) throw new Error('not found');

  if (archive) {
    const archiveDir = path.join(CWD, 'content', 'downloads', '_archive');
    ensureDir(archiveDir);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetName = `${s}-${stamp}.json`;
    const archivePath = path.join(archiveDir, targetName);
    await fsp.rename(filePath, archivePath);
    return { slug: s, archivePath: `content/downloads/_archive/${targetName}` };
  }

  await fsp.unlink(filePath);
  return { slug: s, deletedPath: `content/downloads/${s}.json` };
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
          summary: j.summary || '',
          status: isStubSummary(j.summary) ? 'stub' : 'published'
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
  assertMaxLen('entity name', name || s, 140);
  assertMaxLen('entity summary', summary || '', 400);
  const file = path.join(CWD, 'content', 'entities', String(type), `${s}.json`);
  let wasStub = false;
  if (fs.existsSync(file)) {
    try {
      const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
      wasStub = isStubSummary(existing?.summary);
    } catch {
      wasStub = false;
    }
  }
  ensureDir(path.dirname(file));
  const props = properties && typeof properties === 'object' && !Array.isArray(properties) ? properties : {};
  const propsJson = JSON.stringify(props);
  if (propsJson.length > 4000) throw new Error('properties too large');
  const payload = {
    type: String(type),
    slug: s,
    name: String(name || '').trim() || s.replace(/-/g,' ').replace(/\b\w/g, m=>m.toUpperCase()),
    summary: String(summary || ''),
    properties: props,
    related: Array.isArray(related) ? related.map(String) : []
  };
  await fsp.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  const isNowStub = isStubSummary(payload.summary);
  let notified = [];
  if (wasStub && !isNowStub) {
    const result = await notifyEntitySubscribers({
      type: String(type),
      slug: s,
      name: payload.name,
      summary: payload.summary,
    });
    notified = result.notified;
  }
  return { path: `content/entities/${type}/${s}.json`, slug: s, type, notified };
}

async function deleteEntity({ type, slug }) {
  if (!type || !slug) throw new Error('type and slug are required');
  const normalizedType = String(type);
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) throw new Error('invalid slug');
  const file = path.join(CWD, 'content', 'entities', normalizedType, `${normalizedSlug}.json`);
  if (!fs.existsSync(file)) throw new Error('not found');
  await fsp.unlink(file);
  return { type: normalizedType, slug: normalizedSlug, deletedPath: `content/entities/${normalizedType}/${normalizedSlug}.json` };
}

function isStubSummary(value) {
  const summary = typeof value === 'string' ? value.trim() : '';
  return !summary || /stub/i.test(summary);
}

function getEntityStubStatus(type, slug) {
  if (!type || !slug) return 'missing';
  const file = path.join(CWD, 'content', 'entities', String(type), `${String(slug)}.json`);
  if (!fs.existsSync(file)) return 'missing';
  try {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isStubSummary(existing?.summary) ? 'stub' : 'complete';
  } catch {
    return 'missing';
  }
}

function readEntitySubscriptions() {
  const data = readJSON(ENTITY_SUBSCRIPTIONS_PATH);
  if (data && typeof data === 'object' && data.entities) return data;
  return { entities: {}, updatedAt: null };
}

function writeEntitySubscriptions(data) {
  ensureDir(path.dirname(ENTITY_SUBSCRIPTIONS_PATH));
  return writeFileAtomic(ENTITY_SUBSCRIPTIONS_PATH, JSON.stringify(data, null, 2));
}

function readEntityNotifications() {
  const data = readJSON(ENTITY_NOTIFICATIONS_PATH);
  if (data && typeof data === 'object' && Array.isArray(data.notifications)) return data;
  return { notifications: [] };
}

function writeEntityNotifications(data) {
  ensureDir(path.dirname(ENTITY_NOTIFICATIONS_PATH));
  return writeFileAtomic(ENTITY_NOTIFICATIONS_PATH, JSON.stringify(data, null, 2));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

async function subscribeToEntity({ type, slug, email, source }) {
  if (!type || !slug) throw new Error('type and slug are required');
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('email is required');
  if (!isValidEmail(normalizedEmail)) throw new Error('invalid email');

  const status = getEntityStubStatus(type, slug);
  if (status === 'complete') {
    return { status: 'complete' };
  }

  const data = readEntitySubscriptions();
  const key = `${type}:${slug}`;
  const now = new Date().toISOString();
  const entry = data.entities[key] || { type, slug, subscribers: [] };
  const already = entry.subscribers.some((subscriber) => subscriber.email === normalizedEmail);
  if (!already) {
    entry.subscribers.push({
      email: normalizedEmail,
      createdAt: now,
      source: String(source || 'entity-stub'),
    });
    data.entities[key] = entry;
    data.updatedAt = now;
    await writeEntitySubscriptions(data);
  }

  return { status: already ? 'existing' : 'subscribed' };
}

async function notifyEntitySubscribers({ type, slug, name, summary }) {
  const data = readEntitySubscriptions();
  const key = `${type}:${slug}`;
  const entry = data.entities[key];
  if (!entry || !Array.isArray(entry.subscribers) || entry.subscribers.length === 0) {
    return { notified: [] };
  }

  const outbox = readEntityNotifications();
  const now = new Date().toISOString();
  const notified = [];

  entry.subscribers.forEach((subscriber) => {
    if (subscriber.notifiedAt) return;
    subscriber.notifiedAt = now;
    notified.push(subscriber.email);
    outbox.notifications.push({
      email: subscriber.email,
      type,
      slug,
      name: String(name || slug),
      summary: String(summary || ''),
      sentAt: now,
    });
  });

  if (notified.length) {
    data.entities[key] = entry;
    data.updatedAt = now;
    await writeEntitySubscriptions(data);
    await writeEntityNotifications(outbox);
    console.log('[dev-api:notify]', { type, slug, notified });
  }

  return { notified };
}

function getObservedSize(req) {
  if (typeof req._observedBodySize === 'number' && Number.isFinite(req._observedBodySize)) {
    return req._observedBodySize;
  }
  const header = req.headers?.['content-length'];
  if (!header) return 0;
  const first = Array.isArray(header) ? header[0] : header;
  const parsed = Number.parseInt(first, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function logRequestError(req, error, status) {
  const method = req.method || 'UNKNOWN';
  const route = req.url || '';
  const size = getObservedSize(req);
  const stack = error && typeof error === 'object' && 'stack' in error ? error.stack : undefined;
  const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
  console.error('[dev-api:error]', {
    method,
    route,
    status,
    inputSize: size,
    message,
    stack,
  });
}

async function withRequestBoundary(req, res, handler) {
  try {
    await handler();
  } catch (error) {
    const status = typeof error?.statusCode === 'number'
      ? error.statusCode
      : typeof error?.status === 'number'
        ? error.status
        : 500;

    logRequestError(req, error, status);

    if (!res.headersSent) {
      const payload = { ok: false, error: error?.message || String(error) };
      if (Array.isArray(error?.errors)) {
        payload.errors = error.errors;
      }
      if (Array.isArray(error?.warnings)) {
        payload.warnings = error.warnings;
      }
      send(res, status, payload);
    } else {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------- HTTP SERVER ----------
  const server = http.createServer(async (req, res) => {
    await withRequestBoundary(req, res, async () => {
      parsedUrl = null;
    const startTime = Date.now();
    if (typeof res.on === 'function') {
      res.on('finish', () => {
        logRequest(req, res.statusCode, Date.now() - startTime);
      });
    }

    const remote = req.socket?.remoteAddress || '';
    const route = req.url || '';
    const isPublicEndpoint = PUBLIC_ENDPOINTS.has(route);
    const loopback = remote === '127.0.0.1' || remote === '::1' || remote.startsWith('::ffff:127.');

    if (!isPublicEndpoint) {
      if (!loopback && !DEV_API_TOKEN) {
        return send(res, 403, { ok: false, error: 'Forbidden (dev API is loopback-only without DEV_API_TOKEN)' });
      }
      if (DEV_API_TOKEN) {
        const token = req.headers['x-wc-dev-key'] || req.headers['authorization'];
        const tokenValue = Array.isArray(token) ? token[0] : (token || '').replace(/^Bearer\\s+/i, '');
        if (tokenValue !== DEV_API_TOKEN) {
          return send(res, 401, { ok: false, error: 'Unauthorized' });
        }
      }
    }

    if (req.method === 'OPTIONS') return send(res, 204, { ok: true });

    const rateResult = checkRateLimit(remote || 'unknown', route);
    if (!rateResult.ok) {
      return send(res, 429, {
        ok: false,
        error: 'Rate limit exceeded',
        resetAt: new Date(rateResult.resetAt).toISOString(),
      });
    }

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
      const resolvedModeKey = resolveGeneratorPresetKey(rawMode) ?? '';
      const rawStyle = typeof body.style === 'string' ? body.style.trim() : '';
      const styleKey = rawStyle.toLowerCase();
      const styleDirective = generatorStyles[styleKey] || generatorStyles.cozy;
      const resolvedStyleKey = generatorStyles[styleKey] ? styleKey : 'cozy';
      const strict = body.strict === true || body.strict === 'true';
      const prompt = buildGenprompt({
        topic,
        words,
        ads,
        kofi,
        contentType: resolvedModeKey || undefined,
        styleDirective,
      });

      if (!prompt.includes('opening-reflection') || !prompt.includes('INPUTS')) {
        return send(res, 500, { ok: false, error: 'Stale prompt detected (missing Opening Reflection guards). Check dev-api.js.' });
      }
      return send(res, 200, {
        ok: true,
        prompt,
        options: { topic, mode: rawMode || null, style: resolvedStyleKey, strict, contentType: resolvedModeKey || null }
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
      const topic = typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : undefined;
      const sigilName = typeof body.sigilName === 'string' && body.sigilName.trim() ? body.sigilName.trim() : undefined;
      const altarItem = typeof body.altarItem === 'string' && body.altarItem.trim() ? body.altarItem.trim() : undefined;
      const journalingFollowUp = typeof body.journalingFollowUp === 'string' && body.journalingFollowUp.trim()
        ? body.journalingFollowUp.trim()
        : undefined;

      const prompt = buildCursePrompt({
        type,
        target,
        tone,
        topic,
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
        options: { type, target, tone, topic: topic ?? null, sigilName: sigilName ?? null, altarItem: altarItem ?? null, journalingFollowUp: journalingFollowUp ?? null },
      });
    }

    if (req.method === 'POST') {
      parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
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

        const queryDraft = (() => {
          const flag = parsedUrl.searchParams.get('draft');
          return flag === 'true' || flag === '1';
        })();
        const bodyDraft = typeof payload === 'object' && payload
          ? payload._draft === true || payload._draft === 'true'
          : false;
        const isDraft = queryDraft || bodyDraft;

        let rawSpec;
        if (payload && typeof payload === 'object' && payload.spec && typeof payload.spec === 'object') {
          rawSpec = payload.spec;
        } else if (payload && typeof payload === 'object') {
          const clone = { ...payload };
          delete clone.dryRun;
          delete clone._draft;
          rawSpec = clone;
        } else {
          rawSpec = payload;
        }

        if (rawSpec && typeof rawSpec === 'object' && !Array.isArray(rawSpec) && 'dryRun' in rawSpec) {
          rawSpec = { ...rawSpec };
          delete rawSpec.dryRun;
        }

        try {
          const ingestion = await executeIngest(rawSpec || {}, {
            cwd: CWD,
            postsDirectories: listPostDirsForCollisions(),
            dryRun,
            draft: isDraft,
            forceCategory: 'ritual', // Generator posts are always ritual category
          });
          const { prepared, persistence } = ingestion;
          const relativePath = path.relative(CWD, prepared.post.filePath).replace(/\\/g, '/');

          // Format post stubs for response
          const postStubs = Array.isArray(prepared.postStubs) && prepared.postStubs.length
            ? prepared.postStubs.map(stub => ({
                slug: stub.slug,
                title: stub.title,
                path: path.relative(CWD, stub.file).replace(/\\/g, '/')
              }))
            : [];

          const createdPosts = persistence && Array.isArray(persistence.createdPosts) && persistence.createdPosts.length
            ? persistence.createdPosts.map(file => path.relative(CWD, file).replace(/\\/g, '/'))
            : [];

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
            postStubs,
            createdPosts,
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

    const urlForRouting = parsedUrl ?? new URL(req.url || '', `http://localhost:${PORT}`);
    const pathname = urlForRouting.pathname;

    if (!IS_PRODUCTION && req.method === 'POST' && (req.url === '/tumblr-push' || pathname === '/tumblr-push')) {
      try {
        const body = await parseBody(req);
        const payload = body && typeof body === 'object' ? body : {};
        const slug = slugify(payload.slug || '');
        const title = String(payload.title || '').trim();
        const excerpt = String(payload.excerpt || '').trim();
        const url = String(payload.url || '').trim();
        const heroImageInput = String(payload.heroImage || '').trim();
        const heroImage = resolveTumblrHeroImagePath(heroImageInput);
        const tags = Array.isArray(payload.tags) ? payload.tags : [];

        console.log('[dev-api]', {
          route: '/tumblr-push',
          action: 'attempt',
          slug,
          title: title || null,
          heroImage: heroImage || null,
          tagsCount: tags.length,
        });

        const result = await pushToTumblr({
          title,
          excerpt,
          url,
          heroImage,
          tags,
        });

        console.log('[dev-api]', {
          route: '/tumblr-push',
          action: 'success',
          slug,
          postUrl: result.postUrl,
        });

        return send(res, 200, { ok: true, postUrl: result.postUrl });
      } catch (e) {
        const errorMessage = e?.message || String(e);
        console.error('[dev-api]', {
          route: '/tumblr-push',
          action: 'failure',
          error: errorMessage,
        });
        return send(res, 500, { ok: false, error: errorMessage });
      }
    }

    if (req.method === 'POST' && (req.url === '/posts/list' || pathname === '/posts/list')) {
      try {
        const items = await listPostsForHero();
        return send(res, 200, { ok: true, items });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/staging/list' || pathname === '/staging/list')) {
      try {
        const drafts = await listDraftPosts();
        return send(res, 200, { ok: true, drafts });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/posts/load' || pathname === '/posts/load')) {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug ?? '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const data = await loadPostForEditor(slug);
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : e?.code === 'PARSE_ERROR' ? 400 : 500;
        return send(res, status, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/posts/update' || pathname === '/posts/update')) {
      try {
        const body = await parseBody(req);
        const data = await updatePostFromEditor(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : e?.code === 'SLUG_CONFLICT' ? 409 : 400;
        return send(res, status, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/posts/delete' || pathname === '/posts/delete')) {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const data = await deletePostBySlug(slug);
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : 400;
        return send(res, status, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/curses/list' || pathname === '/curses/list')) {
      try {
        const items = listCursesForEditor();
        return send(res, 200, { ok: true, items });
      } catch (e) {
        console.error('[curses/list] failed:', e);
        return send(res, 200, { ok: false, error: e?.message || String(e), items: [] });
      }
    }

    if (req.method === 'POST' && (req.url === '/curses/load' || pathname === '/curses/load')) {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const data = await loadCurseForEditor(slug);
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : e?.code === 'PARSE_ERROR' ? 400 : 500;
        return send(res, status, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/curses/save' || pathname === '/curses/save')) {
      try {
        const body = await parseBody(req);
        const data = await saveCurseFromEditor(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : e?.code === 'SLUG_CONFLICT' ? 409 : e?.code === 'PARSE_ERROR' ? 400 : 500;
        return send(res, status, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && (req.url === '/curses/delete' || pathname === '/curses/delete')) {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'Invalid slug' });
        }
        const data = await deleteCurseBySlug(slug);
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        const status = e?.code === 'NOT_FOUND' ? 404 : 400;
        return send(res, status, { ok: false, error: e?.message || String(e) });
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
        if (buffer.length > MAX_UPLOAD_BYTES) {
          return send(res, 413, { ok: false, error: `Image exceeds limit (${buffer.length} > ${MAX_UPLOAD_BYTES})` });
        }
        const sniffed = sniffImageHeader(buffer);
        if (sniffed && sniffed !== parsed.mime) {
          return send(res, 400, { ok: false, error: 'Image header mismatch' });
        }
        const targetDir = path.join(HERO_IMAGE_ROOT, slug);
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        const relativePath = `/images/hero/${slug}/${finalName}`.replace(/\\+/g, '/');
        await withLock(`hero:${slug}`, () => fsp.writeFile(filePath, buffer));
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
        const result = await attachHeroToPost({
          slug: body.slug,
          heroImage: body.heroImage,
          heroAlt: body.heroAlt,
        });
        return send(res, 200, { ok: true, path: result.path });
      } catch (e) {
        const code = e?.code;
        const status =
          code === 'NOT_FOUND'
            ? 404
            : code === 'INVALID_SLUG' || code === 'INVALID_IMAGE' || code === 'MISSING_FILE'
              ? 400
              : 500;
        return send(res, status, { ok: false, error: e?.message || String(e) });
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
        if (buffer.length > MAX_UPLOAD_BYTES) {
          return send(res, 413, { ok: false, error: `File exceeds limit (${buffer.length} > ${MAX_UPLOAD_BYTES})` });
        }

        const targetDir = path.join(DOWNLOADS_ROOT, slug, 'files');
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        await withLock(`download:${slug}`, () => fsp.writeFile(filePath, buffer));

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
        if (buffer.length > MAX_UPLOAD_BYTES) {
          return send(res, 413, { ok: false, error: `Image exceeds limit (${buffer.length} > ${MAX_UPLOAD_BYTES})` });
        }
        const sniffed = sniffImageHeader(buffer);
        if (sniffed && !sniffed.startsWith('image/')) {
          return send(res, 400, { ok: false, error: 'Invalid image header' });
        }

        const targetDir = path.join(DOWNLOADS_ROOT, slug, 'cover');
        ensureDir(targetDir);
        const finalName = ensureUniqueFilename(targetDir, base, ext);
        const filePath = path.join(targetDir, finalName);
        await withLock(`download:${slug}`, () => fsp.writeFile(filePath, buffer));

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

    if (req.method === 'POST' && req.url === '/color-tokens/get') {
      try {
        const data = await loadColorTokens();
        return send(res, 200, { ok: true, tokens: data.tokens, updatedAt: data.updatedAt });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/color-tokens/save') {
      try {
        const body = await parseBody(req);
        const state = await saveColorTokens(body || {});
        return send(res, 200, { ok: true, tokens: state.tokens, updatedAt: state.updatedAt });
      } catch (e) {
        return send(res, 400, { ok: false, error: e?.message || String(e) });
      }
    }

    // ---- Themes
    if (req.method === 'POST' && req.url === '/themes/list') {
      try {
        const data = await listThemes();
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/themes/save') {
      try {
        const body = await parseBody(req);
        const theme = await saveThemeRecord(body || {});
        return send(res, 200, { ok: true, theme });
      } catch (e) {
        return send(res, 400, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/themes/set-active') {
      try {
        const body = await parseBody(req);
        const data = await setActiveThemeRecord(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/themes/delete') {
      try {
        const body = await parseBody(req);
        const data = await deleteThemeRecord(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/upload/theme-background') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const parsed = parseImageDataUrl(body.contentBase64);
        if (!parsed) {
          return send(res, 400, { ok: false, error: 'contentBase64 must be a data:image/... URL' });
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
        ensureDir(THEME_BACKGROUNDS_ROOT);
        const finalName = ensureUniqueFilename(THEME_BACKGROUNDS_ROOT, base, ext);
        const filePath = path.join(THEME_BACKGROUNDS_ROOT, finalName);
        const relativePath = `/images/theme-backgrounds/${finalName}`.replace(/\\+/g, '/');
        await fsp.writeFile(filePath, buffer);
        return send(res, 200, { ok: true, path: relativePath });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/themes/list-backgrounds') {
      try {
        ensureDir(THEME_BACKGROUNDS_ROOT);
        let files = [];
        try {
          files = fs.readdirSync(THEME_BACKGROUNDS_ROOT);
        } catch {
          files = [];
        }
        const backgrounds = files
          .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .map((f) => ({
            filename: f,
            path: `/images/theme-backgrounds/${f}`.replace(/\\+/g, '/')
          }));
        return send(res, 200, { ok: true, backgrounds });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

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

    if (req.method === 'POST' && req.url === '/downloads/delete') {
      try {
        const body = await parseBody(req);
        const data = await deleteDownload(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Settings
    if (req.method === 'POST' && req.url === '/settings/get') {
      try {
        const settingsPath = path.join(CWD, 'content', 'settings.json');
        const settings = readJSON(settingsPath) || {};
        return send(res, 200, { ok: true, settings });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/settings/save') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid request body' });
        }

        const settingsPath = path.join(CWD, 'content', 'settings.json');
        const currentSettings = readJSON(settingsPath) || {};

        // Merge the updates with current settings
        const updatedSettings = {
          siteUrl: typeof body.siteUrl === 'string' ? body.siteUrl.trim() : currentSettings.siteUrl || 'https://witchclick.space',
          brandName: typeof body.brandName === 'string' ? body.brandName.trim() : currentSettings.brandName || 'WitchClick',
          disclosure: typeof body.disclosure === 'string' ? body.disclosure.trim() : currentSettings.disclosure || '',
          kofiUsername: typeof body.kofiUsername === 'string' ? body.kofiUsername.trim() : currentSettings.kofiUsername || '',
          showAccountLink: body.showAccountLink === true || body.showAccountLink === 'true',
          analytics: {
            ...(currentSettings.analytics || {}),
            enabled: body.analyticsEnabled === true || body.analyticsEnabled === 'true',
            provider: typeof body.analyticsProvider === 'string' ? body.analyticsProvider.trim() : (currentSettings.analytics?.provider || 'plausible'),
            domain: typeof body.analyticsDomain === 'string' ? body.analyticsDomain.trim() : (currentSettings.analytics?.domain || ''),
            apiHost: typeof body.analyticsApiHost === 'string' ? body.analyticsApiHost.trim() : (currentSettings.analytics?.apiHost || ''),
          },
          ads: {
            ...(currentSettings.ads || {}),
            provider: typeof body.adsProvider === 'string' ? body.adsProvider.trim() : (currentSettings.ads?.provider || 'adsense'),
            adsenseClientId: typeof body.adsenseClientId === 'string' ? body.adsenseClientId.trim() : (currentSettings.ads?.adsenseClientId || ''),
            sidebarSlotId: typeof body.sidebarSlotId === 'string' ? body.sidebarSlotId.trim() : (currentSettings.ads?.sidebarSlotId || ''),
            endSlotId: typeof body.endSlotId === 'string' ? body.endSlotId.trim() : (currentSettings.ads?.endSlotId || ''),
          },
          observability: {
            ...(currentSettings.observability || {}),
            enabled: body.observabilityEnabled === true || body.observabilityEnabled === 'true',
            dsn: body.observabilityDsn || currentSettings.observability?.dsn || null,
            environment: typeof body.observabilityEnvironment === 'string' ? body.observabilityEnvironment.trim() : (currentSettings.observability?.environment || 'production'),
          },
          clientErrorEndpoint: body.clientErrorEndpoint || currentSettings.clientErrorEndpoint || null,
        };

        ensureDir(path.dirname(settingsPath));
        await fsp.writeFile(settingsPath, JSON.stringify(updatedSettings, null, 2), 'utf8');

        return send(res, 200, { ok: true, settings: updatedSettings });
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

    if (req.method === 'POST' && req.url === '/entities/stubs') {
      try {
        const result = generateStubPrompts({ cwd: CWD });
        const stubs = serializeStubEntries(result.entries).map((entry) => ({
          type: entry.type,
          slug: entry.slug,
          name: entry.name,
          filePath: entry.relativePath,
          prompt: entry.prompt,
          references: entry.references,
        }));
        return send(res, 200, { ok: true, total: stubs.length, stubs });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/posts/stubs') {
      try {
        const result = generatePostStubPrompts({ cwd: process.cwd() });
        const stubs = serializePostStubEntries(result.entries);
        return send(res, 200, { ok: true, stubs });
      } catch (e) {
        return send(res, 500, { ok: false, error: e?.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/entities/subscribe') {
      try {
        const body = await parseBody(req);
        const result = await subscribeToEntity(body || {});
        return send(res, 200, { ok: true, ...result });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
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

    if (req.method === 'POST' && req.url === '/entities/delete') {
      try {
        const body = await parseBody(req);
        const data = await deleteEntity(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Products
    if (req.method === 'POST' && req.url === '/products/list') {
      try {
        const productsPath = path.join(CWD, 'content', 'products.json');
        const data = readJSON(productsPath) || { products: [] };
        return send(res, 200, { ok: true, products: data.products || [] });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/products/save') {
      try {
        const body = await parseBody(req);
        if (!body || !Array.isArray(body.products)) {
          return send(res, 400, { ok: false, error: 'products array required' });
        }
        const productsPath = path.join(CWD, 'content', 'products.json');
        const data = { products: body.products };
        ensureDir(path.dirname(productsPath));
        await fsp.writeFile(productsPath, JSON.stringify(data, null, 2), 'utf8');
        return send(res, 200, { ok: true, products: data.products });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Home (Testimonials & CTA)
    if (req.method === 'POST' && req.url === '/home/get') {
      try {
        const homePath = path.join(CWD, 'content', 'blocks', 'home.json');
        const data = readJSON(homePath) || { cta: {}, testimonials: [] };
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/home/save') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid request body' });
        }
        const homePath = path.join(CWD, 'content', 'blocks', 'home.json');
        ensureDir(path.dirname(homePath));
        await fsp.writeFile(homePath, JSON.stringify(body, null, 2), 'utf8');
        return send(res, 200, { ok: true, data: body });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Partners
    if (req.method === 'POST' && req.url === '/partners/get') {
      try {
        const partnersPath = path.join(CWD, 'content', 'blocks', 'partners.json');
        const data = readJSON(partnersPath) || { updatedAt: '', sections: [], affiliateHighlights: [] };
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/partners/save') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid request body' });
        }
        const partnersPath = path.join(CWD, 'content', 'blocks', 'partners.json');
        const data = {
          updatedAt: new Date().toISOString().split('T')[0],
          sections: Array.isArray(body.sections) ? body.sections : [],
          affiliateHighlights: Array.isArray(body.affiliateHighlights) ? body.affiliateHighlights : [],
        };
        ensureDir(path.dirname(partnersPath));
        await fsp.writeFile(partnersPath, JSON.stringify(data, null, 2), 'utf8');
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Editorial Calendar
    if (req.method === 'POST' && req.url === '/calendar/get') {
      try {
        const calendarPath = path.join(CWD, 'content', 'blocks', 'editorial-calendar.json');
        const data = readJSON(calendarPath) || { updatedAt: '', seasons: [] };
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/calendar/save') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid request body' });
        }
        const calendarPath = path.join(CWD, 'content', 'blocks', 'editorial-calendar.json');
        const data = {
          updatedAt: new Date().toISOString().split('T')[0],
          seasons: Array.isArray(body.seasons) ? body.seasons : [],
        };
        ensureDir(path.dirname(calendarPath));
        await fsp.writeFile(calendarPath, JSON.stringify(data, null, 2), 'utf8');
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Authors
    if (req.method === 'POST' && req.url === '/authors/list') {
      try {
        const authorsDir = path.join(CWD, 'content', 'authors');
        const authors = [];
        if (fs.existsSync(authorsDir)) {
          const files = fs.readdirSync(authorsDir).filter(f => f.endsWith('.json'));
          for (const file of files) {
            try {
              const data = JSON.parse(fs.readFileSync(path.join(authorsDir, file), 'utf8'));
              authors.push({
                slug: data.slug || file.replace(/\.json$/, ''),
                name: data.name || '',
                title: data.title || '',
                pronouns: data.pronouns || '',
              });
            } catch { /* ignore malformed file */ }
          }
        }
        authors.sort((a, b) => a.name.localeCompare(b.name));
        return send(res, 200, { ok: true, authors });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/authors/get') {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'slug required' });
        }
        const authorPath = path.join(CWD, 'content', 'authors', `${slug}.json`);
        if (!fs.existsSync(authorPath)) {
          return send(res, 404, { ok: false, error: 'Author not found' });
        }
        const data = JSON.parse(fs.readFileSync(authorPath, 'utf8'));
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/authors/save') {
      try {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object') {
          return send(res, 400, { ok: false, error: 'Invalid request body' });
        }
        const slug = slugify(body.slug || body.name || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'slug or name required' });
        }
        const authorPath = path.join(CWD, 'content', 'authors', `${slug}.json`);
        const data = {
          slug,
          name: String(body.name || '').trim() || slug,
          title: String(body.title || '').trim(),
          pronouns: String(body.pronouns || '').trim(),
          bio: String(body.bio || '').trim(),
          focus: String(body.focus || '').trim(),
          specialties: Array.isArray(body.specialties) ? body.specialties : [],
          links: Array.isArray(body.links) ? body.links : [],
        };
        ensureDir(path.dirname(authorPath));
        await fsp.writeFile(authorPath, JSON.stringify(data, null, 2), 'utf8');
        return send(res, 200, { ok: true, data, path: `content/authors/${slug}.json` });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/authors/delete') {
      try {
        const body = await parseBody(req);
        const slug = slugify(body?.slug || '');
        if (!slug) {
          return send(res, 400, { ok: false, error: 'slug required' });
        }
        const authorPath = path.join(CWD, 'content', 'authors', `${slug}.json`);
        if (!fs.existsSync(authorPath)) {
          return send(res, 404, { ok: false, error: 'Author not found' });
        }
        await fsp.unlink(authorPath);
        return send(res, 200, { ok: true, slug });
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
  });
});

const isDirectExecution = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isDirectExecution && process.env.VITEST !== 'true') {
  server.listen(PORT, HOST, () => {
    console.log(`[dev-api] listening on http://${HOST}:${PORT}`);
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
  listThemes,
  saveThemeRecord,
  setActiveThemeRecord,
  deleteThemeRecord,
  attachHeroToPost,
};
