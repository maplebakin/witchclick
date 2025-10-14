import { toAbsoluteUrl, type SiteSettings, type AnalyticsSettings } from "./settings";

export interface AnalyticsInjection {
  head?: string;
  config?: string;
  runtime?: string;
}

interface AnalyticsBootstrapConfig {
  provider: NonNullable<AnalyticsSettings["provider"]>;
  domain?: string;
  siteId?: string;
  apiHost?: string;
}

const DEFAULT_PLAUSIBLE_SRC = "https://plausible.io/js/script.js";
const DEFAULT_FATHOM_SRC = "https://cdn.usefathom.com/script.js";

export function buildAnalyticsInjection(settings: SiteSettings): AnalyticsInjection | null {
  const analytics = settings.analytics;
  if (!analytics || !analytics.enabled) return null;

  const provider: NonNullable<AnalyticsSettings["provider"]> = analytics.provider ?? "plausible";
  const scriptUrl = resolveScriptUrl(analytics.scriptUrl, provider, settings);

  const attributes: string[] = ["defer", `src="${scriptUrl}"`];

  if (provider === "plausible") {
    const domain = analytics.domain ?? "";
    attributes.push(`data-domain="${escapeAttr(domain)}"`);
    if (analytics.apiHost) {
      attributes.push(`data-api="${escapeAttr(analytics.apiHost)}"`);
    }
  } else if (provider === "fathom") {
    const siteId = analytics.siteId ?? "";
    attributes.push(`data-site="${escapeAttr(siteId)}"`);
    if (analytics.apiHost) {
      attributes.push(`data-host="${escapeAttr(analytics.apiHost)}"`);
    }
  }

  const head = `<script ${attributes.join(" ")}></script>`;
  const config: AnalyticsBootstrapConfig = {
    provider,
    domain: analytics.domain,
    siteId: analytics.siteId,
    apiHost: analytics.apiHost,
  };

  const bootstrap = `<script is:inline>window.__WC_ANALYTICS__=${JSON.stringify(config)};</script>`;
  const runtime = `<script is:inline>(function(){const cfg=window.__WC_ANALYTICS__;if(!cfg) return;const send=(name,detail)=>{if(!name)return;try{if(cfg.provider==='plausible'){if(typeof window.plausible==='function'){window.plausible(name,detail&&Object.keys(detail).length?{props:detail}:{})}}else if(cfg.provider==='fathom'){if(window.fathom&&typeof window.fathom.trackEvent==='function'){window.fathom.trackEvent(name)}}}catch(e){if(typeof console!=='undefined'){console.warn('[analytics] failed to send event',e);}}};const parseProps=(value)=>{if(!value)return{};try{return JSON.parse(value);}catch{return{detail:value}}};const handler=(event)=>{const target=event.target instanceof Element?event.target.closest('[data-analytics]'):null;if(!target)return;const name=target.getAttribute('data-analytics');if(!name)return;const meta=target.getAttribute('data-analytics-meta');const propsAttr=target.getAttribute('data-analytics-props');const payload={...parseProps(propsAttr)};if(meta)payload.meta=meta;if(target instanceof HTMLAnchorElement&&target.href)payload.href=target.href;send(name,payload);};document.addEventListener('click',handler,{capture:true});})();</script>`;

  return { head, config: bootstrap, runtime };
}

function resolveScriptUrl(url: string | undefined, provider: NonNullable<AnalyticsSettings["provider"]>, settings: SiteSettings): string {
  const fallback = provider === "fathom" ? DEFAULT_FATHOM_SRC : DEFAULT_PLAUSIBLE_SRC;
  if (!url) return fallback;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) {
    return toAbsoluteUrl(url, settings);
  }
  return url;
}

function escapeAttr(value: string): string {
  return String(value ?? "").replace(/"/g, "&quot;");
}
