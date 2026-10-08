import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { prepareSpecForPersistence } from '../server/lib/specPreparation.js';
import { createPostSpec } from './postSpecTestUtils';

describe('slug collision publication boundary', () => {
  it('stages a suffix-generated revision rather than silently publishing a second copy', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-collision-'));
    const postsDir = path.join(root, 'src', 'content', 'posts');
    try {
      fs.mkdirSync(postsDir, { recursive: true });
      fs.writeFileSync(path.join(postsDir, 'quiet-working.md'), '---\ntitle: Original\n---\n', 'utf8');
      const prepared = prepareSpecForPersistence(
        createPostSpec({ slug: 'quiet-working', title: 'Quiet Working' }),
        { cwd: root, postsDirectories: [postsDir] },
      );
      expect(prepared.spec.slug).toBe('quiet-working-2');
      expect(prepared.frontmatter.draft).toBe(true);
      expect(prepared.post.contents).toContain('draft: true');
      expect(prepared.warnings.join(' ')).toContain('draft for editorial review');
      expect(prepared.normalizationReport).toContain('publication-review-required:quiet-working-2');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps an intentionally new slug publish-eligible unless draft was requested', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-new-post-'));
    try {
      const postsDir = path.join(root, 'posts');
      fs.mkdirSync(postsDir, { recursive: true });
      const spec = createPostSpec({ slug: 'new-working', title: 'New Working' });
      const published = prepareSpecForPersistence(spec, { cwd: root, postsDirectories: [postsDir] });
      expect(published.frontmatter.draft).toBeUndefined();
      const draft = prepareSpecForPersistence(spec, { cwd: root, postsDirectories: [postsDir], draft: true });
      expect(draft.frontmatter.draft).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
