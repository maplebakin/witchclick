# Task: Add structured data to collection pages

## Source
- docs/repo-audit.md — Visibility & Growth Recommendation 1.

## Goal
Implement JSON-LD `ItemList`/`CollectionPage` structured data for non-post routes (home, tag listings, downloads) so curated lists are eligible for rich results.

## Acceptance Criteria
- Home page renders an `ItemList` JSON-LD payload that enumerates the posts shown on page 1.
- Tag archives, pagination routes, and the downloads index expose appropriate `ItemList` or `CollectionPage` JSON-LD describing the items displayed.
- Structured data generation reuses a shared utility to avoid duplication and is covered by tests that assert valid JSON-LD output for at least the home and downloads pages.
- `npm run build` succeeds and emits no new schema-related warnings from Google Rich Results Test (documented in PR notes if manual check).

## Suggested Steps
1. Create a helper (e.g., `src/utils/structuredData.ts`) that maps post/download summaries into JSON-LD nodes.
2. Inject `<script type="application/ld+json">` blocks into relevant `.astro` pages using server-side data.
3. Add Vitest coverage that imports the helper and asserts `@type`/`itemListElement` shape for sample inputs.
4. Run `npm run build` to ensure the new scripts do not break hydration.

## Suggested Checks
- `npm run build`
- `npm run test`
