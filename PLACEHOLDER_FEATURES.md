# WitchClick Placeholder Features & Non-Functional Elements

This document outlines all the identified placeholder features, stub functionality, and non-functional elements in the WitchClick project that need implementation.

## 1. Entity Stub System
**Status:** Partially implemented but requires completion
- **File:** `src/data/typeMetadata.ts`, `src/components/EntityCard.astro`, `src/pages/entities/[type]/[slug].astro`
- **Issue:** Entity stubs exist with placeholder text like "This crystal's story is still faceting itself" but the full entity completion workflow may not be fully functional
- **Endpoints:** `/entities/stubs` endpoint exists in dev-api.js but may need UI integration
- **Admin Page:** `/admin/stubs` exists for filling entity stubs but may need completion

## 2. Subscription/Notification System for Entity Completion
**Status:** Planned but not implemented
- **File:** `src/pages/entities/[type]/[slug].astro`
- **Issue:** Comment indicates "Future: add subscription/notification CTA when lore completes" in the stub entity display
- **Location:** Around line with "Lore in Progress" section

## 3. Empty State Placeholders
**Status:** Multiple placeholders throughout the site
- **File:** `src/pages/meanderings/index.astro`
- **Issue:** "No meanderings yet. Check back soon for non-magickal rambles and reflections."

- **File:** `src/pages/tools/index.astro`  
- **Issue:** "No tools to share just yet. Visit the About page to see how we choose future listings."

- **File:** `src/pages/lab/index.astro`
- **Issue:** "New printables are brewing—check back soon."

- **File:** `src/pages/hub/index.astro`
- **Issue:** "Our next seasonal arc is brewing—peek back soon for fresh rituals."

- **File:** `src/pages/partners/index.astro`
- **Issue:** "We'll be adding allies for this constellation soon."

- **File:** `src/pages/author/[slug].astro`
- **Issue:** "Circle back soon—new work is on the way."

## 4. Placeholder Images & Media
**Status:** Using placeholder services
- **File:** `src/components/ProductRecommendations.astro`
- **Issue:** Uses `https://placehold.co/600x400?text=${placeholderLabel}` for product images

## 5. Incomplete API Endpoints
**Status:** Endpoints exist but functionality may be incomplete
- **File:** `dev-api.js`
- **Issue:** Various endpoints exist but may need full implementation for production use
- **Endpoints to verify:** All endpoints listed in the file header comment

## 6. Theme Override System
**Status:** Framework exists but may be incomplete
- **File:** `src/lib/theme-editor.ts`
- **Issue:** Comment "Future: Add more scope-specific sections as needed"

## 7. Share Functionality
**Status:** Partial implementation
- **File:** `src/pages/account/index.astro`
- **Issue:** "We couldn't complete that share. Try again soon." error message suggests incomplete sharing feature

## 8. Content Generation Pipeline
**Status:** Exists but may need refinement
- **File:** `src/pages/api/ingest.json.ts`
- **Issue:** Creates placeholder posts with "Content coming soon" messages when auto-generating from link references
- **Issue:** Creates stub entities with "stub entity" summaries

## 9. Visual Design Consistency
**Status:** Some areas may need UI/UX improvements
- **Issue:** While the codebase has styling, the UI may feel harsh or clinical rather than cozy/warm as requested
- **Issue:** May need rounded corners, softer shadows, warmer colors, and more organic shapes

## 10. Missing Interactive Features
**Status:** Static placeholders where dynamic content expected
- **Issue:** Various "Check back soon" messages indicate planned but missing content
- **Issue:** Some components may be static when they should be interactive

## 11. Admin Dashboard Completeness
**Status:** Some admin features may be partially implemented
- **File:** Various admin pages under `src/pages/admin/`
- **Issue:** Need to verify all admin functionality works as expected
- **Issue:** Some form inputs may have placeholder text that suggests features not fully implemented

## 12. Accessibility & UX Enhancements
**Status:** May need additional accessibility features
- **Issue:** Some dynamic content may lack proper ARIA attributes
- **Issue:** Loading states and error handling may need improvement

## Priority Implementation Order:
1. Fix visual design to be "soft cozy" rather than harsh boxes (UI/UX)
2. Complete entity stub system and admin workflow
3. Implement missing content placeholders with actual functionality
4. Verify all API endpoints work correctly
5. Complete admin dashboard functionality
6. Add proper loading/error states
7. Improve accessibility features
8. Add missing interactive elements