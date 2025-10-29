# Token Migration Map — Legacy to Modern

**Date:** October 29, 2025
**Purpose:** Replace legacy `--color-*` tokens with modern semantic tokens from `tokens.css`

---

## Migration Strategy

### Legacy → Modern Token Mapping

#### Text Colors
```css
/* OLD (Legacy) → NEW (Modern Semantic) */
var(--color-gold)      → var(--text-accent-strong)   /* Accent text */
var(--color-ink)       → var(--text-strong)           /* Primary text */
var(--color-muted)     → var(--text-muted)            /* Muted text */
var(--ink-strong)      → var(--text-strong)           /* Keep (semantic helper) */
var(--ink-body)        → var(--text-body)             /* Body text */
var(--ink-muted)       → var(--text-muted)            /* Keep (semantic helper) */
```

#### Border & Accent Colors
```css
/* OLD (Legacy) → NEW (Modern Semantic) */
var(--color-gold) [borders]     → var(--border-accent-strong)   /* Strong borders */
var(--color-iris) [borders]     → var(--border-purple-medium)   /* Purple borders */
var(--color-border)             → var(--border-accent-subtle)   /* Subtle borders */
var(--color-border-strong)      → var(--border-accent-strong)   /* Strong borders */
```

#### Surface Colors
```css
/* OLD (Legacy) → NEW (Modern Semantic) */
var(--color-night)              → var(--surface-panel-primary)  /* Primary panels */
var(--color-midnight)           → var(--surface-panel-secondary) /* Secondary */
var(--color-dusk)               → var(--surface-elevated)       /* Elevated surfaces */
```

#### Focus & Interactive States
```css
/* OLD (Legacy) → NEW (Modern Semantic) */
var(--color-gold) [focus]       → var(--focus-ring)             /* Focus outlines */
```

### Special Cases (Keep as-is)

These tokens are **semantic helpers** that use `color-mix()` and should be preserved:

```css
/* KEEP - Semantic color-mix helpers */
--ink-body: color-mix(in srgb, var(--color-ink) 70%, var(--color-night) 30%);
--ink-strong: color-mix(in srgb, var(--color-ink) 85%, var(--color-night) 15%);
--ink-muted: color-mix(in srgb, var(--color-ink) 55%, white 45%);
--link-color: color-mix(in srgb, var(--color-fog) 55%, var(--color-gold) 45%);
--focus-ring-color: color-mix(in srgb, var(--color-gold) 72%, white 28%);
```

### Color-Mix References (Update Source Only)

For `color-mix()` expressions, only update if the **entire color-mix** can be replaced:

```css
/* BEFORE */
color-mix(in srgb, var(--color-gold) 32%, transparent 68%)

/* AFTER - Only if simpler token exists */
var(--border-accent-subtle)  /* If this achieves same result */

/* OTHERWISE - Keep color-mix but update reference if needed */
color-mix(in srgb, var(--border-accent-strong) 60%, transparent 40%)
```

---

## Files to Update

### High Priority (Direct Token Usage)

1. **`src/styles/base.css`** (45 occurrences)
   - Navigation styles
   - Footer styles
   - Typography (strong, blockquote)
   - Focus states

2. **`src/styles/cards.css`** (32 occurrences)
   - Card borders and surfaces
   - Badge/tag colors
   - Focus outlines

### Medium Priority (color-mix expressions)

3. **`src/styles/tailwind.css`** (19 occurrences)
   - Panel surfaces
   - Action colors
   - Gradients

### Low Priority (Complex color-mix)

4. **`src/layouts/Base.astro`** (inline styles)
   - Ambient color overrides
   - Page-specific backgrounds

---

## Replacement Rules

### Rule 1: Simple Text Color
```css
/* BEFORE */
color: var(--color-gold);

/* AFTER */
color: var(--text-accent-strong);
```

### Rule 2: Border Colors
```css
/* BEFORE */
border: 1px solid var(--color-gold);

/* AFTER */
border: 1px solid var(--border-accent-strong);
```

### Rule 3: Background/Surface
```css
/* BEFORE */
background: var(--color-night);

/* AFTER */
background: var(--surface-panel-primary);
```

### Rule 4: Focus Ring
```css
/* BEFORE */
outline: 2px solid var(--color-gold);

/* AFTER */
outline: 2px solid var(--focus-ring);
```

### Rule 5: Keep Complex Mixes
```css
/* KEEP AS-IS - Too complex to replace */
background: linear-gradient(
  135deg,
  color-mix(in srgb, var(--color-night) 88%, var(--color-midnight) 12%),
  color-mix(in srgb, var(--color-dusk) 78%, black 22%)
);
```

---

## Implementation Checklist

- [ ] Replace text color tokens in `base.css`
- [ ] Replace border tokens in `base.css`
- [ ] Replace focus ring tokens in `base.css`
- [ ] Replace card tokens in `cards.css`
- [ ] Review `tailwind.css` color-mix expressions
- [ ] Test midnight theme visuals
- [ ] Test dawn theme visuals
- [ ] Run build and verify no regressions
- [ ] Update VISUAL-TOKENS.md to note deprecated tokens

---

## Expected Impact

**Lines Changed:** ~100-150
**Files Modified:** 3-4
**Visual Impact:** None (semantic equivalence)
**Performance:** No change
**Maintenance:** Improved (centralized tokens)

---

## Rollback Plan

If visual regressions occur:
```bash
git diff src/styles/base.css > token-migration.patch
git checkout src/styles/base.css
# Review specific changes causing issues
```

All legacy tokens remain defined in `base.css` as fallbacks, so partial rollback is safe.
