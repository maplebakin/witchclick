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
  const raw = await fs.readFile(opts.input, "utf8");
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    die(`Could not parse JSON: ${e?.message || e}`);
  }

  // Normalize / defaults
  const title = str(spec.title) || "Untitled";
  const slug = (str(spec.slug) || slugify(title)).toLowerCase();
  const description = str(spec.description) || "";
  const tags = Array.isArray(spec.tags) ? spec.tags.map(String) : [];
  const draft = !!spec.draft;
  const pubDate = iso(spec.pubDate) || new Date().toISOString();
  const updatedAt = iso(spec.updatedAt);
  const canonical = urlish(spec.canonical);
  const ogImage = str(spec.ogImage);
  const includeAds = !!spec.includeAds;
  const includeKofi = !!spec.includeKofi;
  const downloadId = str(spec.downloadId);

  const affiliateAnchors = Array.isArray(spec.affiliateAnchors) ? spec.affiliateAnchors : [];
  const internalLinks = Array.isArray(spec.internalLinks) ? spec.internalLinks : [];
  const entities = Array.isArray(spec.entities) ? spec.entities : [];

  const body = str(spec.body) ?? "";

  // Compute reading minutes if not provided
  const readingMinutes = num(spec.readingMinutes) || Math.max(1, Math.ceil(wordCount(body) / 200));

  // Where to write?
  const defaultDir = await pickOutDir(opts.dir);
  await fs.mkdir(defaultDir, { recursive: true });

  const outPath = path.join(defaultDir, `${slug}.md`);
  const fm = frontmatter({
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
  });

  const fileContent = `${fm}\n${body.trim()}\n`;

  if (opts.dry) {
    console.log("----- DRY RUN (no write) -----");
    console.log(outPath);
    console.log(fileContent);
    return;
  }

  await fs.writeFile(outPath, fileContent, "utf8");
  console.log(`Wrote ${rel(outPath)} (${bytes(fileContent.length)})`);
  console.log("Tip: commit and deploy when ready.");
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});

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
function str(x) { return typeof x === "string" ? x : undefined; }
function num(x) { return typeof x === "number" && isFinite(x) ? x : undefined; }
function iso(x) { if (!x) return undefined; const d = new Date(x); return isNaN(+d) ? undefined : d.toISOString(); }
function urlish(x) { if (!x) return undefined; return String(x); }
function rel(p) { return path.relative(ROOT, p); }
function bytes(n) { return `${n} bytes`; }
function die(msg) { console.error(msg); process.exit(1); }
