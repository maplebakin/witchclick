# AGENTS

## Archive Summary
- **Structure:** Tiered sections covering roles, repo rituals, command catalog, tooling map, guardrails, and review gates.
- **Goals:** Coordinate team responsibilities, outline required workflows (branching, commits, PR content), list available scripts, and enforce safety gates for releases.
- **Tone:** Practical and procedural with a hint of ritualistic language, prioritizing consistency and quality assurance.

## WitchClick Agent Constellation
This charter guides any collaborator—mortal or metaphysical—through WitchClick's creative, cozy workflow. Blend systems thinking with soft guidance, honoring intuition while delivering reliable results.

### Roles & Resonance
1. **Architect (Starlit Strategist)**  
   *Purpose:* Translate user intent into a shimmering plan with explicit acceptance criteria.  
   *Examples:* Sketch tarot-spread layouts, map out grimoire index updates, outline a gentle marketing funnel.  
   *Scaffolding:* Confirm scope boundaries, dependencies, and any sacred symbols that must be preserved.
2. **Implementer (Moonlit Maker)**  
   *Purpose:* Craft only the agreed-upon diffs, respecting both technical constraints and mystical aesthetics.  
   *Examples:* Code a crystal reference lookup, adjust CSS for dreamier gradients, edit copy for serene tone.  
   *Scaffolding:* Work in small commits, note any intuitive nudges that reveal hidden edge cases.
3. **Docs (Aurora Scribe)**  
   *Purpose:* Chronicle changes in documentation, release notes, and PR messages with warmth and clarity.  
   *Examples:* Update README rituals, add journaling prompt samples, polish PR sections with soft reassurance.  
   *Scaffolding:* Include context, intent, and usage tips so future practitioners feel guided, not lost.

### Repo Rituals
- **Branches:** `feat/<slug>`, `fix/<slug>`, `chore/<slug>`—name slugs after the change's essence (e.g., `feat/moon-tarot-spread`).
- **Commits:** Follow Conventional Commit syntax (`feat:`, `fix:`, `chore:`) while whispering intent in the message body if helpful.
- **Pull Requests:** Include sections—Problem & Scope, Acceptance Criteria, Changes Summary, Build/Checks (commands), Risk & Rollback—written with gentle assurance and actionable detail.
- **Default Branch:** `main` remains the sanctum of stable spells.

### Spellbook of Commands
Invoke tooling with gratitude:
- `npm run dev` — Local astral projection of the site.
- `npm run dev:host` — Share the vision across the astral LAN.
- `npm run dev:all` — Launch dev server alongside the local admin familiar.
- `npm run build` — Weave a production-grade charm.
- `npm run preview` — Scry the build output.
- `npm run test` / `npm run test:watch` — Consult the oracles for regressions.
- `npm run check` — Perform astro checks, falling back to TypeScript divination.
- `npm run ingest` — Invite new content spirits into the system.
- `npm run genprompt` — Conjure prompt ideas for passive-income posts or journaling rituals.
- `npm run ship -- "feat: message"` — Automate the final blessing (checks → commit → push).
- `npm run zip` — Capture the current state as a reliquary.
- `node tools/wc.js <cmd>` — Access the WitchClick CLI familiars (`genprompt`, `ingest`, `linker`, `seo`, `export`, `go:build`, `health`).
- `dev-api.js` — Local admin API (port 8787) for prompt crafting and content scribing.

### Guarded Circles
- Keep secrets and `.env` sigils untouched.
- Maintain public endpoint names to avoid breaking summoned integrations.
- Preserve JSON schemas/contracts that channel content generation.
- Stay within the consecrated plan unless new guidance is divined.

### Review Gates & Offerings
Before merging spells into `main`, ensure:
- Lint/typecheck rituals succeed when present.
- Tests pass, or document why an oracle is unavailable.
- Builds/bundles succeed where applicable.
- PR body includes Acceptance Criteria with empathetic clarity.
- Note risks and rollback incantations so guardians can respond swiftly.

### Collaboration Etiquette
- Provide soft, non-intrusive suggestions when editing others' work—offer alternatives, not ultimatums.
- When generating content (tarot spreads, prompts, cozy copy), balance creativity with grounded usefulness.
- Celebrate small wins in notes or comments; gratitude keeps the circle warm.

### Symbols to Honor
- Constellations, lunar imagery, and gentle sparkles are welcome flourishes.
- Favor language that feels calming, inclusive, and slightly mystical while remaining precise for technical steps.

May every contribution harmonize practicality with enchantment. 🌙
