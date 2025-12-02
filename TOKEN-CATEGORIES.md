# Token Categories (Token Generator)

This project exposes a single generated token object (see `src/App.jsx`) with the following top-level categories. Use these names when exporting, documenting, or wiring tokens into consuming apps.

- **foundation** — stores the base hue and primitives:
  - `hue`
  - `neutrals` (`neutral-0` → `neutral-9`)
  - `accents` (`accent-1`, `accent-2`, `accent-3`, `accent-ink`)
  - `status` (`success`, `warning`, `error`, `info`) used as seeded values for other sets
- **brand** — primary/secondary/accent colors plus CTAs, gradients, link, and focus (`primary`, `secondary`, `accent`, `accent-strong`, `cta`, `cta-hover`, `gradient-start`, `gradient-end`, `link-color`, `focus-ring`)
- **textPalette** — text stack used for body UI (`text-primary`, `text-secondary`, `text-tertiary`, `text-hint`, `text-disabled`, `text-accent`, `text-accent-strong`, `link-color`)
- **typography** — semantic text roles (`heading`, `text-strong`, `text-body`, `text-muted`, `text-hint`, `text-disabled`, `text-accent`, `text-accent-strong`, `footer-text`, `footer-text-muted`)
- **borders** — structural borders and accent borders (`border-subtle`, `border-strong`, `border-accent-subtle`, `border-accent-medium`, `border-accent-strong`, `border-accent-hover`)
- **surfaces** — page-level backgrounds (`background`, `page-background`, `header-background`, `surface-plain`, `surface-plain-border`)
- **cards** — cards/panels/tags (`card-panel-surface`, `card-panel-surface-strong`, `card-panel-border`, `card-panel-border-soft`, `card-panel-border-strong`, `card-tag-bg`, `card-tag-text`, `card-tag-border`)
- **glass** — frosted layers and related effects (`glass-surface`, `glass-surface-strong`, `glass-border`, `glass-border-strong`, `glass-hover`, `glass-shadow`, `glass-highlight`, `glass-glow`, `glass-shadow-soft`, `glass-shadow-strong`, `glass-blur`, `glass-noise-opacity`)
- **entity** — specialized entity tile styling (`entity-card-surface`, `entity-card-border`, `entity-card-glow`, `entity-card-highlight`, `entity-card-heading`)
- **status** — feedback set (stronger variants of `success`, `warning`, `error`, plus `info`)
- **admin** — admin shell accents (`admin-surface-base`, `admin-accent`)
- **aliases** — back-compat names that mirror newer semantics (surface, border, text, overlay, focus, shadow, chip aliases)
- **dawn** — light-theme overrides for surfaces, text, borders, and prose accents
- **named** — legacy palette swatches (`color-midnight`, `color-night`, `color-dusk`, `color-ink`, `color-amethyst`, `color-iris`, `color-gold`, `color-rune`, `color-fog`)
