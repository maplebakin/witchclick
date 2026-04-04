# Pre-Traffic Audit — 2026-04-01

Generated on `2026-04-03` from direct source inspection and fresh build output.

## Scope

This audit was run before a public Tumblr traffic push. Counts below were calculated from the filesystem and generated `dist/` output, not from existing documentation.

Published post rule used:

- `draft !== true`
- `published !== false`
- not future-dated using first valid value from `publishDate`, `publishedAt`, `pubDate`, or `date`

Route count rule used:

- Counted non-asset route files emitted in `dist/` with extensions `.html`, `.xml`, `.json`, `.txt`, or `.pdf`
- Excluded bundled assets under `dist/_astro/`

## Command Run Summary

All required commands were executed in the requested order and exited `0`.

1. `npm install`
2. `npm run check`
3. `npm run test`
4. `npm run build`
5. `npm run linkcheck`
6. `npm run audit:seo`
7. `npm run check:affiliates`

Raw command logs were captured here:

- `/tmp/pretraffic-logs/01-npm-install.log`
- `/tmp/pretraffic-logs/02-npm-run-check.log`
- `/tmp/pretraffic-logs/03-npm-run-test.log`
- `/tmp/pretraffic-logs/04-npm-run-build.log`
- `/tmp/pretraffic-logs/05-npm-run-linkcheck.log`
- `/tmp/pretraffic-logs/06-npm-run-audit-seo.log`
- `/tmp/pretraffic-logs/07-npm-run-check-affiliates.log`

High-signal outcomes:

- `npm install`: up to date
- `npm run check`: passed, with `15` Astro ESLint warnings and `0` errors
- `npm run test`: `92/92` tests passed
- `npm run build`: passed; Astro reported `626` pages built, sitemap generator reported `474` included URLs
- `npm run linkcheck`: passed; `29171` links across `617` HTML files
- `npm run audit:seo`: passed; `55` published posts reported compliant by that script
- `npm run check:affiliates`: passed; `12` products checked

## Content

- Total post files in `src/content/posts`: `158`
- Published posts: `53`
- Draft posts: `105`

Published posts with placeholder signals:

- Unique published posts matching any placeholder signal: `0`
- `excerpt` contains `Placeholder post`: `0`
- `tags` include `placeholder` or `stub`: `0`
- body contains `Content coming soon`: `0`
- body contains `automatically created as a stub`: `0`
- `outline` exactly equals `["Placeholder"]`: `0`

Quality flags on published posts:

- Published posts missing `heroImage` and `heroImageSrc` and `ogImage`: `20`
- Published posts missing `metaDescription` and `description` and `excerpt`: `0`
- Published posts with word count under `300`: `0`

## Entities

- Total entity files in `content/entities`: `181`

Stub entities by type:

- `crystal`: `7`
- `herb`: `2`
- `moonPhase`: `7`
- `planetaryDay`: `6`
- `ritual`: `24`
- `tarot`: `27`

Published entities by type:

- `crystal`: `24`
- `herb`: `18`
- `moonPhase`: `2`
- `planetaryDay`: `1`
- `ritual`: `3`
- `tarot`: `60`

Stub entity rule used:

- `status` in `draft`, `stub`, `placeholder`, `pending`, `wip`
- or `summary` matched placeholder-style patterns including empty summary, `stub entity`, `placeholder`, `coming soon`, `check back soon`, `nothing here yet`, `lore in progress`, `pending`, or `wip`

## Routes

- Total route files emitted in `dist/`: `628`
- Total HTML files emitted in `dist/`: `617`
- Sitemap URLs emitted: `474`

Public routes containing placeholder phrases:

- `/meanderings/`
  Phrase(s): `check back soon`
  File: `dist/meanderings/index.html`

Searched phrases:

- `check back soon`
- `coming soon`
- `nothing here yet`
- `lore in progress`
- `no tools to share yet`
- `placeholder`
- `this area is brewing`

## Affiliates

Product keys from `content/products.json`:

