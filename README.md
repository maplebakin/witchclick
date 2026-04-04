# WitchClick

WitchClick is a solo-built Astro site for cozy, secular, neurodivergent-friendly metaphysical content. The public site ships as static HTML, while local content/admin work runs through a small development API (`dev-api.js`) that handles prompt generation, ingest, post/entity editing, hero image uploads, and other admin tasks.

## Tech stack

- Astro 5 (`output: "static"`)
- Tailwind CSS plus the project's token-based design system
- TypeScript with strict settings
- `dev-api.js` for local admin mutations and media upload
- Vitest for unit tests and Playwright for E2E checks

## Prerequisites and setup

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

That command starts all three local processes you usually need:

- Astro dev server
- `dev-api.js` on `127.0.0.1:8787` by default
- theme CSS watcher

Useful variants:

```bash
npm run dev:host   # Astro on 0.0.0.0 for LAN testing
npm run dev:all    # same startup path as npm run dev
```

Open the site at `http://localhost:4321` unless Astro chooses a different port.

## Available scripts

### Daily development

- `npm run dev` — start Astro, the local admin API, and the theme watcher.
- `npm run dev:host` — same as `dev`, but binds Astro to `0.0.0.0`.
- `npm run dev:all` — same as `dev`.
- `npm run preview` — preview the built site.
- `npm run format` — run Prettier across the repo.

### Build and deploy prep

- `npm run build` — build the post cache, run the Astro build, generate the sitemap, verify draft leaks, and prune non-public outputs.
- `npm run build:public` — alias for `npm run build`.
- `npm run prebuild` — internal pre-build step run automatically before `build`; checks proxy env, rebuilds theme CSS, and builds admin scripts.
- `npm run build:admin-scripts` — rebuild bundled admin scripts.
- `npm run postbuild` — prints the build-complete message.

### Checks and tests

- `npm run check` — Astro check, TypeScript, and ESLint.
- `npm run lint` — ESLint only.
- `npm run test` — run Vitest.
- `npm run test:watch` — Vitest watch mode.
- `npm run test:coverage` — Vitest with coverage.
- `npm run test:e2e` — Playwright E2E tests.
- `npm run linkcheck` — internal/external link validation.
- `npm run check:links` — alias for `npm run linkcheck`.
- `npm run check:prepub` — `check` + public build + link check.
- `npm run audit:seo` — SEO audit script.
- `npm run check:affiliates` — catch placeholder or broken affiliate IDs.
- `npm run themes:lint` — validate theme JSON files.

### Content pipeline and admin utilities

- `npm run genprompt` — generate post prompts via `tools/wc.js`.
- `npm run ingest -- <file>` — ingest a PostSpec JSON file into markdown/content.
- `npm run ingest:quick` — direct alias to the ingest script.
- `npm run drafts:sync` — sync draft JSON into the local content draft area.
- `npm run curses` — generate curse prompts via the CLI.
- `npm run ingest:curses` — ingest curse JSON.
- `npm run export:curses` — export curse cards/print files.
- `npm run themes:build` — generate theme CSS once.
- `npm run themes:watch` — watch and regenerate theme CSS.
- `npm run tools:export:install` — install Playwright Chromium for export tooling.
- `npm run ship -- "message"` — project helper to run checks, commit, and push.
- `npm run zip` — create a backup zip of the repo, excluding `node_modules`, `.git`, and `dist`.

## Content pipeline

### Posts

The normal post flow is:

1. Generate a prompt in `/admin/generator` or with `npm run genprompt`.
2. Send that prompt to your LLM and get back PostSpec JSON.
3. Validate and preview that JSON in `/admin/generator`, or ingest it from the CLI with `npm run ingest -- ./path/to/spec.json`.
4. Save it as a draft or publish-ready post.
5. Review drafts in `/admin/staging`.
6. Edit frontmatter/markdown in `/admin/posts`.
7. Add a hero image in `/admin/hero`.
8. Run `npm run build` for a deployable static output.

The ingest pipeline still centers on PostSpec JSON. In practice it looks like this:

- prompt
- PostSpec JSON
- validation/normalization
- markdown + frontmatter written into the content tree
- static build output in `dist/`

### Entities

Entities live under `content/entities/<type>/<slug>.json` and are managed through `/admin/entities`. The current admin supports:

- search
- type/status/sort filters
- create/edit
- delete with confirmation
- stub tracking

Entity stubs are also surfaced in `/admin/stubs`.

### Curses

Curses use their own admin flow now. Use `/admin/curses` for prompt + ingest work and `/admin/curses/archive` for archive editing/export work. The old README wording that implied curses lived inside the main `/admin` generator is no longer correct.

## Admin workflow

The admin is primarily a local-development tool. In plain terms: run `npm run dev`, then use the admin routes below.

By default the admin is available in dev. When hosted behind a server adapter, most admin pages can also be unlocked with `PUBLIC_ADMIN_KEY` and `?key=...`.

### Core routes

