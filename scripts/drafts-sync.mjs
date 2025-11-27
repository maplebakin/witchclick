#!/usr/bin/env node
/**
 * Sync Cauldron draft JSON files into the main repo for review/ingest.
 * Copies cauldron/src/data/drafts/*.json → content/drafts/
 */
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, "cauldron", "src", "data", "drafts");
const targetDir = path.join(projectRoot, "content", "drafts");

async function listJsonFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

async function copyDrafts() {
  const files = await listJsonFiles(sourceDir);
  if (!files.length) {
    console.log("ℹ️  No drafts found in cauldron/src/data/drafts");
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  let copied = 0;
  for (const filePath of files) {
    const dest = path.join(targetDir, path.basename(filePath));
    await fs.copyFile(filePath, dest);
    copied += 1;
    console.log(`📄 copied ${path.basename(filePath)} → ${path.relative(projectRoot, dest)}`);
  }
  console.log(`✅ Draft sync complete (${copied} files)`);
}

copyDrafts().catch((error) => {
  console.error("Draft sync failed:", error);
  process.exit(1);
});
