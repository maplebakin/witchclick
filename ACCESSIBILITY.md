# Accessibility Guidelines

This document outlines accessibility standards and testing procedures for WitchClick to ensure WCAG AA compliance.

## Color Contrast Standards

### WCAG Requirements

- **WCAG AA (Minimum):**
  - Normal text: 4.5:1 contrast ratio
  - Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio

- **WCAG AAA (Enhanced):**
  - Normal text: 7:1 contrast ratio
  - Large text: 4.5:1 contrast ratio

### Approved Text Color Variables

Use these CSS variables for accessible text. They are tested to meet WCAG AA standards on their intended backgrounds.

#### Dark Theme (Default)
```css
--text-primary: rgba(244, 241, 255, 0.96);      /* ~16:1 contrast - headings, important text */
--text-secondary: rgba(244, 241, 255, 0.85);    /* ~9:1 contrast - body text */
--text-tertiary: rgba(244, 241, 255, 0.75);     /* ~6:1 contrast - secondary/meta text */
--text-hint: rgba(244, 241, 255, 0.65);         /* ~4.5:1 contrast - placeholders, minimum */
--text-disabled: rgba(244, 241, 255, 0.45);     /* For disabled states only - NOT for readable text */
```

#### Dawn Theme (Light)
```css
--text-primary: rgba(44, 27, 61, 1.0);          /* ~16:1 contrast - headings, important text */
--text-secondary: rgba(44, 27, 61, 0.90);       /* ~10:1 contrast - body text */
--text-tertiary: rgba(44, 27, 61, 0.75);        /* ~6.5:1 contrast - secondary/meta text */
--text-hint: rgba(44, 27, 61, 0.60);            /* ~4.5:1 contrast - placeholders, minimum */
--text-disabled: rgba(44, 27, 61, 0.40);        /* For disabled states only */
```

## Usage Guidelines

### ✅ DO

- **Use semantic text variables** for all text content
- **Use `--text-primary`** for headings, important UI text, and high-emphasis content
- **Use `--text-secondary`** for body text, navigation links, and standard content
- **Use `--text-tertiary`** for metadata, timestamps, secondary information
- **Use `--text-hint`** for form placeholders and truly optional hints
- **Test color combinations** when layering backgrounds or using overlays

### ❌ DON'T

- **Never use `opacity` on text elements** to create visual hierarchy - use color variables instead
- **Never use `--text-disabled`** for readable text - it's only for genuinely disabled states
- **Don't use `color-mix()` for body text** - stick to explicit color values
- **Don't layer multiple opacities** (e.g., 0.72 opacity color + 0.75 opacity element)
- **Don't use `--color-muted` directly anymore** - use the new `--text-*` variables

## Testing Procedures

### Manual Testing

Use the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify:

1. Text color (foreground)
2. Background color (after calculating any transparency/overlays)
3. Minimum ratio: 4.5:1 for normal text, 3:1 for large text

### Browser Testing

1. Install [axe DevTools](https://www.deque.com/axe/devtools/) browser extension
2. Run audit on each page type:
   - Home page
   - Post detail page
   - Archive/listing pages
   - Entity pages
   - Admin pages (in both themes)
3. Test both default (dark) and dawn (light) themes
4. Fix any issues flagged as "Critical" or "Serious"

### Automated Testing

Run Lighthouse accessibility audit:

```bash
# For a built site
npm run build
npm run preview

# In another terminal, run Lighthouse
npx lighthouse http://localhost:4321 --only-categories=accessibility --view
```

Target score: **95+** for accessibility

## Common Patterns

### Card Components

```css
/* Headings */
.card-heading {
  color: var(--text-primary);  /* High contrast */
}

/* Body text */
.card-body {
  color: var(--text-secondary);  /* Standard contrast */
}

/* Metadata */
.card-metadata {
  color: var(--text-tertiary);  /* Lower contrast, still AA compliant */
}
```

### Form Inputs

```css
/* Input text */
.input {
  color: var(--text-secondary);
}

/* Placeholder */
.input::placeholder {
  color: var(--text-hint);  /* Minimum AA contrast */
}

/* Disabled */
.input:disabled {
  color: var(--text-disabled);  /* OK for disabled state */
}
```

### Navigation

```css
/* Primary nav links */
.nav-link {
  color: var(--text-secondary);
}

/* Secondary/utility links */
.nav-link--secondary {
  color: var(--text-tertiary);  /* Not opacity! */
}

/* Hover states should increase contrast */
.nav-link:hover {
  color: var(--color-gold);  /* High contrast accent color */
}
```

## Background + Text Combinations

### Verified Safe Combinations

| Background | Text Variable | Contrast Ratio | Status |
|------------|---------------|----------------|--------|
| `rgba(7, 2, 15, 0.95)` (dark panel) | `--text-primary` | ~16:1 | ✅ AAA |
| `rgba(7, 2, 15, 0.95)` (dark panel) | `--text-secondary` | ~9:1 | ✅ AAA |
| `rgba(7, 2, 15, 0.95)` (dark panel) | `--text-tertiary` | ~6:1 | ✅ AAA |
| `rgba(7, 2, 15, 0.95)` (dark panel) | `--text-hint` | ~4.5:1 | ✅ AA |
| `rgba(255, 252, 247, 0.92)` (light panel) | `--text-primary` | ~16:1 | ✅ AAA |
| `rgba(255, 252, 247, 0.92)` (light panel) | `--text-secondary` | ~10:1 | ✅ AAA |
| `rgba(255, 252, 247, 0.92)` (light panel) | `--text-tertiary` | ~6.5:1 | ✅ AAA |

### Requires Testing

When creating new components with these backgrounds, verify contrast:

- Gradient backgrounds (test at darkest/lightest points)
- Overlapping transparent layers
- Color-mixed backgrounds
- Image overlays

## Recent Fixes Applied

### 2025-10-18 - Major Accessibility Overhaul

**Fixed Critical Issues:**
1. Search input placeholder increased from 0.45 to 0.65 opacity (now using `--text-hint`)
2. Card panel text upgraded from `--color-muted` (0.72) to `--text-secondary` (0.85)
3. Footer copyright text increased from 0.55 to 0.75 opacity
4. Blockquote text changed from color-mix to solid `--text-primary`
5. Search result excerpt removed additional opacity layer
6. Navigation secondary links changed from blanket opacity to color-based
7. Card metadata increased from 0.65 to 0.75 opacity

**System Changes:**
- Created `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-hint` variables
- Added dawn theme variants for all text variables
- Documented contrast ratios for all variables
- Removed opacity-based text hierarchy patterns

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Who Can Use](https://whocanuse.com/) - See your colors in different vision simulations
- [Accessible Colors](https://accessible-colors.com/) - Find accessible color combinations

## Maintenance

**When adding new components:**
1. Use approved `--text-*` variables
2. Test contrast ratios manually
3. Run axe DevTools on the page
4. Test in both themes (dark + dawn)
5. Document any new background/text combinations

**When modifying themes:**
1. Recalculate all contrast ratios
2. Update this document
3. Run full accessibility audit
4. Test with actual users who have low vision

## Contact

For accessibility concerns or questions, see the main README or create an issue in the repository.
