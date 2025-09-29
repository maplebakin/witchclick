# WitchClick

A production-focused, static site platform for cozy metaphysical content. Prompt → JSON → CLI ingest → site. SEO-forward, internal linking, and affiliate routing with zero server.

## Publishing workflow

### Hero images

- Install dependencies (`npm install`) so the bundled `@fal-ai/client` is available.
- Set the `FAL_KEY` environment variable with your Fal API token before generating artwork.
- Run `node tools/hero-image.mjs --slug <slug>` (or pass `--all`) to create/update post hero images. The script now calls Fal's
  `fal-ai/flux/dev` model using the post's `heroImagePrompt` front matter (falling back to the title) as the prompt, writes the
  returned PNG to `public/hero-images/<slug>.png`, and updates front matter. If the API request fails or the key is missing, the
  command logs a warning and reverts to the legacy SVG/sharp pipeline so content editors are never blocked.

