#!/usr/bin/env node
// scripts/ingest.mjs
// Turn a JSON spec into a validated Markdown post.
// Works with either src/content/posts/ (Content Collections) or content/posts/ (legacy).
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import prompts from "./lib/prompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.env.WC_PROJECT_ROOT
  ? path.resolve(process.env.WC_PROJECT_ROOT)
  : path.resolve(__dirname, "..");

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
  const { logger, ...rest } = options;
  const raw = await fs.readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Could not parse JSON: ${e?.message || e}`);
  }
  return ingestFromSpec(parsed, { ...rest, inputPath: filePath, logger });
}

export async function ingestFromSpec(input, options = {}) {
  const { dir, dry = false, inputPath, logger } = options;
  const emitLog = createIngestLogger(logger);
  const { value: spec, errors } = validateSpec(input);
  const sourceSlug = deriveLoggingSlug(spec, input);
  if (errors.length > 0) {
    emitLog?.({
      event: "ingest.post",
      path: null,
      bytesWritten: 0,
      slug: sourceSlug,
      validationStatus: "failed",
      dryRun: Boolean(dry),
      source: inputPath || null,
      errors,
    });
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
    contentType: spec.contentType,
  };

  const fm = frontmatter(fmData);
  const fileContent = `${fm}\n${body}\n`;
  const size = Buffer.byteLength(fileContent, "utf8");

  if (dry) {
    const result = {
      dryRun: true,
      path: outPath,
      slug,
      bytes: size,
      frontmatter: fmData,
      content: fileContent,
      source: inputPath || null,
    };
    emitLog?.({
      event: "ingest.post",
      path: outPath,
      bytesWritten: size,
      slug,
      validationStatus: "passed",
      dryRun: Boolean(dry),
      source: inputPath || null,
    });
    return result;
  }

  await fs.writeFile(outPath, fileContent, "utf8");
  const result = {
    dryRun: false,
    path: outPath,
    slug,
    bytes: size,
    frontmatter: fmData,
    source: inputPath || null,
  };
  emitLog?.({
    event: "ingest.post",
    path: outPath,
    bytesWritten: size,
    slug,
    validationStatus: "passed",
    dryRun: Boolean(dry),
    source: inputPath || null,
  });
  return result;
}

/*
Usage:
  node scripts/ingest.mjs path/to/spec.json [--dry] [--dir src/content/posts]
  node scripts/ingest.mjs --interactive [--dry] [--dir src/content/posts]
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
  if (opts.interactive) {
    if (opts.input) {
      die("Interactive mode cannot be combined with a spec file input.");
    }
    try {
      await runInteractiveIngest(opts);
      return;
    } catch (err) {
      if (err instanceof IngestValidationError) {
        console.error("Spec validation failed:");
        for (const e of err.errors) {
          console.error(` • ${e}`);
        }
        process.exit(1);
      }
      throw err;
    }
  }

  if (!opts.input) {
    die(
      "Usage: node scripts/ingest.mjs <spec.json> [--dry] [--dir <outDir>] | node scripts/ingest.mjs --interactive [--dir <outDir>] [--dry]"
    );
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
function createIngestLogger(loggerOption) {
  const emitter = resolveLogEmitter(loggerOption);
  if (!emitter) return null;
  return (event) => {
    const payload = { timestamp: new Date().toISOString(), ...event };
    try {
      emitter(payload);
    } catch (err) {
      console.error(`[ingest] Failed to emit log: ${err?.message || err}`);
    }
  };
}

function resolveLogEmitter(loggerOption) {
  if (!loggerOption) return null;
  if (typeof loggerOption === "function") return loggerOption;
  if (loggerOption === console) {
    return (payload) => console.log(JSON.stringify(payload));
  }
  if (typeof loggerOption !== "object") return null;
  if (typeof loggerOption.emit === "function") {
    return (payload) => loggerOption.emit(payload);
  }
  const method =
    typeof loggerOption.info === "function"
      ? loggerOption.info.bind(loggerOption)
      : typeof loggerOption.log === "function"
        ? loggerOption.log.bind(loggerOption)
        : null;
  if (!method) return null;
  return (payload) => method(payload);
}

async function runInteractiveIngest(options) {
  const spec = await promptSpec();
  const preview = await ingestFromSpec(spec, { dir: options.dir, dry: true });

  console.log("----- DRY RUN PREVIEW -----");
  console.log(rel(preview.path));
  console.log(preview.content);

  if (options.dry) {
    console.log("Dry run flag detected. Skipping write.");
    return;
  }

  const { proceed } = await prompts(
    {
      type: "confirm",
      name: "proceed",
      message: `Write file to ${rel(preview.path)}?`,
      initial: true,
    },
    { onCancel: handlePromptCancel }
  );

  if (!proceed) {
    console.log("Interactive ingest cancelled by user.");
    return;
  }

  const result = await ingestFromSpec(spec, { dir: options.dir, dry: false });
  console.log(`Wrote ${rel(result.path)} (${bytes(result.bytes)})`);
  console.log("Tip: commit and deploy when ready.");
}

async function promptSpec() {
  const { title } = await prompts(
    {
      type: "text",
      name: "title",
      message: "Post title",
      validate: (val) => (val && val.trim() ? true : "Title is required"),
    },
    { onCancel: handlePromptCancel }
  );

  const initialSlug = title ? slugify(title).toLowerCase() : "";

  const slugAnswer = await prompts(
    {
      type: "text",
      name: "slug",
      message: "Slug (leave blank to derive from title)",
      initial: initialSlug,
      validate: (val) => {
        if (!val) return true;
        return slugPattern.test(val) ? true : "Slug must contain only lowercase letters, numbers, or hyphen separators";
      },
    },
    { onCancel: handlePromptCancel }
  );

  const { description } = await prompts(
    {
      type: "text",
      name: "description",
      message: "Description",
    },
    { onCancel: handlePromptCancel }
  );

  const tagAnswer = await prompts(
    {
      type: "list",
      name: "tags",
      message: "Tags (comma separated)",
      separator: ",",
    },
    { onCancel: handlePromptCancel }
  );

  const affiliateAnchors = await promptAffiliateAnchors();

  const { body } = await prompts(
    {
      type: "text",
      name: "body",
      message: "Body (Markdown)",
      validate: (val) => (val && val.trim() ? true : "Body text is required"),
    },
    { onCancel: handlePromptCancel }
  );

  const tags = Array.isArray(tagAnswer.tags)
    ? tagAnswer.tags.map((tag) => tag.trim()).filter(Boolean)
    : [];

  const slug = slugAnswer.slug ? slugify(slugAnswer.slug).toLowerCase() : undefined;

  const normalizedTitle = title.trim();
  const normalizedBody = body.trim();

  return {
    title: normalizedTitle,
    slug,
    description: description?.trim() ? description.trim() : undefined,
    tags,
    affiliateAnchors,
    body: normalizedBody,
  };
}

async function promptAffiliateAnchors() {
  const anchors = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { add } = await prompts(
      {
        type: "confirm",
        name: "add",
        message: anchors.length
          ? "Add another affiliate anchor?"
          : "Would you like to add an affiliate anchor?",
        initial: false,
      },
      { onCancel: handlePromptCancel }
    );

    if (!add) break;

    const anchor = await prompts(
      [
        {
          type: "text",
          name: "key",
          message: "Affiliate anchor key",
          validate: (val) => (val && val.trim() ? true : "Key is required"),
        },
        {
          type: "text",
          name: "text",
          message: "Affiliate anchor text",
          validate: (val) => (val && val.trim() ? true : "Text is required"),
        },
      ],
      { onCancel: handlePromptCancel }
    );

    anchors.push({ key: anchor.key.trim(), text: anchor.text.trim() });
  }
  return anchors;
}

function handlePromptCancel() {
  console.log("Interactive ingest cancelled.");
  process.exit(0);
}

function deriveLoggingSlug(spec, rawInput) {
  const candidates = [
    spec?.slug,
    rawInput && typeof rawInput === "object" ? rawInput.slug : null,
    spec?.title,
    rawInput && typeof rawInput === "object" ? rawInput.title : null,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeSlugCandidate(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function normalizeSlugCandidate(candidate) {
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  return slugify(trimmed).toLowerCase();
}

function parseArgs(a) {
  const out = { input: null, dry: false, dir: null, interactive: false };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--dry") out.dry = true;
    else if (t === "--dir") out.dir = a[++i];
    else if (t === "--interactive") out.interactive = true;
    else if (!out.input) out.input = t;
  }
  return out;
}

async function pickOutDir(preferred) {
  if (preferred) return path.resolve(PROJECT_ROOT, preferred);

  const modern = path.join(PROJECT_ROOT, "src", "content", "posts");
  const legacy = path.join(PROJECT_ROOT, "content", "posts");

  if (directoryHasMarkdown(modern)) return modern;
  if (directoryHasMarkdown(legacy)) return legacy;
  if (isDirectory(modern)) return modern;
  if (isDirectory(legacy)) return legacy;

  // last resort: create under src/content/posts
  return modern;
}

function isDirectory(candidate) {
  try {
    return fssync.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function directoryHasMarkdown(candidate) {
  if (!isDirectory(candidate)) return false;

  try {
    const entries = fssync.readdirSync(candidate, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));
  } catch {
    return false;
  }
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
function rel(p) { return path.relative(PROJECT_ROOT, p); }
function bytes(n) { return `${n} bytes`; }
function die(msg) { console.error(msg); process.exit(1); }

function validateSpec(input) {
  const result = specSchema.safeParse(input);
  if (result.success) {
    return { value: result.data, errors: [] };
  }

  return { value: {}, errors: formatZodErrors(result.error) };
}
const slugPattern = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/i;

const affiliateAnchorSchema = z
  .object(
    {
      key: z
        .string({ required_error: "affiliateAnchors[].key is required", invalid_type_error: "affiliateAnchors[].key must be a string" })
        .trim()
        .min(1, "affiliateAnchors[].key cannot be empty"),
      text: z
        .string({ required_error: "affiliateAnchors[].text is required", invalid_type_error: "affiliateAnchors[].text must be a string" })
        .trim()
        .min(1, "affiliateAnchors[].text cannot be empty"),
    },
    { invalid_type_error: "affiliateAnchors[] must be an object with key and text" }
  )
  .strict();

const internalLinkSchema = z
  .object(
    {
      slug: z
        .string({ required_error: "internalLinks[].slug is required", invalid_type_error: "internalLinks[].slug must be a string" })
        .trim()
        .min(1, "internalLinks[].slug cannot be empty")
        .transform((val) => val.toLowerCase()),
      anchor: z
        .string({ required_error: "internalLinks[].anchor is required", invalid_type_error: "internalLinks[].anchor must be a string" })
        .trim()
        .min(1, "internalLinks[].anchor cannot be empty"),
    },
    { invalid_type_error: "internalLinks[] must be an object" }
  )
  .strict();

const entitySchema = z
  .object(
    {
      type: z
        .string({ required_error: "entities[].type is required", invalid_type_error: "entities[].type must be a string" })
        .trim()
        .min(1, "entities[].type cannot be empty"),
      slug: z
        .string({ required_error: "entities[].slug is required", invalid_type_error: "entities[].slug must be a string" })
        .trim()
        .min(1, "entities[].slug cannot be empty")
        .transform((val) => val.toLowerCase()),
    },
    { invalid_type_error: "entities[] must be an object" }
  )
  .strict();

const isoDate = (field) =>
  z
    .preprocess(
      (val) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === "string" && val.trim() === "") return undefined;
        if (val instanceof Date) return val.toISOString();
        if (typeof val === "number") return new Date(val).toISOString();
        return val;
      },
      z
        .string({ invalid_type_error: `${field} must be a string` })
        .refine((val) => !Number.isNaN(Date.parse(val)), { message: `${field} must be a valid date` })
        .transform((val) => new Date(val).toISOString())
    )
    .optional();

const ALLOWED_CONTENT_TYPES = ["ritual", "guide"];

const specSchema = z
  .object(
    {
      title: z
        .string({ invalid_type_error: "title must be a string" })
        .trim()
        .min(1, "title cannot be empty")
        .optional(),
      slug: z
        .string({ invalid_type_error: "slug must be a string" })
        .trim()
        .min(1, "slug cannot be empty")
        .regex(slugPattern, "slug must contain only lowercase letters, numbers, or hyphen separators")
        .transform((val) => val.toLowerCase())
        .optional(),
      description: z.string({ invalid_type_error: "description must be a string" }).optional(),
      canonical: z
        .string({ invalid_type_error: "canonical must be a string" })
        .trim()
        .min(1, "canonical cannot be empty")
        .refine((val) => looksLikeUrl(val), { message: "canonical must be an absolute URL or start with '/'" })
        .optional(),
      ogImage: z
        .string({ invalid_type_error: "ogImage must be a string" })
        .trim()
        .min(1, "ogImage cannot be empty")
        .optional(),
      downloadId: z
        .string({ invalid_type_error: "downloadId must be a string" })
        .trim()
        .min(1, "downloadId cannot be empty")
        .optional(),
      tags: z
        .array(
          z
            .string({ invalid_type_error: "tags[] must be a string" })
            .trim()
            .min(1, "tags[] cannot be empty"),
          { invalid_type_error: "tags must be an array of strings" }
        )
        .optional()
        .default([]),
      draft: z.boolean({ invalid_type_error: "draft must be a boolean" }).optional(),
      includeAds: z.boolean({ invalid_type_error: "includeAds must be a boolean" }).optional(),
      includeKofi: z.boolean({ invalid_type_error: "includeKofi must be a boolean" }).optional(),
      contentType: z
        .enum(ALLOWED_CONTENT_TYPES, {
          invalid_type_error: "contentType must be one of the allowed values",
        })
        .optional(),
      pubDate: isoDate("pubDate"),
      updatedAt: isoDate("updatedAt"),
      readingMinutes: z
        .number({ invalid_type_error: "readingMinutes must be a positive number" })
        .finite("readingMinutes must be a positive number")
        .positive("readingMinutes must be a positive number")
        .transform((val) => Math.round(val))
        .optional(),
      affiliateAnchors: z
        .array(affiliateAnchorSchema, { invalid_type_error: "affiliateAnchors must be an array" })
        .optional()
        .default([]),
      internalLinks: z
        .array(internalLinkSchema, { invalid_type_error: "internalLinks must be an array" })
        .optional()
        .default([]),
      entities: z
        .array(entitySchema, { invalid_type_error: "entities must be an array" })
        .optional()
        .default([]),
      body: z
        .string({ required_error: "body is required", invalid_type_error: "body must be a string" })
        .trim()
        .min(1, "body cannot be empty"),
    },
    { invalid_type_error: "Spec must be an object" }
  )
  .strict()
  .superRefine((val, ctx) => {
    if (!val.title && !val.slug) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least a title or slug" });
    }
  });

function formatZodErrors(error) {
  return error.issues.map((issue) => {
    const path = formatZodPath(issue.path);
    const message = issue.message;
    return path ? `${path}: ${message}` : message;
  });
}

function formatZodPath(path) {
  if (!path || path.length === 0) return "";
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else if (!out) {
      out = segment;
    } else {
      out += `.${segment}`;
    }
  }
  return out;
}

function looksLikeUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (err) {
    return value.startsWith("/");
  }
}

