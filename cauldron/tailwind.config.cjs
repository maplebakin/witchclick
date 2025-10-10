const typography = require('@tailwindcss/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}', './drafts/**/*.json'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Literata', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        script: ['Parisienne', 'cursive'],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.900'),
            lineHeight: '1.9',
            a: {
              color: theme('colors.purple.700'),
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            },
            'h1,h2,h3,h4': {
              color: theme('colors.gray.900'),
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
              color: theme('colors.purple.700'),
              fontFamily: theme('fontFamily.serif').join(', '),
            },
            blockquote: {
              borderLeftColor: theme('colors.purple.200'),
              color: theme('colors.gray.700'),
              fontFamily: theme('fontFamily.script').join(', '),
              fontSize: '1.15rem',
              lineHeight: '1.7',
            },
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.15rem 0.35rem',
              borderRadius: '0.375rem',
            },
          },
        },
        invert: {
          css: {
            a: { color: theme('colors.purple.300') },
            blockquote: { borderLeftColor: theme('colors.purple.500') },
            code: { backgroundColor: theme('colors.white/10') },
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
