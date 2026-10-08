import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';

const root = process.cwd();
const posts = (slug: string) => matter(fs.readFileSync(path.join(root, 'src/content/posts', `${slug}.md`), 'utf8'));
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
    // Retain the actual article, but retarget curated references to LIVE posts.
    expect(canonical.content).toContain('Religious reminders are woven through popular culture');
    expect(canonical.content).toContain('Keeping your mental space safe does not require perfect avoidance');
    const links = [...canonical.content.matchAll(/\[[^\]]+\]\((\/post\/[^)]+)\)/g)]
      .map((match) => match[1])
      .filter((url): url is string => typeof url === 'string');
    expect(links).toEqual([
      '/post/when-life-feels-on-pause',
      '/post/when-to-let-yourself-rest',
      '/post/whats-the-deal-with-the-rapture-gentle-inquiry',
    ]);
    // A Markdown file in source control is NOT proof its route is public.
    for (const url of links) {
      const destination = posts(url.slice('/post/'.length));
      expect(destination.data.draft, url).not.toBe(true);
      expect(destination.data.published, url).not.toBe(false);
    }
  });

  it('preserves access to the retired published URL through a permanent redirect', () => {
    const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8');
    expect(redirects).toContain('/post/keeping-mental-space-safe-religious-reminders-3  /post/keeping-mental-space-safe-religious-reminders-2  301');
  });
});
