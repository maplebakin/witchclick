const typography = require('@tailwindcss/typography');
const baseConfig = require('../tailwind.config.cjs');

const sharedColors = baseConfig?.theme?.extend?.colors ?? {};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}', './drafts/**/*.json'],
  theme: {
    extend: {
      colors: sharedColors,
      fontFamily: {
        serif: ['Literata', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        script: ['Parisienne', 'cursive'],
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
          },
        },
        invert: {
          css: {
            a: { color: theme('colors.accent-soft') },
            blockquote: { borderLeftColor: theme('colors.line-bold') },
            code: { backgroundColor: theme('colors.inverse/10') },
          },
        },
      }),
      maxWidth: {
        cauldron: '1440px',
      },
      boxShadow: {
        focus: '0 0 0 2px rgba(120, 119, 198, 0.45)',
      },
    },
  },
  plugins: [typography],
};
