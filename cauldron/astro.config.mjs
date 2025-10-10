import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  srcDir: './src',
  outDir: '../dist/cauldron',
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
        allow: ['..'],
      },
    },
  },
});
