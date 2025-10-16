// src/pages/feed.json.ts — JSON Feed v1 (drop‑in replacement)
// Fixes: handler must be `GET` (uppercase). Adds safe fallbacks & sorting.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

function readSettings() {
  try {
    const p = path.join(process.cwd(), 'content', 'settings.json');
    if (!fs.existsSync(p)) return { siteUrl: 'https://example.com' };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { siteUrl: 'https://example.com' };
  }
}

function normalizeSite(u: string) {
  try {
    const s = String(u || '').trim().replace(/\/$/, '');
    return s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s}`;
  } catch {
    return 'https://example.com';
  }
}

export async function GET() {
  const settings = readSettings();
  const site = normalizeSite(settings.siteUrl);

  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')) : [];

  const items = files.map((f) => {
    const full = path.join(postsDir, f);
    const raw = fs.readFileSync(full, 'utf8');
    const { data, content } = matter(raw);

    const slug = (data?.slug ? String(data.slug) : f.replace(/\.md$/, '')).toLowerCase();
    const url = `${site}/post/${slug}`;

    // choose best available date; fall back to file mtime
    const frontDates = [data?.publishedAt, data?.pubDate, data?.date, data?.updatedAt].filter(Boolean) as string[];
    let publishedAt: string | null = null;
    if (frontDates.length) {
      const firstDate = frontDates[0];
      if (firstDate) {
        const d = new Date(firstDate);
        if (!Number.isNaN(+d)) publishedAt = d.toISOString();
      }
    }
    if (!publishedAt) {
      try { publishedAt = fs.statSync(full).mtime.toISOString(); } catch {}
    }

    // first sentence as fallback excerpt
    const excerpt = String(
      data?.excerpt || data?.description || (content || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\-]+/g, ' ').split(/\s+/).slice(0, 40).join(' ')
    ).trim();

    return {
      id: url,
      url,
      title: String(data?.title || slug),
      content_text: excerpt,
      tags: Array.isArray(data?.tags) ? data.tags : [],
      date_published: publishedAt || undefined,
    };
  }).sort((a, b) => {
    const da = a.date_published ? +new Date(a.date_published) : 0;
    const db = b.date_published ? +new Date(b.date_published) : 0;
    return db - da;
  });

  const feed = {
    version: 'https://jsonfeed.org/version/1',
    title: settings.brandName || 'WitchClick',
    home_page_url: site,
    feed_url: `${site}/feed.json`,
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
