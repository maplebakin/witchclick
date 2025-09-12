// tools/src/render.ts
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import fs from 'node:fs';

export interface RenderOptions {
  htmlBeforeSanitize?: (html:string)=>string;
  adPlacements?: ('lead'|'mid'|'end')[];
  affiliateAnchors?: { key: string; text: string }[];
  internalLinks?: { slug: string; anchor: string }[];
  siteUrl: string;
  products: { key:string; url:string; utm?:string }[];
  kofiUsername?: string;
  includeKofi?: boolean;
}

export function renderMarkdown(md:string, opts:RenderOptions){
  let html = marked.parse(md) as string;
  if(opts.htmlBeforeSanitize) html = opts.htmlBeforeSanitize(html);

  // Sanitize first pass
  html = sanitize(html);

  // Inject ads
  if (opts.adPlacements?.includes('lead')) {
    html = `<div class="ad ad--slot" data-slot="lead"></div>` + html;
  }
  if (opts.adPlacements?.includes('mid')) {
    const parts = splitParagraphs(html);
    const mid = Math.floor(parts.length/2);
    parts.splice(mid,0, `<div class="ad ad--slot" data-slot="mid"></div>`);
    html = parts.join('');
  }
  if (opts.adPlacements?.includes('end')) {
    html = html + `<div class="ad ad--slot" data-slot="end"></div>`;
  }

  // Affiliate links: first natural occurrence for each anchor
  if (opts.affiliateAnchors?.length) {
    for (const a of opts.affiliateAnchors) {
      const prod = opts.products.find(p=>p.key===a.key);
      if (!prod || !prod.url) continue;
      const target = `${prod.url.replace(/\/$/,'')}${prod.utm ? `?${prod.utm}`:''}`;
      html = linkifyFirst(html, a.text, `<a href="${target}" rel="nofollow sponsored" target="_blank" data-analytics="aff_click">${escapeHtml(a.text)}</a>`);
    }
    // Disclosure near first affiliate link
    html = html.replace(/<a href="[^"]+"[^>]*rel="nofollow sponsored"[^>]*>.*?<\/a>/, (m)=>{
      const note = `<div class="ad disclosure" data-slot="disclosure"><strong>Heads up:</strong> Some links are affiliate; they help keep WitchClick running.</div>`;
      return note + m;
    });
  }

  // Internal links
  for (const l of (opts.internalLinks||[])) {
    const href = `${opts.siteUrl.replace(/\/$/,'')}/post/${l.slug}`;
    html = linkifyFirst(html, l.anchor, `<a href="${href}">${escapeHtml(l.anchor)}</a>`);
  }

  // Ko-fi
  if (opts.includeKofi && opts.kofiUsername) {
    html += `<hr><p>Enjoyed this? <a href="https://ko-fi.com/${opts.kofiUsername}" target="_blank" rel="nofollow">Support on Ko-fi</a>.</p>`;
  }

  // Sanitize final
  html = sanitize(html);
  return html;
}

function splitParagraphs(html:string){
  return html.split(/(?=<p|<h2|<h3|<ul|<ol|<blockquote|<pre|<div)/i);
}

function linkifyFirst(html:string, text:string, replacementHtml:string){
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re = new RegExp(`(>[^<]*)\\b(${esc})\\b`,'i');
  return html.replace(re, (m, pre, word)=> m.replace(word, replacementHtml));
}

function sanitize(html:string){
  const window = new JSDOM('').window as any;
  const DOMPurify = createDOMPurify(window);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','ul','ol','li','em','strong','h2','h3','h4','blockquote','code','pre','a','hr','img','table','thead','tbody','tr','th','td','div','span'],
    ALLOWED_ATTR: ['href','title','rel','target','data-analytics','src','alt','loading','class','data-slot']
  });
}

function escapeHtml(s:string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
