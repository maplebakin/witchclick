#!/usr/bin/env node
// scripts/ingest.mjs
// Turn a JSON spec into a validated Markdown post.
// Works with either src/content/posts/ (Content Collections) or content/posts/ (legacy).
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ---------- CLI args ----------
const args = process.argv.slice(2);
const opts = parseArgs(args);

export class IngestValidationError extends Error {
  constructor(errors) {
    super("Spec validation failed");
    this.name = "IngestValidationError";
    this.errors = errors;
  }
}

export async function ingestFromFile(filePath, options = {}) {
  const raw = await fs.readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Could not parse JSON: ${e?.message || e}`);
  }
  return ingestFromSpec(parsed, { ...options, inputPath: filePath });
}

export async function ingestFromSpec(input, options = {}) {
  const { dir, dry = false, inputPath } = options;
  const { value: spec, errors } = validateSpec(input);
  if (errors.length > 0) {
    throw new IngestValidationError(errors);
  }

  const title = spec.title || "Untitled";
  const slug = (spec.slug || slugify(title)).toLowerCase();
  const description = spec.description || "";
  const tags = spec.tags ?? [];
  const draft = spec.draft ?? false;
  const pubDate = spec.pubDate || new Date().toISOString();
  const updatedAt = spec.updatedAt;
  const canonical = spec.canonical;
  const ogImage = spec.ogImage;
  const includeAds = spec.includeAds ?? false;
  const includeKofi = spec.includeKofi ?? false;
  const downloadId = spec.downloadId;

  const affiliateAnchors = spec.affiliateAnchors ?? [];
  const internalLinks = spec.internalLinks ?? [];
  const entities = spec.entities ?? [];

  const body = (spec.body ?? "").trim();

  const readingMinutes = spec.readingMinutes ?? Math.max(1, Math.ceil(wordCount(body) / 200));

  const defaultDir = await pickOutDir(dir);
  await fs.mkdir(defaultDir, { recursive: true });

  const outPath = path.join(defaultDir, `${slug}.md`);
  const fmData = {
    title,
    description,
    pubDate,
    updatedAt,
    tags,
    draft,
    canonical,
    ogImage,
    readingMinutes,
    affiliateAnchors,
    internalLinks,
    entities,
    includeAds,
    includeKofi,
    downloadId,
  };

  const fm = frontmatter(fmData);
  const fileContent = `${fm}\n${body}\n`;
  const size = Buffer.byteLength(fileContent, "utf8");

  if (dry) {
    return {
      dryRun: true,
      path: outPath,
      slug,
      bytes: size,
      frontmatter: fmData,
      content: fileContent,
      source: inputPath || null,
    };
  }

  await fs.writeFile(outPath, fileContent, "utf8");
  return {
    dryRun: false,
    path: outPath,
    slug,
    bytes: size,
    frontmatter: fmData,
    source: inputPath || null,
  };
}

/*
Usage:
  node scripts/ingest.mjs path/to/spec.json [--dry] [--dir src/content/posts]
Spec JSON shape (flexible):
{
  "title": "Tea Ritual for Focus",
  "description": "A gentle, secular ritual for calming focus.",
  "slug": "tea-ritual-for-focus",
  "tags": ["rituals","tea","focus"],
  "pubDate": "2025-09-14T13:00:00Z",
  "ogImage": "/og/tea-ritual-for-focus.jpg",
  "canonical": "https://witchclick.space/post/tea-ritual-for-focus",
  "draft": false,
  "affiliateAnchors": [{"key":"plannerA5","text":"A5 planner"}],
  "internalLinks": [{"slug":"tarot-as-secular-tool","anchor":"tarot"}],
  "includeAds": true,
  "includeKofi": true,
  "downloadId": "tea-ritual-card",
  "body": "# Your Markdown...\n\nContent here."
}
*/

async function main() {
  if (!opts.input) {
    die("Usage: node scripts/ingest.mjs <spec.json> [--dry] [--dir <outDir>]");
  }
  try {
    const result = await ingestFromFile(opts.input, { dir: opts.dir, dry: opts.dry });
    if (result.dryRun) {
      console.log("----- DRY RUN (no write) -----");
      console.log(result.path);
      console.log(result.content);
      return;
    }
    console.log(`Wrote ${rel(result.path)} (${bytes(result.bytes)})`);
    console.log("Tip: commit and deploy when ready.");
  } catch (err) {
    if (err instanceof IngestValidationError) {
      console.error("Spec validation failed:");
      for (const e of err.errors) {
        console.error(` • ${e}`);
      }
      process.exit(1);
    }
    console.error(err?.stack || err);
    process.exit(1);
  }
}

if (process.argv[1] === __filename) {
  main().catch((e) => {
    console.error(e?.stack || e);
    process.exit(1);
  });
}

// ---------- helpers ----------
function parseArgs(a) {
  const out = { input: null, dry: false, dir: null };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--dry") out.dry = true;
    else if (t === "--dir") out.dir = a[++i];
    else if (!out.input) out.input = t;
  }
  return out;
}

async function pickOutDir(preferred) {
  if (preferred) return path.resolve(ROOT, preferred);
  const legacy = path.join(ROOT, "content", "posts");
  if (fssync.existsSync(legacy)) return legacy;

  const modern = path.join(ROOT, "src", "content", "posts");
  if (fssync.existsSync(path.dirname(modern))) return modern;

  // last resort: create under src/content/posts
  return modern;
}

function frontmatter(obj) {
  const lines = [];
  lines.push("---");
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    lines.push(`${k}: ${toYaml(v)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function toYaml(v) {
  if (Array.isArray(v)) return `[${v.map(toYaml).join(", ")}]`;
  if (typeof v === "object") {
    // object literal one-liner if simple; else JSON string
    const keys = Object.keys(v);
    const simple = keys.length && keys.every((k) => typeof v[k] !== "object");
    if (simple) {
      const inside = keys
        .map((k) => `${k}: ${toYaml(v[k])}`)
        .join(", ");
      return `{ ${inside} }`;
    }
    return JSON.stringify(v); // fall back to JSON string for nested arrays/objects
  }
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function wordCount(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
function rel(p) { return path.relative(ROOT, p); }
function bytes(n) { return `${n} bytes`; }
function die(msg) { console.error(msg); process.exit(1); }

function validateSpec(input) {
  const errors = [];
  const value = {};

  const title = optionalNonEmptyString(input.title, "title", errors, { allowEmpty: false, optional: true });
  if (title) value.title = title;

  const slugRaw = optionalNonEmptyString(input.slug, "slug", errors, { allowEmpty: false, optional: true });
  if (slugRaw) {
    if (!isValidSlug(slugRaw)) {
      errors.push("slug must contain only lowercase letters, numbers, or hyphen separators");
    } else {
      value.slug = slugRaw.toLowerCase();
    }
  }

  const description = optionalNonEmptyString(input.description, "description", errors, { optional: true, allowEmpty: true });
  if (description !== undefined) value.description = description;

  const canonical = optionalNonEmptyString(input.canonical, "canonical", errors, { optional: true });
  if (canonical) {
    if (!looksLikeUrl(canonical)) {
      errors.push("canonical must be an absolute URL or start with '/'");
    } else {
      value.canonical = canonical;
    }
  }

  const ogImage = optionalNonEmptyString(input.ogImage, "ogImage", errors, { optional: true });
  if (ogImage) value.ogImage = ogImage;

  const downloadId = optionalNonEmptyString(input.downloadId, "downloadId", errors, { optional: true });
  if (downloadId) value.downloadId = downloadId;

  value.tags = normalizeStringArray(input.tags, "tags", errors);

  const draft = optionalBoolean(input.draft, "draft", errors);
  if (draft !== undefined) value.draft = draft;

  const includeAds = optionalBoolean(input.includeAds, "includeAds", errors);
  if (includeAds !== undefined) value.includeAds = includeAds;

  const includeKofi = optionalBoolean(input.includeKofi, "includeKofi", errors);
  if (includeKofi !== undefined) value.includeKofi = includeKofi;

  const pubDate = optionalIsoDate(input.pubDate, "pubDate", errors);
  if (pubDate) value.pubDate = pubDate;

  const updatedAt = optionalIsoDate(input.updatedAt, "updatedAt", errors);
  if (updatedAt) value.updatedAt = updatedAt;

  const readingMinutes = optionalPositiveInteger(input.readingMinutes, "readingMinutes", errors);
  if (readingMinutes !== undefined) value.readingMinutes = readingMinutes;

  value.affiliateAnchors = normalizeAnchorArray(input.affiliateAnchors, "affiliateAnchors", errors);
  value.internalLinks = normalizeInternalLinks(input.internalLinks, errors);
  value.entities = normalizeEntities(input.entities, errors);

  const body = readBody(input.body, errors);
  if (body) value.body = body;

  if (!value.title && !value.slug) {
    errors.push("Provide at least a title or slug");
  }

  return { value, errors };
}

function optionalNonEmptyString(value, field, errors, { optional = false, allowEmpty = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    errors.push(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) {
    errors.push(`${field} cannot be empty`);
    return undefined;
  }
  return allowEmpty ? value : trimmed;
}

function optionalBoolean(value, field, errors) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    errors.push(`${field} must be a boolean`);
    return undefined;
  }
  return value;
}

function optionalIsoDate(value, field, errors) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(+date)) {
    errors.push(`${field} must be a valid date`);
    return undefined;
  }
  return date.toISOString();
}

function optionalPositiveInteger(value, field, errors) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push(`${field} must be a positive number`);
    return undefined;
  }
  return Math.round(value);
}

