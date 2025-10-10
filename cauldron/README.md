# Cauldron — Cozy Drafting Lab

This directory houses the Cauldron drafting experience: an Astro + Preact workspace for shaping WitchClick PostSpec v2 drafts. The prompt engine now wires real data, live previewing, and local persistence so you can experiment with ritual outlines before ingesting them into the main site.

## Project layout
```
cauldron/
├── src/
│   ├── components/
│   │   ├── PromptEngine.astro     ← Island wrapper for the interactive editor
│   │   └── PromptEngine.tsx       ← Prompt builder, editor, preview, persistence logic
│   ├── data/
│   │   ├── draftLibrary.ts        ← Imports JSON seeds for the UI
│   │   └── drafts/                ← Draft JSON seeds (PostSpec v2)
│   │       ├── burnout-kit.json
│   │       └── cozy-games.json
│   └── pages/
│       └── index.astro            ← Mounts the prompt engine
├── docs/
│   └── cauldron-prompt-engine-plan.md ← Step-by-step plan tracked for this iteration
├── astro.config.mjs               ← Astro + Tailwind + Preact configuration
├── package.json                   ← Scripts/dependencies for the lab
└── README.md                      ← This guide
```

## Current capabilities
- ✅ Load seed drafts from `src/data/drafts` and list locally-saved versions.
- ✅ Edit PostSpec metadata, outline, sections, hero prompt, and CTA details with instant preview.
- ✅ Assemble a reusable prompt blueprint that updates alongside draft changes.
- ✅ Save to `localStorage`, copy JSON, and download a ready-to-ingest draft file.

## Usage
Install dependencies and start the dev server:

```sh
cd cauldron
npm install
npm run dev
```

Open `http://localhost:4370` to explore the prompt engine. Local drafts are stored under `localStorage` (key `cauldron.promptEngine.drafts.v1`) so you can close the tab and resume later.

Use the **Generated prompt** textarea to capture instructions for your favorite model, then polish the resulting JSON in the editor pane. When everything shines, copy or download the draft for ingestion into WitchClick proper.
