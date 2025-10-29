# Visual Design Tokens — WitchClick

**Last Updated:** October 29, 2025
**Status:** ✅ Production-Ready

This document catalogs all CSS custom properties (design tokens) used throughout the WitchClick design system, their sources, and usage patterns.

---

## Table of Contents

1. [Token Organization](#token-organization)
2. [Color Tokens](#color-tokens)
3. [Typography Tokens](#typography-tokens)
4. [Spacing Tokens](#spacing-tokens)
5. [Shadow & Effect Tokens](#shadow--effect-tokens)
6. [Component-Specific Tokens](#component-specific-tokens)
7. [Theme System](#theme-system)
8. [Usage Guidelines](#usage-guidelines)

---

## Token Organization

### File Structure

```
src/styles/
├── tokens.css       # Modern design tokens (surfaces, borders, text)
├── base.css         # Core tokens (brand colors, typography, spacing)
├── tailwind.css     # Tailwind configuration
├── cards.css        # Card-specific tokens
└── admin.css        # Admin UI tokens
```

### Import Order

```css
/* src/styles/base.css */
@import "./tokens.css";  /* Load tokens first */
```

**Priority:** `tokens.css` defines modern semantic tokens that should be preferred for new components. `base.css` contains legacy brand tokens still in use.

---

## Color Tokens

### Surface Colors (`tokens.css`)

**Source:** `src/styles/tokens.css:7-13`

#### Midnight Theme (default)
```css
--surface-panel-primary: rgba(18, 7, 37, 0.92);    /* Primary panels */
--surface-panel-secondary: rgba(12, 5, 23, 0.82);  /* Secondary panels */
--surface-card: rgba(20, 10, 33, 0.78);            /* Card backgrounds */
--surface-card-hover: rgba(33, 15, 52, 0.85);      /* Card hover states */
--surface-elevated: rgba(24, 12, 40, 0.68);        /* Elevated surfaces */
--surface-muted: rgba(14, 6, 26, 0.65);            /* Muted backgrounds */
```

#### Dawn Theme (light mode)
```css
--surface-panel-primary: rgba(252, 248, 242, 0.96);
--surface-panel-secondary: rgba(255, 255, 255, 0.92);
--surface-card: rgba(255, 255, 255, 0.88);
--surface-card-hover: rgba(255, 255, 255, 0.98);
--surface-elevated: rgba(255, 255, 255, 0.9);
--surface-muted: rgba(255, 255, 255, 0.92);
```

**Usage:** PostRail, HubPlaylistRow, card components

---

### Border Colors (`tokens.css`)

**Source:** `src/styles/tokens.css:15-21`

#### Midnight Theme
```css
--border-accent-subtle: rgba(212, 175, 55, 0.22);   /* Subtle borders (gold) */
--border-accent-medium: rgba(212, 175, 55, 0.35);   /* Medium borders */
--border-accent-strong: rgba(212, 175, 55, 0.45);   /* Strong borders */
--border-accent-hover: rgba(212, 175, 55, 0.58);    /* Hover states */
--border-purple-subtle: rgba(124, 78, 176, 0.28);   /* Subtle purple */
--border-purple-medium: rgba(124, 78, 176, 0.32);   /* Medium purple */
```

#### Dawn Theme
```css
--border-accent-subtle: rgba(180, 154, 217, 0.28);
--border-accent-medium: rgba(155, 134, 200, 0.35);
--border-accent-strong: rgba(212, 175, 55, 0.4);
--border-accent-hover: rgba(212, 175, 55, 0.42);
--border-purple-subtle: rgba(180, 154, 217, 0.3);
--border-purple-medium: rgba(155, 134, 200, 0.4);
```

**Usage:** Card borders, dividers, outlines

---

### Text Colors (`tokens.css`)

**Source:** `src/styles/tokens.css:23-29`

#### Midnight Theme
```css
--text-strong: rgba(249, 245, 255, 0.95);      /* Highest contrast */
--text-body: rgba(249, 245, 255, 0.82);        /* Body text */
--text-muted: rgba(249, 245, 255, 0.72);       /* Muted text */
--text-subtle: rgba(249, 245, 255, 0.7);       /* Subtle text */
--text-accent: rgba(212, 175, 55, 0.7);        /* Accent text (gold) */
--text-accent-strong: rgba(212, 175, 55, 0.92); /* Strong accent */
```

#### Dawn Theme
```css
--text-strong: rgba(58, 40, 84, 0.95);
--text-body: rgba(87, 63, 115, 0.82);
--text-muted: rgba(87, 63, 115, 0.7);
--text-subtle: rgba(87, 63, 115, 0.65);
--text-accent: rgba(155, 134, 200, 0.7);
--text-accent-strong: rgba(87, 63, 115, 0.9);
```

**Usage:** Typography hierarchy, labels, metadata

---

### WCAG Accessible Text Colors (`base.css`)

**Source:** `src/styles/base.css:56-61`

#### Midnight Theme
```css
--text-primary: rgba(244, 241, 255, 0.96);    /* ~16:1 contrast */
--text-secondary: rgba(244, 241, 255, 0.85);  /* ~9:1 contrast */
--text-tertiary: rgba(244, 241, 255, 0.75);   /* ~6:1 contrast */
--text-hint: rgba(244, 241, 255, 0.65);       /* ~4.5:1 contrast */
--text-disabled: rgba(244, 241, 255, 0.45);   /* Disabled states only */
```

#### Dawn Theme
```css
--text-primary: rgba(44, 27, 61, 1);          /* ~16:1 contrast */
--text-secondary: rgba(44, 27, 61, 0.9);      /* ~10:1 contrast */
--text-tertiary: rgba(44, 27, 61, 0.75);      /* ~6.5:1 contrast */
--text-hint: rgba(44, 27, 61, 0.6);           /* ~4.5:1 contrast */
--text-disabled: rgba(44, 27, 61, 0.4);       /* Disabled states only */
```

**Note:** All text tokens meet WCAG AA compliance for accessibility.

**Usage:** Prioritize these for body content and critical text

---

### Core Brand Colors (`base.css`)

**Source:** `src/styles/base.css:35-49`

#### Midnight Theme
```css
--color-midnight: #07020f;                     /* Deepest purple-black */
--color-night: #120725;                        /* Rich night purple */
--color-iris: #4b2a63;                         /* Brand iris purple */
--color-amethyst: #7c4eb0;                     /* Vibrant amethyst */
--color-dusk: #271534;                         /* Twilight purple */
--color-gold: #d4af37;                         /* Signature gold */
--color-rune: #f8f3ff;                         /* Lightest rune white */
--color-fog: #d7c8f3;                          /* Misty purple */
--color-ink: #f4f1ff;                          /* Primary ink color */
--color-muted: rgba(244, 241, 255, 0.72);      /* Muted text */
--color-border: rgba(125, 98, 162, 0.45);      /* Standard borders */
--color-border-strong: rgba(212, 175, 55, 0.65); /* Strong borders */
--color-overlay: rgba(18, 7, 37, 0.48);        /* Light overlay */
--color-overlay-strong: rgba(18, 7, 37, 0.62); /* Strong overlay */
```

#### Dawn Theme
```css
--color-midnight: #f6f0e8;
--color-night: #ede5dc;
--color-iris: #9b86c8;
--color-amethyst: #b49ad9;
--color-dusk: #f2ecfa;
--color-gold: #caa043;
--color-rune: #fffdf6;
--color-fog: #e5daf5;
--color-ink: #2c1b3d;
--color-muted: rgba(43, 28, 65, 0.88);
--color-border: rgba(122, 94, 154, 0.35);
--color-border-strong: rgba(122, 94, 154, 0.55);
--color-overlay: rgba(242, 236, 229, 0.48);
--color-overlay-strong: rgba(242, 236, 229, 0.6);
```

**Usage:** Legacy tokens still in use throughout base styles. Prefer `tokens.css` equivalents for new work.

---

### Semantic Color Helpers (`base.css`)

**Source:** `src/styles/base.css:68-71`

```css
--ink-body: color-mix(in srgb, var(--color-ink) 70%, var(--color-night) 30%);
--ink-strong: color-mix(in srgb, var(--color-ink) 85%, var(--color-night) 15%);
--ink-muted: color-mix(in srgb, var(--color-ink) 55%, white 45%);
--link-color: color-mix(in srgb, var(--color-fog) 55%, var(--color-gold) 45%);
```

**Usage:** Dynamically computed colors that adapt to theme

---

### Gradient Overlays (`tokens.css`)

**Source:** `src/styles/tokens.css:31-33`

#### Midnight Theme
```css
--gradient-purple-radial: radial-gradient(120% 120% at 8% 10%, rgba(124, 78, 176, 0.18), transparent 70%);
--gradient-gold-radial: radial-gradient(80% 120% at 15% 10%, rgba(212, 175, 55, 0.18), transparent 70%);
```

#### Dawn Theme
```css
--gradient-purple-radial: radial-gradient(120% 120% at 8% 10%, rgba(180, 154, 217, 0.2), transparent 72%);
--gradient-gold-radial: radial-gradient(80% 120% at 15% 10%, rgba(212, 175, 55, 0.16), transparent 72%);
```

**Usage:** Decorative overlays, hero sections

---

## Typography Tokens

**Source:** `src/styles/base.css:14-21`

```css
--font-body-serif: "Lora", "Crimson Text", Georgia, serif;
--font-body: var(--font-body-serif);
--font-heading: "Cinzel", "Cormorant Garamond", "Times New Roman", serif;
--font-accent: "Cormorant Garamond", "Cinzel", serif;
--font-sans: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
--font-body-ui: var(--font-body);                 /* UI elements */
--font-body-letter-spacing: normal;
```

### Font Variant — Sans Serif

**Controlled by:** `data-comfort-font="sans"` attribute

```css
:root[data-comfort-font="sans"] {
  --font-body-ui: var(--font-sans);
  --font-body-letter-spacing: 0.01em;
}
```

**Usage:** User preference for dyslexia-friendly fonts

---

## Spacing Tokens

**Source:** `src/styles/base.css:23-33`

```css
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.5rem;     /* 24px */
--space-6: 2rem;       /* 32px */
--space-7: 2.5rem;     /* 40px */
--space-8: 3rem;       /* 48px */
--space-9: 4rem;       /* 64px */
```

**Scale:** Based on multiples of 0.25rem (4px base)

**Usage:** Consistent spacing throughout layout and components

---

## Shadow & Effect Tokens

### Shadows (`base.css`)

**Source:** `src/styles/base.css:63-65`

#### Midnight Theme
```css
--shadow-soft: 0 18px 45px -28px rgba(11, 6, 20, 0.55);
--shadow-strong: 0 28px 75px -24px rgba(3, 2, 12, 0.72);
```

#### Dawn Theme
```css
--shadow-soft: 0 18px 45px -28px rgba(63, 49, 86, 0.22);
--shadow-strong: 0 28px 75px -24px rgba(63, 49, 86, 0.32);
```

### Card Shadows (`tokens.css`)

**Source:** `src/styles/tokens.css:37-38`

```css
--shadow-card: 0 18px 48px -28px rgba(11, 6, 20, 0.65);
--shadow-card-hover: 0 4px 12px rgba(212, 175, 55, 0.15);
```

**Usage:** Cards, panels, elevated surfaces

---

### Focus Ring (`tokens.css`)

**Source:** `src/styles/tokens.css:36`

```css
--focus-ring: rgba(212, 175, 55, 0.6);  /* Gold focus outline */
```

**Source (extended):** `src/styles/base.css:74-79`

```css
--focus-ring-color: color-mix(in srgb, var(--color-gold) 72%, white 28%);
--focus-ring-offset: 4px;
--focus-ring-base-shadow: color-mix(in srgb, var(--color-night) 70%, transparent 30%);
--focus-ring-shadow:
  0 0 0 2px var(--focus-ring-base-shadow),
  0 0 0 calc(var(--focus-ring-offset) + 2px) color-mix(in srgb, var(--focus-ring-color) 85%, white 15%);
```

**Usage:** Applied automatically to interactive elements via `base.css:317-336`

**Accessibility:** Meets WCAG 2.1 focus indicator requirements

---

## Component-Specific Tokens

### Chip/Tag Components (`tokens.css`)

**Source:** `src/styles/tokens.css:41-42`

#### Midnight Theme
```css
--chip-background: rgba(212, 175, 55, 0.15);
--chip-border: rgba(212, 175, 55, 0.32);
```

#### Dawn Theme
```css
--chip-background: rgba(186, 166, 220, 0.25);
--chip-border: rgba(155, 134, 200, 0.45);
```

**Usage:** Tag chips, category labels, metadata badges

---

### Surface Components (`base.css`)

**Source:** `src/styles/base.css:51-54`

```css
--surface-plain: rgba(18, 10, 30, 0.92);
--surface-plain-border: rgba(124, 78, 176, 0.32);
--surface-plain-shadow: 0 24px 55px -28px rgba(3, 2, 12, 0.72);
```

**Usage:** Plain panels, admin UI, utility surfaces

---

### Container Layout (`base.css`)

**Source:** `src/styles/base.css:343-360`

```css
--wc-container-max: 80rem;  /* Max width (default) */
--wc-container-padding: clamp(1.25rem, 4vw, 2.75rem);
```

**Responsive Breakpoints:**
- Default: `80rem` (1280px)
- `@media (min-width: 768px)`: `86rem` (1376px)
- `@media (min-width: 1024px)`: `92rem` (1472px)

**Usage:** `.wc-container` class

---

## Theme System

### Theme Selection

WitchClick supports two core comfort themes:

1. **Midnight** (default) — Dark mode with deep purples and gold
2. **Dawn** — Light mode with warm earth tones

### Activation

Themes are controlled via the `data-comfort-theme` attribute on `:root`:

```html
<!-- Midnight (default) -->
<html>

<!-- Dawn (light) -->
<html data-comfort-theme="dawn">
```

### Token Override Pattern

All tokens in `tokens.css` and `base.css` follow this pattern:

```css
:root {
  --token-name: <midnight-value>;
}

:root[data-comfort-theme="dawn"] {
  --token-name: <dawn-value>;
}
```

**Example:**
```css
:root {
  --surface-card: rgba(20, 10, 33, 0.78);  /* Midnight */
}

:root[data-comfort-theme="dawn"] {
  --surface-card: rgba(255, 255, 255, 0.88);  /* Dawn */
}
```

### Seasonal Themes

Additional themes available in `content/themes/`:

- `autumn-twilight.json` (midnight mode)
- `golden-harvest.json` (dawn mode)

These provide seasonal color variations loaded via theme customization.

---

## Usage Guidelines

### Preferred Token Hierarchy

When building new components, use tokens in this priority order:

1. **`tokens.css` semantic tokens** (modern, recommended)
   ```css
   background: var(--surface-card);
   border: 1px solid var(--border-accent-subtle);
   color: var(--text-body);
   ```

2. **`base.css` WCAG text tokens** (for critical text)
   ```css
   color: var(--text-primary);  /* Highest contrast */
   ```

3. **`base.css` brand tokens** (legacy, use sparingly)
   ```css
   color: var(--color-gold);  /* Direct brand color */
   ```

### Migration Strategy

**Legacy Pattern:**
```css
.old-card {
  background: rgba(20, 10, 33, 0.78);
  border: 1px solid rgba(212, 175, 55, 0.22);
  color: rgba(249, 245, 255, 0.82);
}
```

**Modern Pattern:**
```css
.new-card {
  background: var(--surface-card);
  border: 1px solid var(--border-accent-subtle);
  color: var(--text-body);
}
```

**Benefits:**
- Automatic theme support
- Single source of truth
- Easier maintenance
- Consistent visual language

---

### Best Practices

#### ✅ Do

- Use semantic tokens from `tokens.css` for surfaces, borders, text
- Apply `--shadow-card` and `--shadow-card-hover` for consistent elevation
- Use `--focus-ring` for accessible focus states
- Leverage CSS `color-mix()` for subtle variations
- Test both midnight and dawn themes

#### ❌ Don't

- Hardcode rgba values when tokens exist
- Create new tokens without documenting them
- Skip theme testing
- Override focus ring styles (accessibility risk)
- Use low-contrast colors without checking WCAG compliance

---

### Adding New Tokens

When adding new tokens, follow this checklist:

1. **Add to appropriate file:**
   - Surface/border/text → `tokens.css`
   - Typography/spacing/brand → `base.css`
   - Component-specific → Consider inline vs. tokens file

2. **Define both theme variants:**
   ```css
   :root {
     --new-token: <midnight-value>;
   }

   :root[data-comfort-theme="dawn"] {
     --new-token: <dawn-value>;
   }
   ```

3. **Document in this file:**
   - Add to appropriate section
   - Include source file and line numbers
   - Provide usage examples

4. **Test theme switching:**
   - Verify visual consistency
   - Check contrast ratios
   - Test with `prefers-reduced-motion`

---

## Token Reference by File

### `src/styles/tokens.css`
- Surface colors (6 variants × 2 themes)
- Border colors (6 variants × 2 themes)
- Text colors (6 variants × 2 themes)
- Gradient overlays (2 variants × 2 themes)
- Interactive states (focus ring, shadows)
- Component tokens (chips)

### `src/styles/base.css`
- Core brand colors (14 colors × 2 themes)
- WCAG text colors (5 levels × 2 themes)
- Typography tokens (7 variants)
- Spacing scale (10 steps)
- Shadow tokens (2 variants × 2 themes)
- Layout tokens (container, padding)
- Focus ring (extended system)
- Background utilities (page-specific)

### `src/styles/cards.css`
- Card-specific layouts
- Metadata styles

### `src/styles/admin.css`
- Admin panel tokens
- Dev UI overrides

---

## Component Token Usage Examples

### PostRail Component

```css
.post-rail__panel {
  background: var(--surface-card);
  border: 1px solid var(--border-accent-subtle);
  box-shadow: var(--shadow-card);
}

.post-rail__card:hover {
  background: var(--surface-card-hover);
  border-color: var(--border-accent-strong);
  box-shadow: var(--shadow-card-hover);
}
```

**Source:** `src/components/PostRail.astro`

---

### HubPlaylistRow Component

```css
.hub-playlist__chip {
  background: var(--chip-background);
  border: 1px solid var(--chip-border);
  color: var(--text-accent);
}
```

**Source:** `src/components/HubPlaylistRow.astro`

---

### ReadingProgress Component

```css
.reading-progress {
  background: var(--border-accent-subtle);
}

.reading-progress__bar {
  background: var(--color-gold);
}
```

**Source:** `src/components/ReadingProgress.astro`

---

## Version History

### v2.0 (October 29, 2025)
- Added comprehensive `tokens.css` with semantic naming
- Introduced modern surface/border/text token hierarchy
- Documented all tokens with sources
- Added usage guidelines and migration strategies

### v1.0 (Initial)
- Established brand color system in `base.css`
- Created spacing and typography tokens
- Implemented midnight/dawn theme system

---

## Related Documentation

- **AGENTS.md** — Collaboration charter and project overview
- **CLAUDE.md** — Project instructions for AI assistants
- **README.md** — Quick start and setup guide

---

**Maintained by:** The WitchClick Constellation
**Questions?** Review code in `src/styles/` or check component files for usage examples
