import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

import { normalizeAuthorSlug } from "./authors";
import { augmentPost, normalizeSpoonLevel, type SpoonLevel } from "./augment";

// Simple Slugger class to replace marked.Slugger (removed in marked v16)
class Slugger {
  private seen: Record<string, number> = {};

  slug(text: string): string {
    let slug = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const originalSlug = slug;
    const count = this.seen[originalSlug] || 0;

    if (count > 0) {
      slug = `${originalSlug}-${count}`;
    }

    this.seen[originalSlug] = count + 1;
    return slug;
  }
}

export interface LoadedPost {
  slug: string;
  title: string;
  data: Record<string, any>;
  content: string;
  date: Date;
  tldr?: string;
  spoons?: SpoonLevel;
}

let cachedPosts: LoadedPost[] | null = null;

const runtimeEnv =
  typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, any> }).env ?? null
    : null;

const shouldCache = runtimeEnv ? Boolean(runtimeEnv.PROD) : process.env.NODE_ENV === "production";

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function directoryHasMarkdown(candidate: string): boolean {
  if (!isDirectory(candidate)) return false;

  try {
    return fs
      .readdirSync(candidate, { withFileTypes: true })
      .some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));
  } catch {
    return false;
  }
}

function resolvePostDirectory(): string | null {
  const cwd = process.cwd();
  const modern = path.join(cwd, "src", "content", "posts");
  const legacy = path.join(cwd, "content", "posts");

  if (directoryHasMarkdown(modern)) return modern;
  if (directoryHasMarkdown(legacy)) return legacy;
  if (isDirectory(modern)) return modern;
  if (isDirectory(legacy)) return legacy;

  return null;
}

function resolvePostDirectories(): string[] {
  const cwd = process.cwd();
  const modern = path.join(cwd, "src", "content", "posts");
  const legacy = path.join(cwd, "content", "posts");

  if (directoryHasMarkdown(modern)) {
    return [modern];
  }

  if (directoryHasMarkdown(legacy)) {
    return [legacy];
  }

  const dirs: string[] = [];

  if (isDirectory(modern)) dirs.push(modern);
  if (isDirectory(legacy)) dirs.push(legacy);

  return dirs;
}

function deriveSlug(file: string, data: Record<string, any>): string {
  const fmSlug = data?.slug ? String(data.slug) : "";
  return (fmSlug || file.replace(/\.md$/, "")).toLowerCase();
}

function isDraft(data: Record<string, any> | null | undefined): boolean {
  if (!data) return false;
  if (data.draft === true) return true;
  if (data.published === false) return true;
  return false;
}

function deriveDate(
  filePath: string,
  data: Record<string, any>
): Date {
  const candidates = [
    data?.publishedAt,
    data?.pubDate,
    data?.date,
    data?.updatedAt,
  ].filter(Boolean) as Array<string | number | Date>;

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(+date)) return date;
  }

  const stat = fs.statSync(filePath);
  return stat.mtime;
}

export function loadAllPosts(): LoadedPost[] {
  if (shouldCache && cachedPosts) return cachedPosts;

  const dirs = resolvePostDirectories();
  if (dirs.length === 0) {
    if (shouldCache) cachedPosts = [];
    return [];
  }

  const posts: LoadedPost[] = [];

  for (const dir of dirs) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);

    const dirPosts = files
      .map((file) => {
        const fullPath = path.join(dir, file);
        const raw = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(raw);
        const slug = deriveSlug(file, data ?? {});
        const date = deriveDate(fullPath, data ?? {});
        const augmented = augmentPost(data ?? {}, content);
        const postData = augmented.data;
        const tldr = typeof postData.tldr === "string" ? postData.tldr : augmented.tldr;
        const spoons = normalizeSpoonLevel(postData.spoons ?? postData.spoonLevel ?? augmented.spoons);

        return {
          slug,
          title: String(postData?.title ?? data?.title ?? "Untitled"),
          data: postData,
          content,
          date,
          tldr: tldr || undefined,
          spoons: spoons || undefined,
        } satisfies LoadedPost;
      })
      .filter((post) => !isDraft(post.data));

    posts.push(...dirPosts);
  }

  posts.sort((a, b) => +b.date - +a.date);
  if (shouldCache) {
    cachedPosts = posts;
    return cachedPosts;
  }

  return posts;
}

export function resetPostCache() {
  cachedPosts = null;
}

export function getPostBySlug(slug: string): LoadedPost | null {
  const normalized = slug.toLowerCase();
  return loadAllPosts().find((post) => post.slug === normalized) ?? null;
}

export function extractAuthorSlugs(data: Record<string, any> | null | undefined): string[] {
  if (!data || typeof data !== "object") return [];

  const authorsRaw: unknown[] = [];

  if (Array.isArray((data as any).authors)) {
    authorsRaw.push(...((data as any).authors as unknown[]));
  }

  if ((data as any).author) {
    authorsRaw.push((data as any).author);
  }

  const normalized = new Set<string>();

  for (const item of authorsRaw) {
    if (!item) continue;
    if (typeof item === "string") {
      const slug = normalizeAuthorSlug(item);
      if (slug) normalized.add(slug);
      continue;
    }

    if (typeof item === "object") {
      const record = item as Record<string, unknown>;
      if (typeof record.slug === "string" && record.slug.trim()) {
        normalized.add(normalizeAuthorSlug(record.slug));
        continue;
      }

      if (typeof record.name === "string" && record.name.trim()) {
        normalized.add(normalizeAuthorSlug(record.name));
      }
    }
  }

  return Array.from(normalized);
}

