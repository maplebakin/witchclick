# Theme System — WitchClick

**Last Updated:** October 29, 2025
**Status:** ✅ Production-Ready

This document explains WitchClick's theme system, including how to create custom themes, the auto-generation process, and usage guidelines.

---

## Table of Contents

1. [Overview](#overview)
2. [Theme JSON Schema](#theme-json-schema)
3. [Creating a New Theme](#creating-a-new-theme)
4. [CSS Generation](#css-generation)
5. [Using Themes](#using-themes)
6. [Theme Metadata](#theme-metadata)
7. [Build Integration](#build-integration)
8. [Best Practices](#best-practices)

---

## Overview

WitchClick uses a **JSON-to-CSS bridge** system that automatically generates CSS custom properties from theme JSON files. This approach provides:

- **Easy theme creation** — Just add a JSON file, no CSS needed
- **Type safety** — Consistent schema validation
- **Automatic generation** — CSS is built during the prebuild step
- **Runtime metadata** — JSON metadata for dynamic theme switching
- **Design system integration** — Themes map to design tokens

### Architecture

```
content/themes/*.json  →  scripts/generate-theme-css.mjs  →  src/styles/themes.generated.css
                                                          ↓
                                                src/data/themes.generated.json
```

**Key Files:**
- `content/themes/` — Theme JSON files (source of truth)
- `scripts/generate-theme-css.mjs` — Generator script
- `src/styles/themes.generated.css` — Auto-generated CSS (DO NOT EDIT)
- `src/data/themes.generated.json` — Runtime metadata
- `content/themes/active.json` — Active theme selection

---

## Theme JSON Schema

### Required Fields

```json
{
  "slug": "theme-slug",           // Unique identifier (kebab-case)
  "label": "Theme Label",         // Human-readable name
  "mode": "midnight",             // "midnight" or "dawn"
  "category": "seasonal",         // "default", "seasonal", "custom"
  "settings": {
    "primary": "#d97642",         // Primary brand color
    "accent": "#e5a82e",          // Accent/highlight color
    "background": "#1a0f0d",      // Background color
    "textPrimary": "#f4e8dc",     // Primary text color
    "textHeading": "#fef3e7",     // Heading text color
    "textMuted": "#d9a882",       // Muted/secondary text color
    "fontSerif": "Literata",      // Serif font family
    "fontScript": "Parisienne"    // Script/decorative font
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | ✅ | Unique theme identifier (used in `data-theme` attribute) |
| `label` | string | ✅ | Display name shown in UI |
| `mode` | enum | ✅ | Theme brightness: `"midnight"` (dark) or `"dawn"` (light) |
| `category` | string | ✅ | Categorization: `"default"`, `"seasonal"`, `"custom"`, etc. |
| `settings` | object | ✅ | Theme-specific values (see below) |

### Settings Object

All color values should use hex format (`#rrggbb`). Font values should be font family names (without quotes).

```typescript
interface ThemeSettings {
  primary: string;      // Main brand color (used for UI elements)
  accent: string;       // Highlight color (used for CTAs, borders)
  background: string;   // Body/page background color
  textPrimary: string;  // Primary body text color
  textHeading: string;  // Heading text color
  textMuted: string;    // Secondary/muted text color
  fontSerif: string;    // Serif font for body text
  fontScript: string;   // Script/accent font for decorative elements
}
```

**Color Contrast:**
- Ensure WCAG AA compliance (4.5:1 for body text, 3:1 for large text)
- Test both `primary` and `accent` against `background`
- Verify `textPrimary` has sufficient contrast with `background`

---

## Creating a New Theme

### Step 1: Create Theme JSON

Create a new file in `content/themes/`:

```bash
touch content/themes/winter-frost.json
```

**Example: Winter Frost (Midnight Mode)**

```json
{
  "slug": "winter-frost",
  "label": "Winter Frost",
  "mode": "midnight",
  "category": "seasonal",
  "settings": {
    "primary": "#7fb3d5",
    "accent": "#b8d8e8",
    "background": "#0d1821",
    "textPrimary": "#e8f2f7",
    "textHeading": "#ffffff",
    "textMuted": "#a8c5da",
    "fontSerif": "Literata",
    "fontScript": "Parisienne"
  }
}
```

### Step 2: Generate CSS

Run the theme generator:

```bash
npm run themes:build
```

**Output:**
```
🎨 Generating theme CSS...
📦 Loaded 5 themes:
   • Autumn Twilight (autumn-twilight) - midnight mode
   • Cozy Dawn (cozy-dawn) - dawn mode
   • Cozy Midnight (cozy-midnight) - midnight mode
   • Golden Harvest (golden-harvest) - dawn mode
   • Winter Frost (winter-frost) - midnight mode

✅ Generated CSS: src/styles/themes.generated.css
✅ Generated metadata: src/data/themes.generated.json
```

### Step 3: Verify Generation

Check that CSS was generated:

```css
/* src/styles/themes.generated.css */
:root[data-theme="winter-frost"] {
  --theme-primary: #7fb3d5;
  --theme-accent: #b8d8e8;
  --theme-background: #0d1821;
  --theme-text-primary: #e8f2f7;
  --theme-text-heading: #ffffff;
  --theme-text-muted: #a8c5da;
  --theme-font-serif: Literata;
  --theme-font-script: Parisienne;
}
```

### Step 4: Test Theme

Apply the theme via HTML attribute:

```html
<html data-theme="winter-frost">
  <!-- Theme CSS custom properties are now active -->
</html>
```

Or dynamically with JavaScript:

```javascript
document.documentElement.setAttribute('data-theme', 'winter-frost');
```

---

## CSS Generation

### How It Works

1. **Load Themes** — Script reads all `*.json` files from `content/themes/` (excluding `active.json`)
2. **Validate** — Checks for required fields (`slug`, `settings`)
3. **Transform** — Converts `camelCase` keys to `kebab-case` CSS properties
4. **Sort** — Orders by category (default first), then mode, then alphabetically
5. **Generate CSS** — Creates `:root[data-theme="..."]` selectors
6. **Generate Metadata** — Creates runtime JSON for theme pickers

### Generated CSS Structure

```css
/**
 * AUTO-GENERATED THEME CSS
 * DO NOT EDIT MANUALLY
 */

/* Default theme mappings */
:root {
  --theme-primary: var(--color-amethyst, #7c4eb0);
  --theme-accent: var(--color-gold, #d4af37);
  /* ... */
}

/* Theme: Autumn Twilight */
:root[data-theme="autumn-twilight"] {
  --theme-primary: #d97642;
  --theme-accent: #e5a82e;
  /* ... */
}

/* Utility classes */
.theme-text-primary { color: var(--theme-text-primary); }
.theme-surface { background: var(--theme-primary); opacity: 0.08; }
/* ... */
```

### CSS Custom Properties

All theme settings are mapped to CSS custom properties with the `--theme-` prefix:

| JSON Key | CSS Property |
|----------|--------------|
| `primary` | `--theme-primary` |
| `accent` | `--theme-accent` |
| `background` | `--theme-background` |
| `textPrimary` | `--theme-text-primary` |
| `textHeading` | `--theme-text-heading` |
| `textMuted` | `--theme-text-muted` |
| `fontSerif` | `--theme-font-serif` |
| `fontScript` | `--theme-font-script` |

---

## Using Themes

### Method 1: HTML Attribute

Set `data-theme` on the root `<html>` element:

```html
<html data-theme="autumn-twilight">
  <body>
    <div class="card">
      <h2 class="theme-text-heading">Hello!</h2>
      <p class="theme-text-primary">This uses theme colors.</p>
    </div>
  </body>
</html>
```

### Method 2: JavaScript

```javascript
// Apply theme
function applyTheme(slug) {
  document.documentElement.setAttribute('data-theme', slug);
  localStorage.setItem('witchclick-theme', slug);
}

// Load saved theme
const savedTheme = localStorage.getItem('witchclick-theme');
if (savedTheme) {
  applyTheme(savedTheme);
}
```

### Method 3: CSS in Components

Use theme tokens in your CSS:

```css
.card {
  background: var(--theme-background);
  border: 1px solid var(--theme-primary);
  color: var(--theme-text-primary);
}

.card__title {
  color: var(--theme-text-heading);
  font-family: var(--theme-font-serif);
}

.card__accent {
  color: var(--theme-accent);
}
```

### Utility Classes

Use pre-defined utility classes:

```html
<h1 class="theme-text-heading">Heading</h1>
<p class="theme-text-primary">Body text</p>
<span class="theme-text-muted">Muted text</span>
<div class="theme-surface">Subtle surface</div>
<div class="theme-swatch"></div> <!-- Color preview -->
```

---

## Theme Metadata

### Runtime JSON

The generator creates `src/data/themes.generated.json` for runtime use:

```json
{
  "generated": "2025-10-29T14:58:21.020Z",
  "count": 4,
  "themes": [
    {
      "slug": "cozy-dawn",
      "label": "Cozy Dawn",
      "mode": "dawn",
      "category": "default"
    },
    {
      "slug": "autumn-twilight",
      "label": "Autumn Twilight",
      "mode": "midnight",
      "category": "seasonal"
    }
  ]
}
```

### Using Metadata in Components

```typescript
// Load theme metadata
import themeMetadata from '@/data/themes.generated.json';

// Build theme picker UI
const midnightThemes = themeMetadata.themes.filter(t => t.mode === 'midnight');
const dawnThemes = themeMetadata.themes.filter(t => t.mode === 'dawn');

// Render theme selector
<select onChange={(e) => applyTheme(e.target.value)}>
  <optgroup label="Midnight Themes">
    {midnightThemes.map(theme => (
      <option value={theme.slug}>{theme.label}</option>
    ))}
  </optgroup>
  <optgroup label="Dawn Themes">
    {dawnThemes.map(theme => (
      <option value={theme.slug}>{theme.label}</option>
    ))}
  </optgroup>
</select>
```

### Active Theme Tracking

`content/themes/active.json` stores the currently active theme per mode:

```json
{
  "midnight": "cozy-midnight",
  "dawn": "cozy-dawn"
}
```

This can be used to load the appropriate theme based on user's comfort preference.

---

## Build Integration

### Automatic Generation

Themes are automatically regenerated during the build process:

```json
{
  "scripts": {
    "prebuild": "node ./scripts/ensure-npm-proxy.mjs && node ./scripts/generate-theme-css.mjs",
    "build": "node ./scripts/build-clean.mjs && node ./scripts/generate-sitemap.mjs"
  }
}
```

**Build Flow:**
1. `npm run build` triggers `prebuild`
2. `prebuild` runs theme generator
3. CSS and metadata are generated
4. Astro build includes generated CSS

### Manual Generation

Generate themes on-demand:

```bash
# Generate once
npm run themes:build

# Watch mode (future enhancement)
npm run themes:watch
```

### CI/CD Integration

Ensure themes are generated in CI pipelines:

```yaml
# .github/workflows/build.yml
- name: Generate themes
  run: npm run themes:build

- name: Build site
  run: npm run build
```

---

## Best Practices

### ✅ Do

- **Create semantic theme names** — `autumn-twilight`, not `theme-1`
- **Match mode appropriately** — Dark colors for `midnight`, light for `dawn`
- **Test contrast ratios** — Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Follow naming conventions** — Use kebab-case for slugs
- **Document custom themes** — Add notes about color inspiration/meaning
- **Commit generated files** — Include `themes.generated.css` and `themes.generated.json` in git
- **Test both modes** — Verify themes work with midnight/dawn comfort settings

### ❌ Don't

- **Edit generated CSS manually** — Changes will be overwritten
- **Use spaces in slugs** — Stick to kebab-case
- **Create themes with poor contrast** — Accessibility is critical
- **Skip the generator** — Always run `npm run themes:build` after changes
- **Hardcode theme values** — Use CSS custom properties instead
- **Mix mode themes** — Don't use dark colors in `dawn` mode themes

### Color Selection Guidelines

**Midnight Themes:**
- Background: Very dark (< #2a2a2a)
- Text: Very light (> #e0e0e0)
- Primary/Accent: Vibrant, saturated colors
- Muted: Desaturated versions of primary colors

**Dawn Themes:**
- Background: Very light (> #f0f0f0)
- Text: Very dark (< #333333)
- Primary/Accent: Softer, less saturated colors
- Muted: Lighter versions of primary colors

### Font Selection

- **Serif fonts:** Use for body text (Literata, Crimson Text, Lora)
- **Script fonts:** Use sparingly for decorative elements (Parisienne, Dancing Script)
- Ensure fonts are loaded in `base.css` or via CDN

---

## Existing Themes

### Default Themes

**Cozy Midnight** (default dark)
- Primary: `#8b7e8f` (muted purple-gray)
- Accent: `#d9b2c4` (soft rose)
- Category: `default`

**Cozy Dawn** (default light)
- Primary: `#9b86c8` (lavender)
- Accent: `#caa043` (warm gold)
- Category: `default`

### Seasonal Themes

**Autumn Twilight** (midnight mode)
- Primary: `#d97642` (burnt orange)
- Accent: `#e5a82e` (golden amber)
- Category: `seasonal`

**Golden Harvest** (dawn mode)
- Primary: `#a85a33` (terracotta)
- Accent: `#d4a843` (harvest gold)
- Category: `seasonal`

---

## Troubleshooting

### Theme Not Applying

**Check:**
1. Did you run `npm run themes:build`?
2. Is `data-theme` attribute set correctly?
3. Is `themes.generated.css` imported in `base.css`?
4. Clear browser cache and hard refresh

### CSS Not Generating

**Check:**
1. Is your JSON valid? Use [JSONLint](https://jsonlint.com/)
2. Does your theme have all required fields?
3. Is the file in `content/themes/` directory?
4. Is the filename `*.json` (not `active.json`)?

### Colors Not Working

**Check:**
1. Are color values in hex format (`#rrggbb`)?
2. Are you using `var(--theme-*)` in CSS?
3. Is the theme attribute on `:root` or `<html>`?

---

## Admin API Endpoints

The admin dashboard now proxies to Astro serverless functions so you can manage
themes without running the local `dev-api.js` server in production. All routes
mirror the JSON contracts used by the legacy dev API.

| Method | URL                      | Auth | Description |
|--------|--------------------------|------|-------------|
| POST   | `/api/themes/list`       | No   | Returns `{ ok, items, active }` describing available midnight/dawn themes. |
| POST   | `/api/themes/save`       | Yes  | Persists or updates a theme JSON file and returns `{ ok, theme }`. |
| POST   | `/api/themes/set-active` | Yes  | Sets the active theme for `midnight` or `dawn`, returning `{ ok, active, theme }`. |
| POST   | `/api/themes/delete`     | Yes  | Removes a theme file and returns `{ ok, slug, mode, active }`. |

### Authentication

Mutating endpoints (`save`, `set-active`, `delete`) require a shared secret. Set
`THEME_ADMIN_TOKEN` in your deployment environment, then provide either of the
following headers when calling the API:

- `Authorization: Bearer <THEME_ADMIN_TOKEN>`
- `X-Witchclick-Admin-Secret: <THEME_ADMIN_TOKEN>`

Requests missing a token, or using the wrong value, receive `{ ok: false,
error: 'Unauthorized' }` with a `401` status. The `list` endpoint remains
unauthenticated so the admin UI can load available themes before prompting for
credentials.

> **Tip:** rotate `THEME_ADMIN_TOKEN` whenever you roll credentials or deploy to
> a new environment. The functions return consistent `{ ok, … }` payloads that
> match the admin UI's expectations, so no further frontend changes are needed.

---

## Future Enhancements

- [ ] Watch mode for development (`themes:watch`)
- [ ] Theme preview generator (screenshot automation)
- [ ] Contrast ratio validation in generator
- [ ] Theme inheritance (extend base themes)
- [ ] Dark/light mode auto-pairing
- [ ] Export themes as shareable JSON
- [ ] Visual theme editor in admin UI

---

## Related Documentation

- **VISUAL-TOKENS.md** — Complete design token reference
- **AGENTS.md** — Project collaboration charter
- **CLAUDE.md** — AI assistant instructions

---

**Maintained by:** The WitchClick Constellation
**Script Location:** `scripts/generate-theme-css.mjs`
**Generated Files:** `src/styles/themes.generated.css`, `src/data/themes.generated.json`
