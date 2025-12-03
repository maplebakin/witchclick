const { simplifiedColors, mapToLegacySemanticNames } = require('./src/lib/theme/colors.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        ...mapToLegacySemanticNames(),
        ...simplifiedColors,
      },
      fontFamily: {
        serif: ['Literata', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        // Ensure a strong preference for a magical script, with a better fallback than generic 'cursive'
        script: ['"Parisienne"', '"Great Vibes"', 'cursive'],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.body-strong'),
            lineHeight: '1.9',
            a: {
              color: theme('colors.secondary'), // Or your preferred accent color
              textDecoration: 'none', // Remove default underline
              position: 'relative', // Enable pseudo-element positioning
              zIndex: 1, // Ensure link text is above pseudo-element
              '&::after': { // Add a pseudo-element for the dynamic underline
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '-0.15em', // Adjust as needed
                height: '2px', // Thicker underline
                borderRadius: '999px',
                background: theme('colors.accent'), // Use an accent color for the underline
                opacity: 0,
                transform: 'scaleX(0.7)', // Start slightly scaled down
                transformOrigin: 'center',
                transition: 'opacity 240ms ease, transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: -1, // Place behind text
              },
              '&:hover': {
                color: theme('colors.accent'), // Change link color on hover
                textDecoration: 'none',
                '&::after': {
                  opacity: 1,
                  transform: 'scaleX(1)', // Expand on hover
                },
              },
              '&:focus-visible': { // Ensure accessibility for keyboard users
                outline: 'none', // Remove default outline for custom focus ring
                '&::after': {
                  opacity: 1,
                  transform: 'scaleX(1)', // Expand on focus
                },
              },
            },
            'h1,h2,h3,h4': {
              // Use a strong heading font, NOT the script font, by default for prose headings.
              // The script font should be reserved for decorative accents or specific elements.
              color: theme('colors.primary'),
              fontFamily: theme('fontFamily.serif').join(', '), // Or a dedicated 'heading' font if available
              marginTop: '2.5rem',
              marginBottom: '1rem',
              letterSpacing: '0.05em', // Add a touch more spacing for heading emphasis
              textTransform: 'uppercase', // Make it feel more inscribed
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
              fontFamily: theme('fontFamily.serif').join(', '), // Ensure blockquotes are readable, not overly decorative
              fontSize: '1.1rem', // Slightly adjust size for better readability
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
            color: theme('colors.inverse'),
            'h1,h2,h3,h4,h5,h6': { color: theme('colors.inverse') },
            p: { color: theme('colors.inverse') },
            strong: { color: theme('colors.inverse') },
            li: { color: theme('colors.inverse') },
            a: {
              color: theme('colors.accent-soft'),
              textDecoration: 'none',
              position: 'relative',
              zIndex: 1,
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '-0.15em',
                height: '2px',
                borderRadius: '999px',
                background: theme('colors.accent-soft'),
                opacity: 0,
                transform: 'scaleX(0.7)',
                transformOrigin: 'center',
                transition: 'opacity 240ms ease, transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: -1,
              },
              '&:hover': {
                color: theme('colors.accent'),
                textDecoration: 'none',
                '&::after': {
                  opacity: 1,
                  transform: 'scaleX(1)',
                },
              },
              '&:focus-visible': {
                outline: 'none',
                '&::after': {
                  opacity: 1,
                  transform: 'scaleX(1)',
                },
              },
            },
            blockquote: {
              borderLeftColor: theme('colors.line-bold'),
              color: theme('colors.inverse-soft'),
            },
            code: {
              backgroundColor: theme('colors.surface-inverse-muted'),
              color: theme('colors.accent-soft'),
            },
          }
        }
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
  darkMode: 'class',
};