export function getPostsByAuthor(slug: string): LoadedPost[] {
  const target = normalizeAuthorSlug(slug);
  if (!target) return [];

  return loadAllPosts().filter((post) => {
    const authors = extractAuthorSlugs(post.data ?? {});
    return authors.includes(target);
  });
}

export function getPrevNext(slug: string): {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
} {
  const posts = loadAllPosts();
  const index = posts.findIndex((post) => post.slug === slug.toLowerCase());
  if (index === -1) return { prev: null, next: null };

  const prev = posts[index - 1] ?? null;
  const next = posts[index + 1] ?? null;
  return {
    prev: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  };
}

export interface HeadingOutlineItem {
  id: string;
  label: string;
  level: number;
}

export function extractHeadingOutline(
  markdown: string,
  { minLevel = 2, maxLevel = 3 }: { minLevel?: number; maxLevel?: number } = {},
): HeadingOutlineItem[] {
  if (!markdown) return [];

  const tokens = marked.lexer(markdown);
  const slugger = new Slugger();
  const results: HeadingOutlineItem[] = [];

  const clampLevel = (depth: number) => Math.min(Math.max(depth, 1), 6);

  const walk = (list: any[]) => {
    for (const token of list) {
      if (!token) continue;
      if (token.type === "heading") {
        const level = clampLevel(Number(token.depth ?? token.level ?? 0));
        if (level >= minLevel && level <= maxLevel) {
          const text = typeof token.text === "string" ? token.text.trim() : "";
          if (!text) continue;
          const id = slugger.slug(text);
          results.push({ id, label: text, level });
        }
      }

      if (Array.isArray((token as any).tokens)) {
        walk((token as any).tokens as any[]);
      }
    }
  };

  walk(tokens as any[]);
  return results;
}

export function estimateReadingMinutes(content: string): number {
  const words = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[#$>*_`~\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

export function firstParagraph(md: string): string {
  const withoutCode = md.replace(/```[\s\S]*?```/g, " ");
  const paragraphs = withoutCode
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const firstParagraph = paragraphs[0];
  if (!firstParagraph) return "";
  const first = firstParagraph
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return first.length > 200 ? `${first.slice(0, 197)}…` : first;
}

export function paginatePosts(page: number, pageSize: number): {
  totalPages: number;
  items: LoadedPost[];
} {
  const posts = loadAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    totalPages,
    items: posts.slice(start, start + pageSize),
  };
}

function extractImageSource(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";

  const record = value as Record<string, any>;
  const directKeys = ["src", "url", "href", "path"] as const;

  for (const key of directKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof record.image === "string" && record.image.trim()) {
    return record.image.trim();
  }

  if (record.image && typeof record.image === "object") {
    const nested = extractImageSource(record.image);
    if (nested) return nested;
  }

  return "";
}

function extractImageAlt(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";

  const record = value as Record<string, any>;
  const altKeys = ["alt", "text", "label", "title", "description"] as const;

  for (const key of altKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (record.image && typeof record.image === "object") {
    const nested = extractImageAlt(record.image);
    if (nested) return nested;
  }

  return "";
}

export function extractHeroImage(
  data: Record<string, any> | null | undefined,
): { src?: string; alt?: string } {
  if (!data || typeof data !== "object") return {};

  const heroCandidates = [
    (data as any).heroImage,
    (data as any).heroImageSrc,
    (data as any).heroImageUrl,
    (data as any).hero,
    (data as any).image,
    (data as any).cardImage,
  ];

  const src = heroCandidates
    .map((candidate) => extractImageSource(candidate))
    .find((value) => value.length > 0);

  const altCandidates = [
    (data as any).heroImageAlt,
    (data as any).heroAlt,
    (data as any).imageAlt,
    (data as any).cardImageAlt,
    (data as any).heroImage,
    (data as any).hero,
    (data as any).image,
    (data as any).cardImage,
  ];

  const alt = altCandidates
    .map((candidate) => extractImageAlt(candidate))
    .find((value) => value.length > 0);

  return {
    src: src || undefined,
    alt: alt || undefined,
  };
}

/**
 * Extract and format tag chips from post data
 * @param data Post frontmatter data
 * @param maxTags Maximum number of tags to return
 * @returns Array of formatted tag strings (e.g., ["#witchcraft", "#ritual"])
 */
export function extractTagChips(data: Record<string, any>, maxTags = 3): string[] {
  const tags = Array.isArray(data?.tags) ? data.tags : [];
  return tags
    .map((tag) => `#${String(tag ?? "").toLowerCase()}`)
    .filter((tag) => tag.length > 1)
    .slice(0, maxTags);
}
