# Gemini's Project Guide: witchclick

This document outlines the key architectural and operational aspects of the `witchclick` project.

## 1. Project Overview

`witchclick` is a content-driven static website built with Astro. It features a sophisticated local-first development workflow that mimics a dynamic CMS for content creation and management, but deploys as a highly-performant static site. A key feature is an AI-assisted content generation pipeline managed through a separate `cauldron` sub-project.

## 2. Technology Stack

-   **Framework:** Astro
-   **UI Language:** TypeScript
-   **Styling:** Tailwind CSS with a custom, data-driven theming system.
-   **Testing:**
    -   Vitest for unit/integration tests.
    -   Playwright for end-to-end smoke tests.
-   **Package Manager:** `pnpm` (inferred from `pnpm-workspace.yaml`).

## 3. Project Structure

-   `astro.config.mjs`: The main Astro configuration file. It's set to `output: 'static'`.
-   `package.json`: Defines dependencies and a rich set of custom scripts for project workflows.
-   `/content`: The heart of the project. Contains all raw content (Markdown, JSON), theme definitions, and site settings. This acts as the site's database.
-   `/src`: Contains all Astro components, layouts, pages, and client-side scripts.
    -   `/src/pages/admin`: Contains local-only admin panels for managing content.
-   `/scripts`: Holds the custom Node.js scripts that power the development and build processes.
-   `/cauldron`: A separate, self-contained Astro project for AI prompt management and content generation.
-   `/dist`: The output directory for the final static site.

## 4. Core Workflows

### Development

The primary development command is `npm run dev`. This command is a wrapper around `node scripts/dev-with-api.mjs`. It simultaneously starts:
1.  The standard Astro dev server.
2.  A local Node.js API server that provides dynamic, CMS-like functionality to the admin pages in `/src/pages/admin`.

This setup allows for a rich content management experience during development.

### Content Ingestion

Content is not consumed directly by Astro. Instead, a custom pipeline processes it:
1.  Raw content is placed in the `/content` directory. This can include markdown files for posts, JSON for data, or prompts for the AI queue.
2.  The `node scripts/ingest.mjs` script is run (often as part of a build or dev process) to validate, process, and prepare this content for Astro.

### Theming

The site's visual theme is dynamic and data-driven:
1.  Theme definitions are stored as JSON files in `/content/themes`.
2.  The `node scripts/generate-theme-css.mjs` script reads the selected theme data and generates a `theme.css` file that is used in the build.

### Build & Deployment

-   `npm run build`: Executes the full build process, which likely includes content ingestion, theme generation, and running `astro build`.
-   `npm run build:public`: A specific script that creates a production-ready `dist/` folder, ensuring any non-public drafts or content are excluded.
-   `scripts/ship.sh`: A shell script that seems to handle the final deployment process.