function normalizeStringArray(value, field, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array of strings`);
    return [];
  }
  const out = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${field}[${index}] must be a string`);
      return;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      errors.push(`${field}[${index}] cannot be empty`);
      return;
    }
    out.push(trimmed);
  });
  return out;
}

function normalizeAnchorArray(value, field, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return [];
  }
  const out = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`${field}[${index}] must be an object with key and text`);
      return;
    }
    const key = optionalNonEmptyString(item.key, `${field}[${index}].key`, errors);
    const text = optionalNonEmptyString(item.text, `${field}[${index}].text`, errors);
    if (key && text) {
      out.push({ key, text });
    }
  });
  return out;
}

function normalizeInternalLinks(value, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push("internalLinks must be an array");
    return [];
  }
  const out = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`internalLinks[${index}] must be an object`);
      return;
    }
    const slug = optionalNonEmptyString(item.slug, `internalLinks[${index}].slug`, errors);
    const anchor = optionalNonEmptyString(item.anchor, `internalLinks[${index}].anchor`, errors);
    if (slug && anchor) {
      out.push({ slug: slug.toLowerCase(), anchor });
    }
  });
  return out;
}

function normalizeEntities(value, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push("entities must be an array");
    return [];
  }
  const out = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`entities[${index}] must be an object`);
      return;
    }
    const type = optionalNonEmptyString(item.type, `entities[${index}].type`, errors);
    const slug = optionalNonEmptyString(item.slug, `entities[${index}].slug`, errors);
    if (type && slug) {
      out.push({ type, slug: slug.toLowerCase() });
    }
  });
  return out;
}

function readBody(value, errors) {
  if (value === undefined || value === null) {
    errors.push("body is required");
    return "";
  }
  if (typeof value !== "string") {
    errors.push("body must be a string");
    return "";
  }
  if (!value.trim()) {
    errors.push("body cannot be empty");
    return "";
  }
  return value;
}

function looksLikeUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (err) {
    return value.startsWith("/");
  }
}

function isValidSlug(value) {
  return /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/i.test(value);
}
