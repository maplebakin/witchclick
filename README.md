# WitchClick

A production-focused, static site platform for cozy metaphysical content. Prompt → JSON → CLI ingest → site. SEO-forward, internal linking, and affiliate routing with zero server.

## Affiliate catalog

Editors can reference the following affiliate keys in post specs and frontmatter. Each key maps to an entry in `content/products.json` and resolves through `/go/<key>` redirects with baked-in tracking parameters.

| Key | Product name | Intended use |
| --- | --- | --- |
| `ritual-journal` | Ember & Ash Ritual Journal | Long-form reflections, tarot notes, or therapy debriefs. |
| `micro-notebook` | Pocket Sparks Dot Grid Notebook | Quick wins, pocket capture, on-the-go scripting. |
| `grounding-stone` | Smoky Quartz Grounding Stone | Tactile grounding objects for rituals and anxiety resets. |
| `cozy-game` | LoFi Cozy Game Library | Low-stakes digital breaks between ritual steps. |
| `tarot-deck` | Everyday Pattern Tarot Deck | Core deck recommendation for spreads and prompts. |
| `tarot-cloth` | Reversible Tarot Spread Cloth | Portable surfaces for laying spreads or altar setups. |
| `focus-tea` | Peppermint Rosemary Focus Tea | Herbal blend for focus rituals and calming resets. |
| `herbal-kit` | Countertop Herb Drying Kit | Prep and store ritual herbs or tea ingredients. |
| `planner-pad` | Undated Focus Planner Pad | Micro-step planning, post-ritual action tracking. |
| `led-candle` | Rechargeable LED Ritual Candle | Fire-safe ambience for shared or low-spoon spaces. |

## Publishing workflow

### Posts

1. Generate a PostSpec prompt via the admin console (`/admin`) or CLI (`npm run genprompt`).
2. Feed the prompt to your model, paste the JSON back into the admin panel, and validate.
3. Ingest with `npm run ingest -- --from-file my-spec.json` or via the admin UI.

### White Magic Curses

1. Visit `/admin` and switch the panel to **Curses** to build a generation prompt.
2. Paste the generated CurseSpec JSON to validate, preview, and persist a markdown file under `content/white-magic-curses/`.
3. The CLI mirrors the same flow:
   - `npm run curses -- --type mirror --target person --tone poetic` writes `tmp/curse_prompt.txt`.
   - `npm run ingest:curses -- --from-file path/to/curse.json` validates and saves the curse markdown.
   - `npm run export:curses` renders printable HTML cards in `dist/exports/curses/`.

### Rendering

- Posts render at `/post/<slug>`.
- Curses automatically surface at `/curses` with detail pages at `/curses/<slug>`.

