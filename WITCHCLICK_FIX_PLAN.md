# WitchClick fix plan — for Luna (implementing agent)

**Source:** hands-on QA run-through of the live site (https://witchclick.space/) on 2026-09-23.
Full findings with repro steps: `FINDINGS.md` in this folder. Raw crawl: `crawl.json`.
**Do not change the site's voice, aesthetic, or content** — these are bug fixes and indexing fixes only.

**Working method:** work through the items in order. After each item, rebuild and verify the acceptance criterion before moving on. If any item's assumed file location is wrong, find the real one — don't skip the item.

---

## 0. Land the search-overhaul branch first

The branch `codex/pretraffic-admin-fixes` reportedly contains the search overhaul (46 `labRitual` data files + a Lab engine fix) but is **not merged or deployed**.

- Merge it into `main` (resolve conflicts if any) and deploy to the Netlify production URL.
- Then verify item 1 below. If the Lab works after the merge, item 1 is done — just confirm no dev-facing copy remains anywhere on `/lab/`.

**Acceptance:** `/lab/` on the live production URL shows a working Ritual Lab with populated ritual data.

---

## 1. Ritual Lab must not show developer copy (if still broken after item 0)

**Problem:** `/lab/` → "Your Ritual Draft" reads: *"Ritual data not found. Add labRitual metadata to src/content/posts entries to populate this space."* The `#ritual-lab-data` JSON block is `"entries": []`. A `src/content` path in user-facing copy is a dev leak.

**Fix:** either populate the data or hide the tool until it's ready:
- Preferred: ensure `labRitual` metadata exists on content entries so the Lab populates.
- Fallback: remove `/lab/` from nav and noindex it until the data lands. A hidden tool beats a broken one.

**Acceptance:** no visitor can reach a page containing the words "src/content" or "metadata". `/lab/` either works or doesn't exist publicly.

---

## 2. Remove the duplicate article

**Problem:** byte-identical article at two URLs, both in `sitemap-0.xml`:
- `/curses/smoke-rite-releasing-distorted-memory-echoes/`
- `/curses/smoke-rite-releasing-distorted-memory-echoes-2/`

**Fix:**
- Keep ONE canonical copy (the non-`-2` URL).
- Delete/unpublish the `-2` source file.
- Add a redirect from the `-2` URL to the canonical URL (Netlify `_redirects` or equivalent) so no inbound link 404s.

**Acceptance:** the `-2` URL either redirects (301) to the canonical or 404s intentionally; only one copy appears in the sitemap.

---

## 3. Remove the dev test page from public builds

**Problem:** `/test-theme-admin` ("Theme Editor Test", "Dev API base URL", "Run Test" buttons) is in `sitemap-0.xml` and publicly reachable.

**Fix:**
- Exclude it from the sitemap.
- Ideally exclude it from production builds entirely (dev-only route).

**Acceptance:** `/test-theme-admin` is absent from the sitemap and unreachable on the production build.

---

## 4. Fix the self-linking preview links on /tools/

**Problem:** on `/tools/`, under "Free Prints & Ritual Supports", both "View preview →" links (Character Creation Spread, Three-Day Ritual Sampler) point to `/tools` — the page you're already on. "Explore Live Tools →" also self-links to `/tools`.

**Fix:** point each preview link at an actual preview of that printable (image, modal, or dedicated page). If no preview exists yet, remove the links rather than shipping dead ones. The real downloads work (Character Creation Spread PDF downloads fine at 261 KB; `/lab/three-day-sampler/` renders) — don't break those.

**Acceptance:** every link on `/tools/` takes the visitor somewhere real. No link points to the page it's already on.

---

## 5. Make search index the flagship content (the big one)

**Problem:** search exists on 506/507 pages but `/search.json` has 61 entries, ALL under `/post/`. Zero of the 60 curses and zero of the 150 entities are indexed:
- `knife rite` → 0 hits (Knife Rite series exists at `/curses/`)
- `cord cutting` → 0 hits ("Knife Rite for Cord-Cutting That Leaves No Shrapnel" is live)
- `amethyst` → 0 hits (crystal index entry exists)

**Fix:**
- Extend the search-index generation to include: all curses (`/curses/`), all entities (crystals, tarot, herbs, spreads, rituals — wherever their pages live), hubs, and tools pages.
- **Critical:** the result-link template currently hardcodes `/post/${slug}`. It must emit the correct path per content type (`/post/…`, `/curses/…`, entity paths). If curses get indexed without this fix, every curse result 404s. Verify by clicking results for each content type.
- Keep the 8-result cap; typo tolerance is a nice-to-have, not required.

**Acceptance:** `knife rite`, `cord cutting`, and `amethyst` each return relevant hits; clicking every type of result lands on the correct page (no 404s).

---

## 6. Make /search/?q= work

**Problem:** visiting `/search/?q=december` ignores the query — no prefill, no results. The `/search` page is just the same combobox as everywhere else.

**Fix:** on the `/search` page, read the `q` query param on load, prefill the input, and run the search.

**Acceptance:** `/search/?q=december` shows the input prefilled with "december" and results rendered.

---

## 7. Curse tags: make pills clickable or remove them

**Problem (two parts):**
- a. On curse pages (e.g. `/curses/knife-rite-clean-cord-cutting/`), tag pills (white-magic, truthwork, mirrorcasting…) render as plain non-clickable `<span>`s. Post cards elsewhere DO link tags (`/tag/creative-ritual`).
- b. Curse-only tags have no tag pages — `/tag/truthwork/` 404s. The 213 existing `/tag/…` pages cover post tags only.

**Fix (pick one, don't half-do both):**
- Option A (preferred): make curse tag pills link to tag pages, and generate tag pages covering curse tags too.
- Option B: remove the pills from curse pages until tag pages exist.

**Acceptance:** no dead-end UI — every visible tag pill leads to a working tag page, or there are no pills.

---

## 8. Content gaps (not bugs, but user-visible thinness)

- All 8 spread entries, most ritual entries, and unwoven tarot cards (**The Fool**, **Death** among them) are ~50-word shells ("No posts have woven X into our rituals yet…"). 31 entity pages are under 60 words. Either weave them into posts or consider unlisting the thinnest shells until they're written. Maddie decides per-page — flag the list, don't mass-delete.
- One post contains the literal word "placeholder" in its body: `/post/creative-re-entry-after-a-season-of-outside-stress`. Finish or remove that section.

**Acceptance:** no page contains the word "placeholder"; Maddie has the thin-shell list and has decided each page's fate.

---

## 9. CSS dead zone 720–768px

**Problem:** the stylesheet pairs `@media(max-width:719px)` with `@media(min-width:769px)` — viewports 720–768px match neither rule.

**Fix:** check what breaks (if anything) at 740px wide; adjust the breakpoints so there's no gap. Likely harmless (base styles cover it) but verify visually.

**Acceptance:** no layout breakage at 720–768px viewports.

---

## Global constraints

- **No regressions:** after all fixes, every sitemap URL still returns 200 (except intentionally removed ones, which must redirect or 404 cleanly), zero JS console errors, zero broken images.
- **Don't touch:** site copy/voice, the cozy-goth aesthetic, comfort settings (theme/font/calm-contrast), mood hubs, Plausible analytics.
- The 113 single-post tag pages are fine — long-tail, leave them.
- When done, summarize what changed per item with before/after verification notes.
