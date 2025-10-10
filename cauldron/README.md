# Cauldron

Cauldron is the workshop for WitchClick. It is where PostSpec v2 rituals get drafted, linted, and previewed before they are ingested into the cozy production site. The stack mirrors WitchClick (Astro + Tailwind + PostSpec tooling) but the ergonomics are tuned for fast, desktop-first iteration.

## Why this exists
- **Focus on iteration.** Treat Cauldron like a studio notebook, not a publication surface. Rough experiments are welcome.
- **Stay close to the spec.** Drafts live as PostSpec v2 JSON files. Prompts that generated them stay alongside for provenance.
- **Promote intentionally.** Only move a draft into WitchClick once it validates cleanly and reads beautifully.

## Project map
```
cauldron/
├── drafts/              ← Working PostSpec v2 payloads (.json)
├── prompts/             ← Prompt sources that birthed each draft
├── scripts/             ← Local automation for linting + promotion
├── src/                 ← Astro UI for previewing and iterating drafts
└── package.json         ← `npm run dev` for the lab, not the public site
```

## Getting started
1. `cd cauldron`
2. `npm run dev`
3. Visit `http://localhost:4370` to browse drafts. Sidebar navigation is designed for wide screens and keyboard traversal.

Tailwind styles are inherited from WitchClick but tweaked for a denser desktop layout. The preview UI keeps the draft list pinned on the left and renders the active ritual on the right so you can scroll, compare, and edit without losing context.

## Draft workflow
- Create or edit a draft inside `drafts/`. Keep the filename aligned with the slug.
- Run `npm run validate` to lint every draft or `npm run list-drafts` to see quick metadata.
- Ready to hand it off? `npm run promote -- <slug>` validates the file and drops it into WitchClick’s `content/prompt-queue/approved/` directory so it can be ingested with the usual scripts.

Experiments and abandoned ideas should remain in Cauldron. Promote only the spells you would proudly publish.
