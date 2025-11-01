const colors = require('tailwindcss/colors');

/**
 * Semantic color tokens keep the current palette intact while giving us
 * meaningful handles for future accessibility work. Only rename values here
 * once the visual design intentionally changes.
 */
const customColors = {
  // Brand + primary ink
  primary: colors.purple[900], // Core headlines, key brand accents
  'primary-strong': colors.purple[800], // Elevated brand text (hover, emphasis)
  secondary: colors.purple[700], // Secondary headlines, nav items
  tertiary: colors.purple[600], // Supporting labels and subtitles
  accent: colors.purple[500], // Interactive glyphs, icons, links
  'accent-soft': colors.purple[300], // Soft accent text on dark cards
  'accent-faint': colors.purple[200], // Muted accent details
  'accent-ghost': colors.purple[100], // Very light accent overlays

  // Neutral copy stacks
  'body-strong': colors.gray[900], // Primary body copy on light backgrounds
  body: colors.gray[800], // Default paragraph text
  'body-muted': colors.gray[700], // Secondary copy
  'body-subtle': colors.gray[600], // Metadata + helper text
  'body-faint': colors.gray[500], // Disabled states on light surfaces

  // Slate metadata + dark-surface ink
  'muted-strong': colors.slate[700], // Strong neutral text on tinted panels
  muted: colors.slate[600], // Metadata on light cards
  'muted-subtle': colors.slate[500], // Supporting captions
  'muted-faint': colors.slate[400], // Quiet hints + placeholders

  // Inverse palettes for dark surfaces
  inverse: colors.white, // Primary ink on night surfaces
  'inverse-soft': colors.slate[50], // Sub-headings on dark backgrounds (lighter for better readability)
  'inverse-muted': colors.slate[100], // Metadata on dark backgrounds (lighter for better readability)
  'inverse-subtle': colors.slate[200], // Quiet hints on dark backgrounds
  'inverse-faint': colors.slate[300], // Disabled states on dark backgrounds

  // Informational accents
  info: colors.indigo[700], // Info badges & headings
  'info-soft': colors.indigo[300], // Info text on dark panels
  'info-faint': colors.indigo[200], // Info highlights
  'info-haze': colors.indigo[100], // Whispered info accents

  // Positive / success hues
  success: colors.green[700], // Success text and icons
  'success-strong': colors.green[800], // Bold success moments
  'success-deep': colors.green[900], // Deep success emphasis
  'success-soft': colors.green[50], // Success backgrounds (soft)
  'success-tint': colors.green[100], // Success callouts (tinted)
  'success-emerald': colors.emerald[700], // Emerald-toned success text

  // Warning + danger signals
  warning: colors.amber[700], // Warning text & badges
  'warning-strong': colors.amber[900], // High-emphasis warnings
  'warning-soft': colors.amber[50], // Warning surface wash
  danger: colors.red[700], // Error text & destructive buttons
  'danger-soft': colors.red[50], // Error background wash

  // Additional tints
  'rose-soft': colors.rose[300], // Soft rose highlights
  'cloud-soft': colors.neutral[300], // Frosted overlays on dark cards
  'cloud-muted': colors.neutral[400], // Neutral overlay details
  'neutral-soft': colors.gray[50], // Gentle neutral surface
  'neutral-tint': colors.gray[100], // Neutral cards
  'cool-soft': colors.slate[50], // Cool neutral background wash
  'emerald-soft': colors.emerald[50], // Emerald callout backgrounds
  'amber-soft': colors.amber[50], // Amber callout backgrounds

  // Surfaces & overlays
  'surface-base': colors.white, // Site canvas
  'surface-card': colors.white, // Elevated cards on base
  'surface-muted': colors.purple[50], // Brand mist background
  'surface-soft': colors.purple[100], // Brand soft background
  'surface-overlay': colors.white, // Translucent overlays on photos
  'surface-accent': colors.purple[500], // Accent panels & CTA fills
  'surface-accent-strong': colors.purple[600], // Accent hover states
  'surface-accent-bolder': colors.purple[700], // Strong accent backgrounds
  'surface-accent-deep': colors.purple[800], // Deep brand fills
  'surface-accent-night': colors.purple[900], // Rich brand overlays
  'surface-accent-midnight': colors.purple[950], // Ultra-deep brand veils
  'surface-inverse': colors.slate[950], // Night mode background
  'surface-inverse-soft': colors.slate[900], // Slightly lifted night surface
  'surface-inverse-muted': colors.slate[800], // Subtle dark panels
  'surface-backdrop': colors.zinc[950], // Full-screen overlays & modals
  'surface-veil': colors.zinc[900], // Frosted overlay veil
  'surface-info': colors.indigo[600], // Info hero backgrounds
  'surface-info-strong': colors.indigo[700], // Info hover state
  'surface-info-soft': colors.indigo[500], // Info tint overlays
  'surface-success': colors.green[600], // Success hero strips
  'surface-success-strong': colors.green[700], // Success hover strips
  'surface-success-soft': colors.green[50], // Success background wash
  'surface-success-tint': colors.green[100], // Success highlight cards
  'surface-warning-soft': colors.amber[50], // Warning highlight cards
  'surface-danger-soft': colors.red[50], // Error highlight cards
  'surface-emerald-soft': colors.emerald[50], // Emerald accent cards
  'surface-neutral-soft': colors.gray[50], // Neutral highlight cards
  'surface-neutral-tint': colors.gray[100], // Neutral panel tint
  'surface-cool-soft': colors.slate[50], // Cool neutral background

  // Border & divider system
  'line-subtle': colors.purple[100], // Soft brand separators
  'line-muted': colors.purple[200], // Default card borders
  'line-strong': colors.purple[300], // Hover + interactive outlines
  'line-bolder': colors.purple[400], // Accent dividers & tabs
  'line-bold': colors.purple[500], // Emphasized accent borders
  'line-accent': colors.purple[700], // CTA outlines
  'line-accent-strong': colors.purple[800], // CTA hover outlines
  'line-accent-deep': colors.purple[900], // Deep accent borders
  'line-inverse': colors.slate[800], // Default divider on dark
  'line-inverse-strong': colors.slate[900], // Strong divider on dark
  'line-night': colors.slate[950], // High-contrast night outlines
  'line-inverse-muted': colors.slate[500], // Inputs on dark
  'line-neutral': colors.gray[200], // Neutral dividers
  'line-neutral-strong': colors.gray[300], // Strong neutral borders
  'line-slate': colors.slate[200], // Cool neutral borders
  'line-success-soft': colors.green[200], // Success outlines
  'line-emerald': colors.emerald[200], // Emerald accents
  'line-warning': colors.amber[200], // Warning outlines
  'line-danger': colors.red[200], // Error outlines
  'line-info': colors.indigo[400], // Info outlines
  'line-info-strong': colors.indigo[500], // Info hover outlines
  'line-veil': colors.zinc[200], // Veiled dividers
  'line-veil-strong': colors.zinc[800], // Veil outline on dark
  'line-contrast': colors.white, // Contrast border on dark surfaces

  // Focus indicators
  focus: colors.purple[400], // Brand focus ring
  'focus-soft': colors.purple[300], // Soft focus halo
  'focus-strong': colors.purple[500], // High-emphasis focus
  'focus-muted': colors.slate[500], // Subtle focus for dense UIs

  // Gradient tokens for entity cards
  'gradient-default-start': colors.slate[500], // Default card gradient start
  'gradient-default-end': colors.slate[900], // Default card gradient end
  'gradient-crystal-start': colors.violet[400], // Crystal gradient start
  'gradient-crystal-end': colors.fuchsia[600], // Crystal gradient end
  'gradient-herb-start': colors.emerald[400], // Herb gradient start
  'gradient-herb-end': colors.lime[500], // Herb gradient end
  'gradient-moon-start': colors.sky[400], // Moon phase gradient start
  'gradient-moon-end': colors.indigo[500], // Moon phase gradient end
  'gradient-ritual-start': colors.amber[400], // Ritual gradient start
  'gradient-ritual-end': colors.orange[600], // Ritual gradient end
  'gradient-tarot-start': colors.violet[500], // Tarot gradient start
  'gradient-tarot-end': colors.rose[500], // Tarot gradient end
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        ...customColors,
        // Ritual palette shorthands used directly in templates
        ink: customColors['body-strong'],
        moss: '#4b6b57',
        ember: '#d08c60',
        moon: '#e8e2d9',
        stone: '#8a7f96',
        inverse: customColors['inverse'],
      },
      fontFamily: {
        serif: ['Literata', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        script: ['Parisienne', 'cursive'],
      },
      boxShadow: {
        soft: '0 18px 45px -28px rgba(11, 6, 20, 0.25)',
      },
      borderRadius: {
        xl: '1rem',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.body-strong'),
            lineHeight: '1.9',
            a: {
              color: theme('colors.secondary'),
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            },
            'h1,h2,h3,h4': {
              color: theme('colors.primary'),
              fontFamily: theme('fontFamily.script').join(', '),
              marginTop: '2.5rem',
              marginBottom: '1rem',
            },
            'h1 + *': {
              marginTop: '0',
            },
            'h2 + *': {
              marginTop: '0',
            },
            p: {
              marginBottom: '1.25em',
            },
            'p:first-of-type::first-letter': {
              float: 'left',
              fontSize: '3.25rem',
              lineHeight: '1',
              marginRight: '0.35rem',
              marginTop: '0.15rem',
              color: theme('colors.secondary'),
              fontFamily: theme('fontFamily.serif').join(', '),
            },
            blockquote: {
              borderLeftColor: theme('colors.line-subtle'),
              color: theme('colors.body-muted'),
              fontFamily: theme('fontFamily.script').join(', '),
              fontSize: '1.15rem',
              lineHeight: '1.7',
            },
            code: {
              backgroundColor: theme('colors.surface-neutral-tint'),
              padding: '0.15rem 0.35rem',
              borderRadius: '0.375rem',
            },
          }
        },
        invert: {
          css: {
            a: { color: theme('colors.accent-soft') },
            blockquote: { borderLeftColor: theme('colors.line-bold') },
            code: { backgroundColor: theme('colors.inverse/10') },
          }
        }
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

module.exports.customColors = customColors;
