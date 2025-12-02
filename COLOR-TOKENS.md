# Color Tokens — WitchClick

Last updated: current repository state (fallbacks in `src/styles/tokens.css` and generated defaults).

This file snapshots every color-related CSS custom property we ship today. Values below are the shipped fallbacks; the runtime theme loader and admin editor can override them at runtime.

## Sources
- `src/styles/tokens.css` — semantic tokens and dawn overrides (runtime-friendly).
- `src/styles/color-tokens.generated.css` — generated text palette fallbacks.
- `src/styles/base.css` — legacy brand palette still referenced by layout tokens.

## Foundation (tokens.css)

### Hue and Neutral Ladder
- `--hc: 270`
- `--neutral-0: 0 0% 100%`
- `--neutral-1: 260 20% 96%`
- `--neutral-2: 260 16% 88%`
- `--neutral-3: 260 10% 72%`
- `--neutral-4: 260 8% 55%`
- `--neutral-5: 260 10% 38%`
- `--neutral-6: 260 12% 28%`
- `--neutral-7: 260 18% 18%`
- `--neutral-8: 260 22% 12%`
- `--neutral-9: 260 26% 8%`

### Accent Ladder and Status Hues
- `--accent-1: 270 60% 78%`
- `--accent-2: 280 55% 68%`
- `--accent-3: 260 65% 58%`
- `--accent-ink: 250 60% 40%`
- `--green-3: 150 50% 45%`
- `--amber-3: 38 90% 50%`
- `--red-3: 352 78% 56%`

## Semantic Fallbacks (Midnight Theme)
These are the default values before any runtime theme override.

### Surfaces
- `--surface-base: hsl(260 26% 8% / 1)`
- `--surface-panel: hsl(260 22% 12% / 0.92)`
- `--surface-card: hsl(260 22% 12% / 0.84)`
- `--surface-elevated: hsl(260 18% 18% / 0.9)`
- `--surface-hover: hsl(260 18% 18% / 0.78)`

### Glass Surfaces and Overlays
- `--glass-surface: color-mix(in hsl, hsl(var(--surface-card)) 88%, transparent 12%)`
- `--glass-surface-strong: color-mix(in hsl, hsl(var(--surface-panel)) 92%, transparent 8%)`
- `--glass-card: color-mix(in hsl, hsl(var(--surface-panel)) 86%, transparent 14%)`
- `--glass-hover: color-mix(in hsl, hsl(var(--surface-hover)) 82%, transparent 18%)`
- `--glass-border: color-mix(in hsl, hsl(var(--border-subtle)) 65%, transparent 35%)`
- `--glass-border-strong: color-mix(in hsl, hsl(var(--border-strong)) 72%, transparent 28%)`
- `--glass-highlight: color-mix(in hsl, hsl(var(--text-accent)) 28%, transparent 72%)`
- `--glass-glow: color-mix(in hsl, hsl(var(--text-accent)) 18%, transparent 82%)`
- `--glass-shadow-soft: 0 22px 55px -32px hsl(260 26% 8% / 0.65)`
- `--glass-shadow-strong: 0 32px 85px -36px hsl(260 26% 8% / 0.78)`
- `--glass-blur: 16px`
- `--glass-noise-opacity: 0.08`

### Borders and Text
- `--border-subtle: hsl(260 12% 28% / 0.42)`
- `--border-strong: hsl(260 8% 55% / 0.6)`
- `--text-strong: hsl(0 0% 100% / 0.98)`
- `--text-body: hsl(260 20% 96% / 0.9)`
- `--text-muted: hsl(260 16% 88% / 0.75)`
- `--text-accent: hsl(270 60% 78% / 1)`

### Admin Palette
- `--admin-surface-base: hsl(0 0% 100% / 1)`
- `--admin-accent: hsl(260 65% 58% / 1)`

## Back-Compat Shim (tokens.css)
Aliases that map legacy names to the semantic tokens above:
- Surfaces: `--surface-panel-primary`, `--surface-panel-secondary`, `--surface-card-hover`, `--surface-muted`.
- Borders: `--border-accent-subtle`, `--border-accent-medium`, `--border-accent-strong`, `--border-accent-hover`, `--border-purple-subtle`, `--border-purple-medium`.
- Text: `--text-subtle`, `--text-accent-strong`.
- Accent legacy: `--accent-purple-strong`, `--accent-purple-soft`.
- Overlays and focus: `--overlay-panel`, `--overlay-panel-strong`, `--focus-ring`, `--shadow-card`, `--shadow-card-hover`.
- Chips: `--chip-background`, `--chip-border`.

