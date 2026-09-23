# Sitemap audit — 2026-09-23

## Result

The fresh local build completed successfully and produced a 320-URL sitemap. Compared with the QA sitemap, 193 URLs are absent and six new URLs appear: `507 - 193 + 6 = 320`. The two QA sitemap copies checked (`witchclick.space` and its Netlify alias) contain the same 507 paths.

The 193 absences are fully partitioned below. One entity detail route looks like an unintended publication-filter exclusion, and the single-post tag total does not match the older QA summary; both are flagged for Maddie. No source publication logic or entity content was changed for this audit.

## Method and verification

- Rebuilt from local `main` with `npm run build` on 2026-09-23. Build exit code: 0. Astro built 643 pages; the sitemap generator included 320 URLs.
- Compared pathnames from the QA and rebuilt XML after removing only the host, query/fragment, and trailing slash.
- Set sizes: QA 507; shared 314; QA-only 193; rebuilt-only 6; rebuilt 320.
- The live QA and Netlify sitemap copies both had 507 URLs and identical path sets.
- The QA crawl's `crawl.json`, cited by `FINDINGS.md`, is not present in this checkout, so per-page QA word counts cannot be recreated from that raw artifact.

## Drop accounting

| Reason | URLs | Build behavior |
| --- | ---: | --- |
| Thin entity shells from the 31-page list | 31 | Not emitted by `readAllEntities({ includeUnpublished: false })`; the content loader classifies empty/stub records as unpublished. |
| Single-result topic pages | 156 | Still emitted, but carry `noindex` under the `<2` result rule; `generate-sitemap.mjs` excludes every page with a robots `noindex` meta tag. |
| Empty entity index routes | 2 | `/entities/planet` and `/entities/spread` are emitted with `noindex` because they have no publicly published entries. |
| Rose Quartz entity detail | 1 | Not emitted because its local entity JSON has an empty summary and properties; see flag below. |
| Partner directory | 1 | `/partners` is emitted with `noindex` because there are no verified public listings. |
| Dev test route | 1 | `/test-theme-admin` is absent from the rebuilt output. |
| Duplicate curse copy | 1 | `-2` route is absent and has a 301 redirect to the canonical curse. |
| **Total** | **193** | |

### 31 thin entity shells (intentional publication filter)

These are the known thin-shell routes. They were not edited. Their source records remain in `content/entities/`.

- `/entities/crystal/smoky-quartz`
- `/entities/herb/rose`
- `/entities/moonPhase/third-quarter`
- `/entities/moonPhase/waning-crescent`
- `/entities/ritual/90-second-reset`
- `/entities/ritual/bravery-ladder`
- `/entities/ritual/breath-and-card-check-in`
- `/entities/ritual/decision-release-ritual`
- `/entities/ritual/deep-closure-ritual`
- `/entities/ritual/first-day-new-job-spread`
- `/entities/ritual/gentle-pause-ritual`
- `/entities/ritual/inner-dialogue-spread`
- `/entities/ritual/name-the-need`
- `/entities/ritual/pre-interview-grounding-ritual`
- `/entities/ritual/secular-journaling-ritual`
- `/entities/ritual/secular-sign-check-in`
- `/entities/ritual/tea-and-timer`
- `/entities/ritual/walkaway-cooldown`
- `/entities/spread/clarity-check-in-spread`
- `/entities/spread/five-card-rest-spread`
- `/entities/spread/secular-tarot`
- `/entities/spread/single-card-anchor`
- `/entities/spread/stay-pause-release-spread`
- `/entities/spread/three-card`
- `/entities/spread/three-card-sign-seeking`
- `/entities/spread/two-paths-choice-spread`
- `/entities/tarot/death`
- `/entities/tarot/page-of-cups`
- `/entities/tarot/the-fool`
- `/entities/tarot/the-hanged-one`
- `/entities/tarot/two-of-cups`

### Single-result topic pages (robots noindex)

All 156 paths below are absent from the sitemap because their rebuilt pages contain a robots `noindex` meta tag under the current `resultCount < 2` rule. The pages remain generated. I re-fetched all 156 corresponding live routes during this audit; each currently rendered one article card.

`FINDINGS.md` records 113 single-post tag pages as acceptable long-tail pages. The current exclusion count is 43 higher. The noindex mechanism accounts for the dropped URLs, but the count difference is not reconciled by the QA artifacts available in this checkout; see Maddie's flags.

