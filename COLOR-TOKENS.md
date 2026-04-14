# Color Tokens — WitchClick (Canonical)

Last updated: April 12, 2026

This is the canonical token reference merged from the prior `COLOR-TOKENS.md` and `VISUAL-TOKENS.md`.  
Runtime theme data can override many values; treat these as baseline definitions and implementation guidance.

## Table of Contents
- [1. Sources and Precedence](#1-sources-and-precedence)
- [2. Theme Model](#2-theme-model)
- [3. Color Foundations](#3-color-foundations)
- [4. Semantic Color Tokens](#4-semantic-color-tokens)
- [5. Dawn Overrides](#5-dawn-overrides)
- [6. Generated Text Palette](#6-generated-text-palette)
- [7. Legacy Brand Palette](#7-legacy-brand-palette)
- [8. Non-Color Visual Tokens](#8-non-color-visual-tokens)
- [9. Component Usage References](#9-component-usage-references)
- [10. Usage and Migration Guidelines](#10-usage-and-migration-guidelines)
- [11. Maintenance Checklist](#11-maintenance-checklist)

## 1. Sources and Precedence

Primary files:
- `src/styles/tokens.css` — semantic surface/border/text/accent tokens and dawn overrides.
- `src/styles/color-tokens.generated.css` — generated fallback text palette.
- `src/styles/base.css` — legacy brand palette, spacing, typography, focus ring extensions, layout tokens.
- `src/styles/cards.css` — card-level usage.
- `src/styles/admin.css` — admin-specific token usage.

Precedence:
1. Runtime theme loader/admin theme editor
2. `tokens.css` semantic tokens
3. `color-tokens.generated.css`
4. `base.css` legacy fallbacks

## 2. Theme Model

Core comfort themes:
- Midnight (default)
- Dawn (light)

Theme switching uses root attributes:
- `data-comfort-theme="dawn"` for light theme
- default/no attribute for midnight

Token override pattern:
```css
:root { --token-name: <midnight>; }
:root[data-comfort-theme="dawn"] { --token-name: <dawn>; }
```

Additional seasonal presets exist under `content/themes/` and can be applied by runtime/theme admin flows.

## 3. Color Foundations

Hue and neutral ladder (`tokens.css`):
- `--hc: 270`
- `--neutral-0` through `--neutral-9`

Accent and status ladder:
- `--accent-1`, `--accent-2`, `--accent-3`, `--accent-ink`
- `--green-3`, `--amber-3`, `--red-3`

Shared recurring color families:
- Gold accent (`#d4af37`) family
- Iris/amethyst purple family (`#4b2a63`, `#7c4eb0`)
- Rune/ink light text family (`#f8f3ff`, `#f4f1ff`, `#f9f5ff`)

## 4. Semantic Color Tokens

### 4.1 Surfaces

Midnight fallbacks:
- `--surface-base: hsl(260 26% 8% / 1)`
- `--surface-panel: hsl(260 22% 12% / 0.92)`
- `--surface-card: hsl(260 22% 12% / 0.84)`
- `--surface-elevated: hsl(260 18% 18% / 0.9)`
- `--surface-hover: hsl(260 18% 18% / 0.78)`

Related compatibility surface aliases are maintained in `tokens.css` for legacy selectors.

### 4.2 Glass and Overlay Surface Tokens

- `--glass-surface`, `--glass-surface-strong`
- `--glass-card`, `--glass-hover`
- `--glass-border`, `--glass-border-strong`
- `--glass-highlight`, `--glass-glow`
- `--glass-shadow-soft`, `--glass-shadow-strong`
- `--glass-blur`, `--glass-noise-opacity`

### 4.3 Borders

Semantic border tokens:
- `--border-subtle`
- `--border-strong`

Legacy accent border families still mapped:
- `--border-accent-subtle`, `--border-accent-medium`, `--border-accent-strong`, `--border-accent-hover`
- `--border-purple-subtle`, `--border-purple-medium`

### 4.4 Text

Semantic text tokens:
- `--text-strong`
- `--text-body`
- `--text-muted`
- `--text-subtle`
- `--text-accent`
- `--text-accent-strong`

WCAG-oriented text levels (from generated/base layers):
- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--text-hint`
- `--text-disabled`

### 4.5 Accent and Utility Tokens

- `--link-color`
- `--focus-ring`
- `--chip-background`, `--chip-border`
- `--gradient-purple-radial`, `--gradient-gold-radial`

### 4.6 Admin Tokens

- `--admin-surface-base`
- `--admin-accent`

## 5. Dawn Overrides

Dawn rebalances:
- Surface stack toward lighter neutrals (`--surface-*` values become high-lightness variants)
- Border tokens become more opaque/light-compatible
- Text tokens shift from rune-white to dark violet/ink values
- Glass mixes rebalance toward white
- Accent/link/code block styling softens while preserving contrast

Representative dawn values:
- `--surface-base: hsl(260 40% 98% / 1)`
- `--surface-card: hsl(260 45% 97% / 1)`
- `--text-strong: hsl(260 30% 18% / 1)`
- `--text-body: hsl(260 28% 24% / 0.92)`
- `--border-subtle: hsl(260 16% 88% / 1)`

## 6. Generated Text Palette

`src/styles/color-tokens.generated.css` ships fallback text values per theme.

Midnight examples:
- `--text-primary: rgba(244,241,255,0.96)`
- `--text-secondary: rgba(244,241,255,0.85)`
- `--text-tertiary: rgba(244,241,255,0.75)`
- `--text-disabled: rgba(244,241,255,0.45)`

Dawn examples:
- `--text-primary: rgba(44,27,61,1)`
- `--text-secondary: rgba(44,27,61,0.9)`
- `--text-tertiary: rgba(44,27,61,0.75)`
- `--text-disabled: rgba(44,27,61,0.4)`

## 7. Legacy Brand Palette

Legacy palette remains in `base.css` and is still referenced by some selectors/gradients.

Midnight family includes:
- `--color-midnight`, `--color-night`, `--color-iris`, `--color-amethyst`, `--color-dusk`
- `--color-gold`, `--color-rune`, `--color-fog`, `--color-ink`
- `--color-muted`, `--color-border`, `--color-border-strong`
- `--color-overlay`, `--color-overlay-strong`

Dawn family mirrors these token names with light-theme values.

Semantic helper mixes in `base.css`:
- `--ink-body`, `--ink-strong`, `--ink-muted`, `--link-color`

## 8. Non-Color Visual Tokens

These came from the prior visual token reference and remain relevant.

### 8.1 Typography

- `--font-body-serif`
- `--font-body`
- `--font-heading`
- `--font-accent`
- `--font-sans`
- `--font-body-ui`
- `--font-body-letter-spacing`

Comfort font toggle:
- `data-comfort-font="sans"` switches UI/body usage toward sans and adjusts tracking.

### 8.2 Spacing

Spacing scale (`base.css`):
- `--space-0` through `--space-9` (4px-step based rhythm)

### 8.3 Shadows and Focus Extensions

- `--shadow-soft`, `--shadow-strong`
- `--shadow-card`, `--shadow-card-hover`
- Extended focus tokens: `--focus-ring-color`, `--focus-ring-offset`, `--focus-ring-base-shadow`, `--focus-ring-shadow`

### 8.4 Layout Container Tokens

- `--wc-container-max`
- `--wc-container-padding`

Responsive max-width adjustments are defined in `base.css` media queries.

## 9. Component Usage References

Representative component usage locations:
- `src/components/PostRail.astro` (surface/border/shadow application)
- `src/components/HubPlaylistRow.astro` (chip/tag tokens)
- `src/components/ReadingProgress.astro` (progress + accent usage)
- Admin pages/components under `src/pages/admin/*` (admin tokens)

## 10. Usage and Migration Guidelines

Preferred token hierarchy for new work:
1. Semantic tokens in `tokens.css` (`--surface-*`, `--text-*`, `--border-*`)
2. Generated text tokens for contrast ladder (`--text-primary` etc.)
3. Legacy `--color-*` only when no semantic equivalent exists

Do:
- Use semantic tokens instead of hardcoded rgba/hex.
- Test both midnight and dawn.
- Preserve accessible focus styles.
- Keep contrast at WCAG-compliant levels for body text.

Do not:
- Introduce hardcoded colors where tokens already exist.
- Add undocumented token names.
- Break legacy alias mappings without coordinated migration.

## 11. Maintenance Checklist

When introducing/updating tokens:
1. Add or update token definitions in `tokens.css` or `base.css`.
2. Add dawn variants where appropriate.
3. Verify runtime/theme-editor behavior still hydrates correctly.
4. Validate usage in representative components (post cards, hubs, admin panels).
5. Update this document if token families or naming conventions change.

---

Related docs:
- `LLM_PROJECT_BRIEFING.md`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
