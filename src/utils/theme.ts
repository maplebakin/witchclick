import fs from "node:fs";
import path from "node:path";

export interface ThemeSettings {
  primary: string;
  accent: string;
  background: string;
  fontSerif: string;
  fontScript: string;
}

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
};

const DEFAULT_DAWN_THEME: ThemeSettings = {
  primary: "#9b86c8",
  accent: "#caa043",
  background: "#f6f0e8",
  fontSerif: "Literata",
  fontScript: "Parisienne",
};

const REQUIRED_FIELDS: (keyof ThemeSettings)[] = [
  "primary",
  "accent",
  "background",
  "fontSerif",
  "fontScript",
];

const THEMES_DIR = path.join(process.cwd(), "content", "themes");
const ACTIVE_FILE = path.join(THEMES_DIR, "active.json");
const LEGACY_FILE = path.join(process.cwd(), "content", "theme.json");

interface ThemeCacheState {
  themes: ActiveThemes;
  fingerprint: string;
}

let cacheState: ThemeCacheState | null = null;

const SHOULD_BYPASS_CACHE = process.env.NODE_ENV !== "production" || process.env.VITEST === "true";

export function getTheme(mode: ThemeMode = "midnight"): ThemeDefinition {
  const themes = getActiveThemes();
  return themes[mode];
}

/**
 * Resolve the currently active dawn and midnight themes.
 *
 * In production we memoize the response until one of the source files changes:
 * - `content/themes/active.json`
 * - Any theme JSON referenced by `active.json`
 * - `content/theme.json` (legacy fallback)
 *
 * Admin tooling that writes to these files can either rely on the automatic
 * mtime detection or call {@link resetThemeCache} after persisting updates to
 * guarantee the next read pulls fresh data.
 */
export function getActiveThemes(): ActiveThemes {
  const mapping = readActiveMapping();

  if (SHOULD_BYPASS_CACHE) {
    return buildActiveThemes(mapping);
  }

  const fingerprint = createThemeFingerprint(mapping);

  if (cacheState && cacheState.fingerprint === fingerprint) {
    return cacheState.themes;
  }

  const themes = buildActiveThemes(mapping);
  cacheState = { themes, fingerprint };
  return themes;
}

/**
 * Clears the cached theme payload so the next {@link getActiveThemes} call
 * re-reads everything from disk. Handy for admin endpoints that update the
 * theme library out-of-band.
 */
export function resetThemeCache() {
  cacheState = null;
}

function buildActiveThemes(mapping: Partial<Record<ThemeMode, string>>): ActiveThemes {
  const midnight = readThemeDefinition(mapping.midnight ?? null, "midnight") ?? fallbackTheme("midnight");
  const dawn = readThemeDefinition(mapping.dawn ?? null, "dawn") ?? fallbackTheme("dawn");

  return { midnight, dawn };
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

  if (fallback && typeof fallback === "object") {
    for (const key of REQUIRED_FIELDS) {
      const candidate = (fallback as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate.trim()) {
        source[key] = candidate;
      }
    }
  }

  if (raw && typeof raw === "object") {
    for (const key of REQUIRED_FIELDS) {
      const candidate = (raw as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate.trim()) {
        source[key] = candidate;
      }
    }
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

function createThemeFingerprint(mapping: Partial<Record<ThemeMode, string>>): string {
  const segments: string[] = [];

  segments.push(`active:${readFileStamp(ACTIVE_FILE)}`);
  segments.push(`legacy:${readFileStamp(LEGACY_FILE)}`);

  for (const mode of ["midnight", "dawn"] as const) {
    const slug = mapping[mode];
    if (!slug) {
      segments.push(`${mode}:none:0`);
      continue;
    }

    const themePath = path.join(THEMES_DIR, `${slug}.json`);
    const stamp = readFileStamp(themePath);
    segments.push(`${mode}:${slug}:${stamp}`);
  }

  return segments.join("|");
}

function readFileStamp(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (error) {
    if (isNotFoundError(error)) {
      return 0;
    }
    throw error;
  }
}

function mergeTheme(
  overrides: Partial<ThemeSettings>,
  filePath: string,
  base: ThemeSettings = DEFAULT_THEME,
): ThemeSettings {
  const theme: Record<keyof ThemeSettings, string> = { ...base };

  for (const [key, value] of Object.entries(overrides) as [keyof ThemeSettings, unknown][]) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      throw new Error(`[theme] ${key} in ${filePath} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`[theme] ${key} in ${filePath} cannot be empty.`);
    }
    if (!REQUIRED_FIELDS.includes(key)) continue;
    theme[key] = trimmed;
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

  return {
    primary: theme.primary,
    accent: theme.accent,
    background: theme.background,
    fontSerif: theme.fontSerif,
    fontScript: theme.fontScript,
  };
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
