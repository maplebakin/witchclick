import { getSiteOrigin, toAbsoluteUrl, type SiteSettings, type AnalyticsSettings } from "./settings";

export interface AnalyticsScript {
  attributes?: Record<string, string | boolean>;
  inline?: string;
}

export interface AnalyticsInjection {
  head?: AnalyticsScript;
  config?: AnalyticsScript;
  runtime?: AnalyticsScript;
}

interface AnalyticsBootstrapConfig {
  provider: NonNullable<AnalyticsSettings["provider"]>;
  domain?: string;
  siteId?: string;
  apiHost?: string;
  endpoint?: string;
  outbound: { enabled: boolean; eventName: string };
  siteOrigin: string;
}

const DEFAULT_PLAUSIBLE_SRC = "https://plausible.io/js/script.js";
const DEFAULT_FATHOM_SRC = "https://cdn.usefathom.com/script.js";
const DEFAULT_UMAMI_SRC = "https://analytics.umami.is/script.js";
const DEFAULT_SIMPLE_ANALYTICS_SRC = "https://scripts.simpleanalyticscdn.com/latest.js";

export function buildAnalyticsInjection(settings: SiteSettings): AnalyticsInjection | null {
  const analytics = settings.analytics;
  if (!analytics || !analytics.enabled) return null;

  const provider: NonNullable<AnalyticsSettings["provider"]> = analytics.provider ?? "plausible";
  const scriptUrl = resolveScriptUrl(analytics.scriptUrl, provider, settings);
  const headAttributes: Record<string, string | boolean> = { src: scriptUrl };

  switch (provider) {
    case "plausible": {
      headAttributes.defer = true;
      const domain = resolvePlausibleDomain(analytics.domain, settings);
      if (domain) {
        headAttributes["data-domain"] = domain;
      }
      if (analytics.apiHost) {
        headAttributes["data-api"] = normalizePlausibleApi(analytics.apiHost);
      }
      headAttributes["data-no-cookie"] = "true";
      break;
    }
    case "fathom": {
      headAttributes.defer = true;
      const siteId = analytics.siteId ?? "";
      if (siteId) {
        headAttributes["data-site"] = siteId;
      }
      if (analytics.apiHost) {
        headAttributes["data-host"] = analytics.apiHost;
      }
      break;
    }
    case "umami": {
      headAttributes.defer = true;
      headAttributes.async = true;
      const siteId = analytics.siteId ?? "";
      if (siteId) {
        headAttributes["data-website-id"] = siteId;
      }
      if (analytics.apiHost) {
        headAttributes["data-host-url"] = analytics.apiHost;
      }
      break;
    }
    case "simple-analytics": {
      headAttributes.defer = true;
      headAttributes.async = true;
      if (analytics.domain) {
        headAttributes["data-hostname"] = analytics.domain;
      }
      break;
    }
  }

  const outboundEnabled = analytics.outboundTracking ?? false;
  const outboundEventName = analytics.outboundEventName?.trim() || "outbound_click";
  const siteOrigin = getSiteOrigin(settings);

  const config: AnalyticsBootstrapConfig = {
    provider,
    domain: analytics.domain,
    siteId: analytics.siteId,
    apiHost: analytics.apiHost,
    endpoint: analytics.endpoint,
    outbound: { enabled: outboundEnabled, eventName: outboundEventName },
    siteOrigin,
  };

  const serializedConfig = JSON.stringify(config).replace(/</g, "\\u003c");
  const bootstrap = `window.__WC_ANALYTICS__=${serializedConfig};`;
  const runtime = `(function(){const cfg=window.__WC_ANALYTICS__;if(!cfg) return;const send=(name,detail)=>{if(!name)return;try{if(cfg.provider==='plausible'){if(typeof window.plausible==='function'){window.plausible(name,detail&&Object.keys(detail).length?{props:detail}:{})}}else if(cfg.provider==='fathom'){if(window.fathom&&typeof window.fathom.trackEvent==='function'){window.fathom.trackEvent(name)}}else if(cfg.provider==='umami'){var tracker=window.umami;if(typeof tracker==='function'){tracker(name,detail);}else if(tracker&&typeof tracker.trackEvent==='function'){tracker.trackEvent(name,detail);}}else if(cfg.provider==='simple-analytics'){if(typeof window.sa_event==='function'){window.sa_event(name,detail||{});}}}catch(e){if(typeof console!=='undefined'){console.warn('[analytics] failed to send event',e);}}};const parseProps=(value)=>{if(!value)return{};try{return JSON.parse(value);}catch{return{detail:value}}};const handler=(event)=>{const target=event.target instanceof Element?event.target.closest('[data-analytics]'):null;if(!target)return;const name=target.getAttribute('data-analytics');if(!name)return;const meta=target.getAttribute('data-analytics-meta');const propsAttr=target.getAttribute('data-analytics-props');const payload={...parseProps(propsAttr)};if(meta)payload.meta=meta;if(target instanceof HTMLAnchorElement&&target.href)payload.href=target.href;send(name,payload);};document.addEventListener('click',handler,{capture:true});const outbound=cfg.outbound&&cfg.outbound.enabled;const outboundName=(cfg.outbound&&cfg.outbound.eventName)||'outbound_click';if(outbound){const siteHost=(function(){try{return cfg.siteOrigin?new URL(cfg.siteOrigin).host:window.location.host;}catch{return window.location.host;}})();const getHost=(href)=>{try{return new URL(href).host;}catch{return null;}};document.addEventListener('click',function(event){const link=event.target instanceof Element?event.target.closest('a[href]'):null;if(!link)return;if(link.closest('[data-analytics]'))return;if(link.hasAttribute('data-analytics-ignore'))return;const href=link.href;if(!href)return;const host=getHost(href);if(!host||host===siteHost)return;const text=(link.textContent||'').trim();const payload={href};if(text)payload.text=text.slice(0,120);send(outboundName,payload);},{capture:true});}})();`;

  return {
    head: { attributes: headAttributes },
    config: { inline: bootstrap },
    runtime: { inline: runtime },
  };
}

function resolveScriptUrl(url: string | undefined, provider: NonNullable<AnalyticsSettings["provider"]>, settings: SiteSettings): string {
  const fallback =
    provider === "fathom"
      ? DEFAULT_FATHOM_SRC
      : provider === "umami"
        ? DEFAULT_UMAMI_SRC
        : provider === "simple-analytics"
          ? DEFAULT_SIMPLE_ANALYTICS_SRC
          : DEFAULT_PLAUSIBLE_SRC;
  if (!url) return fallback;
  const candidate = url.startsWith("//")
    ? `https:${url}`
    : url.startsWith("/")
      ? toAbsoluteUrl(url, settings)
      : url;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function resolvePlausibleDomain(domain: string | undefined, settings: SiteSettings): string {
  if (domain && domain.trim()) {
    return domain.trim();
  }

  try {
    const origin = getSiteOrigin(settings, { strict: false });
    if (!origin) return "";
    const parsed = new URL(origin);
    return parsed.host;
  } catch {
    return "";
  }
}

function normalizePlausibleApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const normalized = trimmed.replace(/\/$/, "");
  return normalized.endsWith("/api/event") ? normalized : `${normalized}/api/event`;
}
