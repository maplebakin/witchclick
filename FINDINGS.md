# WitchClick QA run-through — findings (2026-09-23)

**Site tested:** https://witchclick.netlify.app/ (live). Canonical domain is
https://witchclick.space/ — both serve identical content (200 on both, canonical
tag points to witchclick.space; no redirect, but the canonical tag handles SEO).

**Method note:** Playwright/Chromium could not reach the network from this
sandbox (the egress proxy returns empty responses for Chromium traffic, while
curl and Node work fine), so no real-browser rendering was possible. Instead:
full sitemap crawl of all **507 URLs** (status codes, titles, word counts, image
checks), verification of all 54 unique images, analysis of the live `search.json`
index plus its search script, JS execution of 10 key pages in jsdom with console
+ `window.onerror` capture, and DOM-level probing of the interactive lab tool.
Mobile layout could **not** be visually verified — only static checks (viewport
meta, media queries) were possible.

**Scope covered:** homepage orientation, curse article read-through, crystal
index, tarot directory, search, ritual tools/printables, mobile CSS, console
errors. No code changed; repo untouched (private).

---

## BROKEN (needs fixing)

### 1. Ritual Lab is non-functional and shows a developer message to visitors
- **URL:** https://witchclick.space/lab/ → "Your Ritual Draft" section
- **Repro:** open /lab/, scroll to "Your Ritual Draft".
- **What happens:** the draft area reads: *"Ritual data not found. Add
  labRitual metadata to src/content/posts entries to populate this space."*
  The embedded `#ritual-lab-data` JSON block is `"entries": []`.
- **Should be:** either populated ritual data or the tool hidden until ready.
  A `src/content` path in user-facing copy is a dead giveaway of a dev leak.
- **Context:** the unmerged search-overhaul branch reportedly carries 46
  labRitual data files — this is almost certainly the same missing-data gap,
  so it may resolve when that branch lands. Until then the Lab is a dead tool
  on the live site.

### 2. Duplicate article published at two URLs (byte-identical)
- **URLs:**
  - https://witchclick.space/curses/smoke-rite-releasing-distorted-memory-echoes/
  - https://witchclick.space/curses/smoke-rite-releasing-distorted-memory-echoes-2/
- **Repro:** open both; identical title, identical 434-word body. Both are in
  `sitemap-0.xml`, so both get indexed.
- **Should be:** one canonical article; the `-2` copy unpublished/redirected.

### 3. Dev test page is publicly indexed in the sitemap
- **URL:** https://witchclick.space/test-theme-admin (in `sitemap-0.xml`)
- **Repro:** open it — "Theme Editor Test 🎃", "Dev API base URL", "Run Test",
  "Refresh Theme List" buttons.
- **Should be:** excluded from the sitemap (and ideally from production builds).

### 4. "View preview" / "Explore Live Tools" links on the Tools page go nowhere
- **URL:** https://witchclick.space/tools/
- **Repro:** under "Free Prints & Ritual Supports", click "View preview →" on
  either the Character Creation Spread or the Three-Day Ritual Sampler.
  Both link to `/tools` — the page you're already on. "Explore Live Tools →"
  also self-links to `/tools`.
- **Should be:** previews of the actual printables (or the links removed).
  (The real downloads do work: the Character Creation Spread PDF downloads
  fine at 261 KB, and `/lab/three-day-sampler/` renders.)

---

## SEARCH: present but the flagship content is invisible to it

