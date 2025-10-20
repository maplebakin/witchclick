# Background Treatments - Usage Guide

## Quick Start

All custom background classes have been added to `src/styles/base.css` with:
- ✅ Fallback colors for all gradients
- ✅ Dark mode (dawn theme) variants
- ✅ WCAG AA/AAA contrast verification
- ✅ Reduced motion support

## Implementation Examples

### 1. Homepage: Welcoming & Grounding

```html
<div class="min-h-screen bg-home relative">
  <!-- Optional: Subtle grain texture overlay -->
  <div class="absolute inset-0 opacity-[0.015] pointer-events-none bg-noise"></div>

  <!-- Your content -->
  <main>
    <h1>Welcome to WitchClick</h1>
    <p>Cozy, grounding content goes here...</p>
  </main>
</div>
```

**Features:**
- Warm cream → amber → rose gradient
- Fallback: `#faf7f5`
- Contrast: **14.2:1** (WCAG AAA)
- Dawn variant: Softer parchment tones

---

### 2. Curses: Darker Symbolic Energy

```html
<div class="min-h-screen bg-curses relative">
  <!-- Layered symbolic pattern -->
  <div class="absolute inset-0 opacity-5 bg-sigil-pattern pointer-events-none"></div>

  <!-- Vignette effect for focus -->
  <div class="absolute inset-0 bg-radial-vignette pointer-events-none"></div>

  <!-- Your content (use light text) -->
  <main class="text-[var(--text-primary)]">
    <h1>White Magic Curses</h1>
    <p class="text-[var(--text-secondary)]">Playful resistance rituals...</p>
  </main>
</div>
```

**Features:**
- Purple-900 → slate-900 gradient
- Fallback: `#581c87`
- Contrast: **8.9:1** (WCAG AAA)
- Dawn variant: Lighter purple tones
- **Important:** Use light text colors (`--text-primary`, `--text-secondary`)

---

### 3. Entities: Moonlight & Mist

```html
<div class="min-h-screen bg-entities relative overflow-hidden">
  <!-- Moonlight glow (top) -->
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-moon-glow opacity-20 blur-3xl pointer-events-none"></div>

  <!-- Mist layers (bottom) -->
  <div class="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-slate-700/20 to-transparent pointer-events-none"></div>

  <!-- Subtle star field -->
  <div class="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

  <!-- Your content (use light text) -->
  <main class="text-[var(--text-primary)] relative z-10">
    <h1>Entity Catalogue</h1>
    <p class="text-[var(--text-secondary)]">Crystals, herbs, tarot...</p>
  </main>
</div>
```

**Features:**
- Slate-900 → indigo → slate-800 gradient
- Fallback: `#1e293b`
- Contrast: **11.4:1** (WCAG AAA)
- Dawn variant: Soft lavender tones
- **Important:** Use light text colors in midnight theme, dark in dawn

---

### 4. Tools & Prints: Altar Meets Shop

```html
<div class="min-h-screen bg-tools relative">
  <!-- Woven linen texture (CSS-only) -->
  <div class="absolute inset-0 opacity-[0.03] bg-linen pointer-events-none"></div>

  <!-- Warm accent corners -->
  <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-rose-200/20 to-transparent blur-3xl pointer-events-none"></div>
  <div class="absolute bottom-0 left-0 w-96 h-96 bg-gradient-radial from-amber-200/20 to-transparent blur-3xl pointer-events-none"></div>

  <!-- Your content -->
  <main>
    <h1>Tools & Printables</h1>
    <p>Shop our cozy ritual supplies...</p>
  </main>
</div>
```

**Features:**
- Warm amber-50 base
- Fallback: `#fefce8`
- Contrast: **15.1:1** (WCAG AAA)
- Dawn variant: Even lighter cream
- Subtle linen weave texture

---

### 5. Salon: Tea & Ink Study

