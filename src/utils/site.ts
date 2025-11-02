import fs from "node:fs";
import path from "node:path";

interface SiteSettings {
  siteUrl?: string;
  brandName?: string;
}

const FALLBACK_SETTINGS: Required<SiteSettings> = {
  siteUrl: "https://example.com",
  brandName: "WitchClick",
};

export function readSiteSettings(): Required<SiteSettings> {
  try {
    const settingsPath = path.join(process.cwd(), "content", "settings.json");
    if (!fs.existsSync(settingsPath)) {
      return FALLBACK_SETTINGS;
    }

    const raw = fs.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as SiteSettings;
    return {
      ...FALLBACK_SETTINGS,
      ...parsed,
    };
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export function normalizeSiteUrl(u: string): string {
  try {
    const trimmed = String(u ?? "").trim().replace(/\/$/, "");
    if (!trimmed) return FALLBACK_SETTINGS.siteUrl;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  } catch {
    return FALLBACK_SETTINGS.siteUrl;
  }
}
