import { loadAllPosts, firstParagraph } from "../utils/posts";

export const prerender = true;

export async function GET() {
  const posts = loadAllPosts();
  const items = posts.map((post) => {
    const data = post.data ?? {};
    const slug = post.slug;
    const rawExcerpt =
      data.excerpt ?? data.description ?? data.metaDescription ?? firstParagraph(post.content ?? "");

    return {
      slug,
      title: String(data.title ?? post.title ?? slug),
      excerpt: String(rawExcerpt ?? ""),
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  });

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
