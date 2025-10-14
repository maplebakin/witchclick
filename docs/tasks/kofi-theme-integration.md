# Task: Align Ko‑fi CTA styling with theme tokens

## Source
- docs/frontend-visual-audit.md — Near-Term Enhancement “Ko‑fi CTA cohesion”.

## Goal
Update the Ko‑fi support button to derive colors from ambient/theme tokens instead of a hard-coded gradient so it adapts across color schemes.

## Acceptance Criteria
- `CtaFooter.astro` reads theme/ambient tokens (e.g., from `Base.astro` CSS variables) to generate its gradient and focus ring.
- Button respects light/dark contrasts and passes WCAG AA for text on background.
- Randomized Ko‑fi copy still functions and new styling is covered by unit or snapshot tests as appropriate.
- Manual QA confirms the button adapts when ambient theme changes (e.g., by toggling `body[data-type]`).

## Suggested Steps
1. Expose the needed CSS variables in `Base.astro` or add a small helper class for CTA surfaces.
2. Replace the inline gradient in `CtaFooter.astro` with a class that references the shared variables.
3. Update Tailwind or global CSS as needed and document styling tokens if they are new.

## Suggested Checks
- `npm run build`
- `npm run test`
