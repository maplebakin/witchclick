import type { APIRoute } from "astro";
import { readSettings, type AnalyticsSettings } from "@/utils/settings";
import { enforceMutatingAccess, methodNotAllowed } from "./_mutating";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" } as const;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
} as const;

type AffiliateEvent = {
  url: string;
  ts: string;
  referer: string | null;
  userAgent: string | null;
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
    },
  });

export const GET: APIRoute = async ({ request, url }) => {
  const denied = enforceMutatingAccess(request, "public");
  if (denied) {
    return denied;
  }

  const settings = readSettings();
  const analytics = settings.analytics;

  const targetUrl = url.searchParams.get("url")?.trim() ?? "";
  if (!targetUrl) {
    return jsonResponse({ ok: false, error: "url is required" }, 422);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return jsonResponse({ ok: false, error: "url must be an absolute URL" }, 422);
  }

  if (!/^(https?:)$/i.test(parsedUrl.protocol)) {
    return jsonResponse({ ok: false, error: "Unsupported URL protocol" }, 422);
  }

  const ts = normalizeTimestamp(url.searchParams.get("ts"));
  if (!ts) {
    return jsonResponse({ ok: false, error: "ts must be a valid ISO string or epoch milliseconds" }, 422);
  }

  const event: AffiliateEvent = {
    url: parsedUrl.toString(),
    ts,
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  };

  if (!analytics?.enabled) {
    console.info("[affiliate-click] analytics disabled; event ignored", event);
    return jsonResponse({ ok: true, forwarded: false, reason: "analytics_disabled" }, 202);
  }

  const endpoint = resolveEndpoint(analytics);
  if (!endpoint) {
    console.info("[affiliate-click] captured event without endpoint", {
      provider: analytics.provider ?? null,
      ...event,
    });
    return jsonResponse({ ok: true, forwarded: false, reason: "no_endpoint" }, 202);
  }

  const forwardPayload = buildForwardPayload(event, analytics);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "WitchClickAffiliateClick/1.0",
      },
      body: JSON.stringify(forwardPayload),
      keepalive: true,
    });

    if (!response.ok) {
      const snippet = await safeRead(response);
      console.warn("[affiliate-click] forward failed", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        snippet,
      });
      return jsonResponse({ ok: false, forwarded: false, error: "forward_failed" }, 502);
    }

    return jsonResponse({ ok: true, forwarded: true }, 202);
  } catch (error) {
    console.warn("[affiliate-click] forward error", {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ ok: false, forwarded: false, error: "forward_error" }, 502);
  }
};

export const POST: APIRoute = async () => methodNotAllowed("GET, OPTIONS");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS,
    },
  });
}

function normalizeTimestamp(input: unknown): string | null {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function resolveEndpoint(settings: AnalyticsSettings | undefined): string | null {
  if (!settings) return null;
  if (settings.endpoint && settings.endpoint.trim()) {
    return settings.endpoint.trim();
  }
  return null;
}

function buildForwardPayload(event: AffiliateEvent, analytics: AnalyticsSettings) {
  const name = analytics.outboundEventName?.trim() || "affiliate_click";
  return {
    type: name,
    url: event.url,
    ts: event.ts,
    referer: event.referer,
    userAgent: event.userAgent,
    provider: analytics.provider ?? null,
    domain: analytics.domain ?? null,
    siteId: analytics.siteId ?? null,
  };
}

async function safeRead(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text ? text.slice(0, 500) : null;
  } catch {
    return null;
  }
}