- `/admin` — dashboard with post/entity counts, recent posts, draft shortcuts, hero backlog, quick actions, and slug jump.
- `/admin/generator` — PostSpec generator, validation, preview, and ingest workflow.
- `/admin/staging` — draft review/publish/delete queue with live search.
- `/admin/write` — write a post manually and save/publish from the browser.
- `/admin/posts` — post editor with search, status filter, hero filter, sort controls, and keyboard save.
- `/admin/entities` — entity editor with search, type/status filters, sort, delete, and keyboard save.
- `/admin/hero` — post hero image workflow.
- `/admin/stubs` — entity stub workflow.
- `/admin/curses` — curses prompt/generation dashboard.
- `/admin/curses/archive` — curses archive editor/export tools.

### Other admin routes

These exist and are still active:

- `/admin/authors`
- `/admin/partners`
- `/admin/calendar`
- `/admin/downloads`
- `/admin/home`
- `/admin/theme`
- `/admin/products`
- `/admin/settings`

### Current admin shortcuts worth knowing

- Global search (`Cmd+K` / `Ctrl+K`) searches posts and entities.
- Save shortcuts exist on the main editors: `Cmd+S` / `Ctrl+S` on posts, entities, write, stub dashboard, and curse archive.

## Hero image workflow

The hero workflow is now a real end-to-end flow in `/admin/hero`.

1. Select a post, or deep-link directly with `/admin/hero?post=<slug>`.
2. Review the post's hero prompt.
   - If `heroImagePrompt` already exists, it loads as-is.
   - If it is missing, the admin generates a fallback prompt from the post title and tags.
   - The prompt is editable, can be regenerated, copied, and saved back to the post frontmatter.
3. Choose an image file.
   - Accepted types: `image/jpeg`, `image/png`, `image/webp`
   - Practical safe limit: about `3.5 MB`
   - Hard client-side limit: `5 MB`
4. Preview the image before upload.
5. Upload it through `dev-api.js`.
6. Attach it to the post.

Current storage/reference behavior:

- Uploaded files are written under `public/images/hero/<slug>/...`
- The post frontmatter is updated with the hero image path and alt text
- The attach step is separate from upload, so a file is not written into the post until you confirm it

## Environment variables

Nothing here is strictly required for basic local development if you are happy with the defaults. The useful variables are below.

### Common admin variables

- `PUBLIC_DEV_API` — override the admin UI's dev API base URL. Default is `http://localhost:8787`.
- `PUBLIC_DEV_API_KEY` — dev API key the admin UI sends as `X-WC-Dev-Key`.
- `PUBLIC_ADMIN_KEY` — optional query-string gate for hosted admin pages, used as `?key=...`.

### Local dev API variables

- `DEV_API_HOST` — bind host for `dev-api.js`. Default `127.0.0.1`.
- `DEV_API_PORT` — port for `dev-api.js`. Default `8787`.
- `DEV_API_TOKEN` — enables authenticated non-loopback access to the dev API.
- `DEV_API_CORS_ORIGIN` — CORS origin for the dev API. Default `*`.
- `DEV_API_LOG` — set to `false` to silence dev API request logging.
- `DEV_API_MAX_BODY_BYTES` — override the JSON body limit.
- `DEV_API_MAX_UPLOAD_BYTES` — override the upload limit used by the dev API.
- `HOST` / `PORT` — alternate host/port inputs also respected by `dev-api.js`.

### Mutating Astro API tokens

These matter if you are using the mutating Astro API routes instead of the local dev API:

- `ADMIN_API_TOKEN`
- `THEME_ADMIN_TOKEN`
- `DEV_API_TOKEN`

### Build/test helpers

- `WC_PROJECT_ROOT` — override the project root for ingest/tests.
- `PLAYWRIGHT_PORT` — Playwright local port override.
- `PLAYWRIGHT_BASE_URL` — Playwright base URL override.
- `CI`, `DEBUG`, `NODE_ENV`, `VITEST` — standard tooling/test environment flags.

### Settings file values worth configuring

- `content/settings.json -> formEndpoint` — endpoint used by the site contact/newsletter form handling in `Base.astro`. It must be a rooted path or absolute URL. If it is missing, the form falls back to a visible not-configured message instead of submitting successfully.

## Deployment notes

- The site builds as static output.
- `npm run build` is the deploy artifact path.
- Admin pages are not a full production back end. They are mostly static admin shells that call `dev-api.js` during local work.
- If you want hosted admin mutations, you need a real server adapter and to think through authentication instead of assuming the local dev setup will translate directly.
- Draft posts are checked and pruned from public output during the build pipeline.
- Stub or incomplete entity content is intended for internal/admin workflows first, not accidental public output.
- The current build pipeline also prunes non-public outputs so the generated `dist/` stays deploy-safe.

## Affiliate catalog

Affiliate products still live in `content/products.json`. Post specs and frontmatter can reference those keys, and the site resolves them through `/go/<key>` redirects with tracking parameters baked in.

Current keys:

- `sustainable-incense`
- `altar-kit`
- `gemstone-candle`
- `aroma-diffuser`
- `tumbled-stones`
- `himalayan-salt-lamp`
- `singing-bowl`
- `mindfulness-journal`
- `chakra-bracelet`
- `smudge-kit`
- `crystal-bible`
- `moonology`
