import { readSettings, type SiteSettings } from "./settings";

export type SpoonLevel = "low" | "medium" | "high";

const SPOON_LEVELS: readonly SpoonLevel[] = ["low", "medium", "high"];

export interface AugmentedPost {
  data: Record<string, any>;
  tldr?: string;
  spoons?: SpoonLevel;
}

export interface AugmentedCurse {
  frontmatter: Record<string, any>;
  tldr?: string;
  spoons?: SpoonLevel;
  totalTime?: string;
}

export interface CurseSection {
  label: string;
  content: string;
}

type AutoConfig = {
  autoSummaries: boolean;
  autoSpoons: boolean;
};

function getAutoConfig(settings?: SiteSettings): AutoConfig {
  const source = settings ?? readSettings();
  return {
    autoSummaries: source.autoSummaries !== false,
    autoSpoons: source.autoSpoons !== false,
  };
}

export function normalizeSpoonLevel(value: unknown): SpoonLevel | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return (SPOON_LEVELS as readonly string[]).includes(normalized)
    ? (normalized as SpoonLevel)
    : undefined;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\!\[[^\]]*\]\([^\)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#$>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?…]?/g) ?? [];
  return matches.map((part) => part.trim()).filter(Boolean);
}

function clampText(text: string, limit = 220): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  const truncated = trimmed.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(" ");
  const safe = (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated).trim();
  if (!safe) return trimmed.slice(0, limit).trim();
  return /[.!?…]$/.test(safe) ? safe : `${safe}…`;
}

function deriveTldr(
  body: string,
  {
    existing,
    description,
    settings,
  }: { existing?: unknown; description?: unknown; settings?: SiteSettings }
): string | undefined {
  const manual = typeof existing === "string" ? existing.trim() : "";
  if (manual) return manual;

  const { autoSummaries } = getAutoConfig(settings);
  if (!autoSummaries) return undefined;

  const descText = typeof description === "string" ? description.trim() : "";
  let candidate = descText;

  if (!candidate) {
    const sentences = splitIntoSentences(stripMarkdown(body));
    const [firstSentence, secondSentence] = sentences;
    if (!firstSentence) return undefined;
    candidate = firstSentence;
    if (candidate.length < 120 && secondSentence) {
      candidate = `${candidate} ${secondSentence}`.trim();
    }
  }

  const normalized = clampText(candidate);
  return normalized || undefined;
}

function inferHeadingDensity(wordCount: number, markdown: string): number {
  const headings = markdown.match(/^#+\s+/gm) ?? [];
  if (!headings.length) return Number.POSITIVE_INFINITY;
  return wordCount / headings.length;
}

function inferPostSpoons(
  body: string,
  {
    existing,
    settings,
  }: { existing?: unknown; settings?: SiteSettings }
): SpoonLevel | undefined {
  const manual = normalizeSpoonLevel(existing);
  if (manual) return manual;

  const { autoSpoons } = getAutoConfig(settings);
  if (!autoSpoons) return undefined;

  const plain = stripMarkdown(body);
  const words = plain.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let levelIndex = 0;
  if (wordCount > 1400) {
    levelIndex = 2;
  } else if (wordCount > 700) {
    levelIndex = 1;
  }

  const density = inferHeadingDensity(wordCount, body);
  if (Number.isFinite(density)) {
    if (density <= 180 && levelIndex > 0) {
      levelIndex -= 1;
    } else if (density >= 600 && levelIndex < 2) {
      levelIndex += 1;
    }
  }

  return SPOON_LEVELS[levelIndex];
}

function countListItems(markdown: string): number {
  const matches = markdown.match(/^\s*(?:\d+\.|[-*+])\s+/gm) ?? [];
  return matches.length;
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.toLowerCase());
}

function inferCurseSpoons(
  markdown: string,
  sections: CurseSection[],
  tags: string[],
  {
    existing,
    settings,
  }: { existing?: unknown; settings?: SiteSettings }
): SpoonLevel | undefined {
  const manual = normalizeSpoonLevel(existing);
  if (manual) return manual;

  const { autoSpoons } = getAutoConfig(settings);
  if (!autoSpoons) return undefined;

  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.some((tag) => /(quick|5\s*-?min|one-?page|mini|micro)/.test(tag))) {
    return "low";
  }

  let baseIndex = 0;
  const stepCount = countListItems(markdown);
  if (stepCount > 6) {
    baseIndex = 2;
  } else if (stepCount >= 3) {
    baseIndex = 1;
  }

  const ingredientSections = sections.filter((section) =>
    /ingredient|material|supply|tools|gather/i.test(section.label)
  );
  let ingredientCount = 0;
  for (const section of ingredientSections) {
    ingredientCount += countListItems(section.content);
  }
  if (ingredientCount >= 8) {
    baseIndex = Math.max(baseIndex, 2);
  } else if (ingredientCount >= 4) {
    baseIndex = Math.max(baseIndex, 1);
  }

  const plain = stripMarkdown(markdown);
  if (/(hour|hours|day|days|week|weeks)/i.test(plain)) {
    baseIndex = Math.min(2, baseIndex + 1);
  }

  if (normalizedTags.some((tag) => /(multi\s*-?day|ceremonial|ceremony)/.test(tag))) {
    baseIndex = 2;
  }

  return SPOON_LEVELS[baseIndex];
}

