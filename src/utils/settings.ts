import fs from "node:fs";
import path from "node:path";

export type AnalyticsProvider = "plausible" | "fathom";

export interface AnalyticsSettings {
  enabled: boolean;
  provider?: AnalyticsProvider;
  domain?: string;
  siteId?: string;
  scriptUrl?: string;
  apiHost?: string;
  endpoint?: string;
}

export interface AdsSettings {
  provider?: string;
  adsenseClientId?: string;
  slots?: Record<string, string>;
  sidebarSlotId?: string;
  endSlotId?: string;
}

export type ObservabilityEnvironment = "production" | "staging" | "development";

export interface ObservabilitySettings {
  enabled: boolean;
  dsn?: string | null;
  environment?: ObservabilityEnvironment;
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
      if (provider !== "plausible" && provider !== "fathom") {
        errors.push("analytics.provider must be either 'plausible' or 'fathom'");
      } else {
        analytics.provider = provider;
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

  if (analytics.enabled) {
    const provider = analytics.provider ?? "plausible";
    if (provider === "plausible" && !analytics.domain) {
      errors.push("analytics.domain is required when analytics.provider is 'plausible'");
    }
    if (provider === "fathom" && !analytics.siteId) {
      errors.push("analytics.siteId is required when analytics.provider is 'fathom'");
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
