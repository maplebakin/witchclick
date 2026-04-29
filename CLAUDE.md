# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Authoritative reference: `LLM_PROJECT_BRIEFING.md` (use it first when details conflict).

## Project Overview

WitchClick is a production-focused, static site platform for a secular metaphysical value-space: ritual, tarot, symbolic action, essays, grimoire references, and reflection tools for making meaning outside productivity metrics. It uses an AI-driven workflow: Prompt → JSON → CLI ingest → static site. The platform is SEO-forward with internal linking and affiliate routing, built entirely as a zero-server static site.

Brand and voice direction:
- Ritual and tarot are secular reflective practices, not supernatural guarantees.
- WitchClick helps readers choose perspective, reclaim attention, and preserve value that hostile or narrow systems fail to recognize.
- Neurodivergent-friendly design remains central to the architecture and tone, but it is not the whole brand center.
- Keep copy warm, grounded, non-gatekeeping, cozy, practical, and slightly strange.
- Avoid academic, therapy-coded, manifesto-heavy, simplistic anti-money/anti-work, or generic wellness/productivity framing.
- Prefer localized copy/config/prompt updates before structural code changes; avoid schema or contract edits unless explicitly requested.

**Tech Stack:**
- **Framework:** Astro 5.x (static site generation)
- **Styling:** Tailwind CSS
- **TypeScript:** Strict mode with `noUncheckedIndexedAccess`
- **Testing:** Vitest (unit), Playwright (e2e)
- **Package Manager:** npm

## Development Commands

### Core Development
```bash
npm run dev              # Starts theme watcher + dev-api.js + Astro dev server via scripts/dev-with-api.mjs
npm run build            # Production build (runs prebuild checks + build-clean script)
npm run preview          # Preview production build
npm run check            # Run Astro check, TypeScript, and ESLint
```

### Testing
```bash
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright e2e tests (smoke tests only)
npm run lint             # ESLint checks (.ts, .tsx, .js, .cjs, .mjs, .astro)
npm run linkcheck        # Checks internal links only in built site (external http:// and https:// URLs are ignored)
```

### Content Ingestion
```bash
npm run ingest -- <spec.json> [--dry] [--dir <outDir>]  # Ingest PostSpec v2 JSON to markdown
npm run ingest -- --interactive                          # Interactive ingest flow
```

## Architecture

### Content Pipeline (PostSpec v2)

WitchClick uses a structured JSON specification called **PostSpec v2** to generate content:

1. **Generation:** AI generates JSON following `PostSpecV2Schema` (defined in `server/lib/postSpecSchema.js`)
2. **Validation:** Schema validation via Zod in `server/lib/postSpecValidator.js`
3. **Preparation:** `server/lib/specPreparation.js` prepares and normalizes the spec
4. **Persistence:** `scripts/ingest.mjs` converts JSON → markdown with frontmatter
5. **Output:** Markdown files written to `src/content/posts/`

**Key PostSpec Fields:**
- `specVersion: 2` (required literal)
- `title`, `slug`, `metaDescription`, `tags[4-7]`, `excerpt`
- `outline[]`, `sections[]` (structured content)
- `entities[]` (cross-references to crystals, herbs, moon phases, planets, tarot, spreads, planetary days, and rituals)
- `internalLinkHints[]`, `affiliateHints[]` (SEO optimization)
- `cta`, `adPlacements[]` (monetization)

### Entity System

Entities are typed content objects (crystals, herbs, moon phases, planets, tarot, spreads, planetary days, rituals) stored in `content/entities/<type>/<slug>.json`. They:
- Provide structured metadata for cross-referencing
- Enable automatic internal linking
- Support relationship graphs (via `related[]` field)
- Are referenced in posts via `entities[]` field

**Entity Types:** `crystal`, `herb`, `moonPhase`, `planet`, `tarot`, `spread`, `planetaryDay`, `ritual`

Posts can reference entities, which auto-creates stub entities if they don't exist (see `server/lib/specPreparation.js` entity stub creation).

### Directory Structure

```
/
├── src/
│   ├── content/         # Astro Content Collections (preferred)
│   │   ├── posts/       # Post markdown files
│   │   └── config.ts    # Collection schemas
│   ├── pages/           # Astro pages (static + API routes)
│   │   ├── api/         # API endpoints (dev-only, server output)
│   │   ├── post/[slug].astro
│   │   ├── entities/[type]/[slug].astro
│   │   └── admin/       # Admin UI pages
│   ├── layouts/         # Astro layouts
│   ├── components/      # Astro components
│   ├── utils/           # Utility functions
│   └── lib/             # Library code
├── content/             # Data files
│   ├── entities/        # Entity JSON files
│   ├── products.json    # Affiliate product catalog
│   └── settings.json    # Site settings
├── archive/
│   └── curses/          # Primary curse content storage
├── server/              # Server-side logic (validation, preparation)
│   └── lib/
├── scripts/             # CLI scripts (ingest, build helpers)
├── tests/               # Vitest unit tests + Playwright specs
└── dev-api.js           # Local admin API server (port 8787)
```

### Path Alias

TypeScript/Vite configured with `@/` alias → `src/`:
```typescript
import { loadAllPosts } from '@/utils/posts';
```

### Post Directory Strategy

Posts live in `src/content/posts/` only. The runtime resolver uses a single directory.

### Admin System

