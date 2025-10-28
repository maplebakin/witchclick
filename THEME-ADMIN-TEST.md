# 🎃 Theme Admin Test Guide

## Test: Create "Autumn Harvest" Fall Theme

This document guides you through testing the new fully-functional theme admin system.

---

## 🌐 Access the Admin

1. **Open your browser** to: http://localhost:4323/admin/theme
2. **Or use the test page**: http://localhost:4323/test-theme-admin.html

---

## 🍂 Test 1: Create Fall Theme via UI

### Step 1: Create New Theme
1. Click the **"+ New"** button under "Midnight themes"
2. You should see empty form fields and default values

### Step 2: Enter Theme Details
Fill in the following values:

**Basic Info:**
- **Comfort mode**: `Midnight (dark)`
- **Theme name**: `Autumn Harvest`
- **Slug**: Will auto-generate as `autumn-harvest` (or type it manually)
- **Category**: Select `Seasonal`

**Main Colors:**
- **Primary**: `#d97706` (Warm orange)
- **Accent**: `#92400e` (Deep amber)
- **Background**: `#1c1410` (Dark brown)

**Text Colors:**
- **Primary text**: `#fef3c7` (Light cream)
- **Heading text**: `#fbbf24` (Golden yellow)
- **Muted text**: `#d97706` (Muted orange)

**Typography:**
- **Serif font**: `Cormorant Garamond`
- **Script font**: `Dancing Script`

### Step 3: Observe Live Preview
- ✅ Preview should update instantly as you change colors
- ✅ Contrast checker should show ratio and WCAG rating
- ✅ Background, text, and button colors should change in real-time

### Step 4: Save Theme
- Click **"💾 Save Theme"** button (or press `Ctrl+S`)
- You should see: ✅ "Created 'Autumn Harvest'" success message
- Theme should appear in the Midnight themes list
- Theme card should show the color swatches

### Step 5: Set as Active
- Click **"⭐ Set as Active"** button
- You should see: ✅ "Set 'Autumn Harvest' as active midnight theme"
- Theme card should get a green ring
- "Active midnight" should show "Autumn Harvest"

---

## 🧪 Test 2: Undo/Redo

1. Load the "Autumn Harvest" theme (click its card)
2. Change the primary color to something else (e.g., `#ff0000`)
3. Click **"↶ Undo"** button (or press `Ctrl+Z`)
   - ✅ Color should revert to original `#d97706`
4. Click **"↷ Redo"** button (or press `Ctrl+Y`)
   - ✅ Color should change back to red
5. Buttons should be disabled when no history

---

## 📋 Test 3: Duplicate Theme

1. Load "Autumn Harvest" theme
2. Click **"📋 Duplicate"** button
3. ✅ Should create "Autumn Harvest (Copy)" or "Autumn Harvest 1"
4. ✅ New theme should appear in list
5. ✅ All colors and settings should match original

---

## 🗑️ Test 4: Delete Theme

1. Select the duplicated theme
2. Click **"🗑️ Delete"** button
3. ✅ Confirmation dialog should appear
4. Click OK
5. ✅ Theme should be removed from list
6. ✅ Status message: "Deleted [theme name]"

---

## 💾 Test 5: Export/Import

### Export Single Theme
1. Load "Autumn Harvest" theme
2. Click **"⬇️ Export"** button
3. ✅ JSON file should download: `autumn-harvest.json`
4. Open it - should contain all theme data

### Export All Themes
1. Click **"⬇️ Export All"** button
2. ✅ JSON file should download: `witchclick-themes.json`
3. Contains all themes for both midnight and dawn modes

### Import Theme
1. Delete a theme (or start fresh)
2. Click **"⬆️ Import"** button
3. Select the exported JSON file
4. Choose whether to overwrite if exists
5. ✅ Theme should be imported and appear in list

---

## 🎨 Test 6: Contrast Checker

1. Create or edit any theme
2. **Look at the Contrast Check panel**
3. It should show:
   - Body Text: Ratio (e.g., "4.5:1") and rating (AAA/AA/Fail)
   - Headings: Ratio and rating
   - Color-coded badges (Green=AAA, Yellow=AA, Red=Fail)

### Test Poor Contrast
1. Set background to `#ffffff` (white)
2. Set primary text to `#cccccc` (light gray)
3. ✅ Should show "Fail" rating with red badge

### Test Good Contrast
1. Set background to `#000000` (black)
2. Set primary text to `#ffffff` (white)
3. ✅ Should show "AAA" rating with green badge (21:1 ratio!)

