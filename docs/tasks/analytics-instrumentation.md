# Task: Instrument privacy-friendly analytics

## Source
- docs/repo-audit.md — Visibility & Growth Recommendation 4.

## Goal
Add opt-in analytics instrumentation (e.g., Plausible or Fathom) that respects the settings contract and enables outbound click tracking without bloating the bundle.

## Acceptance Criteria
- `content/settings.json` controls analytics enablement and optional domain/site ID values.
- Base layout injects the analytics script only when `settings.analytics.enabled` is true and passes along any required data attributes or custom domains.
- Outbound affiliate and download links emit analytics events (either via `data-analytics` attributes consumed by the provider or a lightweight script).
- A test covers the settings parser to ensure invalid analytics configuration fails fast.
- Documentation in `docs/publishing.md` (or new analytics doc) explains how to enable analytics in production.

## Suggested Steps
1. Extend `SiteSettings` typing with provider-specific fields (e.g., `analytics.provider`, `analytics.domain`).
2. Add a small utility that returns the analytics snippet for the configured provider.
3. Update `Base.astro` to include the snippet and event wiring guarded by settings.
4. Document enablement steps and update example settings as needed.

## Suggested Checks
- `npm run build`
- `npm run test`
