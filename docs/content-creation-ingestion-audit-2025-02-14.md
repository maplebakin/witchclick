# Content Creation & Ingestion Audit — 2025-02-14

## Overview
WitchClick’s content pipeline pairs rich generation prompts with a shared ingestion core. Specs from the admin console, CLI, or batch queue all flow through `prepareSpecForPersistence`, so validation, normalization, and persistence behave consistently regardless of entry point.【F:scripts/ingest.mjs†L9-L121】【F:server/lib/specPreparation.js†L140-L220】 The admin UI mirrors this by running dry-run requests against the ingest endpoint before it writes anything to disk, giving editors immediate feedback on warnings, normalization, and structural issues.【F:src/pages/admin/index.astro†L812-L918】 Overall the architecture favors a single source of truth for Markdown output, but a few duplicate utilities and heuristics introduce avoidable friction for content teams.

## Implementation update — 2025-02-14
- Introduced a shared slug + frontmatter toolkit consumed by the server pipeline, CLI, local API, and content tooling so every ingestion path now normalizes identifiers identically.【F:scripts/lib/slug.js†L1-L60】【F:scripts/lib/frontmatter.js†L1-L56】【F:dev-api.js†L1-L520】
- Exported `normalizePostSpec` to the browser via a lightweight bundle, wiring the admin console to the production-grade normalizer and removing bespoke drift-prone logic.【F:src/scripts/normalizeDraftSpec.ts†L1-L35】【F:src/pages/admin/index.astro†L640-L820】
- Hardened prompt deduplication by parsing Markdown with `gray-matter`, persisting slug history, and feeding both titles and slugs into the master prompt builder for richer collision avoidance.【F:scripts/lib/postInventory.js†L1-L53】【F:scripts/lib/slugHistory.js†L1-L29】【F:tools/src/genprompt.ts†L1-L120】【F:server/lib/promptBuilder.js†L18-L143】
- Refactored the dev API to rely on the shared helpers for posts directory discovery, frontmatter parsing, and slug history so local previews remain aligned with production ingest behavior.【F:dev-api.js†L1-L560】

## Strengths worth preserving
- **Uniform ingest contract.** All tooling depends on `prepareSpecForPersistence`, ensuring schema validation, word-count enforcement, slug uniqueness, and entity stub creation are handled once and reused everywhere.【F:scripts/ingest.mjs†L56-L122】【F:server/lib/specPreparation.js†L140-L220】
- **Author-facing dry runs.** The admin console surfaces the normalized spec, warnings, and errors returned by the ingest API before attempting persistence, reducing failed publishes without bespoke validators.【F:src/pages/admin/index.astro†L812-L918】
- **Queue automation hooks.** The batch ingester processes `content/prompt-queue/approved` specs with the same validation pipeline and emits machine-readable events, so scheduled jobs can reuse CLI behavior with minimal glue.【F:scripts/ingest-queue.mjs†L17-L103】

## Opportunities to streamline

### 1. Harmonize slug + path utilities across surfaces
Three different slugifiers are baked into the toolchain (`specPreparation`, `ingestionAdapter`, `contentPaths`), each with its own normalization rules. That means an identical title can resolve to different slugs depending on whether it’s normalized in the UI, CLI, or server layer.【F:server/lib/specPreparation.js†L27-L35】【F:server/lib/ingestionAdapter.js†L48-L56】【F:scripts/lib/contentPaths.js†L100-L108】 In parallel, several clients still hand-roll post-directory resolution (`tools/src/ingest.ts`, `dev-api.js`) instead of relying on the shared resolver, so ingestion may miss content saved under `src/content/posts`.【F:tools/src/ingest.ts†L39-L59】【F:dev-api.js†L34-L120】【F:scripts/lib/contentPaths.js†L12-L98】

**Recommendation.** Extract a single `slug.ts` (or similar) module exported through `scripts/lib/contentPaths.js`, update the ingest adapter and `specPreparation` to depend on it, and make the admin UI import the compiled helper. Likewise, route every client (CLI, admin API, queue runner) through `resolvePostsDirectories()` so their directory lists stay in sync.

### 2. Ship shared spec-normalization utilities for the admin UI
The admin page contains its own `normalizeSpec` implementation that trims fields, dedupes tags, and coerces arrays before issuing ingest requests.【F:src/pages/admin/index.astro†L639-L711】 The canonical server pipeline already performs these mutations (and more) inside `prepareSpecForPersistence`, so the browser-side copy risks drifting from production rules and requires duplicate maintenance.【F:server/lib/specPreparation.js†L151-L220】

**Recommendation.** Bundle the normalization helpers from `server/lib` for browser use (e.g., expose a lightweight `normalizeDraftSpec` from the shared package or ship a generated schema/normalizer bundle). That lets the admin surface the exact normalization messages without maintaining parallel logic.

### 3. Harden prompt deduping when generating new specs
`genprompt` avoids duplicate ideas by scanning existing Markdown for a `title:` line, slugifying it, and dropping repeats.【F:tools/src/genprompt.ts†L16-L39】 This regex-based approach fails if titles use block scalars, multiline YAML, or custom quoting, which will become more common as editors tweak frontmatter. Mis-detected titles let the generator propose already-published topics, costing review cycles.

**Recommendation.** Swap the regex for a YAML-aware parser (e.g., `gray-matter`) or reuse `dev-api`’s frontmatter reader so every title variant is detected. Once parsing is reliable, persist the normalized slug list and feed it back into the prompt builder to steer ideation away from saturated topics.

### 4. Reduce duplicated frontmatter parsing in local APIs
The local dev API re-implements frontmatter parsing, hero image naming, and directory selection logic that already exists in shared helpers, increasing the chance of mismatched behavior between admin previews and build-time ingestion.【F:dev-api.js†L34-L203】 Consolidating those concerns under shared utilities keeps previews aligned with production output and makes it easier to evolve the Markdown format (e.g., adding new frontmatter fields) without touching multiple files.

**Recommendation.** Refactor `dev-api.js` to consume the same helpers exported for the CLI—slug/path resolution, frontmatter parsing, and entity handling—so local previews faithfully represent what the ingest pipeline will produce.

## Next steps
1. Create a shared ingestion utility package (`/scripts/lib/slug.ts`, `frontmatter.ts`) and update both Node and browser consumers to import it.
2. Publish a compiled normalizer bundle for the admin UI to replace the inline `normalizeSpec` copy.
3. Update `genprompt` to parse frontmatter with a YAML-aware helper and store normalized slug history for richer duplicate detection.
4. Migrate `dev-api` and other bespoke clients to the shared helpers, then add regression tests that cover both `content/posts` and `src/content/posts` directory layouts to catch drift quickly.
