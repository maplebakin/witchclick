import fs from "node:fs";
import path from "node:path";

export type AnalyticsProvider = "plausible" | "fathom" | "umami" | "simple-analytics";

export interface AnalyticsSettings {
  enabled: boolean;
  provider?: AnalyticsProvider;
  domain?: string;
  siteId?: string;
  scriptUrl?: string;
  apiHost?: string;
  endpoint?: string;
  outboundTracking?: boolean;
  outboundEventName?: string;
}

export interface AdsSettings {
  provider?: string;
  adsenseClientId?: string;
  slots?: Record<string, string>;
  sidebarSlotId?: string;
  endSlotId?: string;
  leadSlotId?: string;
}

export type ObservabilityEnvironment = "production" | "staging" | "development";

export interface ObservabilitySettings {
  enabled: boolean;
  dsn?: string | null;
  environment?: ObservabilityEnvironment;
}

export interface ThemeColors {
  accent?: string;
  primary?: string;
  fontHeading?: string;
  fontSerif?: string;
  surfacePlain?: string;
  cardPanelSurface?: string;
  cardPanelSurfaceStrong?: string;
  cardPanelBorderSoft?: string;
  shadowSoft?: string;
  textBody?: string;
  textMuted?: string;
}

export interface ActiveThemes {
  midnight?: ThemeColors;
  dawn?: ThemeColors;
}

export interface SiteSettings {
  siteUrl: string;
  brandName?: string;
  disclosure?: string;
  kofiUsername?: string;
  showAccountLink?: boolean;
  analytics?: AnalyticsSettings;
  ads?: AdsSettings;
  observability?: ObservabilitySettings;
  clientErrorEndpoint?: string | null;
  autoSummaries?: boolean;
  autoSpoons?: boolean;
  activeThemes?: ActiveThemes;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteUrl: "https://example.com",
  brandName: "WitchClick",
  disclosure:
    "As an affiliate, we may earn a small commission if you purchase through our links.",
  analytics: { enabled: false, provider: "plausible" },
  showAccountLink: false,
  observability: { enabled: false, dsn: null, environment: "production" },
  clientErrorEndpoint: null,
  autoSummaries: true,
  autoSpoons: true,
};

let cached: SiteSettings | null = null;
let warned = false;

function deepMergeSettings(base: SiteSettings, next: Partial<SiteSettings>): SiteSettings {
  const analytics: AnalyticsSettings | undefined = next.analytics
    ? { ...(base.analytics ?? { enabled: false }), ...next.analytics }
    : base.analytics;

  const ads: AdsSettings | undefined = next.ads
    ? { ...(base.ads ?? {}), ...next.ads }
    : base.ads;

  const observability: ObservabilitySettings | undefined = next.observability
    ? {
        ...(base.observability ?? { enabled: false, dsn: null, environment: "production" }),
        ...next.observability,
      }
    : base.observability;

  return {
    ...base,
    ...next,
    showAccountLink: next.showAccountLink ?? base.showAccountLink ?? false,
    autoSummaries: next.autoSummaries ?? base.autoSummaries ?? true,
    autoSpoons: next.autoSpoons ?? base.autoSpoons ?? true,
    analytics,
    ads,
    observability,
    clientErrorEndpoint:
      next.clientErrorEndpoint === undefined
        ? base.clientErrorEndpoint ?? null
        : next.clientErrorEndpoint,
  };
}

export function validateSettings(input: unknown): SiteSettings {
  const sanitized = sanitizeSettings(input);
  return deepMergeSettings({ ...DEFAULT_SETTINGS }, sanitized);
}

