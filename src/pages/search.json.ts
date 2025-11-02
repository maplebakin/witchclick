import { loadAllPosts, toJournalListEntry } from "@/utils/posts";

export const prerender = true;

export async function GET() {
  const posts = loadAllPosts();
  const items = posts.map((post) => {
    const entry = toJournalListEntry(post);
    return {
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags,
      date: entry.date,
    };
  });

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
