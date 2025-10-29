import { loadAllPosts, type LoadedPost } from "./posts";

export interface RecommendationCard {
  slug: string;
  title: string;
  href: string;
  excerpt?: string;
  readingMinutes?: number;
  spoonLevel?: string;
  score: number;
}

interface RecommendationInput {
  currentSlug: string;
  currentData?: Record<string, any>;
  limit?: number;
}

function normalizeStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function normalizeHubs(data: Record<string, any> | undefined | null): string[] {
  if (!data || typeof data !== "object") return [];
  const hubs = new Set<string>();
  normalizeStrings((data as any).hubs).forEach((hub) => hubs.add(hub));
  normalizeStrings((data as any).hubSlugs).forEach((hub) => hubs.add(hub));

  const primary = (data as any).primaryHub ?? (data as any).hub ?? (data as any).hubSlug;
  normalizeStrings(primary).forEach((hub) => hubs.add(hub));

  return Array.from(hubs);
}

function normalizeEntities(data: Record<string, any> | undefined | null): string[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as any).entities;
  const result = new Set<string>();

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry) continue;
      if (typeof entry === "string") {
        const value = entry.trim().toLowerCase();
        if (value) result.add(value);
        continue;
      }

      if (typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const type = typeof record.type === "string" ? record.type.trim().toLowerCase() : "";
        const slug = typeof record.slug === "string" ? record.slug.trim().toLowerCase() : "";
        const key = slug || (typeof record.name === "string" ? record.name.trim().toLowerCase() : "");
        if (type && key) {
          result.add(`${type}:${key}`);
        } else if (key) {
          result.add(key);
        }
      }
    }
  }

  return Array.from(result);
}

function extractInternalLinks(data: Record<string, any> | undefined | null): Set<string> {
  const links = new Set<string>();
  if (!data || typeof data !== "object") return links;
  const source = (data as any).internalLinks;
  if (!Array.isArray(source)) return links;

  for (const entry of source) {
    const href = typeof entry?.href === "string" ? entry.href.trim() : "";
    if (!href) continue;
    const match = href.match(/\/post\/(.+?)(?:[/?#]|$)/i);
    if (match && match[1]) {
      links.add(match[1].toLowerCase());
    }
  }

  return links;
}

function buildLinkFrequency(posts: LoadedPost[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const links = extractInternalLinks(post.data);
    for (const slug of links) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}

function getExcerpt(post: LoadedPost): string | undefined {
  const data = post.data ?? {};
  if (typeof data.excerpt === "string" && data.excerpt.trim()) return data.excerpt.trim();
  if (typeof data.metaDescription === "string" && data.metaDescription.trim()) return data.metaDescription.trim();
  if (typeof post.tldr === "string" && post.tldr.trim()) return post.tldr.trim();
  return undefined;
}

function getReadingMinutes(post: LoadedPost): number | undefined {
  const value = (post.data as any)?.readingMinutes;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getSpoonLevel(post: LoadedPost): string | undefined {
  const value = (post.data as any)?.spoons ?? (post.data as any)?.spoonLevel ?? post.spoons;
  if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  return undefined;
}

export function getRelatedPosts({ currentSlug, currentData, limit = 4 }: RecommendationInput): RecommendationCard[] {
  const posts = loadAllPosts();
  const normalizedSlug = currentSlug.toLowerCase();
  const current = posts.find((post) => post.slug === normalizedSlug) ?? null;
  const datasetCurrent = currentData ?? (current ? current.data : {});

  const currentHubs = normalizeHubs(datasetCurrent);
  const currentEntities = normalizeEntities(datasetCurrent);
  const currentTags = normalizeStrings((datasetCurrent as any)?.tags);
  const currentLinks = extractInternalLinks(datasetCurrent);

  const linkFrequency = buildLinkFrequency(posts);

  const recommendations = posts
    .filter((post) => post.slug !== normalizedSlug)
    .map((post) => {
      const hubs = normalizeHubs(post.data);
      const entities = normalizeEntities(post.data);
      const tags = normalizeStrings((post.data as any)?.tags);
      const inbound = linkFrequency.get(post.slug) ?? 0;

      const sharedHubs = currentHubs.filter((hub) => hubs.includes(hub));
      const sharedEntities = currentEntities.filter((entity) => entities.includes(entity));
      const sharedTags = currentTags.filter((tag) => tags.includes(tag));

      const hubScore = sharedHubs.length > 0 ? 60 + (sharedHubs.length - 1) * 10 : 0;
      const entityScore = sharedEntities.length * 25;
      const tagScore = sharedTags.length * 6;
      const inboundScore = Math.min(inbound, 6) * 4;
      const crossLinkScore = currentLinks.has(post.slug) ? 18 : 0;
      const recencyScore = Math.max(0, Math.round((Date.now() - post.date.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const freshnessPenalty = Math.min(recencyScore, 24);

      const score = hubScore + entityScore + tagScore + inboundScore + crossLinkScore - freshnessPenalty;

      return {
        slug: post.slug,
        title: post.title,
        href: `/post/${post.slug}`,
        excerpt: getExcerpt(post),
        readingMinutes: getReadingMinutes(post),
        spoonLevel: getSpoonLevel(post),
        score,
        date: post.date.getTime(),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.date - a.date;
    });

  const filtered = recommendations.filter((item) => item.score > 0);
  const baseline = filtered.length > 0 ? filtered : recommendations;

  return baseline.slice(0, limit).map(({ date, ...item }) => item);
}
