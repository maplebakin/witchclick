import { loadAllPosts, toJournalListEntry } from "@/utils/posts";
import { readSiteSettings, normalizeSiteUrl } from "@/utils/site";

export async function GET() {
  const settings = readSiteSettings();
  const site = normalizeSiteUrl(settings.siteUrl);
  const posts = loadAllPosts();

  const items = posts.map((post) => {
    const entry = toJournalListEntry(post);
    return {
      slug: entry.slug,
      title: entry.title,
      url: `${site}/journal/${entry.slug}`,
      date: entry.date,
      tags: entry.tags,
      summary: entry.summary,
    };
  });

  const feed = {
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
