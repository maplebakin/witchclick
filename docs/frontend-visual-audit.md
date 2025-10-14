# Frontend Visual Audit

## Summary
- The interface leans on layered parchment textures and glassmorphism accents defined in the base layout; clarity improves by dialing down overlays, tightening spacing, and standardizing thematic color application.
- Hero, navigation, and card components already provide rich ornamentation, but they can benefit from improved hierarchy, responsive behavior, and accessible focus treatments.
- A set of quick wins and stretch enhancements is outlined to guide upcoming design refinements while preserving WitchClick's cozy identity.

## Current Visual System
- **Ambient theming** — `src/layouts/Base.astro` injects runtime theme tokens, layered gradients, and textures directly onto the `<body>` via `bodyStyle`, producing deep ambient color fields and a parchment overlay (`backgroundLayers`).【F:src/layouts/Base.astro†L1-L119】
- **Type styling** — Serif/script headings are supplied by Google Fonts while Inter remains the root sans-serif, with transitions on body background and type states defined inline.【F:src/layouts/Base.astro†L120-L190】
- **Card language** — Shared glass cards (`cards.css`) rely on translucency, multiple radial highlights, and hover elevation to create the shimmering motif used across posts, entities, and CTAs.【F:src/styles/cards.css†L1-L104】
- **Hero presentation** — The primary hero component (`Hero.astro`) mixes serif titles, muted eyebrows, and CTA pills that switch between primary/secondary variants, with responsive media blocks and glass borders.【F:src/components/Hero.astro†L1-L134】
- **Entity/Post cards** — Entity cards layer gradients, decorative orbs, and uppercase labels while Post cards reuse the panel styles, accent pills, and metadata eyebrows.【F:src/components/EntityCard.astro†L1-L165】【F:src/components/PostCard.astro†L1-L66】

## Immediate Opportunities
1. **Tame background stacking for readability**  
   Reduce opacity of `--body-overlay` and `--content-texture` in the base layout to lessen busy interference behind long-form copy; consider offering a plain background fallback for reading-heavy routes such as `/post/*` and `/entities/*`.
2. **Clarify header & navigation alignment**  
   Tighten the `max-w-*` widths so header links align with main content columns, and add responsive spacing between nav items to prevent cramped layouts on mid-sized screens.
3. **Improve hero call-to-action hierarchy**  
   Increase contrast between primary and secondary CTA pills by darkening the hover state and adjusting the arrow glyph weight; add `aria-describedby` or supporting copy to clarify multi-CTA intent.
4. **Boost focus states for keyboard users**  
   Many glass panels rely on subtle glow shadows (`--card-focus-ring`). Introduce higher-contrast outlines or offset borders so focus is clearly visible atop textured backgrounds.
5. **Optimize mobile hero media**  
   The hero image reuses the same asset for all breakpoints; deliver a smaller mobile `srcset` and reduce padding on screens under 400px to keep the fold dominated by copy.
6. **Standardize tag chips**  
   Entity and post cards have uppercase pill tags with heavy tracking. Consider introducing a lowercase style or varying weights to reduce repetitive noise when many tags appear.

## Near-Term Enhancements (1–2 sprints)
- **Adaptive background intensity slider** — Add a settings toggle that maps to existing theme variables so users sensitive to texture can switch to a calmer parchment without altering brand hues.【F:src/layouts/Base.astro†L60-L115】
- **Navigation glow indicator** — Extend the `links` array to include active-route styling (e.g., underlines or pill backgrounds) to orient visitors within the grimoire structure.【F:src/layouts/Base.astro†L34-L57】
- **Hero illustration framing** — Introduce subtle motion (parallax or gradient shimmer) on `.hero-media` while maintaining `prefers-reduced-motion` guardrails already in place.【F:src/components/Hero.astro†L95-L134】
- **Entity card density presets** — Provide a compact variant that reduces radial highlights and drop shadows for list-heavy pages, improving scan-ability without abandoning the magical motif.【F:src/components/EntityCard.astro†L47-L143】
- **Ko‑fi CTA cohesion** — Update the Ko‑fi gradient button to pull from theme tokens instead of a static pink/purple diagonal so donation prompts feel native to each ambient color scheme.【F:src/components/CtaFooter.astro†L1-L34】

## Longer-Term Experiments
- **Dynamic ambient lighting** — Use `mixColors` utilities to align background gradients with the dominant hue of the viewed entity or post, creating subtle scene-setting without manual overrides.【F:src/layouts/Base.astro†L60-L118】
- **Narrative pagination** — Rework `Pagination.astro` to include illustrative glyphs or constellations that guide users between chapters, reinforcing the storybook theme.
- **Scroll-linked animations** — Explore Web Animations API for softly animating card overlays as they enter the viewport while respecting the existing `prefers-reduced-motion` fallbacks.【F:src/components/Hero.astro†L130-L134】【F:src/styles/cards.css†L32-L74】

## Suggested Next Steps
1. Workshop visual guidelines with a mood board capturing lighter parchment states, crisper focus rings, and standardized CTA treatments.
2. Prototype hero and navigation adjustments in a design tool, validating readability across desktop, tablet, and small mobile breakpoints.
3. Schedule an implementation sprint prioritizing background tuning, focus ring improvements, and CTA color harmonization before investing in advanced motion.
