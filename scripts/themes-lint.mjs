#!/usr/bin/env node
/**
 * Lightweight lint for theme presets:
 * - Valid JSON in content/themes/*.json
 * - Required fields present in settings
 * - Unique slug + mode pairs
 */
import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_FIELDS = ["primary", "accent", "background", "fontSerif", "fontScript"];
const THEMES_DIR = path.join(process.cwd(), "content", "themes");
const IGNORED_FILES = new Set(["active.json"]);

async function readThemeFiles() {
  try {
    const entries = await fs.readdir(THEMES_DIR, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".json") &&
          !IGNORED_FILES.has(entry.name.toLowerCase())
      )
      .map((entry) => path.join(THEMES_DIR, entry.name));
  } catch (error) {
    console.error("No theme directory found at content/themes:", error?.message ?? error);
    process.exit(1);
  }
}

async function lintTheme(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { file: filePath, errors: [`Invalid JSON: ${error?.message ?? error}`] };
  }

  const errors = [];
  if (!parsed.slug || typeof parsed.slug !== "string") errors.push("Missing slug");
  if (!parsed.mode || !["midnight", "dawn"].includes(parsed.mode)) errors.push("Missing/invalid mode (midnight|dawn)");
  const settings = parsed.settings || {};
  REQUIRED_FIELDS.forEach((field) => {
    if (!settings[field]) errors.push(`settings.${field} is required`);
  });

  return { file: filePath, slug: parsed.slug, mode: parsed.mode, errors };
}

async function run() {
  const files = await readThemeFiles();
  const results = await Promise.all(files.map(lintTheme));
  const seen = new Set();
  const errors = [];

  for (const result of results) {
    const key = `${result.mode}::${result.slug}`;
    if (result.slug && result.mode) {
      if (seen.has(key)) {
        errors.push(`${result.file}: duplicate slug/mode pair (${key})`);
      } else {
        seen.add(key);
      }
    }
    if (result.errors.length) {
      result.errors.forEach((err) => errors.push(`${result.file}: ${err}`));
    }
  }

  if (errors.length) {
    console.error("Theme lint failed:\n- " + errors.join("\n- "));
    process.exit(1);
  } else {
    console.log(`✅ ${results.length} theme files look good (required fields + unique slug/mode)`);
  }
}

run().catch((error) => {
  console.error("Theme lint errored:", error);
  process.exit(1);
});
