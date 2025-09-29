import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface LoadedPost {
  slug: string;
  title: string;
  data: Record<string, any>;
  content: string;
  date: Date;
}

let cachedPosts: LoadedPost[] | null = null;

const runtimeEnv =
  typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, any> }).env ?? null
    : null;

const shouldCache = runtimeEnv ? Boolean(runtimeEnv.PROD) : process.env.NODE_ENV === "production";

function resolvePostDirectory(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "src", "content", "posts"),
    path.join(cwd, "content", "posts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return null;
}

function deriveSlug(file: string, data: Record<string, any>): string {
  const fmSlug = data?.slug ? String(data.slug) : "";
  return (fmSlug || file.replace(/\.md$/, "")).toLowerCase();
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

  const dir = resolvePostDirectory();
  if (!dir) {
    if (shouldCache) cachedPosts = [];
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const posts = files.map((file) => {
    const fullPath = path.join(dir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(raw);
    const slug = deriveSlug(file, data ?? {});
    const date = deriveDate(fullPath, data ?? {});

    return {
      slug,
      title: String(data?.title ?? "Untitled"),
      data: data ?? {},
      content,
      date,
    } satisfies LoadedPost;
  });

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

  if (!paragraphs.length) return "";
  const first = paragraphs[0]
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
