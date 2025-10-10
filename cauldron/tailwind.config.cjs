const base = require('../tailwind.config.cjs');

module.exports = {
  ...base,
  content: [
    ...(base.content ?? []),
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
    './drafts/**/*.json',
  ],
  theme: {
    ...(base.theme ?? {}),
    extend: {
      ...(base.theme?.extend ?? {}),
      maxWidth: {
        cauldron: '1440px',
      },
      boxShadow: {
        focus: '0 0 0 2px rgba(120, 119, 198, 0.45)',
      },
    },
  },
};
