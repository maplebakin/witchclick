#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DRAFT_ROUTE_PREFIXES = ["/post", "/sampler"];

function isDraft(data) {
  if (!data || typeof data !== "object") return false;
  return data.draft === true || data.published === false;
}

function deriveSlug(filename, data) {
  if (data && typeof data.slug === "string" && data.slug.trim()) {
    return data.slug.trim().toLowerCase();
  }
  return filename.replace(/\.md$/i, "").toLowerCase();
}

export function collectDraftPostSlugs(postsDir) {
  if (!fs.existsSync(postsDir)) return [];

  const files = fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const slugs = new Set();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
    const { data } = matter(raw);
    if (isDraft(data)) {
      slugs.add(deriveSlug(file, data));
    }
  }

  return Array.from(slugs).sort();
}

function findHtmlFiles(dir, baseDir = dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findHtmlFiles(fullPath, baseDir));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files;
}

function filePathToPathname(filePath) {
  let pathname = `/${filePath.replace(/\\/g, "/")}`;
  pathname = pathname.replace(/\/index\.html$/i, "/");
  pathname = pathname.replace(/\.html$/i, "");
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  return pathname;
}

function isDraftRouteLeak(pathname, slug) {
  return DRAFT_ROUTE_PREFIXES.some((prefix) => pathname === `${prefix}/${slug}`);
}

export function findLeakedDraftRoutes(distDir, draftSlugs) {
  if (!fs.existsSync(distDir) || draftSlugs.length === 0) return [];
  const htmlFiles = findHtmlFiles(distDir);
  const leaked = [];

  for (const file of htmlFiles) {
    const pathname = filePathToPathname(file);
    for (const slug of draftSlugs) {
      if (isDraftRouteLeak(pathname, slug)) {
        leaked.push({ slug, pathname });
      }
    }
  }

  return leaked;
}

function collectSitemapFiles(distDir) {
  if (!fs.existsSync(distDir)) return [];
  return fs
    .readdirSync(distDir)
    .filter((file) => /^sitemap(?:-\d+)?\.xml$/i.test(file))
    .map((file) => path.join(distDir, file))
    .sort();
}

export function findLeakedDraftSitemapUrls(distDir, draftSlugs) {
  if (draftSlugs.length === 0) return [];

  const leaks = [];
  for (const sitemapPath of collectSitemapFiles(distDir)) {
    const xml = fs.readFileSync(sitemapPath, "utf8");
    const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);

    for (const match of locMatches) {
      const loc = match[1];
      if (!loc) continue;

      let pathname = "";
      try {
        pathname = new URL(loc).pathname;
      } catch {
        continue;
      }

      for (const slug of draftSlugs) {
        if (isDraftRouteLeak(pathname, slug)) {
          leaks.push({
            slug,
            pathname,
            sitemap: path.basename(sitemapPath),
          });
        }
      }
    }
  }

  return leaks;
}

export function verifyNoDraftLeaks({
  projectRoot = process.cwd(),
  postsDir = path.join(projectRoot, "src", "content", "posts"),
  distDir = path.join(projectRoot, "dist"),
} = {}) {
  const draftSlugs = collectDraftPostSlugs(postsDir);
  if (draftSlugs.length === 0) {
    return { ok: true, draftSlugs: [], routeLeaks: [], sitemapLeaks: [] };
  }

  const routeLeaks = findLeakedDraftRoutes(distDir, draftSlugs);
  const sitemapLeaks = findLeakedDraftSitemapUrls(distDir, draftSlugs);
  const ok = routeLeaks.length === 0 && sitemapLeaks.length === 0;

  return { ok, draftSlugs, routeLeaks, sitemapLeaks };
}

function logAndExit(result) {
  if (result.ok) {
    console.log(
      `✅ Draft leak check passed (${result.draftSlugs.length} draft post slugs scanned).`,
    );
    process.exit(0);
  }

  console.error("❌ Draft content leak detected in production output.");
  if (result.routeLeaks.length > 0) {
    console.error("\nLeaked HTML routes:");
    for (const leak of result.routeLeaks) {
      console.error(`- ${leak.pathname} (draft slug: ${leak.slug})`);
    }
  }

  if (result.sitemapLeaks.length > 0) {
    console.error("\nLeaked sitemap URLs:");
    for (const leak of result.sitemapLeaks) {
      console.error(`- ${leak.pathname} via ${leak.sitemap} (draft slug: ${leak.slug})`);
    }
  }

  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  logAndExit(verifyNoDraftLeaks());
}
