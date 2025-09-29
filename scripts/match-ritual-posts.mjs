#!/usr/bin/env node
/**
 * Match ritual entity slugs to posts in content/posts and emit:
 * - reports/ritual-post-matches.json (full match info)
 * - content/posts/_slug-map.json (on --write; ONLY non-exact mappings)
 *
 * Usage:
 *   npm run match:rituals         # dry-run, prints summary + writes report
 *   npm run match:rituals:write   # writes/updates _slug-map.json
 */

import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const ENT_RITUAL_DIRS = [
  path.join(CWD, "content/entities/ritual"),
  path.join(CWD, "src/content/entities/ritual"),
];
const POSTS_ROOTS = [
  path.join(CWD, "content/posts"),
  path.join(CWD, "content/posts/rituals"),
];

const REPORT_DIR = path.join(CWD, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "ritual-post-matches.json");
const SLUG_MAP_PATH = path.join(CWD, "content/posts/_slug-map.json");
const WRITE = process.argv.includes("--write");

// -------------------------- helpers --------------------------
const fileExists = (p) => {
  try { return fs.existsSync(p); } catch { return false; }
};

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const ensureDir = (p) => { if (!fileExists(p)) fs.mkdirSync(p, { recursive: true }); };

const normalizeSlug = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const stripExt = (f) => f.replace(/\.(md|mdx)$/i, "");

const isMarkdown = (f) => /\.(md|mdx)$/i.test(f);

function walk(dir, acc = []) {
  if (!fileExists(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (stat.isFile() && isMarkdown(entry)) acc.push(full);
  }
  return acc;
}

// Levenshtein distance (small and fast enough for this list size)
function levenshtein(a, b) {
  a = a || ""; b = b || "";
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // delete
        dp[i][j - 1] + 1,      // insert
        dp[i - 1][j - 1] + cost // sub
      );
    }
  }
  return dp[m][n];
}

const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;

// -------------------------- load data --------------------------
function loadRitualEntitySlugs() {
  const dir = ENT_RITUAL_DIRS.find(fileExists);
  if (!dir) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    try {
      const data = readJSON(path.join(dir, f));
      const slug = normalizeSlug(data?.slug ? String(data.slug) : f.replace(/\.json$/, ""));
      out.push({ slug, name: data?.name || "", file: f });
    } catch {}
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadPostCandidates() {
  const posts = [];
  for (const root of POSTS_ROOTS) {
    for (const file of walk(root)) {
      const rel = path.relative(root, file);
      const base = stripExt(path.basename(file));
      const dir = path.dirname(rel);
      const normalizedFileSlug = normalizeSlug(base.replace(DATE_PREFIX_RE, "")); // strip date if present
      // candidate router slugs (we route at /post/[slug])
      const candidateSlugs = new Set([
        normalizeSlug(base),
        normalizedFileSlug,
        normalizeSlug(path.basename(dir)), // folder name
      ]);
      posts.push({
        file,
        root,
        rel,
        base,
        dir,
        slugCandidates: Array.from(candidateSlugs).filter(Boolean),
      });
    }
  }
  return posts;
}

// -------------------------- matching --------------------------
function scoreMatch(ritualSlug, post) {
  const want = normalizeSlug(ritualSlug);

  // Highest priority: exact candidate match
  if (post.slugCandidates.includes(want)) {
    return { score: 100, reason: "exact" };
  }

  // Date-prefixed or index folder: already normalized above; check proximity
  // Heuristic: choose smallest levenshtein among candidates
  let best = { score: -Infinity, reason: "none" };
  for (const cand of post.slugCandidates) {
    const dist = levenshtein(want, cand);
    const maxLen = Math.max(want.length, cand.length) || 1;
    const sim = 1 - dist / maxLen; // 0..1
    const score = Math.round(sim * 80); // cap fuzzy at 80
    if (score > best.score) best = { score, reason: `fuzzy(${cand})` };
  }

  // Bonus if ritual slug appears as a substring in the filename or path
  const hay = `${post.base} ${post.rel}`.toLowerCase();
  if (hay.includes(want)) {
    best = { score: Math.max(best.score, 85), reason: "substring" };
  }

  return best;
}

function bestPostForSlug(ritualSlug, posts) {
  let best = null;
  for (const p of posts) {
    const s = scoreMatch(ritualSlug, p);
    if (!best || s.score > best.score) best = { post: p, ...s };
  }
  return best; // { post, score, reason }
}

// -------------------------- main --------------------------
function main() {
  const rituals = loadRitualEntitySlugs();
  const posts = loadPostCandidates();

  if (!rituals.length) {
    console.log("No ritual entity JSON files found.");
    process.exit(0);
  }

  const results = [];
  const nonExactMap = {}; // only non-exact mappings will be written to _slug-map.json
  let exactCount = 0, fuzzyCount = 0, missCount = 0;

  for (const r of rituals) {
    const best = bestPostForSlug(r.slug, posts);
    if (!best || best.score < 50) {
      // treat as miss below 50
      results.push({
        ritual: r.slug,
        match: null,
        score: 0,
        reason: "no-confident-match",
      });
      missCount++;
      continue;
    }

    const routerSlug = normalizeSlug(r.slug); // we route as /post/[slug]
    const isExact = best.reason === "exact";
    if (isExact) exactCount++;
    else fuzzyCount++;

    results.push({
      ritual: r.slug,
      match: {
        routerSlug,                    // /post/[routerSlug]
        file: best.post.file,
        rel: best.post.rel,
      },
      score: best.score,
      reason: best.reason,
    });

    if (!isExact) {
      // suggest a mapping from ritual slug -> routerSlug (which may be same)
      // If the best candidate's slug differs, record it
      const altCand = best.post.slugCandidates.find((c) => c !== routerSlug);
      const final = altCand || routerSlug;
      if (final !== r.slug) {
        nonExactMap[r.slug] = final;
      }
    }
  }

  ensureDir(REPORT_DIR);
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), exactCount, fuzzyCount, missCount, results }, null, 2));
  console.log(`📝 Wrote match report → ${path.relative(CWD, REPORT_PATH)}`);
  console.log(`   Exact: ${exactCount} • Fuzzy: ${fuzzyCount} • Misses: ${missCount}`);

  if (WRITE) {
    // Merge with existing map if present
    let existing = {};
    if (fileExists(SLUG_MAP_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(SLUG_MAP_PATH, "utf8")); } catch {}
    }
    const merged = { ...existing, ...nonExactMap };
    ensureDir(path.dirname(SLUG_MAP_PATH));
    fs.writeFileSync(SLUG_MAP_PATH, JSON.stringify(merged, null, 2));
    console.log(`✍️  Updated slug map → ${path.relative(CWD, SLUG_MAP_PATH)} (${Object.keys(nonExactMap).length} entries)`);
  } else {
    console.log("💡 Dry run. Add --write to update content/posts/_slug-map.json with non-exact matches.");
  }
}

main();
