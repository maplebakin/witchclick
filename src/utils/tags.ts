import { slugify } from "../../shared/slugify.js";

export interface CanonicalTagRecord {
  canonical: string;
  label: string;
  aliases: string[];
  count: number;
}

export interface TagRouteEntry {
  routeTag: string;
  canonicalTag: string;
  label: string;
  redirectTo: string | null;
}

function decodeMaybe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeTagLabel(value: unknown): string {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const decoded = decodeMaybe(raw);
  return decoded.trim().replace(/\s+/g, " ");
}

export function canonicalizeTagSlug(value: unknown): string {
  const normalized = normalizeTagLabel(value).toLowerCase();
  return slugify(normalized);
}

export function canonicalTagHref(value: unknown): string {
  const slug = canonicalizeTagSlug(value);
  return `/tag/${slug}`;
}

export function tagsFromFrontmatter(data: Record<string, unknown> | null | undefined): string[] {
  if (!data) return [];
  const raw = Array.isArray((data as any).tags)
    ? ((data as any).tags as unknown[])
    : typeof (data as any).tags === "string"
      ? String((data as any).tags).split(",")
      : [];
  return raw
    .map((tag) => normalizeTagLabel(tag))
    .filter(Boolean);
}

function normalizeLegacyTagSegment(value: string): string {
  return value.toLowerCase();
}

function isSafeRouteTag(value: string): boolean {
  if (!value) return false;
  return !value.includes("/");
}

export function buildCanonicalTagRecords(posts: Array<{ data?: Record<string, unknown> | null }>): CanonicalTagRecord[] {
  const map = new Map<string, { label: string; aliases: Set<string>; count: number }>();

  for (const post of posts) {
    const tags = tagsFromFrontmatter(post.data ?? {});
    for (const tag of tags) {
      const canonical = canonicalizeTagSlug(tag);
      if (!canonical) continue;

      if (!map.has(canonical)) {
        map.set(canonical, { label: tag, aliases: new Set<string>(), count: 0 });
      }

      const entry = map.get(canonical);
      if (!entry) continue;
      entry.count += 1;

      const legacy = normalizeLegacyTagSegment(tag);
      if (isSafeRouteTag(legacy) && legacy !== canonical) {
        entry.aliases.add(legacy);
      }
    }
  }

  return Array.from(map.entries())
    .map(([canonical, entry]) => ({
      canonical,
      label: entry.label,
      aliases: Array.from(entry.aliases).sort(),
      count: entry.count,
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}

export function buildTagRouteEntries(posts: Array<{ data?: Record<string, unknown> | null }>): TagRouteEntry[] {
  const records = buildCanonicalTagRecords(posts);
  const entries: TagRouteEntry[] = [];

  for (const record of records) {
    entries.push({
      routeTag: record.canonical,
      canonicalTag: record.canonical,
      label: record.label,
      redirectTo: null,
    });

    for (const alias of record.aliases) {
      entries.push({
        routeTag: alias,
        canonicalTag: record.canonical,
        label: record.label,
        redirectTo: canonicalTagHref(record.canonical),
      });
    }
  }

  return entries;
}
