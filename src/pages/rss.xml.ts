// src/pages/rss.xml.ts
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const prerender = true;

type RssPost = {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
};

export async function GET(context: APIContext) {
  const site = resolveSiteUrl(context) || "https://example.com";
  const posts = await getPostsResilient();

  // newest first
  posts.sort((a, b) => +b.pubDate - +a.pubDate);

  const items = posts
    .map((p) => {
      const link = `${site}/post/${p.slug}`;
      return [
        "<item>",
        `<title>${escapeXml(p.title)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="true">${link}</guid>`,
        `<pubDate>${p.pubDate.toUTCString()}</pubDate>`,
        `<description><![CDATA[${p.description || ""}]]></description>`,
        "</item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    "<title>WitchClick</title>",
    `<link>${site}</link>`,
    "<description>Cozy metaphysical tools & rituals</description>",
    items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}

/* ---------------- helpers ---------------- */

function resolveSiteUrl(context: APIContext): string | null {
  // Prefer astro.config.site, else read from content/settings.json
  if (context.site) {
    try {
      const u = new URL(context.site.toString());
      return u.origin;
    } catch {
      /* noop */
    }
  }
  try {
    const p = path.join(process.cwd(), "content", "settings.json");
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const s = String(j.siteUrl || "").replace(/\/+$/g, "");
      if (s) return s.startsWith("http") ? s : `https://${s}`;
    }
  } catch {
    /* noop */
  }
  return null;
}

async function getPostsResilient(): Promise<RssPost[]> {
  // Try Content Collections first
  try {
    const col = await getCollection("posts", (p) => !p.data.draft);
    if (Array.isArray(col) && col.length) {
      return col.map((p) => ({
        slug: p.slug,
        title: String(p.data.title ?? "Untitled"),
        description: String(p.data.description ?? ""),
        pubDate: new Date(String(p.data.pubDate ?? Date.now())),
      }));
    }
  } catch {
    // falls through to filesystem method
  }
  // Fallback: read ./content/posts/*.md
  const dir = path.join(process.cwd(), "content", "posts");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  const out: RssPost[] = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, "utf8");
    const { data, content } = matter(raw);
    const slug = String((data && data.slug) || file.replace(/\.md$/, "")).toLowerCase();

    const frontDates = [data?.pubDate, data?.publishedAt, data?.date].filter(Boolean) as string[];
    let pubDate = new Date(frontDates[0] || 0);
    if (isNaN(+pubDate)) {
      const stat = fs.statSync(full);
      pubDate = stat.mtime;
    }

    const title = String(data?.title || "Untitled");
    const description =
      String(data?.description || "") || firstSentence(content) || "";

    out.push({ slug, title, description, pubDate });
  }
  return out;
}

function firstSentence(md: string): string | null {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = text.match(/^(.{40,200}?[.!?])\s/);
  return m ? m[1] : null;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