```html
<div class="min-h-screen bg-salon relative">
  <!-- Soft ink wash overlay (top corners) -->
  <div class="absolute top-0 left-0 w-1/3 h-1/2 bg-ink-wash opacity-[0.04] blur-2xl pointer-events-none"></div>
  <div class="absolute top-0 right-0 w-1/3 h-1/2 bg-ink-wash opacity-[0.03] blur-2xl pointer-events-none"></div>

  <!-- Parchment grain -->
  <div class="absolute inset-0 opacity-[0.02] bg-grain pointer-events-none"></div>

  <!-- Your content -->
  <main>
    <h1>Writing Salon</h1>
    <p>Essays, reflections, and thoughtful discourse...</p>
  </main>
</div>
```

**Features:**
- Stone-100 → neutral → slate-100 gradient
- Fallback: `#f5f5f4`
- Contrast: **14.6:1** (WCAG AAA)
- Dawn variant: Warmer sepia tones
- Soft ink wash accents

---

## Available CSS Classes

### Base Background Classes
- `.bg-home` - Homepage welcoming gradient
- `.bg-curses` - Dark purple symbolic gradient
- `.bg-entities` - Moonlit slate gradient
- `.bg-tools` - Warm amber solid
- `.bg-salon` - Cerebral stone gradient

### Overlay Pattern Classes
- `.bg-noise` - Subtle grain texture
- `.bg-sigil-pattern` - Symbolic cross/sigil repeating pattern
- `.bg-radial-vignette` - Soft edge darkening
- `.bg-moon-glow` - Moonlight radial glow
- `.bg-stars` - CSS-only star field
- `.bg-linen` - Woven fabric texture
- `.bg-gradient-radial` - Helper for radial gradients
- `.bg-ink-wash` - Soft watercolor bleed effect
- `.bg-grain` - Fine parchment grain

---

## Text Color Recommendations

### For Light Backgrounds (home, tools, salon)
```css
color: var(--ink-body);        /* Primary body text */
color: var(--ink-strong);      /* Headings */
color: var(--ink-muted);       /* Secondary text */
```

### For Dark Backgrounds (curses, entities)
```css
color: var(--text-primary);    /* Primary body text - 16:1 contrast */
color: var(--text-secondary);  /* Body text - 9:1 contrast */
color: var(--text-tertiary);   /* Secondary text - 6:1 contrast */
color: var(--text-hint);       /* Minimum readable - 4.5:1 contrast */
```

---

## Theme Toggle Support

All backgrounds automatically adapt to the dawn theme:

```javascript
// Toggle between midnight (default) and dawn themes
document.documentElement.setAttribute('data-comfort-theme', 'dawn');

// Return to midnight theme
document.documentElement.removeAttribute('data-comfort-theme');
```

**CSS automatically handles the switch:**
```css
/* Midnight (default) */
.bg-home {
  background-color: #faf7f5;
  background-image: linear-gradient(135deg, #faf7f5 0%, #f5ebe0 50%, #fce4ec 100%);
}

/* Dawn (light) */
:root[data-comfort-theme="dawn"] .bg-home {
  background-color: #f6f0e8;
  background-image: linear-gradient(135deg, #f6f0e8 0%, #ede5dc 50%, #f2ecfa 100%);
}
```

---

## Performance Tips

### 1. Lazy Load Texture Overlays
```html
<!-- Only render below-the-fold textures when visible -->
<div
  class="lazy-bg absolute inset-0 bg-stars opacity-30"
  data-bg="stars"
  loading="lazy"
></div>
```

### 2. Use CSS-Only Patterns (No Images)
All texture overlays use pure CSS gradients - zero HTTP requests! ✅

### 3. Layer Backgrounds Efficiently
```html
<!-- Stack backgrounds with proper z-index -->
<div class="relative">
  <div class="absolute inset-0 bg-home -z-10"></div>
  <div class="absolute inset-0 bg-noise opacity-[0.015] -z-9"></div>
  <!-- Content (z-0 by default) -->
</div>
```

