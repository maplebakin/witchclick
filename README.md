# WitchClick

A production-focused, static site platform for cozy metaphysical content. Prompt → JSON → CLI ingest → site. SEO-forward, internal linking, and affiliate routing with zero server.

## Affiliate catalog

Editors can reference the following affiliate keys in post specs and frontmatter. Each key maps to an entry in `content/products.json` and resolves through `/go/<key>` redirects with baked-in tracking parameters.

| Key | Product name | Intended use |
| --- | --- | --- |
| `sustainable-incense` | Sustainable Incense Stick Set | Eco-friendly cleansing and scent rituals. |
| `altar-kit` | Altar Kit (Cloth, Chalice & Ritual Candles) | Build or refresh a sacred workspace. |
| `gemstone-candle` | Gemstone-Infused Aromatherapy Candle | Blend aromatherapy with crystal support. |
| `aroma-diffuser` | Ceramic Essential Oil Diffuser | Gentle aromatic support for meditation and rest. |
| `tumbled-stones` | Tumbled Stone Crystal Set | Versatile crystals for grids and grounding. |
| `himalayan-salt-lamp` | Himalayan Salt Lamp | Ambient glow with air-cleansing lore. |
| `singing-bowl` | Tibetan Singing Bowl Set | Sound healing, meditation cues, and breath pacing. |
| `mindfulness-journal` | Guided Mindfulness Journal | Prompted reflections for mindful routines. |
| `chakra-bracelet` | Chakra Bracelet / Mala Beads | Wearable reminders for intention setting. |
| `smudge-kit` | White Sage & Palo Santo Smudge Kit | Traditional smoke cleansing for home rituals. |
| `crystal-bible` | The Crystal Bible (Judy Hall) | Trusted crystal reference for correspondences. |
| `moonology` | Moonology (Yasmin Boland) | Lunar planning guidance for monthly rituals. |

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

