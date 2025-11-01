import fs from "node:fs";
import path from "node:path";

export const REQUIRED_FIELDS = [
  "primary",
  "accent",
  "background",
  "fontSerif",
  "fontScript",
] as const;

export const OPTIONAL_FIELDS = [
  "textPrimary",
  "textHeading",
  "textMuted",
  "textSecondary",
  "textTertiary",
  "textStrong",
  "textHint",
  "textDisabled",
  "textBody",
  "textSubtle",
  "textAccent",
  "textAccentStrong",
  "inkBody",
  "inkStrong",
  "inkMuted",
  "linkColor",
  "colorMidnight",
  "colorNight",
  "colorIris",
  "colorAmethyst",
  "colorDusk",
  "colorGold",
  "colorRune",
  "colorFog",
  "colorInk",
  "colorMuted",
  "colorBorder",
  "colorBorderStrong",
  "colorOverlay",
  "colorOverlayStrong",
  "surfacePlain",
  "surfacePlainBorder",
  "cardPanelSurface",
  "cardPanelSurfaceStrong",
  "cardPanelBorder",
  "cardPanelBorderStrong",
  "cardPanelBorderSoft",
  "cardBadgeBg",
  "cardBadgeBorder",
  "cardBadgeText",
  "cardTagBg",
  "cardTagBorder",
  "cardTagText",
  "cardSpoonBg",
  "cardSpoonBorder",
  "cardSpoonText",
  "focusRingColor",
  "cardFocusOutline",
  "fontHeading",
  "fontAccent",
  "shadowSoft",
  "shadowStrong",
  "success",
  "warning",
  "error",
  "info",
  "entityCardBorder",
  "entityCardGlow",
  "entityCardHighlight",
  "entityCardSurfaceTop",
  "entityCardSurfaceBottom",
  "entityCardHeading",
  "entityCardText",
  "entityCardLabel",
  "entityCardCta",
  "entityCardCtaHover",
  "entityCardIcon",
  "entityCardIconShadow",
  "backgroundImage",
] as const;

export const ALL_FIELDS = [...new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS])] as const;

export type ThemeRequiredField = (typeof REQUIRED_FIELDS)[number];
export type ThemeOptionalField = (typeof OPTIONAL_FIELDS)[number];
export type ThemeField = (typeof ALL_FIELDS)[number];

export type ThemeSettings = Record<ThemeRequiredField, string> &
  Partial<Record<ThemeOptionalField, string>>;

export type ThemeMode = "midnight" | "dawn";

export interface ThemeDefinition extends ThemeSettings {
  slug: string;
  label: string;
  mode: ThemeMode;
}

export interface ActiveThemes {
  midnight: ThemeDefinition;
  dawn: ThemeDefinition;
}

const DEFAULT_THEME: ThemeSettings = {
  primary: "#6b21a8",
  accent: "#d9b2c4",
  background: "#faf7f5",
  fontSerif: "Literata",
  fontScript: "Parisienne",
  textPrimary: "#f4f1ff",
  textHeading: "#f8f3ff",
  textMuted: "#d9b2c4",
  linkColor: "#d9b2c4",
};

const DEFAULT_DAWN_THEME: ThemeSettings = {
  primary: "#9b86c8",
  accent: "#caa043",
  background: "#f6f0e8",
  fontSerif: "Literata",
  fontScript: "Parisienne",
  textPrimary: "#2c1b3d",
  textHeading: "#3a2854",
  textMuted: "#573f73",
  linkColor: "#caa043",
};

const THEMES_DIR = path.join(process.cwd(), "content", "themes");
const ACTIVE_FILE = path.join(THEMES_DIR, "active.json");
const LEGACY_FILE = path.join(process.cwd(), "content", "theme.json");

let cachedThemes: ActiveThemes | null = null;

export function getTheme(mode: ThemeMode = "midnight"): ThemeDefinition {
  const themes = getActiveThemes();
  return themes[mode];
}

export function getActiveThemes(): ActiveThemes {
  if (cachedThemes) return cachedThemes;

  const mapping = readActiveMapping();

  const midnight = readThemeDefinition(mapping.midnight ?? null, "midnight") ?? fallbackTheme("midnight");
  const dawn = readThemeDefinition(mapping.dawn ?? null, "dawn") ?? fallbackTheme("dawn");

  cachedThemes = { midnight, dawn };
  return cachedThemes;
}

