import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';

const root = process.cwd();
const posts = (slug) => matter(fs.readFileSync(path.join(root, 'src/content/posts', `${slug}.md`), 'utf8'));
const base = 'keeping-mental-space-safe-religious-reminders';

describe('religious reminder article publication boundary', () => {
  it('keeps one original draft and one linked public version, and retires the repeated public copy', () => {
    const original = posts(base);
    const canonical = posts(`${base}-2`);
    const duplicate = posts(`${base}-3`);
    expect(original.data.draft).toBe(true);
    expect(canonical.data.draft).not.toBe(true);
    expect(duplicate.data.draft).toBe(true);
    expect(canonical.data.canonicalUrl).toBe('https://witchclick.space/post/keeping-mental-space-safe-religious-reminders-2');
    expect(canonical.content).toBe(original.content);
    const links = [...canonical.content.matchAll(/\[[^\]]+\]\(\/post\/[^)]+\)/g)];
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it('preserves access to the retired published URL through a permanent redirect', () => {
    const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8');
    expect(redirects).toContain('/post/keeping-mental-space-safe-religious-reminders-3  /post/keeping-mental-space-safe-religious-reminders-2  301');
  });
});
