// tools/src/render.ts
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import fs from 'node:fs';

// --- DOMPurify singleton (faster than making a JSDOM per call) ---
const windowAny = new JSDOM('').window as any;
const DOMPurify = createDOMPurify(windowAny);

export interface RenderOptions {
  htmlBeforeSanitize?: (html:string)=>string;
  adPlacements?: ('lead'|'mid'|'end')[];
  affiliateAnchors?: { key: string; text: string }[];
  internalLinks?: { slug: string; anchor: string }[];
  siteUrl: string;
  products: { key:string; url:string; utm?:string }[];
  kofiUsername?: string;
  includeKofi?: boolean;
  // NEW: hero image support
  heroImageSrc?: string | null;     // final URL (if you generated an image)
  heroImageAlt?: string | null;     // optional alt
}

export function renderMarkdown(md:string, opts:RenderOptions){
  // 1) Markdown → HTML
  let html = marked.parse(md) as string;
  if (opts.htmlBeforeSanitize) html = opts.htmlBeforeSanitize(html);

  // 2) First sanitize pass (normalize/defang raw HTML from markdown)
  html = sanitize(html);

  // 2.5) Optional hero image block at top (fail-soft)
  if (opts.heroImageSrc) {
    const alt = escapeHtml(opts.heroImageAlt || 'Hero image');
    const img = `<div class="hero"><img src="${escapeAttr(opts.heroImageSrc)}" alt="${alt}" loading="lazy" /></div>`;
    html = img + html;
  }

  // 3) Ads
  if (opts.adPlacements?.includes('lead')) {
    html = `<div class="ad ad--slot" data-slot="lead" aria-label="Advertisement"></div>` + html;
  }
  if (opts.adPlacements?.includes('mid')) {
    const parts = splitBlocks(html);
    if (parts.length > 3) {
      const mid = Math.floor(parts.length/2);
      parts.splice(mid, 0, `<div class="ad ad--slot" data-slot="mid" aria-label="Advertisement"></div>`);
      html = parts.join('');
    } else {
      // too short; drop mid-ad to avoid spammy layout
    }
  }
  if (opts.adPlacements?.includes('end')) {
    html = html + `<div class="ad ad--slot" data-slot="end" aria-label="Advertisement"></div>`;
  }

  // 4) Affiliate links: first natural occurrence for each anchor (avoid inside existing <a>)
  let injectedAffiliate = false;
  if (opts.affiliateAnchors?.length) {
    for (const a of opts.affiliateAnchors) {
      const prod = opts.products.find(p=>p.key===a.key);
      if (!prod || !prod.url) continue;
      const target = appendUtm(prod.url, prod.utm);
      const replacement = `<a href="${escapeAttr(target)}" rel="nofollow sponsored" target="_blank" data-affiliate="true" data-analytics="aff_click">${escapeHtml(a.text)}</a>`;
      const res = linkifyFirst(html, a.text, replacement);
      if (res.changed) {
        injectedAffiliate = true;
        html = res.html;
      }
    }
    // One disclosure near the first affiliate link (only if we injected at least one)
    if (injectedAffiliate) {
      html = html.replace(
        /<a href="[^"]+"[^>]*rel="nofollow sponsored"[^>]*>.*?<\/a>/,
        (m)=>{
          const note = `<div class="ad disclosure" data-slot="disclosure"><strong>Heads up:</strong> Some links are affiliate; they help keep WitchClick running.</div>`;
          return note + m;
        }
      );
    }
  }

  // 5) Internal links (avoid replacing inside existing anchors)
  if (opts.internalLinks?.length) {
    for (const l of opts.internalLinks) {
      const href = `${opts.siteUrl.replace(/\/$/,'')}/post/${l.slug}`;
      const replacement = `<a href="${escapeAttr(href)}">${escapeHtml(l.anchor)}</a>`;
      const res = linkifyFirst(html, l.anchor, replacement);
      if (res.changed) html = res.html;
    }
  }

  // 6) Ko-fi footer
  if (opts.includeKofi && opts.kofiUsername) {
    html += `<hr><p>Enjoyed this? <a href="https://ko-fi.com/${escapeAttr(opts.kofiUsername)}" target="_blank" rel="nofollow">Support on Ko-fi</a>.</p>`;
  }

  // 7) Final sanitize
  html = sanitize(html);
  return html;
}

// --- helpers ---

// Split on top-level blocks to place mid-ad without breaking <p> tags
function splitBlocks(html:string){
  return html.split(/(?=<p|<h2|<h3|<ul|<ol|<blockquote|<pre|<div|<table)/i);
}

// Avoid replacing inside existing anchors/headings; match only in text nodes
function linkifyFirst(html:string, text:string, replacementHtml:string): { html:string; changed:boolean }{
  if (!text) return { html, changed:false };
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  // Find a candidate occurrence not inside an <a> or <h2/h3> opening tag
  // Strategy: find a ">" then some text then our anchor then next "<"
  // and ensure the nearest preceding open tag is not <a ...> or <h2/h3 ...>
  const re = new RegExp(`(>[^<]*?)\\b(${esc})\\b([^<]*<)`, 'i');

  let changed = false;
  html = html.replace(re, (m, pre, word, post, offset, full) => {
    // check backwards for an opening <a ...> without a closing </a> before this point (crude but effective)
    const before = full.slice(0, offset);
    const lastOpen = before.lastIndexOf('<a ');
    const lastClose = before.lastIndexOf('</a>');
    const inAnchor = lastOpen > lastClose;

    // check if last open tag was a heading start
    const lastH2 = before.lastIndexOf('<h2');
    const lastH3 = before.lastIndexOf('<h3');
    const inHeading = Math.max(lastH2, lastH3) > before.lastIndexOf('>');

    if (inAnchor || inHeading) return m; // skip
    changed = true;
    return pre + replacementHtml + post;
  });
  return { html, changed };
}

function sanitize(html:string){
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p','ul','ol','li','em','strong','h2','h3','h4','blockquote','code','pre',
      'a','hr','img','table','thead','tbody','tr','th','td','div','span'
    ],
    ALLOWED_ATTR: [
      'href','title','rel','target','data-affiliate','data-analytics','src','alt','loading','class',
      'data-slot','aria-label'
    ]
  });
}

function escapeHtml(s:string){
  return s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function escapeAttr(s:string){
  return String(s).replace(/"/g, '&quot;');
}

function appendUtm(url:string, utm?:string){
  if (!utm) return url;
  try {
    const u = new URL(url);
    const extra = new URLSearchParams(utm.startsWith('?') ? utm.slice(1) : utm);
    for (const [k,v] of extra.entries()) u.searchParams.set(k,v);
    return u.toString();
  } catch {
    // fallback: naive concat
    return url + (url.includes('?') ? '&' : '?') + utm.replace(/^\?/, '');
  }
}
