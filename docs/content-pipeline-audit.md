# Content Pipeline Audit — 2025-10-01

## Summary
- Admin console validation, preview, and ingest buttons now POST specs to the `/ingest` API with `dryRun` toggles, so UI feedback comes from the canonical normalization and validation pipeline rather than bespoke helpers.
- Both the WitchClick CLI (`tools/wc ingest`) and the project-level `npm run ingest` script call `prepareSpecForPersistence`/`persistPreparedSpec`, aligning command-line ingestion with the same normalization, warnings, and persistence rules enforced by the API.
- All public tooling now surfaces the normalized spec, warnings, normalization notes, and persistence path/slug from a single source, enabling one-shot validation across UI, CLI, and scripts.

## Evidence
- `src/pages/admin/index.astro` parses pasted JSON, normalizes user input, then calls `postSpec(spec, { dryRun: true })` to fetch `/ingest?dryRun=true`, reuses the returned `spec`, `normalizationReport`, `warnings`, and `errors` for status rendering, and only proceeds to a second `dryRun: false` POST when the dry run succeeds.【F:src/pages/admin/index.astro†L520-L707】
- `tools/src/ingest.ts` loads specs from `--from-file` or stdin, runs them through `prepareSpecForPersistence`, conditionally invokes `persistPreparedSpec`, and echoes the API-style response payload (spec, warnings, normalization report, slug, path) to stdout.【F:tools/src/ingest.ts†L1-L60】
- `scripts/ingest.mjs` delegates both file ingestion and interactive flows to `prepareSpecForPersistence`/`persistPreparedSpec`, returning structured results (slug, path, warnings, normalization report) or throwing `IngestValidationError` with the underlying warnings/normalizations when validation fails.【F:scripts/ingest.mjs†L10-L144】
