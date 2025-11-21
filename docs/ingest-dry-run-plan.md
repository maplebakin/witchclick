# Ingest Dry-Run Architecture Plan

## Context
- Current `POST /ingest` route in `dev-api.js` immediately writes PostSpec v2 payloads to disk via `writeMarkdownFromSpec`, returning `{ ok: true, slug, path }`.
- The prompt contracts allow “relaxed” keys (e.g., `description`, `sections[].content`) and minimal payloads, but the route currently expects strict PostSpec v2.
- We must let creators preview the normalized spec/report without hitting persistence when `dryRun` is requested while keeping non-dry-run behaviour identical.

## Goals
1. Accept a dry-run flag either in the query string (`?dryRun=true`) or in the JSON payload (`{ dryRun: true, ... }`). When true, skip all filesystem writes.
2. Normalize any relaxed spec into strict PostSpec v2 and emit a detailed `normalizationReport` describing adjustments/defaults.
3. Persist normalized specs exactly as today when `dryRun` is false, and return `{ spec, normalizationReport, saved: true }`.
4. If the input is already strict PostSpec v2, the `normalizationReport` should be empty and persistence should still respect the `dryRun` flag.
5. Maintain existing error handling, notably returning `400 { error: "Title required" }` when no usable title exists.

## Proposed Changes

### 1. Request parsing and dry-run detection
- Replace the direct `req.url === '/ingest'` guard with path parsing using the WHATWG URL API so we can read search parameters.
- After calling `parseBody(req)`, capture the raw payload (may already be the spec). Extract:
  - `dryRun` as `true` if either the query parameter or a top-level `dryRun` boolean in the body is truthy.
  - The raw spec object: if the payload contains a `spec` object use it; otherwise treat the payload (minus a `dryRun` flag) as the spec.
- Guard against missing bodies as we do today (`400` with descriptive error).

### 2. Normalization pipeline
Introduce a new helper, e.g. `normalizePostSpec(rawSpec)`, that returns `{ spec: normalized, report, derived }`:
- Map relaxed aliases using the generator preset contract:
  - `title`: fall back to `name`/`headline`.
  - `metaDescription`: consider `meta`, `description`, `summary`.
  - `excerpt`: accept `excerpt`, `summary`, `description`.
  - `sections`: convert `{ heading, content|body|markdown }` entries into `{ heading, markdown }`.
  - `outline`: ensure array of `{ heading, id }`; if missing derive headings from sections with slugified IDs, logging the derivation.
  - `entities`: normalise `type`/`slug` strings; drop invalid entries and record drops in the report.
  - `cta`: reuse `normalizeCta` logic from the Astro API (copy or reimplement locally) so relaxed values coerce to `{ type: 'kofi'|'download'|'none', id? }`.
- Default missing arrays (`tags`, `sections`, `entities`, `altTexts`, `internalLinkHints`, `affiliateHints`, `adPlacements`) to `[]` and report defaults that were filled.
- Ensure `heroImagePrompt` is either string or `null` (cast empty values to `null`).
- Enforce `specVersion: 2`; if the input provided a different value, overwrite it and log the change.
- Require a non-empty `title` after trimming; throw a `Title required` error otherwise so we can return the mandated 400 response.

### 3. Slug + derived metadata
- Generate a slug from the input (`slug` or `title`) using the existing `slugify` helper. If generation changes the provided slug, append a report entry.
- Ensure slug uniqueness by checking `src/content/posts/<slug>.md` and incrementing (`-2`, `-3`, …) as current logic does. Record collisions resolved in the report.
- Populate derived outline fallback (if needed) and compute canonical PostSpec structure fields.
- Return additional derived artefacts needed for persistence (frontmatter object, markdown body string, absolute output path) so we can reuse for both dry-run and save flows without recomputation.

### 4. Persistence gating
- Refactor the current `writeMarkdownFromSpec` workflow into two layers:
  1. `prepareNormalizedSpec(rawSpec)` → `{ spec, report, filePath, fileContents, entityStubs }` (pure, no writes).
  2. `persistNormalizedSpec(prepared)` that writes entity stubs and the markdown file.
- The HTTP handler will:
  - Call `prepareNormalizedSpec`.
  - If `dryRun` is `false`, call `persistNormalizedSpec` to write the file and required entity stubs (reusing existing stub logic). Otherwise skip persistence entirely.
  - Respond with `{ spec: prepared.spec, normalizationReport: prepared.report, saved: !dryRun }`.
- Ensure stub creation (`ensureDir`, `fs.writeFileSync`) happens only inside `persistNormalizedSpec` so dry-runs remain read-only.

### 5. Response & error shape
- Replace the previous `{ ok: true, slug, path }` response with `{ spec, normalizationReport, saved }` while keeping the 400 pathway for missing payloads/invalid JSON as `{ error: message }`.
- Update thrown errors (`title is required` → `Title required`) so the 400 response matches the acceptance criteria wording exactly.
- Preserve existing unexpected-error handling (500 with `{ error }`).

## Acceptance Criteria Traceability
1. Dry-run via query flag: handler honours `dryRun` detection, skips `persistNormalizedSpec`, and returns `{ saved:false, spec, normalizationReport }` from preparation.
2. Non-dry-run path shares the preparation step but invokes persistence, so the file is written and response indicates `saved:true` with the same normalized spec/report.
3. Body flag: since dryRun is detected from body payload, both `{ dryRun:true, spec:{...} }` and a PostSpec object with `dryRun:true` will behave identically to the query flag.
4. Strict inputs already matching v2 bypass alias/default branches, so `report` is `[]`; dry-run still skips persistence.
5. All logic lives in `dev-api.js`; no new dependencies are added.

## Edge Cases & Notes
- If the payload is empty or not JSON-parsable, keep returning a 400 error similar to today (`{ error: 'No JSON body provided. Paste a PostSpec v2 object.' }`).
- When deriving outlines for sparse inputs (e.g. only title supplied), return empty arrays but include report entries noting which structures were defaulted.
- Ensure slug uniqueness checks run even during dry-run so that the returned spec mirrors real persistence behaviour.
- Sanitise entity stubs lazily: gather required stubs during preparation but write them only in non-dry-run mode.

## Out of Scope
- Frontend UI changes or preview tooling.
- Altering generator presets, schema validation rules, or ingestion scripts outside `dev-api.js`.
- Adding automated tests; manual verification will be documented by the implementer.
