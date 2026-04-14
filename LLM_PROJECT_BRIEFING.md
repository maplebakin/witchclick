# WitchClick LLM Project Briefing

Last updated: 2026-04-12  
Repository root: `witchclick/`

## 1) Purpose and Product Intent

WitchClick is a static-first Astro publishing platform for cozy, secular, neurodivergent-friendly metaphysical content.

Core intent:
- Keep the tone warm, grounded, and non-gatekeeping.
- Treat rituals/tarot as reflective practices, not supernatural guarantees.
- Prioritize accessibility, SEO, and ethical monetization.
- Use a structured AI content pipeline: prompt -> JSON spec -> validation/normalization -> markdown -> static build.

## 2) High-Level Architecture

Main layers:
- Frontend site (Astro static output): `src/pages`, `src/layouts`, `src/components`, `src/utils`
- Local admin + generation API (Node HTTP server): `dev-api.js`
- Shared prompt/validation/ingestion contracts: `server/lib/*`
- CLI tooling and build scripts: `tools/*`, `scripts/*`
- Content/data: `src/content/posts`, `content/entities`, `content/products.json`, `content/settings.json`
- Separate drafting lab: `cauldron/` (Astro + Preact)

Build mode:
- `astro.config.mjs` is `output: "static"` for deploys.
- Admin workflows are primarily local/dev and call `dev-api.js`.

## 3) Current Project Snapshot

Observed in repo:
- Posts: 168 markdown files in `src/content/posts`
- Published posts: 59
- Draft posts: 109
- Entities: 197 JSON files under `content/entities`
- Entity folders: `crystal`, `herb`, `moonPhase`, `planet`, `planetaryDay`, `ritual`, `spread`, `tarot`

## 4) Guardrails and Collaboration Constraints

From `AGENTS.md` and project conventions:
- Do not change schema contracts lightly (PostSpec/entity contracts are treated as sensitive).
- Preserve accessibility behaviors and theme architecture.
- Keep SEO fundamentals intact (sitemap, metadata, internal linking behavior).
- Avoid editing secrets and deployment-sensitive configs unless explicitly requested.

Practical implication for future LLM work:
- Prefer additive, localized changes.
- When changing prompt/schema behavior, check impact across:
  - `server/lib/postSpecSchema.js`
  - `server/lib/ingestionAdapter.js`
  - `server/lib/postSpecValidator.js`
  - `server/lib/structureValidation.js`
  - tests in `tests/*`

## 5) Core Runtime and Toolchain

Primary stack:
- Astro `^5.15.2`
- TypeScript strict mode + `noUncheckedIndexedAccess`
- Tailwind + generated theme CSS
- Vitest + Playwright

Scripts of record (`package.json`):
- Dev: `npm run dev` (theme watcher + dev-api + Astro dev)
- Build: `npm run build`
- Quality gate: `npm run check`
- Unit tests: `npm run test`
- E2E: `npm run test:e2e`
- Prompt generation: `npm run genprompt`
- Ingest: `npm run ingest -- <spec.json> [--dry]`

Environment notes:
- `.nvmrc` is `20`
- Local machine observed Node `v25.5.0`; project target remains Node 20+

## 6) Content and Data Model

### 6.1 Post content source

Canonical post directory:
- `src/content/posts`

Post loading:
- `src/utils/posts.ts`
- Draft and future-dated content is filtered from public lists/routes.

### 6.2 Entities

Entity files:
- `content/entities/<type>/<slug>.json`

Entity loader:
- `src/utils/entities.js`
- Supports filtering unpublished/stub-like entities from public use.

### 6.3 Site settings and monetization catalog

- Site settings: `content/settings.json`
- Affiliate catalog: `content/products.json`
- Redirect generation for affiliate keys: `tools/src/goBuild.ts` -> `public/_redirects`

## 7) Prompt -> Spec -> Post Pipeline (Critical)

### 7.1 Prompt generation

Main prompt composer:
- `server/lib/promptBuilder.js`
- Assembles fragments from `server/lib/promptFragments.js`
- Injects schema docs from `server/lib/postSpecSchema.js`

Context loader:
- `server/lib/promptContext.js`
- Pulls brand/site settings, existing titles/slugs, affiliate keys, engagement signals

### 7.2 Ingestion and normalization

Primary entrypoint:
- `server/lib/ingestExecutor.js`

Preparation and persistence:
- `server/lib/specPreparation.js`

Normalization (alias-tolerant):
- `server/lib/ingestionAdapter.js`
- Handles field aliases and deterministic cleanup before strict validation

### 7.3 Validation

Schema:
- `server/lib/postSpecSchema.js` (Zod schema)

Semantic/content validations:
- `server/lib/postSpecValidator.js`
- `server/lib/structureValidation.js`

CLI ingestion:
- `scripts/ingest.mjs`

### 7.4 Output

Prepared content is serialized to markdown with frontmatter and written to:
- `src/content/posts/<slug>.md`

Possible side effects:
- Entity stubs may be created for missing referenced entities.
- Post stubs may be generated from internal-link hint anchors/slugs.

## 8) PostSpec v2 Operational Contract (What matters most)

Required behavior in practice:
- `specVersion: 2`
- Strong heading/outline alignment
- First section and first outline item must be Opening Reflection / `opening-reflection`
- Internal link hints and affiliate hints are required arrays (can be empty where allowed by rules)
- CTA and ad placement rules are applied by validation/normalization and ingest logic

Important: this repo currently supports relaxed aliases in multiple places (not only strict field names).  
If you change schema strictness, also update normalizers, validators, and tests.

## 9) Admin and API Surfaces

Local admin server:
- `dev-api.js` on `127.0.0.1:8787` (default)

