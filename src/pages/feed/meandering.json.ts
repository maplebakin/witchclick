// src/pages/feed/meandering.json.ts — JSON Feed v1 for field-note posts only
import { loadAllPosts, filterPostsByCategory, POST_CATEGORY_MEANDERING, getPostCategory } from '../../utils/posts';
import { readSettings } from '../../utils/settings';

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

  const allPosts = loadAllPosts();
  const meanderingPosts = filterPostsByCategory(allPosts, POST_CATEGORY_MEANDERING);

  const items = meanderingPosts.map((post) => {
    const data = post.data ?? {};
    const slug = post.slug;
    const url = `${site}/post/${slug}`;
    const category = getPostCategory(post);

    // Extract excerpt with fallbacks
    const excerpt = String(
      data.excerpt || data.description || data.metaDescription || ''
    ).trim();

    // Get tags and include category as a tag
    const tags = Array.isArray(data.tags) ? [...data.tags, category] : [category];

    return {
      id: url,
      url,
      title: post.title,
      content_text: excerpt,
      tags,
      date_published: post.date.toISOString(),
      _witchclick: {
        category,
      },
    };
  });

  const feed = {
    version: 'https://jsonfeed.org/version/1',
    title: `${settings.brandName || 'WitchClick'} — Field Notes`,
    home_page_url: `${site}/meanderings`,
    feed_url: `${site}/feed/meandering.json`,
    description: 'Field notes, essays, and symbolic reflections on meaning outside productivity metrics.',
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
