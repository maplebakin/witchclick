#!/usr/bin/env node
// scripts/ingest-queue.mjs
// Batch-ingest approved specs from a queue directory using scripts/ingest.mjs helpers.
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ingestFromSpec, IngestValidationError } from "./ingest.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const opts = parseArgs(args);

async function main() {
  const queueDir = resolvePath(opts.queue ?? path.join("content", "prompt-queue", "approved"));
  const archiveDir =
    opts.archive === false ? null : resolvePath(opts.archive ?? path.join("content", "prompt-queue", "shipped"));
  const failedDir =
    opts.failed === false ? null : resolvePath(opts.failed ?? path.join("content", "prompt-queue", "failed"));
  const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : Infinity;

  await ensureDir(queueDir);

  const entries = await fs.readdir(queueDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    console.log(`No approved specs found in ${rel(queueDir)}.`);
    return;
  }

  console.log(`Found ${files.length} approved spec${files.length === 1 ? "" : "s"} in ${rel(queueDir)}.`);

  let processed = 0;
  let successes = 0;
  let failures = 0;
  let validationErrors = 0;
  let readErrors = 0;
  let unexpectedErrors = 0;
  const ingestionEvents = [];
  const emitIngestLog = createBatchLogger(ingestionEvents);

  for (const file of files) {
    if (processed >= limit) {
      console.log(`Limit reached (${limit}). Stopping.`);
      break;
    }
    processed += 1;
    const fullPath = path.join(queueDir, file);
    console.log(`→ Processing ${rel(fullPath)}`);

    let spec;
    try {
      const raw = await fs.readFile(fullPath, "utf8");
      spec = JSON.parse(raw);
    } catch (err) {
      failures += 1;
      readErrors += 1;
      console.error(`  ✖ Failed to read ${file}: ${err?.message || err}`);
      await handleFailure(fullPath, failedDir, opts.dry);
      continue;
    }

    try {
      const result = await ingestFromSpec(spec, {
        dir: opts.dir,
        dry: opts.dry,
        inputPath: fullPath,
        logger: emitIngestLog,
      });
      if (result.dryRun) {
        console.log(`  [dry] ${rel(fullPath)} -> ${rel(result.path)}`);
      } else {
        console.log(`  ✓ Wrote ${rel(result.path)} (${formatBytes(result.bytes)})`);
      }
      successes += 1;
      await handleSuccess(fullPath, archiveDir, opts.dry);
    } catch (err) {
      failures += 1;
      if (err instanceof IngestValidationError) {
        validationErrors += 1;
        console.error(`  ✖ Spec validation failed for ${file}:`);
        for (const message of err.errors) {
          console.error(`    • ${message}`);
        }
      } else {
        unexpectedErrors += 1;
        console.error(`  ✖ Unexpected error for ${file}: ${err?.stack || err}`);
      }
      await handleFailure(fullPath, failedDir, opts.dry);
    }
  }

  console.log(`Summary: ${successes} succeeded, ${failures} failed, ${processed - successes - failures} skipped.`);

  if (ingestionEvents.length > 0) {
    const summaryEvent = buildSummaryEvent({
      processed,
      successes,
      failures,
      validationErrors,
      readErrors,
      unexpectedErrors,
      events: ingestionEvents,
    });
    console.log(JSON.stringify(summaryEvent));
  }

  if (validationErrors > 0 || readErrors > 0 || unexpectedErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});

function parseArgs(argv) {
  const out = { dry: false, queue: null, archive: null, failed: null, dir: null, limit: Infinity };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry") out.dry = true;
    else if (token === "--queue") out.queue = argv[++i];
    else if (token === "--archive") out.archive = argv[++i];
    else if (token === "--failed") out.failed = argv[++i];
    else if (token === "--dir") out.dir = argv[++i];
    else if (token === "--limit") out.limit = Number(argv[++i]);
    else if (token === "--no-archive") out.archive = false;
    else if (token === "--no-failed") out.failed = false;
  }
  return out;
}

async function handleSuccess(filePath, archiveDir, dry) {
  if (dry) return;
  if (!archiveDir) {
    await fs.unlink(filePath);
    return;
  }
  await ensureDir(archiveDir);
  const target = uniqueTarget(archiveDir, filePath);
  await fs.rename(filePath, target);
}

async function handleFailure(filePath, failedDir, dry) {
  if (dry) return;
  if (!failedDir) return;
  await ensureDir(failedDir);
  const target = uniqueTarget(failedDir, filePath);
  try {
    await fs.rename(filePath, target);
  } catch {
    // If rename fails (e.g., cross-device), fall back to copy + unlink.
    await fs.copyFile(filePath, target);
    await fs.unlink(filePath);
  }
}

function uniqueTarget(dir, filePath) {
  const base = path.basename(filePath);
  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  return path.join(dir, `${base.replace(/\.json$/i, "")}-${stamp}.json`);
}

async function ensureDir(dir) {
  if (!dir) return;
  if (fssync.existsSync(dir)) return;
  await fs.mkdir(dir, { recursive: true });
}

function resolvePath(relPath) {
  return path.resolve(ROOT, relPath);
}

function rel(p) {
  return path.relative(ROOT, p);
}

function formatBytes(n) {
  return `${n} bytes`;
}

function createBatchLogger(store) {
  if (!store) return null;
  return (event) => {
    if (!event) return;
    store.push(event);
    console.log(JSON.stringify(event));
  };
}

function buildSummaryEvent({ processed, successes, failures, validationErrors, readErrors, unexpectedErrors, events }) {
  const totalBytes = events.reduce((sum, event) => sum + (Number.isFinite(event.bytesWritten) ? event.bytesWritten : 0), 0);
  const dryRuns = events.filter((event) => event.dryRun).length;
  const passed = events.filter((event) => event.validationStatus === "passed").length;
  const failed = events.filter((event) => event.validationStatus === "failed").length;
  return {
    event: "ingest.summary",
    timestamp: new Date().toISOString(),
    processed,
    successes,
    failures,
    validationErrors,
    readErrors,
    unexpectedErrors,
    ingested: events.length,
    passed,
    failed,
    dryRuns,
    bytesWritten: totalBytes,
  };
}
