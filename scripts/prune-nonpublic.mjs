#!/usr/bin/env node
/**
 * Prune non-public routes from the production build.
 * Use after `npm run build` to strip admin/dev-only outputs before upload.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "dist");

const PREFIXES = [
  "admin", // Admin UI and tools
  "api", // Dev API endpoints
];

async function removeTarget(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    console.log(`🧹 removed ${targetPath}`);
  } catch (error) {
    console.warn(`⚠️  could not remove ${targetPath}:`, error?.message ?? error);
  }
}

async function run() {
  try {
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => PREFIXES.some((prefix) => entry.name.startsWith(prefix)))
        .map((entry) => removeTarget(path.join(ROOT, entry.name))),
    );
  } catch (error) {
    console.warn("ℹ️  dist/ not found or unreadable; nothing to prune.");
    if (process.env.DEBUG) {
      console.warn(error);
    }
  }
}

void run();
