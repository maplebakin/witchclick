# Internal Link Validation Fix

## Problem

When trying to validate and ingest a PostSpec, the system was throwing a 400 error:
```
server error (400): internal link anchor "journaling" does not appear verbatim in sections markdown
```

This prevented ingestion of posts that referenced future content or posts where the internal link hint didn't appear in the exact markdown text.

## Root Cause

There were two validation layers blocking internal link hints that didn't appear in the post markdown:

1. **Validation Layer** (`server/lib/postSpecValidator.js:111-112`)
   - Threw an ERROR if anchor didn't appear in combined markdown
   - Blocked ingestion completely

2. **Normalization Layer** (`server/lib/ingestionAdapter.js:421-435`)
   - Filtered out (dropped) internal link hints not found in content
   - Prevented stub post creation for those hints

## Solution

### 1. Changed Validation from Error to Warning

**File:** `server/lib/postSpecValidator.js`
**Lines:** 111-115

**Before:**
```javascript
if (!markdownContainsAnchor(combinedMarkdown, anchor)) {
  errors.push(`Internal link anchor "${anchor}" does not appear verbatim in sections markdown.`);
}
```

**After:**
```javascript
// Note: We no longer error on missing anchors since stub posts are auto-created
// This allows referencing future posts that don't exist yet
if (!markdownContainsAnchor(combinedMarkdown, anchor)) {
  warnings.push(`Internal link anchor "${anchor}" does not appear in sections markdown (stub post will be created).`);
}
```

### 2. Changed Normalization to Keep All Hints

**File:** `server/lib/ingestionAdapter.js`
**Lines:** 421-433

**Before:**
```javascript
if (internalLinkHints.length > 0) {
  const lowerCombined = combinedMarkdown.toLowerCase();
  const filteredHints = [];
  for (const hint of internalLinkHints) {
    const anchor = hint.anchor || '';
    if (anchor && lowerCombined.includes(anchor.toLowerCase())) {
      filteredHints.push(hint);
    } else {
      const message = `internalLinkHint dropped: anchor "${anchor}" not found in content.`;
      report.push(message);
      warnings.push(message);
    }
  }
  internalLinkHints = filteredHints; // Dropped hints not in content!
}
```

**After:**
```javascript
// Note: We now keep all internal link hints, even if not in content
// This allows referencing future posts that will be auto-created as stubs
if (internalLinkHints.length > 0) {
  const lowerCombined = combinedMarkdown.toLowerCase();
  for (const hint of internalLinkHints) {
    const anchor = hint.anchor || '';
    if (anchor && !lowerCombined.includes(anchor.toLowerCase())) {
      const message = `internalLinkHint "${anchor}" not found in content (stub post will be created).`;
      report.push(message);
      warnings.push(message);
    }
  }
  // No longer filtering - all hints are kept!
}
```

## Behavior Changes

### Before Fix
❌ **Error:** `internal link anchor "journaling" does not appear verbatim in sections markdown`
❌ Ingestion blocked
❌ No stub posts created

### After Fix
✅ **Warning:** `internalLinkHint "journaling" not found in content (stub post will be created).`
✅ Ingestion succeeds
✅ Stub post created at `content/posts/journaling.md` with `draft: true`

## Example Output

**Test Spec with Missing Anchors:**
```json
{
  "internalLinkHints": [
    {"anchor": "journaling", "rationale": "Related practice"},
    {"anchor": "meditation techniques", "rationale": "Foundational practice"},
    {"anchor": "mindfulness exercises", "rationale": "Related work"}
  ]
}
```

**Dry Run Output:**
```
Normalizations:
 • internalLinkHint "meditation techniques" not found in content (stub post will be created).
 • internalLinkHint "mindfulness exercises" not found in content (stub post will be created).

Warnings:
 • Internal link anchor "journaling" should be 2–6 words (currently 1).
 • Internal link anchor "meditation techniques" does not appear in sections markdown (stub post will be created).
 • Internal link anchor "mindfulness exercises" does not appear in sections markdown (stub post will be created).

Would create post stubs:
 • content/posts/journaling.md (Journaling)
 • content/posts/meditation-techniques.md (Meditation Techniques)
 • content/posts/mindfulness-exercises.md (Mindfulness Exercises)
```

**Actual Ingestion:**
```
Wrote content/posts/test-post.md (1199 bytes)
Created post stubs:
 • content/posts/journaling.md
 • content/posts/meditation-techniques.md
 • content/posts/mindfulness-exercises.md
```

## Use Cases Now Enabled

1. **Forward References:** Posts can reference content that will be created in the future
2. **Content Planning:** Writers can outline an entire content strategy with internal links before all posts exist
3. **Iterative Development:** Publish posts that reference planned content, fill in stubs later
4. **Cross-Referencing:** Build a web of interconnected content without blocking on sequential creation

## Testing

Verified with test spec containing 5 internal link hints where none appear in the markdown:
- ✅ Validation passes (warnings only)
- ✅ Preview works
- ✅ Ingestion succeeds
- ✅ All 5 stub posts created with `draft: true`
- ✅ Stub posts have proper frontmatter and placeholder content

## Related Changes

This fix complements the stub post creation feature implemented in:
- `server/lib/specPreparation.js` - Core stub generation
- `scripts/ingest.mjs` - CLI reporting
- `dev-api.js` - API endpoint
- `src/pages/admin/index.astro` - Admin UI display