- **UI:** `/admin` routes serve interactive admin panels
- **API:** `dev-api.js` provides local endpoints for prompt generation, ingestion, entity management
- **Output Mode:** Astro builds as `output: 'static'`; local/admin mutations are handled by `dev-api.js`

**Admin Features:**
- Generate prompts for AI content creation (`/admin`, `/api/genprompt`)
- Validate and ingest PostSpec JSON (`/api/ingest`)
- Manage entities (`/admin/entities`, `dev-api.js` `/entities/*`; there are no `src/pages/api/entities/*` files)
- Theme customization (`/admin/theme`)

### White Magic Curses

Special content type for printable "curses" (playful rituals):
- Schema: `server/lib/curseSpecSchema.js` (CurseSpec)
- Storage: primarily `archive/curses/*.md`
- Ingestion: Similar to posts but via curse-specific pipeline (`server/lib/cursePreparation.js`)
- Export: Printable HTML cards generated via `/admin/downloads` or CLI

### Affiliate System

Affiliate links managed via `content/products.json`:
- Maps product keys → URLs with UTM tracking
- Referenced in posts via `affiliateHints[]`
- Resolves through `/go/<key>` redirects
- See README.md for full product catalog table

## Important Patterns

### Content Loading

Posts are loaded via `src/utils/posts.ts`:
```typescript
loadAllPosts() // Returns LoadedPost[] with caching in production
```

- Uses a single post directory (`src/content/posts`)
- Handles frontmatter via gray-matter
- Augments posts with summaries/spoon levels if enabled
- Filters drafts (unless explicitly requested)

### Validation Flow

1. Raw JSON → Zod schema validation (`PostSpecV2Schema`)
2. Normalization pass (slug generation, date handling)
3. Structure validation (outline/section consistency)
4. Entity stub creation (if referenced entities don't exist)
5. Markdown generation with frontmatter

Errors bubble up as `IngestValidationError` with structured `errors`, `warnings`, `normalizations` arrays.

### Build Safety

- **Prebuild Check:** `scripts/ensure-npm-proxy.mjs` fails fast if legacy proxy env vars are set
- **Build Clean:** `scripts/build-clean.mjs` clears dist before Astro build

### Settings Management

Site settings from `content/settings.json`:
- Loaded by Astro config (`astro.config.mjs`)
- Used for site URL, brand name, analytics, ads config
- Schema defined in `src/content/config.ts`

## Testing

### Unit Tests (Vitest)
- Location: `tests/*.test.ts`
- Focus: Schema validation, ingestion pipeline, structured data generation
- Run: `npm run test`

### E2E Tests (Playwright)
- Config: `playwright.config.ts`
- Pattern: Only runs `smoke.spec.ts` (testMatch filter)
- Spins up preview server automatically
- Run: `npm run test:e2e`

## TypeScript Configuration

- **Strict mode:** Enabled with `noUncheckedIndexedAccess`
- **Module:** ES2022 with Bundler resolution
- **Paths:** `@/*` → `src/*`, custom script type declarations
- **Types:** node, astro/client, @playwright/test, vitest

## Common Patterns

### When adding new entity types:
1. Update `ENTITY_TYPES` in `server/lib/postSpecSchema.js`
2. Add schema validation in `src/content/config.ts` (if using Collections)
3. Create index/detail pages in `src/pages/entities/`
4. Update entity utilities in `src/utils/entities.ts` (if exists)

### When modifying PostSpec schema:
1. Update `PostSpecV2Schema` in `server/lib/postSpecSchema.js`
2. Update documentation in `generateSchemaDocumentation()`
3. Run tests: `npm run test -- schema-consistency`
4. Update admin UI prompt builders if needed

### When writing new posts:
1. Generate prompt via admin UI or `npm run genprompt`
2. Get PostSpec JSON from AI
3. Validate via admin UI or `npm run ingest -- <file> --dry`
4. Ingest: `npm run ingest -- <file>`
5. Review created entities in `content/entities/`

## Commit Conventions

Follow Conventional Commits format:
- `feat:` New features
- `fix:` Bug fixes
- `chore:` Maintenance tasks
- `docs:` Documentation changes

See `AGENTS.md` for full collaboration guidelines (includes branching, PR format, review gates).

## Environment Notes

- **Node Version:** Managed via `.nvmrc`
- **Package Manager:** npm
- **Linting:** ESLint with TypeScript and Astro plugins
- **Sentry:** Client-side error tracking configured (`@sentry/browser`)

## Special Files

- `dev-api.js` - Local admin API (port 8787)
- `scripts/ingest.mjs` - CLI content ingestion
- `server/lib/specPreparation.js` - Core validation/preparation logic
- `src/utils/posts.ts` - Post loading from a single runtime directory (`src/content/posts`)
- `content/products.json` - Affiliate product definitions
- `content/themes/*.json` - Visual themes (managed via Admin Theme editor; `active.json` selects current)

## Astro-Specific Notes

- **Output Mode:** Static (`output: "static"`) controlled in `astro.config.mjs`
- **Markdown:** GFM enabled, smartypants on, syntax highlighting off
- **Redirects:** Configured in astro.config (e.g., `/rss` → `/rss.xml`)
- **Sitemap:** Auto-generated, excludes /admin and /api routes
- **Asset URL Resolution:** Admin scripts load via `Astro.resolve()` pattern (see recent commits)
