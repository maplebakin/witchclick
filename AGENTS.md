# AGENTS — WitchClick Collaboration Charter

**Last Updated:** October 29, 2025
**Status:** ✅ Production-Ready

This document guides any collaborator—mortal or metaphysical—through WitchClick's creative, cozy workflow. Blend systems thinking with soft guidance, honoring intuition while delivering reliable results.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Agent Roles](#agent-roles)
3. [Development Workflow](#development-workflow)
4. [Command Reference](#command-reference)
5. [Architecture & Technical Stack](#architecture--technical-stack)
6. [Content Pipeline](#content-pipeline)
7. [SEO & Growth Strategy](#seo--growth-strategy)
8. [Quality Gates & Review Process](#quality-gates--review-process)
9. [Known Issues & Roadmap](#known-issues--roadmap)

---

## Project Overview

**WitchClick** is a static-first Astro site delivering cozy, secular, neurodivergent-friendly metaphysical content. Built with accessibility, SEO, and ethical monetization in mind.

### Core Values
- **Secular approach**: Evidence-based ritual practice without supernatural claims
- **Neurodivergent-friendly**: ADHD-accessible rituals with low-spoons options
- **Ethical cursing**: Accountability and boundaries, not revenge
- **No gatekeeping**: Welcoming skeptics and beginners
- **Cozy & accessible**: Warm tone without being woo-woo

### Current Metrics (as of Oct 2025)
- **Published Posts:** 28
- **Draft Posts:** 13 (ready to publish)
- **Entity Pages:** 83 (crystals, herbs, tarot, rituals)
- **Total Pages:** 257 built, 244 indexable
- **SEO Status:** ✅ Sitemap working, RSS active, meta complete
- **Tests:** 68/68 passing
- **Build Time:** ~4.8s average

---

## Agent Roles

### 1. Architect (Starlit Strategist) ✨
**Purpose:** Translate user intent into shimmering plans with explicit acceptance criteria.

**Responsibilities:**
- Sketch feature layouts (tarot spreads, grimoire indexes, marketing funnels)
- Define scope boundaries and dependencies
- Identify sacred symbols/patterns to preserve
- Create technical specifications with compassion

**Examples:**
- Design new entity type schemas
- Plan hub page expansions (calm/focus/release)
- Map out interactive tool features

---

### 2. Implementer (Moonlit Maker) 🌙
**Purpose:** Craft only agreed-upon diffs, respecting technical constraints and mystical aesthetics.

**Responsibilities:**
- Write clean, tested code
- Follow Astro/TypeScript best practices
- Maintain cozy visual design language
- Document intuitive insights about edge cases

**Examples:**
- Code crystal reference lookups
- Adjust CSS for dreamier gradients
- Edit copy for serene tone
- Implement PostRail components with accessibility

**Code Standards:**
- TypeScript strict mode with `noUncheckedIndexedAccess`
- CSS: Tailwind + custom tokens (`src/styles/tokens.css`)
- Components: Astro components with `is:inline` scripts
- Tests: Vitest for unit, Playwright for E2E

---

### 3. Docs Keeper (Aurora Scribe) 📖
**Purpose:** Chronicle changes with warmth and clarity.

**Responsibilities:**
- Update documentation (README, CLAUDE.md)
- Write release notes
- Polish PR descriptions with soft reassurance
- Maintain AGENTS.md (this file)

**Examples:**
- Document new PostSpec fields
- Add troubleshooting guides
- Update admin panel workflows

---

## Development Workflow

### Branch Strategy
```
main (production)
├── feat/<slug>     # New features (e.g., feat/moon-tarot-spread)
├── fix/<slug>      # Bug fixes (e.g., fix/sitemap-generation)
└── chore/<slug>    # Maintenance (e.g., chore/update-deps)
```

### Commit Conventions
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add reading progress indicator to post pages
fix: resolve hero image prompt palette matching
chore: upgrade astro to v5.15.2
docs: update CLAUDE.md with new entity types
```

**Commit Message Structure:**
```
<type>: <short summary>

[optional body with context]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pull Request Template
```markdown
## Problem & Scope
Brief description of what's being solved.

## Acceptance Criteria
- [ ] Feature X works as expected
- [ ] Tests pass
- [ ] Documentation updated

## Changes Summary
- Modified: PostRail.astro (eliminated duplication)
- Created: src/styles/tokens.css (color system)
- Updated: AGENTS.md (this file)

## Build & Checks
```bash
npm run build  # ✅ Passes
npm run check  # ✅ Passes
npm run test   # ✅ 68/68
```

## Risk & Rollback
Low risk. Rollback: `git revert <commit-sha>`
```

---

## Command Reference

### Development
```bash
npm run dev              # Local dev server (localhost:4321)
npm run dev:host         # Share on LAN (0.0.0.0:4321)
npm run dev:all          # Dev server + admin API (port 8787)
```

### Building
```bash
npm run build            # Production build (runs prebuild checks + sitemap)
npm run preview          # Preview production build
```

### Quality Checks
```bash
npm run check            # Astro + TypeScript + ESLint
npm run lint             # ESLint only
npm run test             # Vitest unit tests
npm run test:watch       # Watch mode
npm run test:e2e         # Playwright E2E (smoke tests)
npm run linkcheck        # Validate internal/external links
npm run check:affiliates # Check for placeholder affiliate IDs
```

### Content Management
```bash
npm run ingest -- <spec.json> [--dry]    # Ingest PostSpec v2 JSON
npm run ingest -- --interactive          # Interactive ingest flow
npm run genprompt                        # Generate content prompts
node tools/wc.js stubprompts             # Generate prompts for incomplete entity stubs
```

### Utilities
```bash
npm run ship -- "feat: message"   # Auto-check → commit → push
npm run zip                       # Create backup archive
node tools/wc.js <command>        # CLI tools (genprompt, ingest, etc.)
```

### Admin API (Development Only)
```bash
node dev-api.js          # Start admin API on port 8787
# Endpoints:
# POST /genprompt         - Generate hero/post prompts
# POST /posts/list        - List all posts
# POST /ingest            - Ingest content
# POST /entities/*        - Entity management
```

---

## Architecture & Technical Stack

### Framework & Build
- **Framework:** Astro 5.x (static site generation)
- **Output Mode:** Hybrid (server in dev, static in build)
- **Styling:** Tailwind CSS + custom tokens
- **TypeScript:** Strict mode with `noUncheckedIndexedAccess`
- **Testing:** Vitest (unit), Playwright (e2e)
- **Package Manager:** pnpm (workspace support)

### Directory Structure
```
witchclick/
├── src/
│   ├── content/          # Astro Content Collections (preferred)
│   │   ├── posts/        # Post markdown (if using collections)
│   │   └── config.ts     # Collection schemas
│   ├── pages/            # Routes (static + API)
│   │   ├── api/          # API endpoints (dev-only)
│   │   ├── post/[slug].astro
│   │   ├── hub/[slug].astro
│   │   └── admin/        # Admin UI
│   ├── components/       # Astro components
│   ├── layouts/          # Page layouts
│   ├── utils/            # Utility functions
│   ├── styles/           # CSS (base, tokens, tailwind)
│   └── scripts/          # Client-side scripts
├── content/              # Content files (legacy fallback)
│   ├── posts/            # Markdown posts
│   ├── entities/         # Entity JSON files
│   ├── themes/           # Theme palettes
│   ├── products.json     # Affiliate products
│   └── settings.json     # Site configuration
├── scripts/              # Build scripts & CLI tools
├── tests/                # Test suites
└── public/               # Static assets
```

### Key Files
- `astro.config.mjs` - Astro configuration
- `tailwind.config.cjs` - Tailwind setup
- `tsconfig.json` - TypeScript config
- `CLAUDE.md` - Detailed project instructions
- `AGENTS.md` - This file

### Path Alias
```typescript
import { loadAllPosts } from '@/utils/posts';  // @/ → src/
```

### Recent Refactorings (Oct 2025)
1. **Color Design Tokens** - Centralized CSS variables (`src/styles/tokens.css`)
2. **PostRail Deduplication** - Eliminated 36% HTML duplication
3. **ReadingProgress A11y** - Added proper ARIA attributes
4. **Hub Type Safety** - Created `extractTagChips()` utility
5. **Chip Overflow Indicators** - Shows "+N" when tags exceed limit
6. **Hero Prompt Dimensions** - Now includes 1920×1280px specs for LLMs
7. **Theme Palette Matching** - Hero prompts respect user's comfort theme

---

## Content Pipeline

### PostSpec v2 Schema
WitchClick uses structured JSON for AI-driven content generation:

1. **Generation:** AI generates JSON following `PostSpecV2Schema`
2. **Validation:** Zod schema validation (`server/lib/postSpecValidator.js`)
3. **Preparation:** Normalization (`server/lib/specPreparation.js`)
4. **Persistence:** `scripts/ingest.mjs` converts JSON → markdown
5. **Output:** Written to `src/content/posts/`

**Key PostSpec Fields:**
- `specVersion: 2` (required literal)
- `title`, `slug`, `metaDescription`, `tags[4-7]`, `excerpt`
- `outline[]`, `sections[]` (structured content)
- `entities[]` (cross-references: crystals, herbs, tarot, etc.)
- `internalLinkHints[]`, `affiliateHints[]` (SEO optimization)
- `cta`, `adPlacements[]` (monetization)

### Entity System
**Entity Types:** `crystal`, `herb`, `moonPhase`, `tarot`, `planetaryDay`, `ritual`

Stored in `content/entities/<type>/<slug>.json`:
```json
{
  "type": "crystal",
  "slug": "rose-quartz",
  "name": "Rose Quartz",
  "summary": "Stone of unconditional love and compassion",
  "keywords": ["love", "healing", "heart chakra"],
  "related": ["crystal:amethyst", "herb:lavender"]
}
```

**Benefits:**
- Automatic internal linking
- Relationship graphs via `related[]`
- Stub creation if referenced but not defined

### Ingestion Workflow
```bash
# 1. Generate prompt
npm run genprompt

# 2. Get PostSpec JSON from AI

# 3. Validate (dry run)
npm run ingest -- spec.json --dry

# 4. Ingest to content
npm run ingest -- spec.json

# 5. Review created entities
ls content/entities/
```

---

## SEO & Growth Strategy

### Current SEO Status ✅
- **Sitemap:** Auto-generated (`dist/sitemap-index.xml`, 244 URLs)
- **RSS Feed:** Active (`/rss.xml`)
- **robots.txt:** Configured correctly
- **Meta Descriptions:** 100% coverage
- **Internal Links:** Configured and validated
- **OG/Twitter Cards:** Implemented in Base layout
- **Structured Data:** BlogPosting schema on all posts

### Pre-Launch Checklist
- [ ] Configure real affiliate IDs (`content/products.json`)
  - Replace `YOURTAG-20` with Amazon Associates tag
  - Replace `YOUR_BOOKSHOP_ID` with Bookshop.org ID
- [ ] Submit sitemap to Google Search Console
- [ ] Verify production URLs load correctly
- [ ] Test social sharing preview cards

### Target Keywords (Low Competition)
**Primary:**
- secular tarot
- tarot without spirituality
- ADHD-friendly rituals
- neurodivergent witch
- secular witchcraft

**Long-Tail:**
- how to use tarot cards without belief
- ADHD morning ritual 5 minutes
- secular grounding exercises anxiety
- ethical cursing rituals
- tarot for skeptics
- witchcraft for atheists

### Growth Roadmap

**Week 1-2 (Quick Wins):**
1. Publish 5-10 real posts (drafts are stubs)
2. Submit to Google Search Console
3. Expand hub pages to 2000+ words each
4. Create "Start Here" onboarding flow

**Month 1:**
5. Add interactive tools (moon calculator, tarot lookup)
6. Create comparison posts (Rose Quartz vs Amethyst)
7. Build lead magnets (printable ritual cards)
8. Implement FAQ schema for featured snippets

**Month 2-3:**
9. Generate Open Graph images (1200×630px)
10. Add breadcrumbs sitewide
11. Create internal linking matrix
12. Launch email newsletter

### Projected Traffic
**90 Days:**
- 50+ posts, 100+ entities, 400+ pages
- 1,000+ organic visitors/month
- 100+ email subscribers

**6 Months:**
- 100+ posts, 150+ entities, 600+ pages
- 5,000+ organic visitors/month
- 500+ email subscribers

---

## Quality Gates & Review Process

### Before Merging to `main`
- [ ] **Lint/typecheck passes:** `npm run check`
- [ ] **Tests pass:** `npm run test` (or document unavailable)
- [ ] **Build succeeds:** `npm run build`
- [ ] **PR has Acceptance Criteria:** Clear, empathetic
- [ ] **Risks documented:** Rollback plan noted
- [ ] **No secrets committed:** `.env` files excluded

### PR Review Guidelines
- Provide soft, non-intrusive suggestions
- Offer alternatives, not ultimatums
- Celebrate small wins in comments
- Balance creativity with grounded usefulness

### Code Review Checklist
- Follows Astro/TypeScript conventions
- Maintains cozy visual aesthetic
- Accessible (keyboard nav, screen reader friendly)
- Respects user comfort theme preferences
- Uses design tokens where applicable

---

## Known Issues & Roadmap

### ⚠️ Current Known Issues
1. **Placeholder Affiliate IDs** - Must replace before monetization
2. **Some tests have type mismatches** - Non-blocking (17 errors in test files)
3. **Legacy content directory cleanup** - Posts now live in `src/content/posts/` to keep the pipeline predictable

### 🔧 Technical Debt
1. **Align ingestion output paths** - Single source of truth for posts
2. **Add schema validation** - Prevent malformed PostSpec JSON
3. **Expand test coverage** - Cover pagination, reading time, entity resolution
4. **Cache-bust post loader** - Invalidate during dev server changes

### 🚀 Upcoming Features
1. **Interactive Tools**
   - Moon phase calculator
   - Tarot card meaning lookup
   - Daily draw generator
   - Ritual timing planner

2. **Content Enhancements**
   - Beginner guide series
   - Comparison posts
   - Seasonal collections
   - Newsletter signup module

3. **SEO Optimizations**
   - FAQ schema implementation
   - Breadcrumb deployment
   - Auto-generated OG images
   - Related posts matrix

4. **Monetization**
   - Ko-fi integration
   - Digital downloads (ritual cards)
   - Affiliate link optimization
   - Privacy-conscious analytics (Plausible/Fathom)

---

## Collaboration Etiquette

### Communication Style
- Use warm, inclusive language
- Balance mystical flourishes with technical precision
- Celebrate progress, no matter how small
- Ask clarifying questions with curiosity, not judgment

### When Generating Content
- Balance creativity with grounded usefulness
- Include low-spoons options for rituals
- Avoid gatekeeping language
- Welcome skeptics explicitly

### Symbols to Honor
- Constellations, lunar imagery, gentle sparkles ✨🌙⭐
- Cozy, tactile metaphors (candlelight, soft textiles)
- Favor language that feels calming yet precise

---

## Guarded Circles (Sacred Constraints)

**DO NOT modify without explicit approval:**
- Secret files (`.env`, API keys)
- Public endpoint names (breaks integrations)
- PostSpec JSON schemas/contracts
- Core entity type definitions
- Affiliate tracking parameters
- Analytics configuration

**Preserve always:**
- Accessibility features
- Theme system architecture
- Content pipeline integrity
- SEO fundamentals (sitemaps, meta)

---

## Emergency Contacts & Resources

### Documentation
- **CLAUDE.md** - Detailed project instructions
- **README.md** - Quick start guide
- **docs/*** - Technical audits (archived)

### External Services
- **Domain:** witchclick.space
- **Hosting:** [TBD - static host]
- **Search Console:** [Configure on launch]
- **Analytics:** [TBD - Plausible/Fathom]

### Useful Commands
```bash
# Emergency rollback
git revert <commit-sha>

# Clear build cache
rm -rf dist/ .astro/

# Rebuild node_modules
rm -rf node_modules/ && pnpm install

# Check git status
git status

# View recent commits
git log --oneline -10
```

---

## Closing Ritual

May every contribution harmonize practicality with enchantment. Work within agreed boundaries, celebrate small victories, and keep the circle warm. When in doubt, ask questions with curiosity and grace.

**Remember:** Code is craft. Content is care. Community is sacred.

✨ **Blessed builds and cozy commits** 🌙

---

**Version:** 3.0
**Maintained by:** The WitchClick Constellation
**Last Audit:** October 29, 2025
