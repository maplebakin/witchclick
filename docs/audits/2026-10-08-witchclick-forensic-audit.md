# WitchClick: verified workflow and reader-experience audit

**Audited:** 2026-10-08  
**Baseline:** `main` at `85c68853d451eca60578ad839665061b43f2aa08`  
**Scope:** Static Astro public site, reader paths, content delivery, ingest/staging, archive/SEO boundaries, navigation/comfort affordances, admin/public separation, CI and diagnostics.

## Decision

**Keep the identity, repair the boundaries.** WitchClick already has a specific secular, symbolic, editorial character; the Ground/Focus/Release entrance, Clean Cursing intentions, readable article presentation, and comfort preferences make sense together. The dominant correctness problem is not missing theme polish. It is a publishing flow that can accidentally create multiple public copies of one article, coupled with CI that stops browser verification whenever editorial SEO fails.

The site also has some retired-but-still-rendered UI and a broken optional runtime-debug entry point. Treat these as separate targeted fixes, not justification for an Astro rewrite.

## Evidence standard

- **Confirmed code:** direct behavior visible from current source.
- **Confirmed live:** page content verified from https://witchclick.space/ on 2026-10-08.
- **Confirmed CI:** official GitHub Actions jobs and decoded failure logs.
- **Needs runtime reproduction:** plausible or source-inferred defect not verified in a browser in this review.
- Tests described as *passing* refer to an actual completed GitHub workflow; merely writing a test or seeing a production build pass does not qualify.

I reviewed current GitHub source, tracked-tree contents, publishing utilities, reader routes, integration logs, and the live homepage, Clean Cursing, and Start pages. I did not execute local admin writes, crawl every generated post in a browser, or test every phone/device/assistive technology.

## Application map

1. `astro.config.mjs` creates static public HTML; `src/layouts/Base.astro` provides the global shell, theme kit, header/footer, comfort preferences, and analytics.
2. `src/pages/index.astro` builds the need router and featured/recent reading shelf from `loadAllPosts()`.
3. `src/utils/posts.ts` reads public posts from **`src/content/posts/`**, excluding explicit drafts and future-dated items.
4. `src/pages/post/[slug].astro` renders cached or transformed Markdown, sanitized HTML, related reading, reading aids, and optional affiliate links.
5. `src/utils/curses.ts` reads the separate curse archive; `src/pages/curses/index.astro` presents the intention, spoon-level, and text filters, and `[slug].astro` renders an individual working.
6. `server/lib/specPreparation.js` normalizes PostSpec and creates a collision-free Markdown output path; `scripts/ingest.mjs` and local dev APIs drive ingestion.
7. `src/utils/staging.ts` handles an explicitly drafted post's publication readiness and publishing.
8. `scripts/audit-seo.mjs` statically scores posts and archive entries by required content shape. The `CI` workflow also builds/checks/executes browser smoke tests.
9. Production build pruning removes admin/API output. The local admin is a different trust and deployment boundary from the static reader site.

## Findings

### W01 · SEO editorial debt prevents independent browser validation
**Impact:** High process reliability. **Confidence:** Confirmed CI and source.

The latest main CI run `37809205308` passed both Node quality jobs, but the `integration` job stopped on SEO because two published posts had only one internal Markdown link each. Build, link validation, and Playwright were therefore skipped in that job.

The issue is more significant than the two link counts: a green quality stage can coexist with zero completed integration evidence, and the UI never tests whether the failing editorial item also affected layout.

