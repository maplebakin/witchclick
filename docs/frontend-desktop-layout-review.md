# Desktop Layout Audit & Recommendations

## Summary
- Desktop viewports inherit tight mobile-width constraints from the base layout (`max-w-3xl`/`max-w-4xl`), creating generous empty gutters that make the experience feel like an enlarged mobile view.【F:src/layouts/Base.astro†L43-L44】【F:src/layouts/Base.astro†L641-L665】
- Key landing pages (home, downloads, entities) cap grids at two columns and `max-w-5xl`, leaving storytelling elements vertically stacked instead of taking advantage of horizontal space.【F:src/pages/index.astro†L111-L205】【F:src/pages/downloads/index.astro†L54-L144】【F:src/pages/entities/index.astro†L10-L42】
- Article pages already opt into `wide` mode but concentrate supporting panels into a narrow sidebar; there is room to treat the right column as a richer scene setter so it doesn’t feel like a single mobile column with an add-on.【F:src/pages/post/[slug].astro†L160-L245】

## Audit Notes & Opportunities by Page

### Global Layout (Base)
- **Issue:** Header/navigation and main content share the same `max-w-3xl` default, so even on 1440px screens the core column matches tablet width.【F:src/layouts/Base.astro†L43-L44】【F:src/layouts/Base.astro†L641-L665】  
  **Suggestion:** Introduce a new `desktopWide` (e.g., `max-w-7xl`) breakpoint for pages flagged as grid-heavy. Keep text measures controlled with inner wrappers to prevent overly long line lengths.
- **Issue:** The gradient overlay/background stack is identical across breakpoints, which can feel flat on large displays.【F:src/layouts/Base.astro†L66-L125】  
  **Suggestion:** Add an optional subtle vignette or corner embellishment that only appears above `lg` to frame the expanded layouts without over-brightening the center.

### Home (`/`)
- **Hero band**  
  The hero lives in a single column grid inside a `max-w-5xl` container, so the media and CTA stack vertically even on large screens.【F:src/pages/index.astro†L111-L179】  
  • Split the hero into a 12-column layout above `lg`, letting copy span ~6 columns and imagery float across the remaining space to create asymmetry distinct from mobile.  
  • Elevate the secondary CTA block (currently below the feature card) into a right-hand rail that persists as users scroll, echoing a magazine cover.
- **Feed grid**  
  Cards are locked to two columns (`grid-cols-1 sm:grid-cols-2`), which mimics tablet density.【F:src/pages/index.astro†L182-L205】  
  • Add a third column above `xl` with staggered card heights or featured widths so the layout breathes.  
  • Introduce an interstitial ribbon (e.g., “Browse by mood”) across the full width between rows, using the extra horizontal space for iconography.
- **Evergreen stack**  
  Evergreen CTA and testimonials occupy a single column list.【F:src/pages/index.astro†L124-L138】  
  • Convert to a two-column split with balanced heights on desktop, aligning with the hero’s new rhythm.

### Downloads Hub (`/downloads`)
- **Grid density**  
  Panels stop at two columns with generous card padding, leaving large empty gutters on ultrawide monitors.【F:src/pages/downloads/index.astro†L55-L144】  
  • Add a third column at `xl` and increase the card image footprint to make covers feel more like physical artifacts.  
  • Consider a masonry variant (alternating tall/short cards) to differentiate from the home feed while still respecting the cozy aesthetic.
- **Header block**  
  Hero copy caps at 40ch and sits centered within the panel.【F:src/pages/downloads/index.astro†L56-L134】  
  • Introduce a horizontal rule or side illustration (e.g., stack of printables) anchored to the right margin to reinforce the tactile vibe unique to desktop.

### Entities Hub (`/entities`)
- **Grid jump**  
  The layout jumps from two columns to three at `lg`, but the parent section remains `max-w-5xl`, so the third column squeezes.【F:src/pages/entities/index.astro†L10-L42】  
  • Expand the container to `max-w-6xl`+ for this view, or add responsive gutters (`px-8 xl:px-12`) so each card breathes while still filling horizontal space.  
  • Rotate the card accent (icon + label) into a vertical strip on desktop to differentiate from the mobile stack and celebrate the chapter art.

### Article Pages (`/post/*`)
- **Content vs. sidebar**  
  Articles already use `max-w-6xl` and a 8/4 split, but the sidebar primarily houses CTAs stacked vertically.【F:src/pages/post/[slug].astro†L172-L245】  
  • Convert the sidebar into a layered column with a pinned “Chapter Highlights” card, a scroll-syncing outline, or contextual pull quotes to justify the extra width.  
  • Allow hero art to bleed across both columns up to a fixed height on desktop to create a cinematic entry moment distinct from mobile hero crops.
- **Reading surface**  
  The prose block spans the full 8-column width without inner measure control.【F:src/pages/post/[slug].astro†L175-L215】  
  • Add a `max-w-[68ch]` wrapper for paragraphs while letting figures break out, ensuring readability even as the layout expands.

### Static Content Pages (About/Privacy/Contact)
- These pages rely on the Base layout’s main column with `max-w-3xl`, leading to tall walls of text.【F:src/pages/about.astro†L1-L16】【F:src/layouts/Base.astro†L641-L665】  
  • Introduce a shared “story layout” component that places supporting imagery or callouts in a right-hand margin on desktop while preserving the simpler single column on mobile.  
  • Add section dividers or ambient flourishes (constellation dividers) that only appear beyond `md` to signal that desktop has more room to explore.

## Implementation Sequencing
1. Prototype a widened Base layout variant and apply it to the home, downloads, and entities pages to validate the new grid rhythm.
2. Refresh the home hero and feed to adopt multi-column treatments, then mirror that compositional language on downloads/entities for cohesion.
3. Iterate on article sidebar content and supporting visuals so long-form reading feels intentionally expansive instead of stretched mobile UI.
4. Audit remaining static pages and introduce the shared story layout to keep typography comfortable on large screens.

## Stewardship Notes
- Capture screenshots of widened experiments during implementation to keep visual regressions in check and document the evolving art direction alongside this brief.
- When experimenting with broader breakpoints, watch for regressions in cozy microcopy placement—if phrases wrap awkwardly, introduce breakpoint-specific line breaks rather than shrinking font sizes.
- Surface layout changes to the content team during weekly rituals so fresh printable drops can intentionally leverage any new horizontal storytelling room.
