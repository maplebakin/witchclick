// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";

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

// Server in DEV so /api routes accept POST; Static in BUILD so deploys stay simple.
export default defineConfig(({ command }) => {
  const output = command === "dev" ? "server" : "static";
  // Keep the friendly log you had
  console.log("[astro.config] command =", command, "→ output =", output);

  const site = normalizeSite(settings.siteUrl);

  return {
    site,
    output,

    // Keep URLs clean on a static site
    trailingSlash: "never",
    compressHTML: true,

    integrations: [
      tailwind(),
      sitemap({
        filter: (page) => {
          // Skip admin, api, and 404 pages from sitemap
          if (/\/admin(\/|$)/.test(page)) return false;
          if (/\/api\//.test(page)) return false;
          if (/\/404(\.html)?$/.test(page)) return false;
          return true;
        },
      }),
    ],

    markdown: {
      syntaxHighlight: false, // lighter, faster
      gfm: true,              // GitHub-flavored markdown (tables, etc.)
      smartypants: true,      // nicer punctuation
    },

    // Handy shortcut redirects (optional)
    redirects: {
      "/rss": "/rss.xml",
      "/feed": "/rss.xml",
    },

    // Dev niceties
    server: {
      host: true, // allow LAN testing
      // port: 4321, // uncomment to pin the port
    },

    // Vite tweaks if/when needed
    vite: {
      // Define a build timestamp if you want cache-busting fingerprints in templates
      define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      },
      // optimizeDeps: { include: [] },
      // ssr: { external: [] },
    },
  };
});
