import fs from "node:fs";
import path from "node:path";

export interface ThemeSettings {
  primary: string;
  accent: string;
  background: string;
  fontSerif: string;
  fontScript: string;
}

export interface AnalyticsSettings {
  enabled: boolean;
  endpoint?: string;
}

export interface AdsSettings {
  provider?: string;
  adsenseClientId?: string;
  slots?: Record<string, string>;
  sidebarSlotId?: string;
  endSlotId?: string;
}

export interface SiteSettings {
  siteUrl: string;
  brandName?: string;
  disclosure?: string;
  kofiUsername?: string;
  analytics?: AnalyticsSettings;
  ads?: AdsSettings;
  theme?: ThemeSettings;
}

const DEFAULT_THEME: ThemeSettings = {
  primary: "#6b21a8",
  accent: "#d9b2c4",
  background: "#faf7f5",
  fontSerif: "Literata",
  fontScript: "Parisienne",
};

const DEFAULT_SETTINGS: SiteSettings = {
  siteUrl: "https://example.com",
  brandName: "WitchClick",
  disclosure:
    "As an affiliate, we may earn a small commission if you purchase through our links.",
  analytics: { enabled: false },
  theme: DEFAULT_THEME,
};

let cached: SiteSettings | null = null;
let warned = false;

function deepMergeSettings(base: SiteSettings, next: Partial<SiteSettings>): SiteSettings {
  const theme: ThemeSettings = {
    ...DEFAULT_THEME,
    ...(base.theme ?? {}),
    ...(next.theme ?? {}),
  };

  const analytics: AnalyticsSettings | undefined = next.analytics
    ? { ...(base.analytics ?? { enabled: false }), ...next.analytics }
    : base.analytics;

  const ads: AdsSettings | undefined = next.ads
    ? { ...(base.ads ?? {}), ...next.ads }
    : base.ads;

  return {
    ...base,
    ...next,
    analytics,
    ads,
    theme,
  };
}

export function readSettings(): SiteSettings {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "content", "settings.json");
  let loaded = { ...DEFAULT_SETTINGS };

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    loaded = deepMergeSettings(loaded, parsed);
  } catch (error) {
    if (!warned && process.env.NODE_ENV !== "production") {
      console.warn(`[settings] Unable to read ${filePath}:`, (error as Error).message);
      warned = true;
    }
  }

  cached = { ...loaded, theme: loaded.theme ?? DEFAULT_THEME };
  return cached;
}

export function resetSettingsCache() {
  cached = null;
  warned = false;
}

export function getSiteOrigin(settings: SiteSettings = readSettings()): string {
  const origin = settings.siteUrl || DEFAULT_SETTINGS.siteUrl;
  return String(origin).replace(/\/$/, "");
}

export function toAbsoluteUrl(url: string, settings: SiteSettings = readSettings()): string {
  if (!url) return url;
  try {
    return new URL(url, getSiteOrigin(settings) || "http://localhost").toString();
  } catch {
    return url;
  }
}

export function getTheme(settings: SiteSettings = readSettings()): ThemeSettings {
  return settings.theme ?? DEFAULT_THEME;
}
