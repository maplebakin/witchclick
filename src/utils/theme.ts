import fs from "node:fs";
import path from "node:path";

export interface ThemeNeutralPalette {
  page: string;
  panel: string;
  veil: string;
  borders: string;
}

export interface ThemeTypePalette {
  accent: string;
}

export interface ThemeSettings {
  primary: string;
  accent: string;
  background: string;
  neutrals: ThemeNeutralPalette;
  type: ThemeTypePalette;
  fontSerif: string;
  fontScript: string;
}

type ThemeOverrides = Partial<Omit<ThemeSettings, "neutrals" | "type">> & {
  neutrals?: Partial<ThemeNeutralPalette>;
  type?: Partial<ThemeTypePalette>;
};

const DEFAULT_THEME: ThemeSettings = {
  primary: "#6b21a8",
  accent: "#d9b2c4",
  background: "#faf7f5",
  neutrals: {
    page: "#faf7f5",
    panel: "rgba(255, 255, 255, 0.82)",
    veil: "rgba(124, 58, 237, 0.12)",
    borders: "rgba(124, 58, 237, 0.2)",
  },
  type: {
    accent: "#4a3a52",
  },
  fontSerif: "Literata",
  fontScript: "Parisienne",
};

type SimpleThemeKey = Exclude<keyof ThemeSettings, "neutrals" | "type">;

const REQUIRED_FIELDS: SimpleThemeKey[] = [
  "primary",
  "accent",
  "background",
  "fontSerif",
  "fontScript",
];

const REQUIRED_NEUTRALS: (keyof ThemeNeutralPalette)[] = ["page", "panel", "veil", "borders"];
const REQUIRED_TYPE: (keyof ThemeTypePalette)[] = ["accent"];

const SIMPLE_THEME_KEYS: SimpleThemeKey[] = ["primary", "accent", "background", "fontSerif", "fontScript"];

function isSimpleThemeKey(value: keyof ThemeOverrides): value is SimpleThemeKey {
  return SIMPLE_THEME_KEYS.includes(value as SimpleThemeKey);
}

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

function readThemeFile(filePath: string): ThemeOverrides {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`theme.json must contain an object`);
    }
    return parsed as ThemeOverrides;
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

function mergeTheme(overrides: ThemeOverrides, filePath: string): ThemeSettings {
  const theme: ThemeSettings = JSON.parse(JSON.stringify(DEFAULT_THEME));

  for (const [key, value] of Object.entries(overrides) as [keyof ThemeOverrides, unknown][]) {
    if (value === undefined || value === null) continue;

    if (key === "neutrals") {
      if (!value || typeof value !== "object") {
        throw new Error(`[theme] neutrals in ${filePath} must be an object.`);
      }
      for (const [neutralKey, neutralValue] of Object.entries(value as Partial<ThemeNeutralPalette>)) {
        if (neutralValue === undefined || neutralValue === null) continue;
        if (typeof neutralValue !== "string") {
          throw new Error(`[theme] neutrals.${neutralKey} in ${filePath} must be a string.`);
        }
        const trimmed = neutralValue.trim();
        if (!trimmed) {
          throw new Error(`[theme] neutrals.${neutralKey} in ${filePath} cannot be empty.`);
        }
        theme.neutrals[neutralKey as keyof ThemeNeutralPalette] = trimmed;
      }
      continue;
    }

    if (key === "type") {
      if (!value || typeof value !== "object") {
        throw new Error(`[theme] type in ${filePath} must be an object.`);
      }
      for (const [typeKey, typeValue] of Object.entries(value as Partial<ThemeTypePalette>)) {
        if (typeValue === undefined || typeValue === null) continue;
        if (typeof typeValue !== "string") {
          throw new Error(`[theme] type.${typeKey} in ${filePath} must be a string.`);
        }
        const trimmed = typeValue.trim();
        if (!trimmed) {
          throw new Error(`[theme] type.${typeKey} in ${filePath} cannot be empty.`);
        }
        theme.type[typeKey as keyof ThemeTypePalette] = trimmed;
      }
      continue;
    }

    if (isSimpleThemeKey(key)) {
      if (typeof value !== "string") {
        throw new Error(`[theme] ${String(key)} in ${filePath} must be a string.`);
      }
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error(`[theme] ${String(key)} in ${filePath} cannot be empty.`);
      }
      theme[key] = trimmed;
      continue;
    }

    throw new Error(`[theme] Unknown theme field "${String(key)}" in ${filePath}.`);
  }

  const missing = REQUIRED_FIELDS.filter((requiredKey) => {
    const value = theme[requiredKey];
    return typeof value !== "string" || value.trim().length === 0;
  });

  const missingNeutrals = REQUIRED_NEUTRALS.filter((neutralKey) => {
    const value = theme.neutrals[neutralKey];
    return typeof value !== "string" || value.trim().length === 0;
  });

  const missingType = REQUIRED_TYPE.filter((typeKey) => {
    const value = theme.type[typeKey];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0 || missingNeutrals.length > 0 || missingType.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(missing.join(", "));
    if (missingNeutrals.length > 0) parts.push(`neutrals.${missingNeutrals.join(", neutrals.")}`);
    if (missingType.length > 0) parts.push(`type.${missingType.join(", type.")}`);
    throw new Error(
      `[theme] Missing values for ${parts.join(", ")} in ${filePath}. Provide a value for each field.`,
    );
  }

  return {
    primary: theme.primary,
    accent: theme.accent,
    background: theme.background,
    neutrals: theme.neutrals,
    type: theme.type,
    fontSerif: theme.fontSerif,
    fontScript: theme.fontScript,
  };
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean((error as NodeJS.ErrnoException)?.code === "ENOENT");
}
