import { loadAllPosts } from "../utils/posts";

export async function GET() {
  const posts = loadAllPosts();
  const items = posts.map((post) => {
    const data = post.data ?? {};
    const slug = post.slug;
    return {
      slug,
      title: String(data.title ?? post.title ?? slug),
      excerpt: String(data.excerpt ?? data.description ?? data.metaDescription ?? ""),
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  });

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
