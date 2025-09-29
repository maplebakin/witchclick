#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const ENT_DIRS = [
  path.join(CWD, "content/entities/ritual"),
  path.join(CWD, "src/content/entities/ritual"),
];
const POSTS_DIR = path.join(CWD, "content/posts/rituals");
const MAP_PATH = path.join(CWD, "content/posts/_slug-map.json");
const REPORT_PATH = path.join(CWD, "reports/ritual-post-matches.json");

const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const slugify = (s) => String(s||"").toLowerCase().trim()
  .replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "")
  .replace(/-+/g, "-").replace(/^-|-$/g, "");

const loadEntities = () => {
  const dir = ENT_DIRS.find(exists);
  if (!dir) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith(".json")).map(f=>{
    const data = JSON.parse(fs.readFileSync(path.join(dir,f), "utf8"));
    const slug = slugify(data?.slug || f.replace(/\.json$/,""));
    return { slug, name: data?.name || "", summary: data?.summary || "" };
  }).sort((a,b)=>a.slug.localeCompare(b.slug));
};

const findPostFile = (slug) => {
  const roots = [path.join(CWD,"content/posts"), POSTS_DIR];
  const exts = [".md",".mdx"];
  for (const root of roots) {
    for (const ext of exts) {
      const direct = path.join(root, `${slug}${ext}`);
      const index  = path.join(root, slug, `index${ext}`);
      if (exists(direct) || exists(index)) return true;
    }
  }
  return false;
};

function main() {
  const ents = loadEntities();
  const map = exists(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) : {};
  const misses = [];

  for (const e of ents) {
    const routedSlug = slugify(map[e.slug] || e.slug);
    if (!findPostFile(routedSlug)) misses.push({ ...e, routedSlug });
  }

  if (!misses.length) {
    console.log("✅ No missing posts. Nothing to stub.");
    return;
  }

  if (!exists(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  for (const m of misses) {
    const file = path.join(POSTS_DIR, `${m.routedSlug}.md`);
    if (exists(file)) continue;
    const fm = [
      "---",
      `title: "${m.name || m.routedSlug.replace(/-/g, " ")}"`,
      `description: "${(m.summary || "").replace(/"/g, '\\"')}"`,
      `tags: ["ritual"]`,
      `entitySlug: "${m.slug}"`,
      "---",
      "",
      `> This is an auto-generated stub for **${m.name || m.routedSlug}**.`,
      "",
      "## Overview",
      "",
      "_Write the ritual steps, tools, and timing here._",
      "",
      "## Steps",
      "- ",
      "",
      "## Notes",
      "- ",
      ""
    ].join("\n");
    fs.writeFileSync(file, fm, "utf8");
    console.log("✍️  Created", path.relative(CWD, file));
  }

  console.log(`\n📝 Stubs created in ${path.relative(CWD, POSTS_DIR)}. Rebuild to see them:`);
  console.log("   npm run build && npm run preview");
}

main();
