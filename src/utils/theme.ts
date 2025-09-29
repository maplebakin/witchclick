import fs from "node:fs";
import path from "node:path";

export interface ThemeSettings {
  primary: string;
  accent: string;
  background: string;
  fontSerif: string;
  fontScript: string;
}

const DEFAULT_THEME: ThemeSettings = {
  primary: "#6b21a8",
  accent: "#d9b2c4",
  background: "#faf7f5",
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

let cachedTheme: ThemeSettings | null = null;

export function getTheme(): ThemeSettings {
  if (cachedTheme) return cachedTheme;

  const filePath = path.join(process.cwd(), "content", "theme.json");
  const overrides = readThemeFile(filePath);
  const theme = mergeTheme(overrides, filePath);

  cachedTheme = theme;
  return cachedTheme;
}

export function resetThemeCache() {
  cachedTheme = null;
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

function mergeTheme(overrides: Partial<ThemeSettings>, filePath: string): ThemeSettings {
  const theme: Record<keyof ThemeSettings, string> = { ...DEFAULT_THEME };

  for (const [key, value] of Object.entries(overrides) as [keyof ThemeSettings, unknown][]) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      throw new Error(`[theme] ${key} in ${filePath} must be a string.`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`[theme] ${key} in ${filePath} cannot be empty.`);
    }
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

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean((error as NodeJS.ErrnoException)?.code === "ENOENT");
}