function inferTotalTime(markdown: string): string | undefined {
  const matches = Array.from(
    markdown.matchAll(/(\d+(?:\.\d+)?)(?:\s*-\s*\d+(?:\.\d+)?)?\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)/gi)
  );
  if (matches.length === 0) return undefined;

  let totalMinutes = 0;
  for (const match of matches) {
    const value = Number.parseFloat(match[1] ?? "");
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = (match[2] ?? "").toLowerCase();
    if (/(week)/.test(unit)) {
      totalMinutes += value * 7 * 24 * 60;
    } else if (/(day)/.test(unit)) {
      totalMinutes += value * 24 * 60;
    } else if (/(hour|hr)/.test(unit)) {
      totalMinutes += value * 60;
    } else {
      totalMinutes += value;
    }
  }

  if (totalMinutes <= 0) return undefined;

  let remaining = Math.round(totalMinutes);
  const weeks = Math.floor(remaining / (7 * 24 * 60));
  remaining -= weeks * 7 * 24 * 60;
  const days = Math.floor(remaining / (24 * 60));
  remaining -= days * 24 * 60;
  const hours = Math.floor(remaining / 60);
  remaining -= hours * 60;
  const minutes = remaining;

  let iso = "P";
  if (weeks > 0) {
    iso += `${weeks}W`;
  }
  if (days > 0) {
    iso += `${days}D`;
  }
  if (hours > 0 || minutes > 0) {
    iso += "T";
    if (hours > 0) iso += `${hours}H`;
    if (minutes > 0) iso += `${minutes}M`;
  }

  return iso.length > 1 ? iso : undefined;
}

export function augmentPost(
  data: Record<string, any>,
  content: string,
  settings?: SiteSettings
): AugmentedPost {
  const working = { ...data };

  const existingTldr =
    typeof working.tldr === "string"
      ? working.tldr
      : typeof working.tldrSummary === "string"
        ? working.tldrSummary
        : undefined;
  const descriptionCandidate =
    typeof working.description === "string"
      ? working.description
      : typeof working.metaDescription === "string"
        ? working.metaDescription
        : typeof working.excerpt === "string"
          ? working.excerpt
          : undefined;

  const tldr = deriveTldr(content, {
    existing: existingTldr,
    description: descriptionCandidate,
    settings,
  });

  if (tldr) {
    working.tldr = tldr;
  }

  const existingSpoons =
    working.spoons ?? working.spoonLevel ?? working.spoon_level ?? working.spoon;

  const spoons = inferPostSpoons(content, { existing: existingSpoons, settings });
  if (spoons) {
    working.spoons = spoons;
    if (!working.spoonLevel) {
      working.spoonLevel = spoons;
    }
  }

  return { data: working, tldr, spoons };
}

export function augmentCurse(
  frontmatter: Record<string, any>,
  markdown: string,
  sections: CurseSection[],
  tags: string[],
  settings?: SiteSettings
): AugmentedCurse {
  const working = { ...frontmatter };
  const existingTldr = typeof working.tldr === "string" ? working.tldr : undefined;
  const descriptionCandidate =
    typeof working.description === "string"
      ? working.description
      : typeof working.summary === "string"
        ? working.summary
        : undefined;

  const tldr = deriveTldr(markdown, {
    existing: existingTldr,
    description: descriptionCandidate,
    settings,
  });

  if (tldr) {
    working.tldr = tldr;
  }

  const spoons = inferCurseSpoons(markdown, sections, tags, {
    existing: working.spoons ?? working.spoonLevel,
    settings,
  });
  if (spoons) {
    working.spoons = spoons;
    if (!working.spoonLevel) {
      working.spoonLevel = spoons;
    }
  }

  const totalTime = inferTotalTime(markdown);

  return { frontmatter: working, tldr, spoons, totalTime };
}

export function summarizeMarkdown(markdown: string): string {
  return clampText(stripMarkdown(markdown));
}
