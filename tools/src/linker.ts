// tools/src/linker.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

type Link = { title: string; slug: string; anchor: string };

function listPosts(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
}

function readPost(p: string) {
  const raw = fs.readFileSync(p, 'utf8');
  const { data, content } = matter(raw);
  const slug = (data && data.slug) ? String(data.slug) : path.basename(p).replace(/\.md$/, '');
  const title = (data && data.title) ? String(data.title) : slug;
  return { path: p, slug, title, data, content, raw };
}

function savePost(p: string, data: any, content: string) {
  const out = matter.stringify(content, data);
  fs.writeFileSync(p, out, 'utf8');
}

function normText(s: string) { return s.replace(/\s+/g, ' ').trim(); }

export async function linkerCmd() {
  const ROOT = process.cwd();
  const POSTS_DIR = path.join(ROOT, 'content', 'posts');

  const files = listPosts(POSTS_DIR);
  const posts = files.map(f => readPost(path.join(POSTS_DIR, f)));

  // Precompute candidates (title → slug)
  const candidates = posts.map(p => ({ slug: p.slug, title: p.title, anchor: p.title }));

  let changed = 0;

  for (const p of posts) {
    const contentLC = p.content.toLowerCase();
    const links: Link[] = [];

    for (const c of candidates) {
      if (c.slug === p.slug) continue;
      if (links.length >= 7) break;

      const anchor = c.anchor;
      if (!anchor) continue;
      const idx = contentLC.indexOf(anchor.toLowerCase());
      if (idx === -1) continue;

      // record link (first natural occurrence only)
      links.push({ title: c.title, slug: c.slug, anchor });
    }

    // Merge into frontmatter if changed
    const oldLinks = Array.isArray(p.data.internalLinks) ? p.data.internalLinks : [];
    const equal =
      oldLinks.length === links.length &&
      oldLinks.every((l: any, i: number) =>
        l.slug === links[i]?.slug && l.anchor === links[i]?.anchor && l.title === links[i]?.title
      );

    if (!equal) {
      p.data.internalLinks = links;
      savePost(p.path, p.data, p.content);
      changed++;
    }
  }

  process.stdout.write(JSON.stringify({ ok: true, scanned: posts.length, changed }, null, 2) + '\n');
}
