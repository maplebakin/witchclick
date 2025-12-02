# Project Audit and Future Implementation Proposal

This document provides a comprehensive audit of the `witchclick` project, identifies key problems and opportunities, and proposes a strategic plan to meet the site's goals.

**Goal:** A metaphysical article library with personal "meanderings" content and future e-commerce capabilities.

## 1. Audit Findings Summary

The project is built on a very solid technical foundation with a modern Astro and TypeScript stack, robust build scripting, and strong code quality checks. The primary issues are not in the code itself, but in the content architecture and the application of its own quality tools.

| Category | Status | Key Finding |
| :--- | :--- | :--- |
| **Content Architecture** | ⚠️ **Needs Improvement** | No clear distinction exists between the "article library" and personal "meanderings." |
| **E-Commerce** | 🟡 **Foundation Exists** | The site uses an affiliate model. There is no native cart or checkout. |
| **SEO & Content Quality**| 🔴 **High-Priority Issue**| The SEO audit script ignores 100% of the site's primary content. |
| **Code Health & Tooling** | ✅ **Excellent** | The project has a mature, modern, and well-maintained development process. |

---

## 2. Problems & Proposed Solutions

### Issue #1: Unclear Content Structure (High Priority)

- **Problem:** There is no programmatic way to distinguish between the main "article library" (the `white-magic-curses`) and a future "meanderings" section for personal posts. The `content/posts` directory intended for this is currently empty.
- **Proposed Solution:** Introduce a formal `category` field in the frontmatter of all content. This is a simple, powerful way to classify content without restructuring files.
- **Implementation Plan:**
    1.  **Retrofit Existing Content:** Create a one-time script to add `category: 'library'` to the frontmatter of all markdown files within the `content/white-magic-curses/` directory.
    2.  **Establish "Meanderings":** Standardize on using the `content/posts/` directory for "meandering" posts, each with `category: 'meandering'` in its frontmatter.
    3.  **Update Frontend:** Modify the Astro pages to fetch and display content based on these categories, creating dedicated sections for the "Library" and "Meanderings."

### Issue #2: SEO Audit Blind Spot (Critical Priority)

- **Problem:** The powerful SEO audit script at `scripts/audit-seo.mjs` is hardcoded to **only** scan the `src/content/posts` directory, which is empty. This means all of the site's main content is currently un-audited for SEO compliance.
- **Proposed Solution:** Expand the script's scope and integrate it into the CI/CD pipeline to act as an automated quality gate.
- **Implementation Plan:**
    1.  **Refactor Script:** Modify `scripts/audit-seo.mjs` to accept an array of directories to scan (e.g., `['content/white-magic-curses', 'content/posts']`).
    2.  **Add NPM Script:** Add a script to `package.json`: `"audit:seo": "node scripts/audit-seo.mjs"`.
    3.  **Automate via CI:** Modify the `.github/workflows/ci.yml` file to add a new step that runs `npm run audit:seo` on every pull request. This will prevent merging content that doesn't meet SEO standards.

### Issue #3: E-Commerce Evolution (Future Goal)

- **Problem:** The site is limited to an affiliate marketing model. To sell products directly, a full e-commerce solution is required.
- **Proposed Solution:** A phased approach, starting with improvements to the current model and moving towards native e-commerce.

#### Phase 1: Enhance the Affiliate Model

- **Goal:** Make affiliate products easier to manage and more visually engaging.
- **Implementation Plan:**
    1.  **Create a Product Component:** Build a reusable Astro component (e.g., `<ProductCard key="product-key-from-json" />`).
    2.  **Centralize Data:** This component will look up the product's data from `content/products.json` at build time.
    3.  **Decouple Content:** Replace hardcoded affiliate links in markdown with this new component. This makes managing products significantly easier.

#### Phase 2: Implement Native E-Commerce

- **Goal:** Sell products directly on the website.
- **Implementation Plan:**
    1.  **Select a Headless Backend:** Choose and configure a headless e-commerce platform (e.g., Shopify Storefront API, Snipcart, BigCommerce).
    2.  **Migrate Product Data:** Move the product information from `content/products.json` into the chosen platform.
    3.  **Build Storefront:**
        - Create new Astro pages for `/shop` (listing) and `/shop/[slug]` (product details).
        - Use Astro's `getStaticPaths` to fetch all product data from the e-commerce API at build time, ensuring a fast-loading store.
    4.  **Integrate Cart & Checkout:** Use the platform's JavaScript SDK to add "add to cart" functionality and handle the checkout process.
