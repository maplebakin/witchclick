# Task: Add evergreen CTAs and social proof modules

## Source
- docs/repo-audit.md — Visibility & Growth Recommendation 3.

## Goal
Introduce modular homepage sections for newsletter signup, testimonials, or seasonal collections that can be curated via content files/settings and reused on other landing pages.

## Acceptance Criteria
- Home page renders at least one new evergreen CTA block (newsletter or download lead magnet) and one social proof/testimonial module.
- Content for these blocks is sourced from Markdown/JSON (e.g., `content/blocks/*.json`) or `settings`, enabling updates without code changes.
- Blocks are responsive, accessible, and follow existing card/typography patterns.
- Tests cover the data loader that reads the CTA content and ensure missing data falls back gracefully.
- Documentation explains how to edit the CTA/social proof content.

## Suggested Steps
1. Define a lightweight content schema for CTA and testimonial entries (could reuse Content Collections).
2. Create new components (e.g., `CtaBlock.astro`, `Testimonials.astro`) that read from the data source.
3. Update `src/pages/index.astro` to include the blocks and conditionally render based on available data.
4. Document authoring flow in `docs/publishing.md` or a new README section.

## Suggested Checks
- `npm run build`
- `npm run test`
