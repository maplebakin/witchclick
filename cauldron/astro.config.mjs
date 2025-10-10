import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedCandidates = ['witchclick-shared', '../witchclick-shared', '../packages/shared']
  .map((relativePath) => path.resolve(__dirname, relativePath))
  .filter((resolvedPath) => existsSync(resolvedPath));

export default defineConfig({
  srcDir: './src',
  outDir: './dist',
  server: {
    port: 4370,
    host: true,
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    server: {
      fs: {
        allow: [path.resolve(__dirname, '.'), ...sharedCandidates],
      },
    },
  },
});