---

## 🔄 Test 7: Persistence

### Test localStorage Persistence
1. Create "Autumn Harvest" theme
2. Set it as active
3. **Refresh the page** (F5)
4. ✅ "Autumn Harvest" should still exist
5. ✅ Should still be marked as active
6. ✅ All colors and settings preserved

### Test Browser Restart
1. **Close the browser completely**
2. Reopen browser
3. Navigate to http://localhost:4323/admin/theme
4. ✅ All themes should still be there
5. ✅ Active themes preserved

### Clear Storage (Reset Test)
- Visit: http://localhost:4323/test-theme-admin.html
- Click **"🗑️ Clear Storage"**
- ✅ All themes deleted
- Refresh admin page - should be empty

---

## 🎯 Test 8: Category Filter

1. Create themes in different categories:
   - "Autumn Harvest" (Seasonal)
   - "Dark Mode" (Custom)
   - "Simple" (Minimal)

2. Use the **"Filter by category"** dropdown
3. Select "Seasonal"
4. ✅ Should only show "Autumn Harvest"
5. Select "All categories"
6. ✅ Should show all themes

---

## ⌨️ Test 9: Keyboard Shortcuts

1. Edit any theme
2. Make a change
3. Press **`Ctrl+S`** (or `Cmd+S` on Mac)
   - ✅ Should save theme
4. Make another change
5. Press **`Ctrl+Z`**
   - ✅ Should undo
6. Press **`Ctrl+Y`** (or `Ctrl+Shift+Z`)
   - ✅ Should redo

---

## 🌓 Test 10: Dawn Mode

1. Click **"+ New"** under "Dawn themes"
2. Comfort mode should auto-select "Dawn (light)"
3. Create a theme with light colors:
   - Background: `#f7f3f8`
   - Primary text: `#1f1630`
   - Primary: `#9b86c8`
4. ✅ Preview should show light theme
5. ✅ Save and set as active
6. ✅ "Active dawn" should update

---

## 🎨 Test 11: Color Picker Sync

1. Create or edit any theme
2. **Click a color picker** (the colored square)
3. Choose a color
4. ✅ Hex input should update automatically
5. **Type in hex input** (e.g., `#ff5733`)
6. ✅ Color picker should update
7. ✅ Preview should update instantly

---

## 📊 Expected Results Summary

✅ All form controls should work
✅ Live preview updates in real-time
✅ Contrast checker shows accurate ratings
✅ Undo/redo works for all changes
✅ CRUD operations all functional
✅ Export/import preserves all data
✅ localStorage persists across refreshes
✅ Keyboard shortcuts work
✅ Category filtering works
✅ No console errors
✅ No dead buttons or fake features

---

## 🐛 If Something Doesn't Work

1. **Open browser DevTools** (F12)
2. Check the **Console** tab for errors
3. Check the **Application > Local Storage** tab
   - Key: `witchclick_themes`
   - Should contain JSON with presets and active themes
4. **Report the issue** with:
   - What you did
   - What you expected
   - What actually happened
   - Any console errors

---

## 🎉 Success Criteria

**The test passes if:**
- ✅ You can create "Autumn Harvest" with all the specified colors
- ✅ It saves and persists after refresh
- ✅ Preview updates in real-time
- ✅ Contrast checker works
- ✅ All CRUD operations work
- ✅ Undo/redo works
- ✅ Export/import works
- ✅ No errors in console

---

## 📁 Storage Format

The theme data is stored in localStorage as:

```json
{
  "presets": {
    "midnight": [
      {
        "name": "Autumn Harvest",
        "slug": "autumn-harvest",
        "mode": "midnight",
        "category": "seasonal",
        "variables": {
          "primary": "#d97706",
          "accent": "#92400e",
          "background": "#1c1410",
          "textPrimary": "#fef3c7",
          "textHeading": "#fbbf24",
          "textMuted": "#d97706",
          "fontSerif": "Cormorant Garamond",
          "fontScript": "Dancing Script"
        },
        "createdAt": "2025-10-28T...",
        "updatedAt": "2025-10-28T..."
      }
    ],
    "dawn": []
  },
  "active": {
    "midnight": "autumn-harvest",
    "dawn": null
  }
}
```

---

## 🚀 Quick Test (Automated)

For a quick automated test:

1. Open: http://localhost:4323/test-theme-admin.html
2. Click **"🍂 Run Test"** button
3. Watch the console for automated tests
4. All tests should pass with green checkmarks

---

**Happy Testing! 🎃✨**
