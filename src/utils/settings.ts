import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";

import {
  DEFAULT_SITE_SETTINGS,
  SiteSettingsInputSchema,
  applySiteSettingsDefaults,
  type AdsSettings,
  type AnalyticsProvider,
  type AnalyticsSettings,
  type ObservabilitySettings,
  type SiteSettings,
  type SiteSettingsInput,
} from "../../shared/schema/index.js";

export type {
  AdsSettings,
  AnalyticsProvider,
  AnalyticsSettings,
  ObservabilitySettings,
  SiteSettings,
  SiteSettingsInput,
};

let cached: SiteSettings | null = null;
let warned = false;

function formatZodError(error: ZodError): string {
  if (!error.issues.length) return error.message;
  const details = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "root";
    return `${path}: ${issue.message}`;
  });
  return details.join("; ");
}

export function validateSettings(input: unknown): SiteSettings {
  const parsed = SiteSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid settings.json: ${formatZodError(parsed.error)}`);
  }
  return applySiteSettingsDefaults(parsed.data);
}

export function readSettings(): SiteSettings {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "content", "settings.json");
  let loaded = applySiteSettingsDefaults();

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    loaded = validateSettings(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid settings.json: ${formatZodError(error)}`);
    }
    if (isNotFoundError(error)) {
      if (!warned && process.env.NODE_ENV !== "production") {
        console.warn(`[settings] Optional file missing at ${filePath}`);
        warned = true;
      }
    } else if (error instanceof Error) {
      throw new Error(`[settings] ${error.message}`);
    } else if (typeof error === "string") {
      throw new Error(`[settings] ${error}`);
    }
  }

  cached = { ...loaded };
  return cached;
}

export function resetSettingsCache() {
  cached = null;
  warned = false;
}

export function getSiteOrigin(settings: SiteSettings = readSettings()): string {
  const origin = settings.siteUrl || DEFAULT_SITE_SETTINGS.siteUrl;
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

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}
