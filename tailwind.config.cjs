// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,ts,tsx,vue,svelte,md}"],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/typography')]
};