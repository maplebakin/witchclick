import { loadAllPosts, firstParagraph, getPostCategory } from "../utils/posts";
import { readAllEntities } from "../utils/entities.js";
import { loadAllCurses } from "../utils/curses";

export const prerender = true;

export async function GET() {
  const posts = loadAllPosts();
  const postItems = posts.map((post) => {
    const data = post.data ?? {};
    const slug = post.slug;
    const category = getPostCategory(post);
    const rawExcerpt =
      data.excerpt ?? data.description ?? data.metaDescription ?? firstParagraph(post.content ?? "");

    return {
      slug,
      href: `/post/${slug}`,
      type: category === "meandering" ? "Field note" : "Article",
      title: String(data.title ?? post.title ?? slug),
      excerpt: String(rawExcerpt ?? ""),
      tags: Array.isArray(data.tags) ? data.tags : [],
      category, // Include category for client-side filtering
    };
  });

  const entities = readAllEntities({ includeUnpublished: false });
  const entityItems = Object.values(entities).flatMap((entries) =>
    (Array.isArray(entries) ? entries : []).map((entity: any) => ({
      slug: entity.slug,
      href: `/entities/${entity.type}/${entity.slug}`,
      type: "Grimoire",
      title: String(entity.name || entity.slug),
      excerpt: String(entity.summary || ""),
      tags: Object.values(entity.properties || {}).flatMap((value) =>
        Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : [],
      ),
      category: "entity",
    })),
  );

  const curseItems = loadAllCurses().map((curse) => ({
    slug: curse.slug,
    href: `/curses/${curse.slug}`,
    type: "Clean Cursing",
    title: curse.title,
    excerpt: curse.tldr || curse.invocation,
    tags: curse.tags,
    category: "curse",
  }));

  const items = [...postItems, ...entityItems, ...curseItems];

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