**Action:** PR [#288](https://github.com/maplebakin/witchclick/pull/288) gives SEO its own independent `content-audit` job and lets browser integration run separately without suppressing the SEO failure. **Verified on its PR run:** quality Node 20/22 passed, browser integration passed, and content-audit failed on the existing articles, as intended.

### W02 · Suffix-based ingest can silently publish an existing story again
**Impact:** High editorial trust, search duplication. **Confidence:** Confirmed code and concrete existing content.

`server/lib/specPreparation.js` invokes `ensureUniqueSlug` when a filename is occupied, yielding `-2`, `-3` and so on. Existing behavior protects the original file but creates a publish-eligible new file unless the caller explicitly sets `draft:true`. Duplicate content is not the same as an intentional new edition.

**Existing case:** `keeping-mental-space-safe-religious-reminders.md` is a draft; `...-2.md` and `...-3.md` are published with exactly identical Markdown bodies and titles, but different canonical URLs.

**Action:** PR [#290](https://github.com/maplebakin/witchclick/pull/290) forces collision-generated revisions to `draft:true`, supplies an explicit publication-review warning and adds tests. It leaves intentional first-time publication alone. **Current published duplicates are not touched.** Editors should still decide whether a revision warrants a new public URL.

### W03 · Homepage duplicates the same story in featured and recent slots
**Impact:** High reader-facing polish, medium discovery. **Confidence:** Confirmed source and live.

`src/pages/index.astro` selects the newest ritual as feature, then removes only that *slug* from recent posts. The duplicate posts have distinct slugs but the same title and body. The live homepage visibly repeats the same story in its lead card and first recent card.

**Action:** PR [#289](https://github.com/maplebakin/witchclick/pull/289) de-duplicates the featured/recent selection by normalized title while preserving newest-first order and filling remaining slots. Unit tests cover duplicates and list caps. This is a *presentation guard*, not an editorial deduplication strategy. Intentionally distinct articles with matching titles should be disambiguated editorially, rather than indefinitely hidden.

### W04 · The optional runtime debug panel cannot reliably load on prerendered pages
**Impact:** Medium diagnostic/repair speed. **Confidence:** Confirmed structural code issue; new browser regression awaits execution.

In `Base.astro`, debug activation historically read `Astro.url?.searchParams.get('debug')` when generating static HTML. That build-time URL cannot observe a later visitor's `?debug=1` query. The inline module also referenced `@/utils/observability` inside `is:inline`, bypassing Astro bundling of the path alias. Thus production debug sessions were likely inactive or unable to resolve the module.

**Action:** PR [#291](https://github.com/maplebakin/witchclick/pull/291) embeds inert JSON configuration and uses a browser-time query check with a bundled dynamic import. A Playwright regression asserts that `/?debug=1` actually shows the panel. **Do not claim that new Playwright test has passed until it runs under the separated integration workflow.**

### W05 · A hidden, unusable search overlay remains in normal page markup
**Impact:** Low/medium interface coherence/accessibility. **Confidence:** Confirmed code and live page contents.

`src/data/navigation.ts` includes a direct Search link, so `Header.astro` hides its alternate search-modal trigger. However, the modal and duplicate SearchBox remain rendered on every public page. The live homepage markup also contains the second search surface. This creates dead weight and a second focusable structure which depends on CSS hiding correctly.

**Action:** PR [#292](https://github.com/maplebakin/witchclick/pull/292) mounts the modal only when its trigger exists. The normal Search route remains the primary path; a header configuration without the direct route retains the alternate modal. A browser test covers the default navigation.

### W06 · Editorial SEO counts and actual reader usefulness are not equivalent
**Impact:** Medium process policy. **Confidence:** Confirmed implementation.

`scripts/audit-seo.mjs` treats a number of links as a pass/fail property, uses `data.wordCount` from frontmatter instead of counting actual words, and counts `internalLinks[]` metadata without independently checking every URL's relevance to that article. It can incentivize padding or miss editorial problems while a metric remains green.

**Action:** Keep the warning until the duplicate articles are resolved, but evolve this checker toward *real* internal route validation, body-vs-metadata consistency, and useful contextual linking. Do not auto-inject links into personal, sensitive essays to satisfy a quota.

### W07 · Public and editorial content trees have intentionally different boundaries
**Impact:** Medium maintenance risk. **Confidence:** Confirmed source.

`loadAllPosts()` reads current public posts only from `src/content/posts/`. The SEO audit additionally reads legacy `content/posts` and `content/white-magic-curses`; public Clean Cursing reads a dedicated archive path via `src/utils/curses.ts`. This distinction is workable, but generic tooling that assumes a single source tree may audit or publish the wrong material.

**Action:** Document canonical inputs for posts, curses, entities, SEO, sitemap and generation. Compare the actual **published set** for each route, not raw file counts. Never bulk move/delete legacy archive files without a route-preservation plan.

### W08 · The Clean Cursing index renders a large library all at once
**Impact:** Medium mobile discoverability, potential performance. **Confidence:** Confirmed source/live structure; performance not measured.

The live Clean Cursing index says "Showing all 59 workings." It generates all cards and then client-filters them by intent, search text, and spoon level. The intent-first entrance is a good product choice and the underlying generator types match the intent chips, but all content is present before filtering. Clicking an intent scrolls the list into view without moving keyboard focus or explicitly announcing the selection as a navigation milestone.

**Next test:** On slow mobile hardware and keyboard/screen-reader flows, measure initial layout/DOM cost, focus after selection, announce result count, and clearing filters. Consider progressive display or pagination only if measured results warrant it; keep the intuitive intent doors.

### W09 · Native quality gates test browser fundamentals, not the full human reading experience
**Impact:** Medium quality coverage. **Confidence:** Confirmed workflow and test configuration.

The current Playwright suite uses Chromium with a production static preview. It checks meaningful routes and comfort-mode persistence, but the suite alone does not certify color contrast in every theme, mobile hit-target ergonomics, VoiceOver/TalkBack reading order, old-device performance, real native downloads, or Netlify deployment behavior.

**Action:** Create a small, reviewable visual/a11y acceptance matrix: desktop/phone, standard/calm/plain, keyboard focus in overlays, article reading, Clean Cursing filters, search, and page-level landmarks. Run representative checks on a production preview, not solely Astro dev.

### W10 · The repo's agent-facing documentation has historical language
**Impact:** Medium AI-assisted maintenance. **Confidence:** Confirmed timestamps/content, not a confirmed current runtime bug.

`AGENTS.md` is marked last updated April 2026 and contains a mix of older production-ready claims, historical metrics, and valid project conventions. `README.md` is substantially more current. Static audit conclusions should not be pulled blindly from historical reports, especially after the recent editorial spine merge.

**Action:** Make one short, actively maintained "current behavior and boundaries" entry point, linking to README, routes, production build safety, ingestion and this audit. Preserve historical documents as dated evidence rather than deleting them.

### W11 · The static/admin security boundary is a strength to preserve
**Impact:** High if regressed. **Confidence:** Confirmed source intent; production deployment headers not independently verified.

The public site is statically generated; `scripts/prune-nonpublic.mjs` removes `/admin` and `/api` output from production, and `verify-no-draft-leaks.mjs` checks draft routes and sitemap/data references. Local admin mutation endpoints use separate access checks. This is appropriate boundary separation; a link to a static route or a query-based admin UI gate is not a substitute for server authorization.

**Action:** Preserve build-pruning tests and ensure deploy previews never expose development APIs, unpublished Markdown, or runtime admin secrets. No current security exploit is claimed by this audit.

## Priority sequence

1. Merge **#288 first** so editorial content debt no longer hides browser failures. A red SEO job is allowed to be *informative* rather than opaque.
2. Review **#290** to keep *new* collisions as drafts, then decide what to do with current `-2` and `-3` duplicates. Do not delete public URLs without redirects or considering existing links.
3. Review **#289** for immediate homepage reader quality.
4. Validate and review **#291/#292** with actual built-site Chromium tests after #288.
5. Test the real complete reader loops across desktop, phone, comfort modes and keyboard: arrive by need, browse work, open/cross-link article, find another via search, return/home.
6. Fix actual information hierarchy and illustration placement in a focused visual pass *after* the core journey is reliable. Keep Cinzel/Cormorant, the warm charcoal, mulberry accent and the secular, non-game grimoire positioning.

## Deliberately left untouched

- Existing published article files, published slugs and canonical URLs: editorial decisions and redirects needed.
- Font pairing, established color palette, reader language, low-spoon approach, Clean Cursing philosophy.
- Production build pruning and local admin authentication.
- Homepage section architecture and featured/recent content roles.

## What was validated

GitHub Actions for **#288**: Node 20 and Node 22 quality jobs succeeded; Chromium/browser integration succeeded; separate SEO content audit failed on the existing two duplicate published articles. Other PRs contain new tests but may still have the baseline SEO failure until the independent workflow is merged. Separate build workflows have succeeded for some PR branches; that does **not** prove their new Playwright tests passed.

The homepage, Clean Cursing directory and Start page were viewed from the live site. Source reviews inspected Astro readers, navigation, ingestion, staging, CI, and browser diagnostics. This is a broad, evidence-driven pass, **not** a claim to have manually verified every post, entity route, admin operation or device.
