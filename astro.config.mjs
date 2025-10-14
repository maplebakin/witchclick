// astro.config.mjs — drop‑in with '@' alias preserved around your existing config
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
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

// Server in DEV so /api routes accept POST; Static in BUILD so deploys stay simple.
export default defineConfig(({ command }) => {
  const output = command === "dev" ? "server" : "static";
  console.log("[astro.config] command =", command, "→ output =", output);

  const site = normalizeSite(settings.siteUrl);

  return {
    site,
    output,
    trailingSlash: "never",
    compressHTML: true,

    integrations: [
      tailwind(),
      sitemap({
        filter: (page) => {
          if (/\/admin(\/|$)/.test(page)) return false;
          if (/\/api\//.test(page)) return false;
          if (/\/404(\.html)?$/.test(page)) return false;
          return true;
        },
      }),
    ],

    markdown: {
      syntaxHighlight: false,
      gfm: true,
      smartypants: true,
    },

    redirects: {
      "/rss": "/rss.xml",
      "/feed": "/rss.xml",
    },

    server: {
      host: true,
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
  };
});
