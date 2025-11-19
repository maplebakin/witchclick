import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

import { augmentCurse, normalizeSpoonLevel, type SpoonLevel } from "./augment";

export interface LoadedCurse {
  slug: string;
  title: string;
  invocation: string;
  tags: string[];
  frontmatter: Record<string, any>;
  sections: {
    label: string;
    content: string;
  }[];
  tldr?: string;
  spoons?: SpoonLevel;
  totalTime?: string;
}

const curseFrontmatterSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    invocation: z.string().optional(),
    tags: z.array(z.string()).optional(),
    tldr: z.string().optional(),
    spoons: z.enum(["low", "medium", "high"]).optional(),
  })
  .catchall(z.unknown());

let cachedCurses: LoadedCurse[] | null = null;

const runtimeEnv =
  typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: Record<string, any> }).env ?? null
    : null;

const shouldCache = runtimeEnv ? Boolean(runtimeEnv.PROD) : process.env.NODE_ENV === "production";

function resolveCurseDirectory(): string | null {
  const cwd = process.cwd();
  const dir = path.join(cwd, "content", "white-magic-curses");
  try {
    if (fs.statSync(dir).isDirectory()) {
      return dir;
    }
  } catch {
    return null;
  }
  return dir;
}

function parseSections(body: string): LoadedCurse["sections"] {
  const sections: LoadedCurse["sections"] = [];
  const pattern = /(^|\n)##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|$)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const heading = match[2]?.trim() ?? '';
    const content = match[3]?.trim() ?? '';
    sections.push({ label: heading, content });
  }

  if (!sections.length && body.trim()) {
    sections.push({ label: 'Opening Reflection', content: body.trim() });
  }

  return sections;
}

export function loadAllCurses(): LoadedCurse[] {
  if (shouldCache && cachedCurses) return cachedCurses;
  const dir = resolveCurseDirectory();
  if (!dir) {
    if (shouldCache) cachedCurses = [];
    return [];
  }

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const curses = files.map((file) => {
    const fullPath = path.join(dir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(raw);
    const slug = String(data?.slug ?? file.replace(/\.md$/, "")).toLowerCase();

    const sections = parseSections(content ?? "");
    const parsed = curseFrontmatterSchema.safeParse(data ?? {});
    const frontmatter = parsed.success ? parsed.data : (data ?? {});
    const rawTags = Array.isArray(frontmatter?.tags)
      ? frontmatter.tags
      : Array.isArray(data?.tags)
        ? data.tags
        : [];
    const tags = rawTags.map((tag: unknown) => String(tag));

    const augmented = augmentCurse(frontmatter ?? {}, content ?? "", sections, tags);
    const finalFrontmatter = augmented.frontmatter;
    const finalTags = Array.isArray(finalFrontmatter?.tags)
      ? finalFrontmatter.tags.map((tag: unknown) => String(tag))
      : tags;

    return {
      slug,
      title: String(finalFrontmatter?.title ?? data?.title ?? slug),
      invocation: String(finalFrontmatter?.invocation ?? data?.invocation ?? ""),
      tags: finalTags,
      frontmatter: finalFrontmatter,
      sections,
      tldr: augmented.tldr ?? (typeof finalFrontmatter?.tldr === "string" ? finalFrontmatter.tldr : undefined),
      spoons: normalizeSpoonLevel(finalFrontmatter?.spoons ?? finalFrontmatter?.spoonLevel ?? augmented.spoons) || undefined,
      totalTime: augmented.totalTime,
    } satisfies LoadedCurse;
  });

  curses.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  if (shouldCache) {
    cachedCurses = curses;
    return cachedCurses;
  }

  return curses;
}

export function resetCurseCache() {
  cachedCurses = null;
}

export function getCurseBySlug(slug: string): LoadedCurse | null {
  const normalized = slug.toLowerCase();
  return loadAllCurses().find((curse) => curse.slug === normalized) ?? null;
}
