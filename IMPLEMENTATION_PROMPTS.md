# Implementation Prompts for WitchClick Placeholder Features

## Prompt Set #6: UI Coziness Transformation

**Target File:** `src/styles/global.css` (or main style file) and individual component styles
**Objective:** Transform harsh, boxy UI elements into soft, cozy, warm aesthetics

```
Transform the WitchClick UI to have a soft, cozy, sanctuary-like feel rather than harsh boxes and raw text. The current interface has very angular, boxy elements and stark contrasts that feel clinical rather than welcoming.

For the overall aesthetic, implement:
- Soft rounded corners on all UI elements (buttons, text areas, panels, etc.) - use border-radius: 12px minimum
- Warmer, more muted color palette with softer contrasts
- Gentle gradients and subtle textures instead of flat colors
- Softer shadows and depth effects
- More organic, flowing shapes

Specific changes needed:
1. Buttons: rounded corners (12-16px radius), subtle gradient backgrounds, softer hover animations
2. Cards/panels: rounded corners, soft pastel background colors, gentle hover effects
3. Text areas: rounded borders, softer focus states, warm background colors
4. Navigation: softer hover states, rounded menu items, warm accent colors
5. General styling: warm color palette (muted golds, soft greens, warm grays), softer fonts
```

## Prompt Set #7: Entity Stub System Completion

**Target Files:** `src/pages/admin/stubs.astro`, `src/pages/entities/[type]/[slug].astro`, `dev-api.js` (entities/stubs endpoint)
**Objective:** Complete the entity stub creation and management system

```
Complete the entity stub management system that currently has placeholder functionality. The system should:

1. Allow users to identify which entity stubs need completion
2. Provide an easy interface to generate AI prompts for completing stub entities
3. Allow users to paste completed JSON and validate it
4. Save completed entities to the correct location in content/entities/
5. Remove the stub from the pending list upon successful completion
6. Display proper status messages throughout the process

Currently there's a /admin/stubs page that shows stubs, but the workflow may not be fully functional. The entity detail pages show "Lore in Progress" messages for stub entities but don't provide a clear path to completion.

The API endpoint /entities/stubs exists in dev-api.js but needs to be fully implemented to return all pending stubs with their reference information.
```

## Prompt Set #8: Subscription/Notification Feature

**Target Files:** `src/pages/entities/[type]/[slug].astro`, related API endpoints
**Objective:** Implement the planned subscription/notification feature for when entity lore is completed

```
Implement the subscription/notification feature that was planned but not yet implemented. In the entity detail page (src/pages/entities/[type]/[slug].astro), there's a comment indicating "Future: add subscription/notification CTA when lore completes" in the stub entity display section.

Create a simple email notification system where users can:
1. Enter their email address when viewing a stub entity
2. Receive notification when the entity content is completed
3. Optionally provide a callback function to refresh the page or show a notification

This could be a simple form that stores email addresses associated with entity slugs, and sends notifications when those entities are updated.
```

## Prompt Set #9: Empty State Content Implementation

**Target Files:** `src/pages/meanderings/index.astro`, `src/pages/tools/index.astro`, `src/pages/lab/index.astro`, `src/pages/hub/index.astro`, `src/pages/partners/index.astro`, `src/pages/author/[slug].astro`
**Objective:** Replace "coming soon" placeholders with actual content or better user experiences

```
Replace the various "coming soon" and empty state placeholders with either:
1. Actual content where available
2. Better user experience with clear timelines or alternative actions
3. Email signup forms to notify users when content becomes available
4. Links to related content in the meantime
5. Engaging copy that maintains user interest while explaining the delay

Focus on making these pages feel intentional rather than like gaps in the experience. For example:
- Meanderings page: Add a signup for email notifications when new meanderings are published
- Tools page: Link to general resources or add a request form
- Lab page: Add a form to request new printables
- Hub page: Explain the seasonal cycle and expected timeline
```

## Prompt Set #10: Dynamic Placeholder Image Replacement

**Target File:** `src/components/ProductRecommendations.astro`
**Objective:** Replace static placeholder images with dynamic alternatives

