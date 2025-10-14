# Task: Optimize hero media for small screens

## Source
- docs/frontend-visual-audit.md — Immediate Opportunity 5.

## Goal
Deliver responsive hero imagery that reduces bandwidth on mobile and prevents the illustration from crowding the fold.

## Acceptance Criteria
- `Hero.astro` serves a reduced-size source (e.g., via `srcset`/`sizes`) for viewports under 640px.
- Mobile layout adjusts padding/margins so the hero copy remains above the fold on sub-400px devices.
- Images include explicit width/height attributes or aspect-ratio styles to prevent layout shift.
- Lighthouse performance audit (mobile) shows improved LCP/total bytes compared to baseline screenshot documented in PR.

## Suggested Steps
1. Generate appropriately sized hero thumbnails during build or leverage existing image pipeline utilities.
2. Update the `<picture>` element with mobile-first sources and `sizes` hints.
3. Tweak CSS spacing tokens for `.hero-panel` and `.hero-media` under 400px width.
4. Capture before/after Lighthouse metrics or WebPageTest snippet for documentation.

## Suggested Checks
- `npm run build`
- `npm run test`
