export type RelatedPost = {
  title: string;
  href: string;
  excerpt?: string;
};

/**
 * Placeholder helper that will eventually hydrate entity pages with supporting posts.
 * For now it returns an empty list so the UI can gracefully render fallback copy.
 */
export async function getPostsForEntity(
  type: string,
  slug: string
): Promise<RelatedPost[]> {
  void type;
  void slug;
  // TODO: Replace with content query that fetches posts referencing the entity.
  return [];
}
