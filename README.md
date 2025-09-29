# WitchClick

A production-focused, static site platform for cozy metaphysical content. Prompt → JSON → CLI ingest → site. SEO-forward, internal linking, and affiliate routing with zero server.

## Publishing workflow

The end-to-end publishing checklist lives in [docs/publishing.md](docs/publishing.md). It covers prompt generation, ingestion, testing, and deployment expectations for new contributors.

## Continuous integration

Pull requests and pushes run through the automated workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It installs dependencies with `npm ci`, executes `npm run check`, runs the Vitest suite via `npm test`, and verifies the production build with `npm run build` to ensure changes are ready to deploy.
