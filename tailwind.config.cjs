/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,ts,tsx,md,mdx}"],
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
            a: {
              color: theme('colors.purple.700'),
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            },
            'h2,h3': { color: theme('colors.gray.900') },
            blockquote: { borderLeftColor: theme('colors.purple.200'), color: theme('colors.gray.700') },
            code: { backgroundColor: theme('colors.gray.100'), padding: '0.15rem 0.35rem', borderRadius: '0.375rem' },
          }
        },
        invert: {
          css: {
            a: { color: theme('colors.purple.300') },
            blockquote: { borderLeftColor: theme('colors.purple.500') },
            code: { backgroundColor: theme('colors.white/10') },
          }
        }
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
