import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { fileURLToPath } from "node:url";

export interface RitualLabStep {
  title: string;
  duration?: string;
  description: string;
}

export interface RitualLabEntry {
  slug: string;
  title: string;
  summary?: string;
  intents: string[];
  tools: string[];
  durationMinutes?: number;
  tags: string[];
  materials?: string[];
  steps: RitualLabStep[];
}

interface RawRitualFrontmatter {
  labRitual?: {
    intents?: string[];
    tools?: string[];
    durationMinutes?: number;
    tags?: string[];
    materials?: string[];
    summary?: string;
  };
  steps?: (
    | {
        title?: string;
        description?: string;
        duration?: string;
      }
    | null
    | undefined
  )[];
  title?: string;
  slug?: string;
  summary?: string;
  excerpt?: string;
  tags?: string[];
}

const postsDirectory = fileURLToPath(new URL("../../content/posts", import.meta.url));

function walkMarkdownFiles(directory: string, results: string[] = []): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(fullPath, results);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0)
    .map((item) => item.toLowerCase());
}

function coerceDurationMinutes(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = parseInt(value, 10);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

function parseSteps(steps: RawRitualFrontmatter["steps"], body: string): RitualLabStep[] {
  if (Array.isArray(steps) && steps.length > 0) {
    return steps
      .map((step) => {
        if (!step) return null;
        const title = normalizeText(step.title);
        const description = normalizeText(step.description);
        if (!title && !description) return null;
        return {
          title,
          description,
          duration: normalizeText(step.duration) || undefined,
        } satisfies RitualLabStep;
      })
      .filter((step): step is RitualLabStep => Boolean(step && (step.title || step.description)));
  }

  // Fallback: derive steps from markdown body bullet lists separated by blank lines.
  const rawSteps = body
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return rawSteps.map((chunk, index) => ({
    title: `Step ${index + 1}`,
    description: chunk,
  }));
}

export function loadRitualLabEntries(): RitualLabEntry[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const files = walkMarkdownFiles(postsDirectory);

  return files
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      const data = parsed.data as RawRitualFrontmatter;
      const labMeta = data.labRitual;
      if (!labMeta) return null;

      const slug = normalizeText(data.slug) || path.basename(filePath, path.extname(filePath));
      const title = normalizeText(data.title) || slug.replace(/[-_]/g, " ");
      const intents = normalizeStringArray(labMeta.intents);
      const tools = normalizeStringArray(labMeta.tools);
      const tags = [
        ...new Set([
          ...normalizeStringArray(data.tags),
          ...normalizeStringArray(labMeta.tags),
        ]),
      ];
      const durationMinutes = coerceDurationMinutes(labMeta.durationMinutes);
      const materials = normalizeStringArray(labMeta.materials);
      const summary =
        normalizeText(labMeta.summary) || normalizeText(data.summary) || normalizeText(data.excerpt);
      const steps = parseSteps(data.steps, parsed.content ?? "");

      return {
        slug,
        title,
        summary: summary || undefined,
        intents,
        tools,
        tags,
        durationMinutes,
        materials: materials.length > 0 ? materials : undefined,
        steps,
      } satisfies RitualLabEntry;
    })
    .filter((entry): entry is RitualLabEntry => Boolean(entry));
}

export interface RitualLabRequest {
  intent?: string;
  tools?: string[];
  maxMinutes?: number;
}

export interface RitualLabPlan {
  primary?: RitualLabEntry;
  alternates: RitualLabEntry[];
}

function scoreRitual(entry: RitualLabEntry, request: RitualLabRequest): number {
  let score = 0;
  if (request.intent && entry.intents.includes(request.intent.toLowerCase())) {
    score += 5;
  }

  if (request.tools && request.tools.length > 0) {
    const matched = request.tools.filter((tool) => entry.tools.includes(tool.toLowerCase()));
    score += matched.length * 2;
  }

  if (
    typeof request.maxMinutes === "number" &&
    typeof entry.durationMinutes === "number" &&
    entry.durationMinutes <= request.maxMinutes
  ) {
    score += 3;
  }

  // Reward solo/sound style matches when request uses those keywords.
  if (request.tools) {
    if (request.tools.includes("sound") && entry.tags.includes("sound")) score += 1;
    if (request.tools.includes("nosound") && entry.tags.includes("nosound")) score += 1;
    if (request.tools.includes("group") && entry.tags.includes("group")) score += 1;
    if (request.tools.includes("solo") && entry.tags.includes("solo")) score += 1;
  }

  return score;
}

export function createRitualLabPlan(
  entries: RitualLabEntry[],
  request: RitualLabRequest,
): RitualLabPlan {
  if (entries.length === 0) return { alternates: [] };

  const decorated = entries
    .map((entry) => ({ entry, score: scoreRitual(entry, request) }))
    .sort((a, b) => b.score - a.score || entryTitleSort(a.entry.title, b.entry.title));

  const [primaryMatch, ...rest] = decorated;
  return {
    primary: primaryMatch?.score ? primaryMatch.entry : undefined,
    alternates: rest.filter((item) => item.score > 0).map((item) => item.entry),
  };
}

function entryTitleSort(a: string, b: string): number {
  return a.localeCompare(b, "en-US", { sensitivity: "base" });
}

export function collectUnique(values: string[][]): string[] {
  return Array.from(new Set(values.flat().filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
