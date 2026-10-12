# WitchClick Build & Post Template Audit

## Build and Dependency Health Check
- `npm run build` completes without errors, confirming Astro can generate all 243 routes. The only runtime warnings are Astro router notices about missing `GET` handlers for API endpoints that intentionally only serve `POST` or `prerender` responses, and an npm warning about the unused `http-proxy` config key. These do not block builds but should be cleaned up to avoid noise in CI logs.
- The dependency tree is modest (`astro`, `@astrojs/tailwind`, `marked`, `jsdom`, `dompurify`, etc.) and none of the direct versions are flagged as deprecated. However, we do not run any automated audit or dependency freshness checks today.

## Why the Post Pages Feel Off
- The post template in `src/pages/post/[slug].astro` inlines a large bespoke `<style>` block (roughly 450 lines) that redefines gradients, typography, and surface colors instead of leaning on the shared design tokens exposed in `src/styles/tailwind.css`. Because of the hard-coded palette, any change to the global theme leaves posts stuck with the old lilac gradients and uppercase typography, so they never quite match new layouts elsewhere on the site.【F:src/pages/post/[slug].astro†L326-L615】【F:src/styles/tailwind.css†L1-L120】
- Content is rendered by piping Markdown through `marked` + `DOMPurify` and then injected via `set:html`. While the markup receives the `prose` class, the template overrides many colors manually but misses key prose variants (quotes, callouts, tables, code). That produces low-contrast body text on the dark "panel" background and inconsistent heading spacing compared to shared components.【F:src/pages/post/[slug].astro†L400-L448】【F:src/pages/post/[slug].astro†L760-L815】
- Hero images, badges, CTAs, and the sidebar all use independent spacing rules and drop shadows that differ from the card system defined in `@/styles/cards.css`. The lack of component reuse makes each tweak require hand-editing this single file, so drift keeps accumulating.【F:src/pages/post/[slug].astro†L346-L465】【F:src/styles/cards.css†L1-L96】

## Hardening & Future-Proofing Plan (Codex Prompt Roadmap)
1. **Normalize build tooling noise**  
   Prompt: *"Audit the npm configuration for unknown env keys (specifically `http-proxy`) and adjust the repo so `npm run build` completes without warnings. Update CI docs if you change npm configs."*

2. **Add dependency health automation**  
   Prompt: *"Introduce a scheduled GitHub Action that runs `npm outdated` and `npm audit --omit dev` for the workspace, storing the reports as workflow artifacts and failing on high severity advisories."*

3. **Modularize post styling**  
   Prompt: *"Refactor `src/pages/post/[slug].astro` to extract the giant `<style>` block into scoped CSS modules or shared Tailwind utility classes that reuse the tokens from `src/styles/tailwind.css` and `@/styles/cards.css`. Preserve the design intent but ensure text colors, radii, and shadows inherit from the existing design system."*

4. **Improve Markdown typography**  
   Prompt: *"Create a dedicated `PostBody` component that applies consistent typography to Markdown content (including blockquotes, callouts, tables, and code) using Tailwind's `typography` plugin and accessible contrast ratios."*

5. **Responsive hero alignment**  
   Prompt: *"Rebuild the post hero section as a reusable component that matches the global hero spacing, supports both image and text-only variants, and gracefully stacks on small screens without hard-coded uppercase headings."*

6. **Sidebar & CTA cleanup**  
   Prompt: *"Replace the ad/entity sidebar layout with existing card primitives and ensure all CTA components share a consistent padding/gradient pattern."*

7. **Editing & deletion workflow**  
   Prompt: *"Extend the admin interface (`src/pages/admin/index.astro`) with an authenticated panel that lists Markdown posts from `content/posts`, allowing edit/delete actions. Wire those buttons to new API routes that update or remove the source files, respecting existing ingestion schema and rate-limiting."*

8. **Regression safety net**  
   Prompt: *"Add Vitest or Playwright smoke tests that load a post page, verify key regions (hero, prose body, sidebar) render, and check contrast using `toHaveScreenshot` or Axe accessibility rules."*

By following the prompts above in order, Codex (or any assistant) can close the current stylistic gaps, keep dependencies fresh, and give maintainers the levers they need to edit or retire posts without directly touching the filesystem.
