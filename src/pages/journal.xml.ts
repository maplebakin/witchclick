import { loadAllPosts, toJournalListEntry } from "@/utils/posts";
import { readSiteSettings, normalizeSiteUrl } from "@/utils/site";

const DESCRIPTION = "Latest WitchClick journal entries.";
const MAX_ITEMS = 20;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET() {
  const settings = readSiteSettings();
  const site = normalizeSiteUrl(settings.siteUrl);
  const brandName = settings.brandName ?? "WitchClick";

  const posts = loadAllPosts();
  const entries = posts.map(toJournalListEntry).slice(0, MAX_ITEMS);

  const channelItems = entries
    .map((entry) => {
      const url = `${site}/journal/${entry.slug}`;
      const pubDate = entry.date ? new Date(entry.date) : null;
      const pubDateValue = pubDate && !Number.isNaN(+pubDate) ? pubDate.toUTCString() : null;

      const lines = [
        "    <item>",
        `      <title>${escapeXml(entry.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid>${url}</guid>`,
      ];

      if (pubDateValue) {
        lines.push(`      <pubDate>${pubDateValue}</pubDate>`);
      }

      if (entry.summary) {
        lines.push(`      <description>${escapeXml(entry.summary)}</description>`);
      }

      lines.push("    </item>");
      return lines.join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${brandName} — Journal`)}</title>
    <link>${site}/journal</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${channelItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
