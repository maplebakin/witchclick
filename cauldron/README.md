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
2. `npm install`
3. Symlink the shared PostSpec helpers so the validator can load them. Pick whichever location matches your checkout:

   ```sh
   ln -s ../witchclick-shared witchclick-shared
   # or, if the shared package lives inside a packages/ folder
   ln -s ../packages/shared witchclick-shared
   ```

   If you keep Cauldron inside the WitchClick repo during migration, linking to `../server` works as a temporary stand-in.

4. `npm run dev`
5. Visit `http://localhost:4370` to browse drafts. Sidebar navigation is designed for wide screens and keyboard traversal.

Tailwind styles are tuned locally for a denser desktop layout. The preview UI keeps the draft list pinned on the left and renders the active ritual on the right so you can scroll, compare, and edit without losing context.

## Draft workflow
- Create or edit a draft inside `drafts/`. Keep the filename aligned with the slug.
- Run `npm run validate` to lint every draft or `npm run list-drafts` to see quick metadata.
- Ready to hand it off? `npm run promote -- <slug>` validates the file and drops it into WitchClick’s `content/prompt-queue/approved/` directory so it can be ingested with the usual scripts. Set `WITCHCLICK_ROOT=/path/to/witchclick` if the repo lives somewhere other than a sibling directory.

Experiments and abandoned ideas should remain in Cauldron. Promote only the spells you would proudly publish.

## Splitting this directory into its own repo

When you are ready to detach Cauldron from the WitchClick monorepo, a subtree split keeps the history intact:

```sh
git subtree split --prefix=cauldron --branch cauldron-release
```

Push the resulting `cauldron-release` branch to a new remote, or replace the branch/remote names with your preferred ritual.
