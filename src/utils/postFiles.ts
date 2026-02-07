import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isValidSlug } from "../../shared/slugify.js";

export interface PostFileRecord {
  slug: string;
  fileName: string;
  filePath: string;
  data: Record<string, any>;
  content: string;
}

export function resolveCanonicalPostsDirectory(cwd = process.cwd()): string {
  return path.join(cwd, "src", "content", "posts");
}

export function listCanonicalPostFiles(postsDir = resolveCanonicalPostsDirectory()): string[] {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

export function getCanonicalPostDisplayPath(fileName: string): string {
  return `src/content/posts/${fileName}`;
}

export function normalizePostSlugInput(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  if (!isValidSlug(normalized)) return null;
  return normalized;
}

export function readPostFile(filePath: string): Omit<PostFileRecord, "slug" | "fileName"> & { slug?: string } {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = (parsed.data ?? {}) as Record<string, any>;
  const slug = typeof data.slug === "string" && data.slug.trim() ? data.slug.trim().toLowerCase() : undefined;
  return { data, content: parsed.content, filePath, slug };
}

export function readAllPostRecords(postsDir = resolveCanonicalPostsDirectory()): PostFileRecord[] {
  return listCanonicalPostFiles(postsDir).map((fileName) => {
    const filePath = path.join(postsDir, fileName);
    const parsed = readPostFile(filePath);
    return {
      slug: parsed.slug ?? fileName.replace(/\.md$/, "").toLowerCase(),
      fileName,
      filePath,
      data: parsed.data,
      content: parsed.content,
    };
  });
}

export function findPostRecordBySlug(slug: string, postsDir = resolveCanonicalPostsDirectory()): PostFileRecord | null {
  const normalized = normalizePostSlugInput(slug);
  if (!normalized) return null;

  const directFileName = `${normalized}.md`;
  const directPath = path.join(postsDir, directFileName);
  if (fs.existsSync(directPath)) {
    const parsed = readPostFile(directPath);
    return {
      slug: parsed.slug ?? normalized,
      fileName: directFileName,
      filePath: directPath,
      data: parsed.data,
      content: parsed.content,
    };
  }

  for (const record of readAllPostRecords(postsDir)) {
    if (record.slug === normalized) return record;
  }
  return null;
}