export function resetThemeCache() {
  cachedThemes = null;
}

function readThemeDefinition(slug: string | null, expectedMode: ThemeMode): ThemeDefinition | null {
  if (!slug) return null;
  const filePath = path.join(THEMES_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const mode = raw.mode === "dawn" ? "dawn" : "midnight";
    const labelValue = typeof raw.label === "string" ? raw.label.trim() : "";
    const label = labelValue || toTitleCase(slug);
    const settingsSource = normalizeSettingsSource(raw.settings, raw);
    const merged = mergeTheme(settingsSource, filePath, mode === "dawn" ? DEFAULT_DAWN_THEME : DEFAULT_THEME);

    if (mode !== expectedMode) {
      return {
        ...merged,
        slug,
        label,
        mode: expectedMode,
      };
    }

    return {
      ...merged,
      slug,
      label,
      mode,
    };
  } catch {
    return null;
  }
}

function readActiveMapping(): Partial<Record<ThemeMode, string>> {
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf8")) as Record<string, unknown>;
    const midnight = typeof raw.midnight === "string" ? raw.midnight.trim() : "";
    const dawn = typeof raw.dawn === "string" ? raw.dawn.trim() : "";
    return {
      midnight: midnight || undefined,
      dawn: dawn || undefined,
    };
  } catch {
    return {};
  }
}

function fallbackTheme(mode: ThemeMode): ThemeDefinition {
  if (mode === "midnight") {
    try {
      const overrides = readThemeFile(LEGACY_FILE);
      const merged = mergeTheme(overrides, LEGACY_FILE, DEFAULT_THEME);
      return {
        ...merged,
        slug: "legacy-midnight",
        label: "Legacy Midnight",
        mode: "midnight",
      };
    } catch {
      // fall through to default below
    }
  }

  const base = mode === "dawn" ? DEFAULT_DAWN_THEME : DEFAULT_THEME;
  return {
    ...base,
    slug: `default-${mode}`,
    label: mode === "dawn" ? "Default Dawn" : "Default Midnight",
    mode,
  };
}

function normalizeSettingsSource(raw: unknown, fallback?: Record<string, unknown>): Partial<ThemeSettings> {
  const source: Partial<ThemeSettings> = {};

  const copyValues = (target: Record<string, unknown>) => {
    for (const key of ALL_FIELDS) {
      const candidate = target[key];
      if (typeof candidate === "string" && candidate.trim()) {
        source[key] = candidate;
      }
    }
  };

  if (fallback && typeof fallback === "object") {
    copyValues(fallback as Record<string, unknown>);
  }

  if (raw && typeof raw === "object") {
    copyValues(raw as Record<string, unknown>);
  }

  return source;
}

function readThemeFile(filePath: string): Partial<ThemeSettings> {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`theme.json must contain an object`);
    }
    return parsed as Partial<ThemeSettings>;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(
        `[theme] Missing theme configuration at ${filePath}. Create theme.json with colour and font settings.`,
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[theme] Failed to read theme.json: ${message}`);
  }
}

function mergeTheme(
  overrides: Partial<ThemeSettings>,
  filePath: string,
  base: ThemeSettings = DEFAULT_THEME,
): ThemeSettings {
  const theme: Partial<Record<ThemeField, string>> = { ...base };

  for (const [rawKey, value] of Object.entries(overrides) as [ThemeField, unknown][]) {
    if (!ALL_FIELDS.includes(rawKey)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      throw new Error(`[theme] ${rawKey} in ${filePath} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      if (REQUIRED_FIELDS.includes(rawKey as ThemeRequiredField)) {
        throw new Error(`[theme] ${rawKey} in ${filePath} cannot be empty.`);
      }
      continue;
    }
    theme[rawKey] = trimmed;
  }

  const missing = REQUIRED_FIELDS.filter((key) => {
    const value = theme[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `[theme] Missing values for ${missing.join(", ")} in ${filePath}. Provide a hex colour or font family for each field.`,
    );
  }

  const result: Partial<Record<ThemeField, string>> = {};
  for (const key of ALL_FIELDS) {
    const value = theme[key];
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result as ThemeSettings;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean((error as NodeJS.ErrnoException)?.code === "ENOENT");
}
