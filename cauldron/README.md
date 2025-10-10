# Cauldron — Cozy Drafting Lab (Work in Progress)

This directory houses the new Cauldron drafting experience: a VS Code-inspired Astro app for shaping WitchClick PostSpec v2 drafts. The current commit only scaffolds the layout and file structure so the design can be reviewed before wiring in live data.

## Project layout
```
cauldron/
├── src/
│   ├── components/
│   │   ├── ControlBar.astro       ← Placeholder buttons for save/copy/publish
│   │   ├── DraftEditor.astro      ← Read-only mock fields for PostSpec metadata
│   │   ├── DraftPreview.astro     ← Sample preview card rendering canned content
│   │   └── Sidebar.astro          ← Sectioned list of sample drafts
│   ├── data/
│   │   └── drafts/                ← Draft JSON seeds (PostSpec v2)
│   │       ├── burnout-kit.json
│   │       └── cozy-games.json
│   └── pages/
│       └── index.astro            ← Composes the placeholder layout
├── .env                           ← Local WITCHCLICK_API placeholder
├── astro.config.mjs               ← Astro + Tailwind configuration
├── package.json                   ← Scripts/dependencies for the lab
└── README.md                      ← This guide
```

## Status
- ✅ File tree established with placeholder components
- ✅ Sample draft content included for reference
- 🚧 No real interactivity yet — components are static until the next iteration

## Next steps
1. Wire the Sidebar to load drafts from `/src/data/drafts/`.
2. Make the editor fields interactive with localStorage persistence.
3. Reflect live edits inside `DraftPreview.astro`.
4. Implement the control bar actions (copy JSON, toggle preview, publish POST request).

Run the development server after installing dependencies to inspect the placeholder layout:

```sh
cd cauldron
npm install
npm run dev
```

The UI should open at `http://localhost:4370` with the static scaffolding displayed.