Major capabilities:
- Prompt generation (`/genprompt`)
- Post ingest (`/ingest`)
- Curse prompt/ingest (`/curses/prompt`, `/curses/ingest`)
- Post CRUD/staging (`/posts/*`, `/staging/*`)
- Entity CRUD (`/entities/*`)
- Theme, settings, products, downloads, partners, calendar, authors

Astro mutating APIs:
- Guarded in `src/pages/api/_mutating.ts`
- Dev-only + token checks for mutation routes

## 10) Build, SEO, and Release Safety Gates

Build pipeline includes:
- Astro build via `scripts/build-clean.mjs`
- Sitemap generation `scripts/generate-sitemap.mjs`
- Draft leak verification `scripts/verify-no-draft-leaks.mjs`
- Non-public route pruning `scripts/prune-nonpublic.mjs`

Additional audit/check scripts:
- Internal links: `scripts/check-internal-links.mjs`
- SEO audit: `scripts/audit-seo.mjs`
- Affiliate placeholder guard: `scripts/check-affiliate-ids.mjs`
- Combined pre-traffic gate: `scripts/pretraffic-gate.mjs`

## 11) Curses Subsystem (Separate but related)

Curses have a separate schema/prompt/ingest path:
- Schema: `server/lib/curseSpecSchema.js`
- Prompt builder: `server/lib/cursePromptBuilder.js`
- Preparation/persistence: `server/lib/cursePreparation.js`
- CLI ingest/export: `tools/src/ingestCurse.ts`, `tools/src/exportCurses.ts`
- Storage primarily in `archive/curses`

Treat this as a parallel content track, not a variant of post ingestion.

## 12) Cauldron Subproject

`cauldron/` is a drafting lab used for prompt/spec experimentation:
- UI editor + preview in `cauldron/src/components/PromptEngine.tsx`
- Local draft persistence and export
- Validation/promotion helpers in `cauldron/scripts/*`
- Symlink to shared server contracts via `cauldron/witchclick-shared -> ../server`

Use Cauldron for ideation/drafting workflows, then ingest into main pipeline.

## 13) Current Contract Drift / Known Seams (Important for future edits)

These are high-value caution points when touching prompt/schema code:

1. Content type legacy values still appear in runtime schema.
- `server/lib/postSpecSchema.js` still lists `guide` and `spread` in `CONTENT_TYPES`.
- Other prompt/validator logic expects newer narrowed modes.

2. `category` is still present in runtime schema and frontmatter ecosystem.
- Present in schema and utilities, even where prompt docs de-emphasize it.

3. `internalLinkHints` shape is not fully unified.
- Schema object in code currently validates `{ anchor, rationale }`.
- Prompt docs/examples reference `{ anchor, slug, rationale }`.

4. Affiliate synonym normalization still exists in ingestion normalizer.
- `server/lib/ingestionAdapter.js` maps synonyms (for example notebooks/journal/crystals).
- This can conflict with exact-key-only policy if policy was tightened elsewhere.

5. Internal-link count targets are inconsistent across validator/audit scripts.
- Some checks target 5-8 hints.
- Legacy SEO audit logic still flags fewer than 3 in markdown.

If you are asked to “fix prompt contradictions,” audit all five areas above together.

## 14) Test Strategy and Where Changes Usually Break

Primary tests to run after content-pipeline changes:
- `tests/prompt-consistency.test.ts`
- `tests/postspec-validation.test.ts`
- `tests/ingest-loose-mode.test.ts`
- `tests/ingest-structure.test.ts`
- `tests/pipeline.test.ts`
- `tests/admin-generator.test.ts`

Common break pattern:
- Prompt text changes pass locally, but ingestion schema/validator/tests still enforce old behavior.
- Fix by updating prompt, schema, normalizer, validators, and tests as one unit.

## 15) Recommended LLM Working Checklist

When receiving a task in this repo:

1. Identify impacted layer first:
- Prompt text only
- Schema/normalization
- Ingest/persistence
- Frontend rendering
- Build/SEO tooling

2. Search for duplicate rule definitions before editing:
- Prompt fragments
- strict JSON rule blocks
- schema docs
- validators/audits

3. Prefer single source of truth edits:
- If a rule is changed, ensure one canonical definition and minimal duplicated wording.

4. Validate quickly:
- `npm run check`
- targeted tests for edited module(s)
- full `npm run test` if schema/pipeline was touched

5. For release-sensitive changes:
- `npm run build`
- `npm run linkcheck`
- optionally `npm run check:pretraffic`

## 16) Fast File Map (Most Important Files)

Prompting and contracts:
- `server/lib/promptBuilder.js`
- `server/lib/promptFragments.js`
- `server/lib/generatorPresets.js`
- `server/lib/postSpecSchema.js`
- `server/lib/strictJsonRules.js`

Ingest and validation:
- `server/lib/ingestionAdapter.js`
- `server/lib/postSpecValidator.js`
- `server/lib/structureValidation.js`
- `server/lib/specPreparation.js`
- `server/lib/ingestExecutor.js`
- `scripts/ingest.mjs`

Frontend/content loading:
- `src/layouts/Base.astro`
- `src/utils/posts.ts`
- `src/utils/entities.js`
- `src/utils/recommendations.ts`
- `src/content/config.ts`

Ops/build/audits:
- `scripts/build-clean.mjs`
- `scripts/generate-sitemap.mjs`
- `scripts/verify-no-draft-leaks.mjs`
- `scripts/prune-nonpublic.mjs`
- `scripts/audit-seo.mjs`
- `scripts/pretraffic-gate.mjs`

Admin/dev API:
- `dev-api.js`
- `src/pages/api/_mutating.ts`

---

If you provide this brief to a fresh LLM, it should have enough context to work safely on WitchClick without re-discovering project structure, contracts, or known drift areas.