export function readSettings(): SiteSettings {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "content", "settings.json");
  let loaded = { ...DEFAULT_SETTINGS };

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    loaded = validateSettings(parsed);
  } catch (error) {
    if (isNotFoundError(error)) {
      if (!warned && process.env.NODE_ENV !== "production") {
        console.warn(`[settings] Optional file missing at ${filePath}`);
        warned = true;
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[settings] ${message}`);
    }
  }

  cached = { ...loaded };
  return cached;
}

export function resetSettingsCache() {
  cached = null;
  warned = false;
}

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("[settings] siteUrl cannot be empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[settings] siteUrl must be an absolute URL. Received: ${value}`);
  }

  parsed.hash = "";
  parsed.search = "";
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.origin}${path}`;
}

function ensureAbsoluteUrl(
  value: string,
  base: string,
  options: { stripHash?: boolean } = {},
): string {
  const { stripHash = false } = options;
  const fallbackBase = base || "http://localhost";
  try {
    const resolved = new URL(value, fallbackBase);
    if (stripHash) {
      resolved.hash = "";
    }
    return resolved.toString();
  } catch {
    return value;
  }
}

export function getSiteOrigin(
  settings: SiteSettings = readSettings(),
  options: { strict?: boolean } = {},
): string {
  const { strict = true } = options;
  const raw = typeof settings.siteUrl === "string" ? settings.siteUrl.trim() : "";
  if (!raw) {
    if (strict) {
      throw new Error("[settings] siteUrl is required in content/settings.json");
    }
    return "";
  }

  try {
    return normalizeSiteUrl(raw);
  } catch (error) {
    if (strict) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    return "";
  }
}

export function buildCanonicalUrl(
  settings: SiteSettings = readSettings(),
  options: { canonical?: string; path?: string; astroUrl?: URL | null } = {},
): string {
  const base = getSiteOrigin(settings);
  const candidate = options.canonical ?? options.path ?? "";

  if (candidate) {
    return ensureAbsoluteUrl(candidate, base, { stripHash: true });
  }

  const pathname = options.astroUrl?.pathname ?? "/";
  return ensureAbsoluteUrl(pathname, base, { stripHash: true });
}

export function toAbsoluteUrl(url: string, settings: SiteSettings = readSettings()): string {
  if (!url) return url;
  const base = getSiteOrigin(settings);
  return ensureAbsoluteUrl(url, base);
}

function sanitizeSettings(input: unknown): Partial<SiteSettings> {
  if (!input || typeof input !== "object") {
    throw new Error("settings.json must contain an object");
  }

  const errors: string[] = [];
  const out: Partial<SiteSettings> = {};
  const data = input as Record<string, unknown>;

  if ("siteUrl" in data) {
    const value = expectString(data.siteUrl, "siteUrl", errors, { required: true });
    if (value) {
      if (!isValidUrl(value)) {
        errors.push("siteUrl must be an absolute URL");
      } else {
        out.siteUrl = value;
      }
    }
  }

  if ("brandName" in data) {
    const value = expectString(data.brandName, "brandName", errors);
    if (value) out.brandName = value;
  }

  if ("disclosure" in data) {
    const value = expectString(data.disclosure, "disclosure", errors, { allowEmpty: true });
    if (value !== undefined) out.disclosure = value;
  }

  if ("kofiUsername" in data) {
    const value = expectString(data.kofiUsername, "kofiUsername", errors, { allowEmpty: true });
    if (value !== undefined) out.kofiUsername = value;
  }

  if ("showAccountLink" in data) {
    const raw = (data as Record<string, unknown>).showAccountLink;
    if (typeof raw === "boolean") {
      out.showAccountLink = raw;
    } else {
      errors.push("showAccountLink must be a boolean");
    }
  }

  if ("analytics" in data) {
    const value = sanitizeAnalytics(data.analytics, errors);
    if (value) out.analytics = value;
  }

  if ("autoSummaries" in data) {
    const raw = data.autoSummaries;
    if (typeof raw === "boolean") {
      out.autoSummaries = raw;
    } else {
      errors.push("autoSummaries must be a boolean");
    }
  }

  if ("autoSpoons" in data) {
    const raw = data.autoSpoons;
    if (typeof raw === "boolean") {
      out.autoSpoons = raw;
    } else {
      errors.push("autoSpoons must be a boolean");
    }
  }

  if ("ads" in data) {
    const value = sanitizeAds(data.ads, errors);
    if (value) out.ads = value;
  }

  if ("observability" in data) {
    const value = sanitizeObservability(data.observability, errors);
    if (value) out.observability = value;
  }

  if ("clientErrorEndpoint" in data) {
    const raw = data.clientErrorEndpoint;
    if (raw === null) {
      out.clientErrorEndpoint = null;
    } else {
      const endpoint = expectString(raw, "clientErrorEndpoint", errors);
      if (endpoint) {
        if (!isValidEndpoint(endpoint)) {
          errors.push("clientErrorEndpoint must be a rooted path or absolute URL");
        } else {
          out.clientErrorEndpoint = endpoint;
        }
      }
    }
  }

  if (errors.length) {
    throw new Error(`Invalid settings.json: ${errors.join("; ")}`);
  }

  return out;
}

function sanitizeObservability(value: unknown, errors: string[]): ObservabilitySettings | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") {
    errors.push("observability must be an object");
    return undefined;
  }

  const data = value as Record<string, unknown>;
  const enabledRaw = data.enabled;
  if (typeof enabledRaw !== "boolean") {
    errors.push("observability.enabled must be a boolean");
    return undefined;
  }

  const observability: ObservabilitySettings = { enabled: enabledRaw };

  if ("dsn" in data) {
    const rawDsn = data.dsn;
    if (rawDsn === null) {
      observability.dsn = null;
    } else {
      const dsn = expectString(rawDsn, "observability.dsn", errors);
      if (dsn) observability.dsn = dsn;
    }
  }

  if ("environment" in data) {
    const env = expectString(data.environment, "observability.environment", errors);
    if (env) {
      const normalized = env.toLowerCase();
      if (normalized === "production" || normalized === "staging" || normalized === "development") {
        observability.environment = normalized as ObservabilityEnvironment;
      } else {
        errors.push("observability.environment must be 'production', 'staging', or 'development'");
      }
    }
  }

  return observability;
}

function sanitizeAnalytics(value: unknown, errors: string[]): AnalyticsSettings | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") {
    errors.push("analytics must be an object");
    return undefined;
  }
  const data = value as Record<string, unknown>;
  const enabledRaw = data.enabled;
  if (typeof enabledRaw !== "boolean") {
    errors.push("analytics.enabled must be a boolean");
    return undefined;
  }

  const analytics: AnalyticsSettings = { enabled: enabledRaw };

  if ("provider" in data) {
    const provider = expectString(data.provider, "analytics.provider", errors);
    if (provider) {
      if (provider !== "plausible" && provider !== "fathom" && provider !== "umami" && provider !== "simple-analytics") {
        errors.push("analytics.provider must be 'plausible', 'fathom', 'umami', or 'simple-analytics'");
      } else {
        analytics.provider = provider as AnalyticsProvider;
      }
    }
  }

  if ("domain" in data) {
    const domain = expectString(data.domain, "analytics.domain", errors);
    if (domain) analytics.domain = domain;
  }

  if ("siteId" in data) {
    const siteId = expectString(data.siteId, "analytics.siteId", errors);
    if (siteId) analytics.siteId = siteId;
  }

  if ("scriptUrl" in data) {
    const script = expectString(data.scriptUrl, "analytics.scriptUrl", errors);
    if (script) {
      if (!isValidUrl(script) && !script.startsWith("/")) {
        errors.push("analytics.scriptUrl must be an absolute URL or rooted path");
      } else {
        analytics.scriptUrl = script;
      }
    }
  }

  if ("apiHost" in data) {
    const apiHost = expectString(data.apiHost, "analytics.apiHost", errors);
    if (apiHost) {
      if (!isValidUrl(apiHost)) {
        errors.push("analytics.apiHost must be an absolute URL");
      } else {
        analytics.apiHost = apiHost.replace(/\/$/, "");
      }
    }
  }

  if ("endpoint" in data) {
    const endpoint = expectString(data.endpoint, "analytics.endpoint", errors);
    if (endpoint) analytics.endpoint = endpoint;
  }

  if ("outboundTracking" in data) {
    const raw = data.outboundTracking;
    if (typeof raw === "boolean") {
      analytics.outboundTracking = raw;
    } else {
      errors.push("analytics.outboundTracking must be a boolean");
    }
  }

  if ("outboundEventName" in data) {
    const eventName = expectString(data.outboundEventName, "analytics.outboundEventName", errors, { allowEmpty: false });
    if (eventName) analytics.outboundEventName = eventName;
  }

  if (analytics.enabled) {
    const provider = analytics.provider ?? "plausible";
    if (provider === "plausible" && !analytics.domain) {
      errors.push("analytics.domain is required when analytics.provider is 'plausible'");
    }
    if (provider === "fathom" && !analytics.siteId) {
      errors.push("analytics.siteId is required when analytics.provider is 'fathom'");
    }
    if (provider === "umami" && !analytics.siteId) {
      errors.push("analytics.siteId is required when analytics.provider is 'umami'");
    }
  }

  return analytics;
}

function sanitizeAds(value: unknown, errors: string[]): AdsSettings | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") {
    errors.push("ads must be an object");
    return undefined;
  }
  const data = value as Record<string, unknown>;
  const ads: AdsSettings = {};

  if ("provider" in data) {
    const provider = expectString(data.provider, "ads.provider", errors);
    if (provider) ads.provider = provider;
  }
  if ("adsenseClientId" in data) {
    const client = expectString(data.adsenseClientId, "ads.adsenseClientId", errors);
    if (client) ads.adsenseClientId = client;
  }
  if ("sidebarSlotId" in data) {
    const sidebar = expectString(data.sidebarSlotId, "ads.sidebarSlotId", errors, { allowEmpty: true });
    if (sidebar !== undefined) ads.sidebarSlotId = sidebar;
  }
  if ("endSlotId" in data) {
    const end = expectString(data.endSlotId, "ads.endSlotId", errors, { allowEmpty: true });
    if (end !== undefined) ads.endSlotId = end;
  }
  if ("leadSlotId" in data) {
    const lead = expectString(data.leadSlotId, "ads.leadSlotId", errors, { allowEmpty: true });
    if (lead !== undefined) ads.leadSlotId = lead;
  }
  if ("slots" in data) {
    const slotsValue = data.slots;
    if (!slotsValue || typeof slotsValue !== "object") {
      errors.push("ads.slots must be an object map");
    } else {
      const slots: Record<string, string> = {};
      for (const [key, raw] of Object.entries(slotsValue)) {
        const slotId = expectString(raw, `ads.slots.${key}`, errors);
        if (slotId) slots[key] = slotId;
      }
      if (Object.keys(slots).length > 0) ads.slots = slots;
    }
  }

  return ads;
}

function expectString(
  value: unknown,
  field: string,
  errors: string[],
  options: { required?: boolean; allowEmpty?: boolean } = {},
): string | undefined {
  const { required = false, allowEmpty = false } = options;
  if (value === undefined || value === null) {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) {
    errors.push(`${field} cannot be empty`);
    return undefined;
  }
  return allowEmpty ? value : trimmed;
}

function isValidEndpoint(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  return isValidUrl(value);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean((error as NodeJS.ErrnoException)?.code === "ENOENT");
}
