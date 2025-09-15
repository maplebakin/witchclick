// src/pages/robots.txt.ts
import type { APIContext } from "astro";
import fs from "node:fs";
import path from "node:path";

export const prerender = true;

export async function GET(context: APIContext) {
  const origin = resolveSiteOrigin(context) ?? "https://witchclick.space";
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    `Sitemap: ${origin}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function resolveSiteOrigin(context: APIContext): string | null {
  try {
    if (context.site) return new URL(context.site.toString()).origin;
  } catch {
    /* noop */
  }
  try {
    const p = path.join(process.cwd(), "content", "settings.json");
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const s = String(j.siteUrl || "").replace(/\/+$/g, "");
      if (!s) return null;
      return s.startsWith("http") ? s : `https://${s}`;
    }
  } catch {
    /* noop */
  }
  return null;
}
