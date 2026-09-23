// astro.config.mjs — drop‑in with '@' alias preserved around your existing config
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';

/** -------- Read settings with safe fallback -------- */
function readSettings() {
  const fallback = {
    siteUrl: "https://example.com",
    brandName: "WitchClick",
  };
  try {
    const p = path.join(process.cwd(), "content", "settings.json");
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, "utf8");
    const json = JSON.parse(raw);
    return { ...fallback, ...json };
  } catch {
    return fallback;
  }
}
const settings = readSettings();

/** Normalize site: drop trailing slash, ensure protocol */
function normalizeSite(u) {
  try {
    const s = String(u || "").trim().replace(/\/+$/g, "");
    // If missing protocol, assume https
    return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
  } catch {
    return "https://example.com";
  }
}

// Static site generation for zero-server deployment
// Admin pages work as static HTML calling dev-api.js (port 8787)
// Note: Sitemap generation handled by scripts/generate-sitemap.mjs post-build

const site = normalizeSite(settings.siteUrl);

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "never",
  compressHTML: true,

  integrations: [
    tailwind(),
  ],

  markdown: {
    syntaxHighlight: false,
    gfm: true,
    smartypants: true,
  },

  redirects: {
    "/rss": "/rss.xml",
    "/feed": "/rss.xml",
    "/salon": "/hub",
    "/study": "/",
    "/study/herbary": "/entities/herb",
    "/study/crystal-grotto": "/entities/crystal",
    "/study/moon-chamber": "/entities/moonPhase",
    "/study/grimoire": "/entities",
  },

  server: {
    host: process.env.HOST === "0.0.0.0" ? "0.0.0.0" : "127.0.0.1",
    // port: 4321,
  },

  // ✅ Vite alias so `@/…` resolves to `src/…`
  vite: {
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // optimizeDeps: { include: [] },
    // ssr: { external: [] },
  },
});
