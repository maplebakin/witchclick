# Admin Navigation Collapsible Feature

## Overview

Implemented a collapsible admin navigation panel across all 13 admin pages. The panel can be collapsed to save screen space and expanded when needed, with the state persisted in localStorage.

## Implementation

### Component Updated
- **File:** `src/components/AdminNav.astro`

### Features Added

1. **Toggle Button**
   - Positioned next to "Admin Panel" title
   - Chevron icon that rotates when collapsed
   - Accessible with proper ARIA attributes
   - Keyboard and mouse accessible

2. **Collapse/Expand Functionality**
   - Smooth transition animations
   - Hides all navigation sections when collapsed
   - Maintains header with toggle and "View Site" link
   - Click toggle to switch states

3. **State Persistence**
   - Uses localStorage key: `witchclick-admin-nav-collapsed`
   - State persists across page navigations
   - Automatically applies saved state on page load

4. **Visual Design**
   - Chevron rotates 180° when collapsed
   - Smooth transitions (0.2s for toggle, 0.3s for sections)
   - Compact collapsed state removes bottom padding and border
   - Button has hover and focus states

## User Interface

### Expanded State (Default)
```
┌─────────────────────────────────────┐
│ Admin Panel [<]    [View Site]      │
├─────────────────────────────────────┤
│ CONTENT CREATION                    │
│ • Generator                         │
│ • Write                             │
│ • Posts                             │
│                                     │
│ CONTENT MANAGEMENT                  │
│ • Entities                          │
│ • Authors                           │
│ • Partners                          │
│ • Calendar                          │
│ • Downloads                         │
│                                     │
│ (Design & Settings sections...)     │
└─────────────────────────────────────┘
```

### Collapsed State
```
┌─────────────────────────────────────┐
│ Admin Panel [>]    [View Site]      │
└─────────────────────────────────────┘
```

## Technical Details

### HTML Structure
```html
<nav class="admin-nav" data-admin-nav>
  <div class="admin-nav-header">
    <div class="admin-nav-header-left">
      <h2 class="admin-nav-title">Admin Panel</h2>
      <button data-admin-toggle aria-expanded="true">
        <svg class="admin-nav-toggle-icon">...</svg>
      </button>
    </div>
    <a href="/" class="admin-nav-home-link">...</a>
  </div>
  <div class="admin-nav-sections" data-admin-sections>
    <!-- sections content -->
  </div>
</nav>
```

### JavaScript Logic
```javascript
// Initialize on page load
function initAdminNav() {
  // Load saved state from localStorage
  const isCollapsed = localStorage.getItem('witchclick-admin-nav-collapsed') === 'true';

  // Apply initial state
  if (isCollapsed) {
    nav.classList.add('is-collapsed');
    toggle.setAttribute('aria-expanded', 'false');
  }

  // Handle toggle clicks
  toggle.addEventListener('click', () => {
    // Toggle state and save to localStorage
  });
}
```

### CSS Classes

**Base Classes:**
- `.admin-nav` - Main navigation container
- `.admin-nav-header` - Header with title and toggle
- `.admin-nav-header-left` - Left side grouping (title + toggle)
- `.admin-nav-toggle` - Toggle button
- `.admin-nav-toggle-icon` - Chevron SVG icon
- `.admin-nav-sections` - Collapsible sections container

**State Classes:**
- `.admin-nav.is-collapsed` - Applied when collapsed
  - Hides `.admin-nav-sections`
  - Removes header border and padding
  - Rotates toggle icon 180°

### Key Styles

**Toggle Button:**
```css
.admin-nav-toggle {
  width: 2rem;
  height: 2rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: transparent;
  transition: all 0.2s ease;
}

.admin-nav-toggle:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
```

**Collapsed State:**
```css
.admin-nav.is-collapsed .admin-nav-sections {
  display: none;
}

.admin-nav.is-collapsed .admin-nav-toggle-icon {
  transform: rotate(180deg);
}

.admin-nav.is-collapsed .admin-nav-header {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
```

## Benefits

1. **Screen Space:** Collapsed panel saves vertical space for content
2. **Persistent State:** Choice remembered across page loads
3. **Always Accessible:** Toggle always visible when collapsed
4. **Smooth UX:** Animations provide visual feedback
5. **Accessibility:** Proper ARIA attributes for screen readers
6. **Consistent:** Works the same on all 13 admin pages

## Admin Pages Affected

All 13 admin pages now have collapsible navigation:
1. `/admin/` - Generator
2. `/admin/write` - Write
3. `/admin/posts` - Posts
4. `/admin/entities` - Entities
5. `/admin/authors` - Authors
6. `/admin/partners` - Partners
7. `/admin/calendar` - Calendar
8. `/admin/downloads` - Downloads
9. `/admin/theme` - Theme
10. `/admin/hero` - Hero Images
11. `/admin/home` - Homepage
12. `/admin/products` - Products
13. `/admin/settings` - Settings

## Usage

**For Users:**
1. Click the chevron button next to "Admin Panel"
2. Panel collapses/expands with smooth animation
3. State is saved automatically
4. Next visit remembers your preference

**For Developers:**
- No props changes needed on admin pages
- Component automatically handles collapse state
- localStorage key: `witchclick-admin-nav-collapsed`
- Can clear state: `localStorage.removeItem('witchclick-admin-nav-collapsed')`

## Testing

✅ Toggle button works on all pages
✅ State persists across navigation
✅ Animations smooth and responsive
✅ Accessibility attributes correct
✅ No TypeScript/ESLint errors
✅ Works on mobile and desktop

## Future Enhancements

Potential improvements:
- Add keyboard shortcut (e.g., Alt+B) to toggle
- Animate height instead of display toggle
- Add tooltip on hover
- Different states for mobile vs desktop
