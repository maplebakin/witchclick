#!/usr/bin/env node
/**
 * Sort/inspect ritual entities by vibe, with smart guessing.
 *
 * Usage:
 *   node scripts/sort-rituals-by-vibe.mjs
 *   node scripts/sort-rituals-by-vibe.mjs --write
 *   node scripts/sort-rituals-by-vibe.mjs --dir ./path
 *
 * Extras:
 *   - Optional overrides at content/entities/ritual/_vibes-map.json
 *     { "pre-interview-grounding-ritual": "Grounding", "game-night-ritual": "Gaming" }
 */

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const has = (flag) => args.has(flag) || args.has(`--${flag}`);
const getArgValue = (name, fallback = "") => {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  return idx > -1 ? (process.argv[idx + 1] || fallback) : fallback;
};

const RITUAL_DIR = (() => {
  const override = getArgValue("dir", "");
  if (override) return override;
  const candidates = ["./content/entities/ritual", "./src/content/entities/ritual"];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return "";
})();

if (!RITUAL_DIR) {
  console.error("❌ Could not find ritual entities directory.");
  process.exit(1);
}

const OVERRIDES_PATH = path.join(RITUAL_DIR, "_vibes-map.json");
let OVERRIDES = {};
try {
  if (fs.existsSync(OVERRIDES_PATH)) {
    OVERRIDES = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
  }
} catch {}

// Canon mapping → display buckets
const VIBE_CANON = {
  reset: "Reset", refresh: "Reset", cleanse: "Reset", cleansing: "Reset", clear: "Reset", resetting: "Reset",
  ground: "Grounding", grounding: "Grounding", center: "Grounding", centering: "Grounding", root: "Grounding",
  gaming: "Gaming", game: "Gaming", focus: "Gaming", concentration: "Gaming", study: "Gaming", productivity: "Gaming",
  calm: "Calm", soothe: "Calm", soothing: "Calm", anxiety: "Calm", relax: "Calm", relaxation: "Calm",
  protection: "Protection", protect: "Protection", ward: "Protection",
  clarity: "Clarity", insight: "Clarity", vision: "Clarity",
  energy: "Energy", energize: "Energy", boost: "Energy"
};

const titleCase = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
const words = (s) => String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Heuristic: try overrides > explicit vibe > keywords > slug/title tokens */
function guessVibeFor({ slug, data }) {
  if (OVERRIDES[slug]) return OVERRIDES[slug];

  const props = (data.properties && typeof data.properties === "object") ? data.properties : {};
  let raw = String(props.vibe || "").toLowerCase().trim();
  if (raw && VIBE_CANON[raw]) return VIBE_CANON[raw];
  if (raw) return titleCase(raw);

  const hay = new Set([
    ...words(data.name),
    ...words(data.summary),
    ...words(slug),
    ...(Array.isArray(props.keywords) ? props.keywords.map((k) => String(k).toLowerCase()) : [])
  ]);

  for (const token of hay) {
    if (VIBE_CANON[token]) return VIBE_CANON[token];
  }

  // simple multi-word hints
  const joined = Array.from(hay).join(" ");
  if (/\b(game|gaming|controller|boss|speedrun)\b/.test(joined)) return "Gaming";
  if (/\binterview|first-day|onboarding|meeting\b/.test(joined)) return "Grounding";
  if (/\bwalkaway|cooldown|reset|clear|cleanse\b/.test(joined)) return "Reset";
  if (/\bcalm|soothe|anxiety|relax|tea\b/.test(joined)) return "Calm";
  if (/\bprotect|ward|boundary\b/.test(joined)) return "Protection";
  if (/\bclarity|focus|decision|insight\b/.test(joined)) return "Clarity";
  if (/\benerg(y|ize)|spark|kickstart\b/.test(joined)) return "Energy";

  return "Other";
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
function writeJSONPretty(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const files = fs.readdirSync(RITUAL_DIR).filter((f) => f.endsWith(".json"));
/** @type {Array<{slug:string, file:string, data:any, vibe:string}>} */
const items = [];

for (const f of files) {
  const file = path.join(RITUAL_DIR, f);
  const data = readJSON(file);
  if (!data || typeof data !== "object") continue;
  const slug = (data.slug ? String(data.slug) : f.replace(/\.json$/, "")).toLowerCase();
  const vibe = guessVibeFor({ slug, data });
  items.push({ slug, file, data, vibe });
}

// group
const byVibe = {};
for (const it of items) (byVibe[it.vibe] ||= []).push({ slug: it.slug, file: it.file });
const vibes = Object.keys(byVibe).sort();

// report
const report = {};
for (const v of vibes) report[v] = byVibe[v].map((x) => x.slug).sort();

console.log(`📂 Ritual dir: ${path.resolve(RITUAL_DIR)}`);
console.log(`🔎 Found ${items.length} ritual file${items.length === 1 ? "" : "s"} in ${vibes.length} vibe bucket${vibes.length === 1 ? "" : "s"}.\n`);
for (const v of vibes) {
  const list = report[v];
  console.log(`${v} — ${list.length}`);
  if (list.length) console.log("  " + list.join(", "));
}

writeJSONPretty(path.join("reports", "ritual-vibes.json"), report);
console.log(`\n📝 Wrote report → reports/ritual-vibes.json`);

if (has("--write") || has("write")) {
  let changed = 0;
  for (const it of items) {
    const current = (it.data.properties && typeof it.data.properties === "object" && it.data.properties.vibe)
      ? String(it.data.properties.vibe)
      : "";
    const canonical = it.vibe;
    if (current !== canonical) {
      if (!it.data.properties || typeof it.data.properties !== "object") it.data.properties = {};
      it.data.properties.vibe = canonical;
      writeJSONPretty(it.file, it.data);
      changed++;
    }
  }
  console.log(`\n✍️ Normalized properties.vibe in ${changed} file${changed === 1 ? "" : "s"}.`);
} else {
  console.log(`\n(dry run) Add --write to normalize properties.vibe to the canonical bucket names.`);
}

if (!fs.existsSync(OVERRIDES_PATH)) {
  console.log(`\n💡 Tip: create ${OVERRIDES_PATH} to force specific slugs to a vibe.`);
}