### 4. Respect Reduced Motion
All blur effects are automatically disabled for users who prefer reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .blur-3xl,
  .blur-2xl,
  .blur-xl {
    filter: none !important;
  }
}
```

---

## Testing

### Visual Test Page
Open `test-backgrounds.html` in your browser to see all backgrounds in action:

```bash
# From project root
open test-backgrounds.html
# or
npx serve . -p 3000
# then visit http://localhost:3000/test-backgrounds.html
```

**Features:**
- Toggle between midnight/dawn themes
- Live contrast ratio display
- All 5 background treatments
- Full layer demonstrations

### Contrast Verification
See `CONTRAST_VERIFICATION.md` for full WCAG compliance report.

---

## Migration from Old Backgrounds

### Before (Inline Styles)
```html
<div style="background: linear-gradient(180deg, #f5f5f4 0%, #fafaf9 100%);">
  Content
</div>
```

### After (Semantic Classes)
```html
<div class="bg-salon">
  Content
</div>
```

**Benefits:**
- ✅ Automatic dark mode support
- ✅ Guaranteed contrast ratios
- ✅ Consistent fallback colors
- ✅ Easier to maintain
- ✅ Reduced CSS duplication

---

## Troubleshooting

### Issue: Text is hard to read
**Solution:** Ensure you're using the correct text color variables for your background:
- Light backgrounds → `var(--ink-body)`, `var(--ink-strong)`
- Dark backgrounds → `var(--text-primary)`, `var(--text-secondary)`

### Issue: Gradients not showing
**Solution:** Check that fallback colors are visible - if yes, browser may not support gradients (very rare in 2025). All modern browsers support CSS gradients.

### Issue: Dawn theme not switching
**Solution:** Verify the `data-comfort-theme` attribute is set on the `<html>` element:
```javascript
console.log(document.documentElement.getAttribute('data-comfort-theme'));
// Should return 'dawn' or null
```

### Issue: Blur effects too intense
**Solution:** Respect user's motion preferences - check if `prefers-reduced-motion` is enabled. All blur effects are disabled automatically for these users.

---

## Examples in Production

### Homepage
```astro
---
// src/pages/index.astro
---
<div class="min-h-screen bg-home relative">
  <div class="absolute inset-0 opacity-[0.015] pointer-events-none bg-noise"></div>
  <main class="wc-container py-16">
    <h1>Welcome</h1>
  </main>
</div>
```

### Curses Index
```astro
---
// src/pages/curses/index.astro
---
<div class="min-h-screen bg-curses relative">
  <div class="absolute inset-0 opacity-5 bg-sigil-pattern pointer-events-none"></div>
  <div class="absolute inset-0 bg-radial-vignette pointer-events-none"></div>
  <main class="wc-container py-16 text-[var(--text-primary)] relative z-10">
    <h1>White Magic Curses</h1>
  </main>
</div>
```

### Entity Catalogue
```astro
---
// src/pages/entities/[type]/index.astro
---
<div class="min-h-screen bg-entities relative overflow-hidden">
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-moon-glow opacity-20 blur-3xl pointer-events-none"></div>
  <div class="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>
  <main class="wc-container py-16 text-[var(--text-primary)] relative z-10">
    <h1>{type} Entities</h1>
  </main>
</div>
```

---

## Summary

✅ **5 semantic background classes** for different page types
✅ **9 overlay pattern classes** for texture layers
✅ **Automatic dark mode** via `data-comfort-theme="dawn"`
✅ **WCAG AA/AAA compliant** contrast ratios (all verified)
✅ **Fallback colors** for all gradients
✅ **Reduced motion support** built-in
✅ **Zero HTTP requests** - all CSS-only patterns
✅ **Production-ready** with full documentation

Start using these backgrounds today for a cohesive, accessible, low-stimulation design system across all WitchClick pages!
