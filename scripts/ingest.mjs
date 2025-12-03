#!/usr/bin/env node
// scripts/ingest.mjs
// Turn a JSON spec into a validated Markdown post inside src/content/posts/.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import prompts from "./lib/prompts.js";
import { executeIngest } from "../server/lib/ingestExecutor.js";
import { generateSchemaDocumentation } from "../server/lib/postSpecSchema.js";
import { resolvePostsDirectories, slugify } from "./lib/contentPaths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.env.WC_PROJECT_ROOT
  ? path.resolve(process.env.WC_PROJECT_ROOT)
  : path.resolve(__dirname, "..");

// ---------- CLI args ----------
const args = process.argv.slice(2);
const opts = parseArgs(args);

export class IngestValidationError extends Error {
  constructor(details = {}) {
    const normalized = Array.isArray(details)
      ? { errors: details }
      : { message: details.message, errors: details.errors, warnings: details.warnings, normalizations: details.normalizations };
    const message = normalized.message || (normalized.errors && normalized.errors[0]) || "Spec validation failed";
    super(message);
    this.name = "IngestValidationError";
    this.errors = Array.isArray(normalized.errors) ? normalized.errors : [];
    this.warnings = Array.isArray(normalized.warnings) ? normalized.warnings : [];
    this.normalizations = Array.isArray(normalized.normalizations) ? normalized.normalizations : [];
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

  const postsDirectories = await Promise.resolve(
    resolvePostsDirectories({ root: PROJECT_ROOT, preferred: dir })
  );

  let ingestionResult;
  try {
    ingestionResult = await executeIngest(input || {}, {
      cwd: PROJECT_ROOT,
      postsDirectories,
      dryRun: Boolean(dry),
      sourcePath: inputPath || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errors = Array.isArray(err?.errors) && err.errors.length ? err.errors : [err?.message || "Spec validation failed"];
    const warnings = Array.isArray(err?.warnings) ? err.warnings : [];
    const normalizations = Array.isArray(err?.normalizations) ? err.normalizations : [];
    const slug = deriveLoggingSlug(input, input);
    emitLog?.({
      event: "ingest.post",
      path: null,
      bytesWritten: 0,
      slug,
      validationStatus: "failed",
      dryRun: Boolean(dry),
      source: inputPath || null,
      errors,
      warnings,
      normalizations,
    });
    throw new IngestValidationError({ message: err?.message, errors, warnings, normalizations });
  }

  const { prepared, persistence, bytesWritten } = ingestionResult;
  const { post, spec, normalizationReport, warnings, entityStubs, postStubs, promptMetadata } = prepared;
  const slug = spec.slug;

  const result = {
    dryRun: Boolean(dry),
    path: post.filePath,
    slug,
    bytes: bytesWritten,
    spec,
    warnings,
    normalizationReport,
    entityStubs,
    postStubs,
    markdown: post.contents,
    createdEntities: persistence?.createdEntities ?? [],
    createdPosts: persistence?.createdPosts ?? [],
    source: inputPath || null,
    promptMetadata: promptMetadata ?? null,
    postsDirectories,
  };

  emitLog?.({
    event: "ingest.post",
    path: post.filePath,
    bytesWritten,
    slug,
    validationStatus: "passed",
    dryRun: Boolean(dry),
    source: inputPath || null,
    warnings,
    normalizations: normalizationReport,
  });

  return result;
}

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

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
    printHelp();
    process.exit(1);
  }
  try {
    const result = await ingestFromFile(opts.input, { dir: opts.dir, dry: opts.dry });
    if (result.dryRun) {
      printDryRun(result);
      return;
    }
    await maybeRunAutoSeo(result, opts.autoSeo);
    printSuccess(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      console.error("Spec validation failed:");
      for (const e of err.errors) {
        console.error(` • ${e}`);
      }
      if (err.normalizations?.length) {
        console.error("Normalizations applied:");
        for (const n of err.normalizations) {
          console.error(` • ${n}`);
        }
      }
      if (err.warnings?.length) {
        console.error("Warnings:");
        for (const w of err.warnings) {
          console.error(` • ${w}`);
        }
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
  const { spec, sourcePath } = await promptSpec();
  const preview = await ingestFromSpec(spec, { dir: options.dir, dry: true, inputPath: sourcePath });

  printDryRun(preview);

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

  const result = await ingestFromSpec(spec, { dir: options.dir, dry: false, inputPath: sourcePath });
  await maybeRunAutoSeo(result, options.autoSeo);
  printSuccess(result);
}

async function promptSpec() {
  const { sourceType } = await prompts(
    {
      type: "select",
      name: "sourceType",
      message: "How would you like to provide the PostSpec payload?",
      choices: [
        { title: "Load from JSON file", value: "file" },
        { title: "Paste JSON directly", value: "inline" },
      ],
      initial: 0,
    },
    { onCancel: handlePromptCancel }
  );

  if (sourceType === "inline") {
    const { json } = await prompts(
      {
        type: "text",
        name: "json",
        message: "Paste PostSpec JSON",
        validate: (val) => {
          if (!val || !val.trim()) return "JSON payload is required";
          try {
            JSON.parse(val);
            return true;
          } catch (err) {
            return `Invalid JSON: ${err?.message || err}`;
          }
        },
      },
      { onCancel: handlePromptCancel }
    );

    try {
      return { spec: JSON.parse(json), sourcePath: null };
    } catch (err) {
      throw new Error(`Failed to parse JSON: ${err?.message || err}`);
    }
  }

  const { filePath } = await prompts(
    {
      type: "text",
      name: "filePath",
      message: "Path to PostSpec JSON file",
      validate: async (val) => {
        if (!val || !val.trim()) return "Path is required";
        try {
          await fs.access(path.resolve(PROJECT_ROOT, val));
          return true;
        } catch {
          return "File not found";
        }
      },
    },
    { onCancel: handlePromptCancel }
  );

  const resolvedPath = path.resolve(PROJECT_ROOT, filePath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${rel(resolvedPath)}: ${err?.message || err}`);
  }

  return { spec: parsed, sourcePath: resolvedPath };
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
  const out = { input: null, dry: false, dir: null, interactive: false, autoSeo: true };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--dry") out.dry = true;
    else if (t === "--dir") out.dir = a[++i];
    else if (t === "--interactive") out.interactive = true;
    else if (t === "--no-auto-seo") out.autoSeo = false;
    else if (t === "--auto-seo") out.autoSeo = true;
    else if (t === "--help" || t === "-h") continue;
    else if (!out.input) out.input = t;
  }
  return out;
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }
function bytes(n) { return `${n} bytes`; }
function die(msg) { console.error(msg); process.exit(1); }

function printDryRun(result) {
  console.log("----- DRY RUN (no write) -----");
  console.log(rel(result.path));
  console.log(result.markdown);
  if (result.normalizationReport?.length) {
    console.log("Normalizations:");
    for (const n of result.normalizationReport) {
      console.log(` • ${n}`);
    }
  }
  if (result.warnings?.length) {
    console.log("Warnings:");
    for (const w of result.warnings) {
      console.log(` • ${w}`);
    }
  }
  if (Array.isArray(result.postStubs) && result.postStubs.length) {
    console.log("Would create post stubs:");
    for (const stub of result.postStubs) {
      console.log(` • ${rel(stub.file)} (${stub.title})`);
    }
  }
}

function printSuccess(result) {
  console.log(`Wrote ${rel(result.path)} (${bytes(result.bytes)})`);
  if (result.normalizationReport?.length) {
    console.log("Normalizations:");
    for (const n of result.normalizationReport) {
      console.log(` • ${n}`);
    }
  }
  if (result.warnings?.length) {
    console.log("Warnings:");
    for (const w of result.warnings) {
      console.log(` • ${w}`);
    }
  }
  if (Array.isArray(result.createdEntities) && result.createdEntities.length) {
    console.log("Created entity stubs:");
    for (const file of result.createdEntities) {
      console.log(` • ${rel(file)}`);
    }
  }
  if (Array.isArray(result.createdPosts) && result.createdPosts.length) {
    console.log("Created post stubs:");
    for (const file of result.createdPosts) {
      console.log(` • ${rel(file)}`);
    }
  }
  console.log("Tip: commit and deploy when ready.");
}

function printHelp() {
  console.log("Usage: node scripts/ingest.mjs <spec.json> [--dry] [--dir <outDir>] [--no-auto-seo]");
  console.log("       node scripts/ingest.mjs --interactive [--dry] [--dir <outDir>] [--no-auto-seo]");
  console.log("       node scripts/ingest.mjs --help");
  console.log("");
  console.log("Input must be a PostSpec v2 JSON payload (see below):");
  console.log(generateSchemaDocumentation());
}

async function maybeRunAutoSeo(result, autoSeoEnabled) {
  if (!autoSeoEnabled) return;
  if (result?.dryRun) return;
  if (!result?.slug) return;
  if (!Array.isArray(result?.postsDirectories) || result.postsDirectories.length === 0) return;

  const scriptPath = path.join(PROJECT_ROOT, "scripts", "seo-fix-apply.mjs");
  const dirArg = result.postsDirectories.join(",");
  const args = [scriptPath, "--slug", result.slug, "--dirs", dirArg];

  console.log(`Running SEO auto-fix for ${result.slug}...`);
  const child = spawnSync("node", args, { stdio: "inherit" });
  if (child.status !== 0) {
    throw new Error("SEO auto-fix failed during ingest. Check logs above.");
  }
}
