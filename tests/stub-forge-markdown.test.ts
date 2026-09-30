import { describe, expect, it } from 'vitest';

import {
  normalizePastedMarkdownDraft,
  parsePastedMarkdownDraft,
  replacePostStubWithDraft,
} from '../dev-api.js';

const baseBody = `
# Basic Scrying Techniques

Body content here.
`;

describe('Stub Forge pasted markdown parsing', () => {
  it('parses a quoted YAML slug', () => {
    const { parsed } = parsePastedMarkdownDraft(`---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}`);

    expect(parsed.data.slug).toBe('basic-scrying-techniques');
  });

  it('parses an unquoted YAML slug', () => {
    const { parsed } = parsePastedMarkdownDraft(`---
title: Basic Scrying Techniques
slug: basic-scrying-techniques
draft: true
postType: ritual
category: ritual
---
${baseBody}`);

    expect(parsed.data.slug).toBe('basic-scrying-techniques');
  });

  it('normalizes leading blank lines before frontmatter', () => {
    const { parsed } = parsePastedMarkdownDraft(`

---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}`);

    expect(parsed.data.slug).toBe('basic-scrying-techniques');
  });

  it('unwraps a whole-document markdown fence', () => {
    const markdown = normalizePastedMarkdownDraft(`\`\`\`markdown
---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}
\`\`\``);

    expect(markdown.startsWith('---\n')).toBe(true);
    expect(markdown).not.toContain('```');
  });

  it('extracts frontmatter after accidental leading prose', () => {
    const { parsed } = parsePastedMarkdownDraft(`Here is the completed markdown:

---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}`);

    expect(parsed.data.slug).toBe('basic-scrying-techniques');
  });

  it('leaves missing slug detectable by validation', () => {
    const { parsed } = parsePastedMarkdownDraft(`---
title: "Basic Scrying Techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}`);

    expect(parsed.data.slug).toBeUndefined();
  });

  it('parses draft true as boolean true', () => {
    const { parsed } = parsePastedMarkdownDraft(`---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: true
postType: "ritual"
category: "ritual"
---
${baseBody}`);

    expect(parsed.data.draft).toBe(true);
  });

  it('keeps quoted draft true acceptable for replacement validation', async () => {
    await expect(replacePostStubWithDraft({
      stubSlug: 'basic-scrying-techniques',
      markdown: `---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: "true"
postType: "ritual"
category: "ritual"
---
${baseBody}`,
    }, { dryRun: true })).resolves.toMatchObject({
      saved: false,
      slug: 'basic-scrying-techniques',
    });
  });

  it('normalizes blank category/content type values so replacement frontmatter remains schema-safe', async () => {
    await expect(replacePostStubWithDraft({
      stubSlug: 'ancestral-patterns',
      markdown: `---
title: "Ancestral Patterns"
slug: "ancestral-patterns"
draft: true
postType: ""
category: ""
metaDescription: "A grounded guide to noticing inherited patterns without fatalism, shame, or pressure to fix everything at once."
excerpt: "A gentle way to name inherited patterns and choose one practical next step."
tags:
  - reflection
  - boundaries
  - self-trust
  - journaling
---
# Ancestral Patterns

This completed draft replaces the placeholder with practical reflection. It gives the reader a small way to notice inherited patterns without treating those patterns as destiny.

## Gentle Practice

Write down one repeated pattern, one choice you still have, and one support you can ask for this week.
`,
    }, { dryRun: true })).resolves.toMatchObject({
      saved: false,
      slug: 'ancestral-patterns',
      frontmatter: expect.objectContaining({
        category: 'ritual',
      }),
    });
  });

  it('drops invalid pasted contentType instead of writing schema-invalid frontmatter', async () => {
    const result = await replacePostStubWithDraft({
      stubSlug: 'ancestral-patterns',
      markdown: `---
title: "Ancestral Patterns"
slug: "ancestral-patterns"
draft: true
postType: "pop-culture-review"
contentType: "pop-culture-review"
category: "feature"
metaDescription: "A grounded guide to noticing inherited patterns without fatalism, shame, or pressure to fix everything at once."
excerpt: "A gentle way to name inherited patterns and choose one practical next step."
tags:
  - reflection
  - boundaries
  - self-trust
  - journaling
---
# Ancestral Patterns

This completed draft replaces the placeholder with practical reflection. It gives the reader a small way to notice inherited patterns without treating those patterns as destiny.

## Gentle Practice

Write down one repeated pattern, one choice you still have, and one support you can ask for this week.
`,
    }, { dryRun: true });

    const frontmatter = result.frontmatter as Record<string, unknown>;
    expect(frontmatter.category).toBe('ritual');
    expect(frontmatter.contentType).toBeUndefined();
    expect(frontmatter.postType).toBeUndefined();
  });

  it('rejects draft false for replacement validation', async () => {
    await expect(replacePostStubWithDraft({
      stubSlug: 'basic-scrying-techniques',
      markdown: `---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
draft: false
postType: "ritual"
category: "ritual"
---
${baseBody}`,
    }, { dryRun: true })).rejects.toThrow('Pasted draft must keep draft: true.');
  });

  it('rejects missing draft for replacement validation', async () => {
    await expect(replacePostStubWithDraft({
      stubSlug: 'basic-scrying-techniques',
      markdown: `---
title: "Basic Scrying Techniques"
slug: "basic-scrying-techniques"
postType: "ritual"
category: "ritual"
---
${baseBody}`,
    }, { dryRun: true })).rejects.toThrow('Pasted draft must keep draft: true.');
  });
});