## Dawn (Light) Overrides (tokens.css)
Active when `data-comfort-theme="dawn"` is present:
- `--surface-base: hsl(260 40% 98% / 1)`
- `--surface-panel: hsl(260 40% 98% / 1)`
- `--surface-card: hsl(260 45% 97% / 1)`
- `--surface-elevated: hsl(260 35% 96% / 1)`
- `--surface-hover: hsl(260 22% 92% / 1)`
- Glass modifiers in dawn: surface/hover mixes are rebalanced toward white.
- Text: `--text-strong: hsl(260 30% 18% / 1)`, `--text-body: hsl(260 28% 24% / 0.92)`, `--text-muted: hsl(260 20% 36% / 0.75)`.
- Borders: `--border-subtle: hsl(260 16% 88% / 1)`, `--border-strong: hsl(260 10% 72% / 1)`.
- Accent softeners: links and code blocks use `hsl(270 60% 45% / 1)` and `hsl(270 55% 42% / 1)`; prose backgrounds use `hsl(260 25% 92% / 1)` and `hsl(260 25% 94% / 1)`.

## Generated Text Palette (color-tokens.generated.css)
Fallbacks that get rewritten by the admin theme editor:

- Midnight: `--text-primary: rgba(244,241,255,0.96)`, `--text-secondary: rgba(244,241,255,0.85)`, `--text-tertiary: rgba(244,241,255,0.75)`, `--text-hint: rgba(244,241,255,0.65)`, `--text-disabled: rgba(244,241,255,0.45)`, `--text-strong: rgba(249,245,255,0.95)`, `--text-body: rgba(249,245,255,0.82)`, `--text-muted: rgba(249,245,255,0.72)`, `--text-subtle: rgba(249,245,255,0.7)`, `--text-accent: rgba(212,175,55,0.7)`, `--text-accent-strong: rgba(212,175,55,0.92)`, `--link-color: #e0c07d`.

- Dawn: `--text-primary: rgba(44,27,61,1)`, `--text-secondary: rgba(44,27,61,0.9)`, `--text-tertiary: rgba(44,27,61,0.75)`, `--text-hint: rgba(44,27,61,0.6)`, `--text-disabled: rgba(44,27,61,0.4)`, `--text-strong: rgba(58,40,84,0.95)`, `--text-body: rgba(87,63,115,0.82)`, `--text-muted: rgba(87,63,115,0.7)`, `--text-subtle: rgba(87,63,115,0.65)`, `--text-accent: rgba(155,134,200,0.7)`, `--text-accent-strong: rgba(87,63,115,0.9)`, `--link-color: #caa043`.

## Legacy Brand Palette (base.css)
Still loaded for layout tokens and gradients.

- Midnight defaults: `--color-midnight: #070a05`, `--color-night: #261a0d`, `--color-iris: #f2bf8c`, `--color-amethyst: #d18c47`, `--color-dusk: #22170b`, `--color-gold: #e4a667`, `--color-rune: #f8f2ed`, `--color-fog: #cc9966`, `--color-ink: #ebd9c7`, `--color-muted: rgba(235,217,199,0.72)`, `--color-border: #452e17`, `--color-border-strong: rgba(228,166,103,0.7)`, `--color-overlay: #22170b`, `--color-overlay-strong: #261a0d`.

- Dawn variants: `--color-midnight: #f6f0e8`, `--color-night: #ede5dc`, `--color-iris: #9b86c8`, `--color-amethyst: #b49ad9`, `--color-dusk: #f2ecfa`, `--color-gold: #caa043`, `--color-rune: #fffdf6`, `--color-fog: #e5daf5`, `--color-ink: #2c1b3d`, `--color-muted: rgba(43,28,65,0.88)`, `--color-border: rgba(122,94,154,0.35)`, `--color-border-strong: rgba(122,94,154,0.55)`, `--color-overlay: rgba(242,236,229,0.48)`, `--color-overlay-strong: rgba(242,236,229,0.6)`.

## Notes for Implementers
- Runtime themes overwrite these values on page load; treat the numbers here as build-time safety nets.
- Prefer semantic tokens (`--surface-*`, `--text-*`, `--border-*`) over direct hue primitives so themes stay consistent.
- Back-compat aliases exist to keep legacy selectors working; new work should use the semantic names above.