### 5. Search index covers only posts — zero curses, zero entities
- **Repro:** type in any search box (present on 506/507 pages):
  - `knife rite` → **0 hits** (the entire Knife Rite curse series exists at
    `/curses/` but is not indexed)
  - `cord cutting` → **0 hits** ("Knife Rite for Cord-Cutting That Leaves No
    Shrapnel" is a live article)
  - `amethyst` → **0 hits** (crystal index entry exists)
  - `december` → 1 hit (works — post titles/excerpts/tags are indexed)
- **Root cause:** `/search.json` contains 61 entries, all resolving under
  `/post/`; the 60 curses, 150 entities, hubs, tools, and tags are absent.
  Matching is plain case-insensitive substring on title+excerpt+tags, capped
  at 8 results, no typo tolerance.
- **Note:** result links hardcode `/post/${slug}`, which is correct for every
  currently indexed item — no 404 bug there, but if curses get added to the
  index without fixing the link template, every curse result would 404.
- This is presumably what the unmerged search overhaul addresses; on the live
  site, search is decorative for the site's core content.

### 6. `/search/?q=…` does nothing
- **Repro:** visit https://witchclick.space/search/?q=december — the query is
  ignored; no prefill, no results. The `/search` page is just the same
  combobox as everywhere else.

---

## CONFUSING BUT WORKS / papercuts

### 7. Tag pills on curse pages aren't clickable
- **Repro:** open any curse (e.g. `/curses/knife-rite-clean-cord-cutting/`) —
  tags (white-magic, truthwork, mirrorcasting…) render as plain `<span>`s.
  Post cards elsewhere *do* link tags (`/tag/creative-ritual`).
- **Effect:** no way to pivot from a curse to related content by topic.

### 8. Curse tags have no tag pages (404 if guessed)
- The 213 `/tag/…` pages only cover post tags. Curse-only tags like
  `truthwork` → https://witchclick.space/tag/truthwork/ → **404**.

### 9. Thin entity shells (content gap, not a bug)
- All 8 spread entries, most ritual entries, and unwoven tarot cards
  (**The Fool**, **Death** among them) render only a title plus
  *"No posts have woven X into our rituals yet. Visit the Lore Hub…"*
  (~50 words). 31 entity pages are under 60 words.
- Entries that *are* woven into posts (e.g. The Magician, most crystals) have
  real meanings, properties, and related-post links — so the pattern works,
  it's just sparsely populated.

### 10. One stub post
- `/post/creative-re-entry-after-a-season-of-outside-stress` contains the word
  "placeholder" in its body text (only stub-marker hit site-wide).

### 11. CSS dead zone 720–768px
- `index.*.css` uses `@media(max-width:719px)` alongside
  `@media(min-width:769px)` — viewports 720–768px match neither rule.
  Probably harmless (base styles cover it) but worth a glance.

### 12. 113 single-post tag pages
- Over half the tag pages list exactly one post — fine for a growing archive,
  just long-tail thin.

---

## VERIFIED WORKING WELL

- **507/507 sitemap URLs return 200** (after trailing-slash redirect); zero
  broken pages, zero broken images (54 unique images checked).
- **Zero JS console errors and zero uncaught page errors** across 10 executed
  pages (home, search, curses index, a curse article, crystal page, tools,
  tags, hub, theme-admin, lab) — including clicking the lab's generate button.
- Search combobox is on 506/507 pages with proper ARIA
  (`role=combobox`, `aria-expanded`, `aria-controls`).
- Curse articles are genuinely well-structured: TL;DR, spoon-theory labels
  ("Low spoons: quick read/short ritual"), Opening Reflection, Invocation,
  Method, Closure & Aftercare, Safety Notes, Journaling Follow-up.
- **`/start` is a good first-visitor orientation page**; nav is clear
  (Start Here, Grimoire, Hubs, Ritual Tools, White Magic Curses, Archive,
  Tags, Search).
- **Mood hubs work** (`/hub/calm`, `/hub/focus`, `/hub/release`) with live
  practices listed.
- **Comfort settings** (theme/font/calm-contrast toggles, persisted to
  localStorage) ran without errors — a strong neurodivergent-first touch.
- Proper mobile menu button (`aria-controls="mobile-navigation"`), viewport
  meta present, responsive breakpoints throughout the CSS.
- `feed.json` valid with 61 items; canonical tags correct; Plausible analytics
  (self-hosted, no-cookie) — privacy-respecting.
- Printable PDF download works; `/lab/three-day-sampler` renders.

---

## Suggested fix order for Maddie

1. Decide the Lab's fate: populate `labRitual` data (likely arrives with the
   search branch) or hide `/lab/` until then — the dev-facing message is the
   most user-visible breakage.
2. Remove the duplicate `-2` curse article.
3. Drop `/test-theme-admin` from the sitemap/build.
4. Fix or remove the self-linking "View preview" links on `/tools`.
5. When the search overhaul lands, make sure the index covers curses +
   entities and the result-link template handles both `/post/` and `/curses/`.
6. Nice-to-haves: clickable tag pills on curse pages; tag pages for curse
   tags; fill in The Fool/Death/spread shells.

Raw crawl data: `crawl.json` in this folder. Scripts: `crawl.js`,
`jsdom-run.js`, `lab-run.js`, `qa-run.js` (Playwright version — unusable in
this sandbox, kept for a networked environment).
