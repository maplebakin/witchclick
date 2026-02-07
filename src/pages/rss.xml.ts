import { buildCanonicalUrl, getSiteOrigin, readSettings } from '../utils/settings';
import { loadAllPosts } from '../utils/posts';

type RssItem = {
  url: string;
  title: string;
  desc: string;
  pubDate?: string;
};

function derivePubDate(data: Record<string, any>, fallback: Date): string | undefined {
  const candidate = [data?.publishedAt, data?.pubDate, data?.date, data?.updatedAt].find(Boolean);
  if (candidate) {
    const date = new Date(String(candidate));
    if (!Number.isNaN(+date)) return date.toUTCString();
  }
  return Number.isNaN(+fallback) ? undefined : fallback.toUTCString();
}

function toRssItems(): RssItem[] {
  const settings = readSettings();
  const site = getSiteOrigin(settings, { strict: false }) || "https://example.com";

  return loadAllPosts()
    .map((post) => {
      const title = String(post.data?.title || post.title || post.slug);
      const desc = String(post.data?.excerpt || post.data?.description || post.content.slice(0, 280));
      const pubDate = derivePubDate(post.data ?? {}, post.date);
      const url = buildCanonicalUrl(settings, { path: `/post/${post.slug}` }) || `${site}/post/${post.slug}`;
      return { url, title, desc, pubDate };
    })
    .sort((a, b) => +new Date(b.pubDate || 0) - +new Date(a.pubDate || 0));
}

export async function GET() {
  const settings = readSettings();
  const site = getSiteOrigin(settings, { strict: false }) || "https://example.com";
  const items = toRssItems();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    ` <channel>\n` +
    ` <title>${escapeXml(settings.brandName || 'WitchClick')}</title>\n` +
    ` <link>${site}</link>\n` +
    ` <description>${escapeXml(settings.brandName || 'WitchClick')}</description>\n` +
    ` ${items.map(i => `\n <item>\n <title>${escapeXml(i.title)}</title>\n <link>${i.url}</link>\n <guid>${i.url}</guid>\n ${i.pubDate ? `<pubDate>${i.pubDate}</pubDate>` : ''}\n <description>${escapeXml(i.desc)}</description>\n </item>`).join('')}\n` +
    ` </channel>\n` +
    `</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

function escapeXml(s: string) {
  return s.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
