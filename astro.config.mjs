// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

const settings = JSON.parse(fs.readFileSync('./content/settings.json','utf8'));

// Server in DEV so /api routes accept POST; Static in BUILD so deploys stay simple.
export default defineConfig(({ command }) => {
  const out = command === 'dev' ? 'server' : 'static';
  console.log('[astro.config] command =', command, '→ output =', out);
  return {
    site: settings.siteUrl || 'https://example.com',
    output: out,
    integrations: [tailwind(), sitemap()],
    markdown: { syntaxHighlight: false }
  };
});
