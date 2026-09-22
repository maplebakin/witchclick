#!/usr/bin/env node
/**
 * Prune non-public routes from the production build.
 * Use after `npm run build` to strip admin/dev-only outputs before upload.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "dist");

const NONPUBLIC_ROOTS = new Set([
  "admin", // Admin UI and tools
  "api", // Dev API endpoints
  "account", // Unlaunched local member shelf
  "lab", // Internal/unfinished ritual lab
]);

async function removeTarget(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
  console.log(`🧹 removed ${targetPath}`);
}

async function run() {
  try {
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => NONPUBLIC_ROOTS.has(entry.name))
        .map((entry) => removeTarget(path.join(ROOT, entry.name))),
    );
    const remaining = await fs.readdir(ROOT);
    const leaks = remaining.filter((entry) => NONPUBLIC_ROOTS.has(entry));
    if (leaks.length > 0) {
      throw new Error(`Non-public build output remains: ${leaks.join(", ")}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn("ℹ️  dist/ not found; nothing to prune.");
      return;
    }
    console.error("❌ Failed to prune non-public build output.", error);
    process.exitCode = 1;
  }
}

void run();
