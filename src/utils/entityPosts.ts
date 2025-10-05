import { firstParagraph, loadAllPosts } from "./posts";

export type RelatedPost = {
  title: string;
  href: string;
  slug: string;
  publishedAt: string;
  excerpt?: string;
};

type EntityRef = { type: string; slug: string };

function normalizeEntityRef(candidate: unknown): EntityRef | null {
  if (!candidate) return null;

  if (typeof candidate === "string") {
    const [typePart = "", slugPart = ""] = candidate.split("/");
    const type = typePart.trim().toLowerCase();
    const slug = slugPart.trim().toLowerCase();
    if (type && slug) return { type, slug };
    return null;
  }

  if (typeof candidate === "object") {
    const maybeType = "type" in candidate ? String(candidate.type ?? "") : "";
    const maybeSlug = "slug" in candidate ? String(candidate.slug ?? "") : "";
    const type = maybeType.trim().toLowerCase();
    const slug = maybeSlug.trim().toLowerCase();
    if (type && slug) return { type, slug };
  }

  return null;
}

function derivePublishedAt(post: ReturnType<typeof loadAllPosts>[number]): string {
  const candidates = [post.data?.publishedAt, post.data?.pubDate, post.data?.date, post.date];

  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(+date)) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Returns the metadata for posts that reference the requested entity in their frontmatter.
 * The consumer can use this to populate related-post link lists without loading full content.
 */
export async function getPostsForEntity(
  type: string,
  slug: string
): Promise<RelatedPost[]> {
  const normalizedType = String(type ?? "").trim().toLowerCase();
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();
  if (!normalizedType || !normalizedSlug) return [];

  const posts = loadAllPosts();

  const matches = posts.filter((post) => {
    const entities = Array.isArray(post.data?.entities) ? post.data.entities : [];
    return entities
      .map(normalizeEntityRef)
      .filter((ref): ref is EntityRef => Boolean(ref))
      .some((ref) => ref.type === normalizedType && ref.slug === normalizedSlug);
  });

  return matches.map((post) => {
    const excerptFromFrontmatter =
      typeof post.data?.excerpt === "string" ? post.data.excerpt.trim() : "";
    const excerpt = excerptFromFrontmatter || firstParagraph(post.content);

    return {
      title: post.title,
      href: `/post/${post.slug}`,
      slug: post.slug,
      publishedAt: derivePublishedAt(post),
      excerpt: excerpt || undefined,
    } satisfies RelatedPost;
  });
}
