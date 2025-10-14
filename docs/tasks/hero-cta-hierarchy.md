# Task: Improve hero CTA hierarchy and accessibility

## Source
- docs/frontend-visual-audit.md — Immediate Opportunity 3.

## Goal
Strengthen the visual and semantic distinction between primary and secondary hero CTAs while providing assistive guidance for multi-action choices.

## Acceptance Criteria
- Primary hero CTA has a distinct hover/focus treatment (color/weight) that clearly differentiates it from the secondary button.
- Secondary CTA styling is updated to reduce competition with the primary action (e.g., outlined pill with toned-down fill).
- Multi-CTA layouts include accessible context such as `aria-describedby` or supporting copy clarifying each option.
- Keyboard focus order for hero CTAs is logical and focus rings meet contrast guidelines.
- Visual regression verified manually or via screenshot tests to confirm the hierarchy.

## Suggested Steps
1. Update `Hero.astro` styles to adjust gradients, borders, and arrow glyph weights for the primary vs. secondary CTAs.
2. Add an optional description or `aria-describedby` hook when more than one CTA is supplied.
3. Ensure focus rings use high-contrast outlines consistent with the focus improvements elsewhere.
4. Test across breakpoints to verify layout integrity.

## Suggested Checks
- `npm run build`
- `npm run test`
