/** Select a featured story and a short reading shelf without repeating story titles.
 *
 * Publishing may assign new slugs to near-identical revisions. This is a
 * presentation safeguard, not a substitute for resolving duplicate publication.
 */
export function selectDistinctHomeStories<T extends { slug: string; title: string }>(
  posts: readonly T[],
  recentLimit = 6,
): { featured: T | null; recent: T[] } {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const post of posts) {
    const titleKey = post.title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
    const key = titleKey || post.slug.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(post);
    if (picked.length >= Math.max(1, recentLimit + 1)) break;
  }
  return { featured: picked[0] ?? null, recent: picked.slice(1) };
}