- `/tag/acupuncture`
- `/tag/anger-release`
- `/tag/apocalypse`
- `/tag/authenticity`
- `/tag/autumn-rituals`
- `/tag/avoidance`
- `/tag/azazel`
- `/tag/banish-fog`
- `/tag/banishment`
- `/tag/beginner-friendly`
- `/tag/belonging`
- `/tag/birth-chart`
- `/tag/body-awareness`
- `/tag/boundary-ritual`
- `/tag/calm-space`
- `/tag/calming-rituals`
- `/tag/cleaning-ritual`
- `/tag/cognitive-flexibility`
- `/tag/color-mapping`
- `/tag/colour-magic`
- `/tag/colour-therapy`
- `/tag/communication`
- `/tag/comparative-religion`
- `/tag/compassion`
- `/tag/conflict`
- `/tag/connection`
- `/tag/cozy-witchcraft`
- `/tag/creative-block`
- `/tag/creative-practice`
- `/tag/creative-re-entry`
- `/tag/creative-recovery`
- `/tag/creative-return`
- `/tag/creative-ritual`
- `/tag/cursing-ritual`
- `/tag/december`
- `/tag/deconstruction`
- `/tag/depression`
- `/tag/desert-magic`
- `/tag/divination`
- `/tag/doomscrolling`
- `/tag/double-crown`
- `/tag/emotion`
- `/tag/emotional-awareness`
- `/tag/emotional-clarity`
- `/tag/emotional-growth`
- `/tag/emotional-processing`
- `/tag/emotional-release`
- `/tag/energetic-hygiene`
- `/tag/energy-patterns`
- `/tag/eschatology`
- `/tag/everlasting-soul`
- `/tag/everyday-spellcraft`
- `/tag/existence`
- `/tag/faith-transition`
- `/tag/first-day`
- `/tag/football`
- `/tag/forgiveness`
- `/tag/free-time-ideas`
- `/tag/game-day`
- `/tag/gaming`
- `/tag/gentle`
- `/tag/gentle-lessons`
- `/tag/gentle-living`
- `/tag/gentle-self-care`
- `/tag/gentleness`
- `/tag/grounding-techniques`
- `/tag/hands-on`
- `/tag/health`
- `/tag/health-boundaries`
- `/tag/heart`
- `/tag/heart-awareness`
- `/tag/history`
- `/tag/holidays`
- `/tag/home-blessing`
- `/tag/hope`
- `/tag/household-magic`
- `/tag/identity`
- `/tag/illness`
- `/tag/imperfect-progress`
- `/tag/inner-guidance`
- `/tag/inner-narrative`
- `/tag/inner-world`
- `/tag/interview-prep`
- `/tag/intuition`
- `/tag/intuition-building`
- `/tag/job-search`
- `/tag/journal-prompts`
- `/tag/journaling-prompts`
- `/tag/journaling-ritual`
- `/tag/journey-over-destination`
- `/tag/justice-magic`
- `/tag/low-energy`
- `/tag/low-energy-option`
- `/tag/mental-health`
- `/tag/mental-overwhelm`
- `/tag/metaphysical-reflection`
- `/tag/mindful-pacing`
- `/tag/moon-timing`
- `/tag/mystical-tools`
- `/tag/neurodivergence`
- `/tag/neurodivergent-friendly`
- `/tag/new-job`
- `/tag/new-year`
- `/tag/nintendo`
- `/tag/november-2025`
- `/tag/ostara`
- `/tag/outside-stress`
- `/tag/overthinking`
- `/tag/parenting`
- `/tag/pattern-recognition`
- `/tag/personal-myth`
- `/tag/perspective-shift`
- `/tag/perspective-taking`
- `/tag/political-unrest`
- `/tag/productivity`
- `/tag/projects`
- `/tag/protection`
- `/tag/psychology`
- `/tag/reality`
- `/tag/recovery`
- `/tag/relationships`
- `/tag/releasing`
- `/tag/religious-beliefs`
- `/tag/rest-and-survival`
- `/tag/scrying`
- `/tag/secular-reflection`
- `/tag/self-awareness`
- `/tag/self-healing`
- `/tag/self-regulation`
- `/tag/self-worth`
- `/tag/sensory-life`
- `/tag/slow-living`
- `/tag/slow-seasons`
- `/tag/social-navigation`
- `/tag/spell`
- `/tag/spiritual-identity`
- `/tag/spiritual-practice`
- `/tag/spring-equinox`
- `/tag/steam`
- `/tag/story-design`
- `/tag/storytelling`
- `/tag/substitutions`
- `/tag/sun-sign`
- `/tag/symbolism`
- `/tag/tarot-spreads`
- `/tag/tarotspread`
- `/tag/tea`
- `/tag/toxic-positivity`
- `/tag/transits`
- `/tag/uncertainty`
- `/tag/waiting`
- `/tag/work-anxiety`
- `/tag/worldbuilding`
- `/tag/writing-ritual`
- `/tag/xbox`
- `/tag/yarn-craft`

### Other intentional noindex routes

These routes are still generated, but the sitemap generator omits them because they carry `noindex`:

- `/entities/planet`
- `/entities/spread`
- `/partners`

### Dev-only and duplicate routes

- `/test-theme-admin` — not present in `dist/`; intentionally removed from public output.
- `/curses/smoke-rite-releasing-distorted-memory-echoes-2` — not present in `dist/`; [public/_redirects](/home/maddie/Documents/code/witchclick/public/_redirects) sends it to `/curses/smoke-rite-releasing-distorted-memory-echoes/` with status 301.

## Maddie's flags

1. **Rose Quartz is an extra entity exclusion outside the known 31-shell list.** The current source file `content/entities/crystal/rose-quartz.json` has an empty summary and properties, so the publication filter omits its route. The existing live page returned during this audit has 105 words in its main content and links to two related posts. It was present in the 507-URL QA sitemap and was not on the known 31 hidden-shell list. This looks like a source/publication-state mismatch and should be reviewed; it was left untouched.
2. **The topic-page count differs from the QA note.** The QA report says 113 single-post tags; 156 old sitemap tag routes are absent under the current noindex rule. The current live responses for all 156 each rendered one article card, but the missing raw `crawl.json` prevents exact reconciliation to the original crawl. No tag or indexing logic was changed.

## New URLs in the rebuilt sitemap

These six additions offset the 193 drops:

- `/post/holding-strength-when-holding-accountable`
- `/post/tarot-for-skeptics-practical-card-pull-working`
- `/tag/ethical-curse`
- `/tag/mirrorcasting`
- `/tag/returning-energy`
- `/tag/truthwork`

The four new `/tag/` paths correspond to curse tags now represented by topic pages. The two `/post/` paths are present in the local build but not in the QA sitemap.

## Build note

The build passed, with one existing duplicate content ID warning for `creative-re-entry-after-a-season-of-outside-stress`; Astro says the later item wins. It did not prevent output or change the sitemap comparison.
