module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    extraFileExtensions: [".astro"],
  },
  plugins: ["@typescript-eslint", "astro"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended",
  ],
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
        sourceType: "module",
      },
      rules: {
        "astro/no-unused-css-selector": "warn",
      },
    },
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
      },
    },
    {
      files: ["tests/**/*.ts"],
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
  ignorePatterns: ["dist", "node_modules", "playwright-report", "coverage"],
};