- `altar-kit` → `https://www.amazon.com/s?k=altar+tools+chalice+altar+cloth+ritual+candles&tag=witchclickspa-20` → `generic_search_url`
- `aroma-diffuser` → `https://www.amazon.com/s?k=ceramic+essential+oil+diffuser&tag=witchclickspa-20` → `generic_search_url`
- `chakra-bracelet` → `https://www.amazon.com/s?k=chakra+bracelet+mala&tag=witchclickspa-20` → `generic_search_url`
- `crystal-bible` → `https://bookshop.org/a/witchclick/search?keywords=the+crystal+bible+judy+hall` → `generic_search_url`
- `gemstone-candle` → `https://www.amazon.com/s?k=gemstone+infused+candle&tag=witchclickspa-20` → `generic_search_url`
- `himalayan-salt-lamp` → `https://www.amazon.com/s?k=himalayan+salt+lamp&tag=witchclickspa-20` → `generic_search_url`
- `mindfulness-journal` → `https://www.amazon.com/s?k=guided+mindfulness+journal&tag=witchclickspa-20` → `generic_search_url`
- `moonology` → `https://bookshop.org/a/witchclick/search?keywords=moonology+yasmin+boland` → `generic_search_url`
- `singing-bowl` → `https://www.amazon.com/s?k=singing+bowl+set&tag=witchclickspa-20` → `generic_search_url`
- `smudge-kit` → `https://www.amazon.com/s?k=white+sage+palo+santo+kit&tag=witchclickspa-20` → `generic_search_url`
- `sustainable-incense` → `https://www.amazon.com/s?k=sustainable+incense+sticks&tag=witchclickspa-20` → `generic_search_url`
- `tumbled-stones` → `https://www.amazon.com/s?k=tumbled+stones+set&tag=witchclickspa-20` → `generic_search_url`

`/go/:key` mappings from `public/_redirects`:

- `/go/sustainable-incense` → `https://www.amazon.com/s?k=sustainable+incense+sticks&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=sustainable_incense` (`302`)
- `/go/altar-kit` → `https://www.amazon.com/s?k=altar+tools+chalice+altar+cloth+ritual+candles&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=altar_kit` (`302`)
- `/go/gemstone-candle` → `https://www.amazon.com/s?k=gemstone+infused+candle&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=gemstone_candle` (`302`)
- `/go/aroma-diffuser` → `https://www.amazon.com/s?k=ceramic+essential+oil+diffuser&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=aroma_diffuser` (`302`)
- `/go/tumbled-stones` → `https://www.amazon.com/s?k=tumbled+stones+set&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=tumbled_stones` (`302`)
- `/go/himalayan-salt-lamp` → `https://www.amazon.com/s?k=himalayan+salt+lamp&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=himalayan_salt_lamp` (`302`)
- `/go/singing-bowl` → `https://www.amazon.com/s?k=singing+bowl+set&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=singing_bowl` (`302`)
- `/go/mindfulness-journal` → `https://www.amazon.com/s?k=guided+mindfulness+journal&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=mindfulness_journal` (`302`)
- `/go/chakra-bracelet` → `https://www.amazon.com/s?k=chakra+bracelet+mala&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=chakra_bracelet` (`302`)
- `/go/smudge-kit` → `https://www.amazon.com/s?k=white+sage+palo+santo+kit&tag=witchclickspa-20&utm_source=witchclick&utm_medium=affiliate&utm_campaign=smudge_kit` (`302`)
- `/go/crystal-bible` → `https://bookshop.org/a/witchclick/search?keywords=the+crystal+bible+judy+hall&utm_source=witchclick&utm_medium=affiliate&utm_campaign=crystal_bible` (`302`)
- `/go/moonology` → `https://bookshop.org/a/witchclick/search?keywords=moonology+yasmin+boland&utm_source=witchclick&utm_medium=affiliate&utm_campaign=moonology` (`302`)

## Broken Links

- No broken internal links were reported by `npm run linkcheck`

## Findings To Review Before Traffic Push

- Published content is smaller than the current docs claim: `53` published posts from source, not `55`
- `20` published posts are still missing all three hero image fields: `heroImage`, `heroImageSrc`, and `ogImage`
- Entity inventory is heavily stub-weighted in some types, especially `ritual` (`24` stubs vs `3` published), `tarot` (`27` stubs), `moonPhase` (`7` stubs), and `planetaryDay` (`6` stubs)
- At least one public route, `/meanderings/`, still contains placeholder-style copy
