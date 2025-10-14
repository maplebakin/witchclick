import fs from "node:fs";
import path from "node:path";

export interface DownloadEntry {
  id: string;
  slug: string;
  name: string;
  summary: string;
  price?: string;
  currency?: string;
  url?: string;
  file?: string;
  cover?: string;
  features: string[];
  tags: string[];
  rel?: string;
  href: string;
  isExternal: boolean;
}

let cachedDownloads: DownloadEntry[] | null = null;

const runtimeEnv =
  typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, any> }).env ?? null
    : null;

const shouldCache = runtimeEnv ? Boolean(runtimeEnv.PROD) : process.env.NODE_ENV === "production";

function downloadsDir(): string | null {
  const dir = path.join(process.cwd(), "content", "downloads");
  try {
    if (fs.statSync(dir).isDirectory()) {
      return dir;
    }
  } catch {
    return null;
  }
  return dir;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function deriveSlug(fileName: string, data: Record<string, unknown>): { slug: string; id: string } {
  const rawSlug = normalizeString(data.slug ?? data.id ?? "");
  if (rawSlug) {
    const slug = rawSlug.toLowerCase();
    return { slug, id: rawSlug };
  }

  const base = fileName.replace(/\.json$/i, "");
  const normalized = base.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return { slug: normalized || base.toLowerCase(), id: normalized || base };
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

function normalizeFilePath(raw: unknown, slug: string): string {
  const value = normalizeString(raw);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  const normalized = value.replace(/\\/g, "/");
  const fileName = path.basename(normalized) || `${slug}.pdf`;
  return `/downloads/${fileName}`;
}

function normalizeCoverPath(raw: unknown): string {
  const value = normalizeString(raw);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  const normalized = value.replace(/\\/g, "/");
  return `/${normalized.replace(/^\/+/, "")}`;
}

function toDownloadEntry(file: string, data: Record<string, unknown>): DownloadEntry | null {
  const { slug, id } = deriveSlug(file, data);
  const name = normalizeString(data.name ?? slug);
  const summary = normalizeString(data.summary ?? "");
  if (!name) return null;

  const url = normalizeString(data.url ?? "");
  const fileHref = normalizeFilePath(data.file, slug);
  const href = url || fileHref;
  if (!href) return null;

  const price = normalizeString(data.price ?? "");
  const currency = normalizeString(data.currency ?? "");
  const features = normalizeArray(data.features);
  const tags = normalizeArray(data.tags);
  const cover = normalizeCoverPath(data.cover);
  const rel = normalizeString(data.rel ?? "");

  return {
    id,
    slug,
    name,
    summary,
    price: price || undefined,
    currency: currency || undefined,
    url: url || undefined,
    file: fileHref || undefined,
    cover: cover || undefined,
    features,
    tags,
    rel: rel || undefined,
    href,
    isExternal: /^https?:\/\//i.test(href),
  };
}

export function loadDownloads(): DownloadEntry[] {
  if (shouldCache && cachedDownloads) return cachedDownloads;

  const dir = downloadsDir();
  if (!dir) {
    if (shouldCache) cachedDownloads = [];
    return [];
  }

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name);

  const entries = files
    .map((file) => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return toDownloadEntry(file, parsed);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[downloads] Failed to read ${file}:`, error);
        }
        return null;
      }
    })
    .filter((entry): entry is DownloadEntry => Boolean(entry));

  entries.sort((a, b) => a.name.localeCompare(b.name));

  if (shouldCache) {
    cachedDownloads = entries;
    return cachedDownloads;
  }

  return entries;
}

export function resetDownloadsCache() {
  cachedDownloads = null;
}

export function getDownloadBySlug(slugOrId: string): DownloadEntry | null {
  if (!slugOrId) return null;
  const normalized = slugOrId.trim().toLowerCase();
  if (!normalized) return null;

  const downloads = loadDownloads();
  return (
    downloads.find((download) => download.slug === normalized) ||
    downloads.find((download) => download.id.toLowerCase() === normalized) ||
    null
  );
}
