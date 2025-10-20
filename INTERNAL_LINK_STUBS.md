# Internal Link Stub Creation Feature

## Overview

This feature automatically creates stub posts for internal link hints that reference posts that don't exist yet, similar to how entity stubs are created.

## How It Works

When ingesting a post with `internalLinkHints`, the system now:

1. Extracts each internal link hint anchor text
2. Converts the anchor text to a slug (e.g., "morning gratitude ritual" → "morning-gratitude-ritual")
3. Checks if a post with that slug already exists
4. If not, creates a stub post with:
   - Proper frontmatter (title, slug, excerpt, etc.)
   - `draft: true` flag to prevent publishing
   - `tags: ["placeholder", "stub"]` to identify it as a stub
   - Placeholder content explaining it needs to be replaced
   - Proper canonical URL

## Modified Files

### Core Implementation
- **server/lib/specPreparation.js**
  - Added `createPostStubRecords()` function to generate stub post records
  - Modified `prepareSpecForPersistence()` to call the new function
  - Modified `persistPreparedSpec()` to write stub posts to disk
  - Returns `postStubs` and `createdPosts` in result objects

### CLI Ingestion Script
- **scripts/ingest.mjs**
  - Updated to extract `postStubs` from prepared spec
  - Updated to extract `createdPosts` from persistence result
  - Modified `printDryRun()` to show stub posts that would be created
  - Modified `printSuccess()` to show created stub posts

### API Endpoint
- **src/pages/api/ingest.json.ts**
  - Added `ensurePostStubs()` function for API-based ingestion
  - Modified POST handler to create stub posts
  - Returns `createdPostStubs` in response

## Usage Examples

### CLI Usage

```bash
# Dry run to see what stubs would be created
node scripts/ingest.mjs post-spec.json --dry

# Actually create the post and stubs
node scripts/ingest.mjs post-spec.json
```

### Output Example

```
Wrote content/posts/my-new-post.md (1675 bytes)
Created post stubs:
 • content/posts/morning-gratitude-ritual.md
 • content/posts/evening-wind-down-practices.md
 • content/posts/beginner-tarot-guide.md
Tip: commit and deploy when ready.
```

### Stub Post Structure

```markdown
---
title: "Morning Gratitude Ritual"
slug: "morning-gratitude-ritual"
excerpt: "Placeholder post for \"Morning Gratitude Ritual\"."
metaTitle: "Morning Gratitude Ritual"
metaDescription: "This is a placeholder post that was auto-generated from an internal link reference. Content coming soon."
tags: ["placeholder","stub"]
outline: ["Placeholder"]
wordCount: 50
readingMinutes: 1
entities: []
includeAds: false
includeKofi: false
affiliateAnchors: []
internalLinkHints: []
internalLinks: []
publishedAt: "2025-10-20T13:34:12.995Z"
canonicalUrl: "https://witchclick.space/post/morning-gratitude-ritual"
specVersion: 2
draft: true
---

## Placeholder

This post was automatically created as a stub from an internal link reference. Please replace this content.
```

## Benefits

1. **No More Ingestion Errors**: Posts with internal link hints to non-existent posts no longer block ingestion
2. **Content Planning**: Writers can reference future posts without breaking the pipeline
3. **Automatic Scaffolding**: Stub posts provide a starting point for content that needs to be written
4. **Easy Identification**: Stubs are marked with `draft: true` and `tags: ["placeholder", "stub"]` for easy filtering
5. **Consistent Behavior**: Works the same way as entity stub creation

## Notes

- Stub posts are only created if they don't already exist
- The `draft: true` frontmatter field prevents stubs from being published
- Internal link hints that don't appear in the post content are still filtered out (existing validation)
- The feature works in both CLI ingestion and API-based ingestion