```
Replace the placeholder.co service in ProductRecommendations.astro with a more robust solution:

Instead of: `https://placehold.co/600x400?text=${placeholderLabel}`

Implement one of these solutions:
1. Use a locally hosted placeholder image that gets replaced when real images are available
2. Generate SVG placeholders with the product name embedded
3. Create a fallback system that tries to load real images first, then falls back to generated placeholders
4. Add proper loading states and error handling for image loading

The goal is to have a more professional and controllable placeholder system that works consistently.
```

## Prompt Set #11: API Endpoint Verification

**Target File:** `dev-api.js`
**Objective:** Verify and complete all API endpoints for production use

```
Review and complete all API endpoints in dev-api.js to ensure they work properly in production:

1. Test all endpoints to confirm they return proper responses
2. Add proper error handling and validation
3. Ensure all endpoints have appropriate authentication/authorization where needed
4. Add rate limiting where appropriate
5. Ensure proper CORS headers for frontend integration
6. Add logging for debugging purposes
7. Document any endpoints that are still in development

Pay special attention to endpoints that may have been created but not fully implemented, particularly around entity management, content generation, and admin functionality.
```

## Prompt Set #12: Share Functionality Completion

**Target File:** `src/pages/account/index.astro`
**Objective:** Complete the sharing functionality that currently shows error messages

```
Complete the sharing functionality on the account page that currently shows "We couldn't complete that share. Try again soon." error messages.

Implement proper Web Share API integration with fallbacks:
1. Use navigator.share() when available
2. Provide fallback sharing options for browsers that don't support Web Share API
3. Add proper error handling and user feedback
4. Include appropriate share text and links
5. Track sharing success for analytics if appropriate

Ensure the sharing works for both mobile and desktop browsers with appropriate fallbacks.
```

## Prompt Set #13: Content Generation Pipeline Improvement

**Target File:** `src/pages/api/ingest.json.ts`
**Objective:** Improve the automatic content generation pipeline

```
Improve the content generation pipeline in src/pages/api/ingest.json.ts to provide better placeholder content and clearer workflows:

1. Instead of basic "Content coming soon" messages, generate more meaningful placeholder content
2. Add clearer indicators when content is auto-generated vs. manually created
3. Provide better guidance for users on how to replace placeholder content
4. Add proper metadata and SEO considerations for placeholder content
5. Create a system to track and manage placeholder content that needs completion
6. Add notifications or dashboards to help users identify which content needs attention

The goal is to make auto-generated content more useful as a starting point rather than just a placeholder.
```

## Prompt Set #14: Admin Dashboard Completion

**Target Files:** All files in `src/pages/admin/`
**Objective:** Verify and complete all admin functionality

```
Review all admin pages in src/pages/admin/ to ensure complete functionality:

1. Test all form submissions and data saving
2. Verify all API calls work properly with the dev-api.js endpoints
3. Add proper validation and error handling
4. Ensure consistent UI/UX across all admin pages
5. Add loading states and success/error feedback
6. Verify all CRUD operations work for entities, posts, settings, etc.
7. Add proper access controls if needed
8. Ensure responsive design works on admin pages
9. Add keyboard navigation and accessibility features
10. Create consistent form patterns and validation approaches

Focus on making the admin experience smooth and efficient for content creators.
```

## Prompt Set #15: Accessibility & UX Enhancement

**Target Files:** All template files throughout the project
**Objective:** Add proper accessibility features and improve user experience

```
Enhance accessibility and user experience across all pages:

1. Add proper ARIA attributes to dynamic content
2. Implement proper loading states and skeleton screens
3. Add focus management for modal dialogs and dynamic content
4. Ensure proper keyboard navigation throughout the site
5. Add screen reader announcements for dynamic content changes
6. Implement proper error messaging and validation feedback
7. Add skip links for keyboard users
8. Ensure sufficient color contrast ratios
9. Add proper heading hierarchies
10. Implement lazy loading for images and content where appropriate

Focus on making the site usable for all users regardless of ability or device constraints.
```