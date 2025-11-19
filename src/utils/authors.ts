import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const AuthorLinkSchema = z
  .object({
    title: z.string().min(1, "Link title is required"),
    url: z
      .string()
      .refine((link) => {
        try {
          new URL(link);
          return true;
        } catch {
          return false;
        }
      }, { message: "Link must be a valid URL" }),
    rel: z.string().optional(),
  })
  .strict();

const AuthorSchema = z
  .object({
    slug: z.string().min(1, "Author slug is required"),
    name: z.string().min(1, "Author name is required"),
    title: z.string().optional(),
    pronouns: z.string().optional(),
    bio: z.string().optional(),
    headshot: z.string().optional(),
    focus: z.string().optional(),
    links: z.array(AuthorLinkSchema).default([]),
    specialties: z.array(z.string()).default([]),
    availability: z.string().optional(),
  })
  .catchall(z.unknown());

export type AuthorProfile = z.infer<typeof AuthorSchema>;

const runtimeEnv =
  typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, any> }).env ?? null
    : null;

const shouldCache = runtimeEnv ? Boolean(runtimeEnv.PROD) : process.env.NODE_ENV === "production";

let cachedAuthors: AuthorProfile[] | null = null;
let cachedKey = "";

function authorsDirectory(): string {
  return path.join(process.cwd(), "content", "authors");
}

function computeCacheKey(dir: string, files: string[]): string {
  if (!files.length) return `${dir}::empty`;
  try {
    const parts = files.map((file) => {
      const stat = fs.statSync(path.join(dir, file));
      return `${file}:${stat.mtimeMs}`;
    });
    return `${dir}::${parts.join("|")}`;
  } catch {
    return `${dir}::uncached`;
  }
}

function normalizeAuthorRecord(record: unknown): AuthorProfile | null {
  try {
    return AuthorSchema.parse(record);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[authors] Unable to parse author record", error);
    }
    return null;
  }
}

export function normalizeAuthorSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function loadAuthorFiles(): AuthorProfile[] {
  const dir = authorsDirectory();
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name);
  const nextKey = computeCacheKey(dir, files);

  if (shouldCache && cachedAuthors && cachedKey === nextKey) {
    return cachedAuthors;
  }

  const authors = files
    .map((file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        const parsed = JSON.parse(raw);
        const profile = normalizeAuthorRecord(parsed);
        return profile;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[authors] Failed to read ${file}:`, error);
        }
        return null;
      }
    })
    .filter((profile): profile is AuthorProfile => Boolean(profile))
    .map((profile) => ({ ...profile, slug: normalizeAuthorSlug(profile.slug || profile.name) }));

  if (shouldCache) {
    cachedAuthors = authors;
    cachedKey = nextKey;
  }

  return authors;
}

export function loadAuthors(): AuthorProfile[] {
  return loadAuthorFiles();
}

export function getAuthorBySlug(slug: string): AuthorProfile | null {
  const normalized = normalizeAuthorSlug(slug);
  return loadAuthorFiles().find((author) => normalizeAuthorSlug(author.slug) === normalized) ?? null;
}

export function listAuthorSlugs(): string[] {
  return loadAuthorFiles().map((author) => author.slug);
}

export function resetAuthorCache() {
  cachedAuthors = null;
  cachedKey = "";
}
