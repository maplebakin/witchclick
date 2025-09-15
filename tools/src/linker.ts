// tools/src/linker.ts
// Robust, DOM-free auto-linker for affiliate + internal links.
// - First occurrence only per anchor text (configurable)
// - Skips <a>, <code>, <pre>, and headings by default (configurable)
// - Adds rel="sponsored nofollow noopener noreferrer" + target for affiliate anchors
// - Optional UTM handling for affiliate URLs
// - Supports internal post links
// - Returns stats so pages can decide whether to show disclosures, etc.
//
// No external dependencies.

export type AffiliateAnchor = {
  key: string;     // product key in products[]
  text: string;    // visible text to convert to a link (case-insensitive by default)
};

export type Product = {
  key: string;     // product key
  url: string;     // absolute or relative URL
  utm?: string;    // e.g. "utm_source=witchclick&utm_medium=post"
  rel?: string;    // override rel
  target?: string; // override target
};

export type InternalLink = {
  slug: string;    // "post-slug" or a path like "/post/slug"
  anchor: string;  // visible text to link
};

export type AutoLinkOptions = {
  affiliateAnchors?: AffiliateAnchor[];
  products?: Product[];
  internalLinks?: InternalLink[];

  // Behavior controls
  firstOccurrenceOnly?: boolean;  // default: true
  caseSensitive?: boolean;        // default: false
  matchWhole?: boolean;           // default: false (exact substring match)
  maxPerAnchor?: number;          // default: 1 (ignored if firstOccurrenceOnly === true)

  // Skipping rules
  skipHeadings?: boolean;         // default: true (skip <h1>-<h6>)
  skipLinks?: boolean;            // default: true (skip inside <a>)
  skipCode?: boolean;             // default: true (skip inside <code>/<pre>)
  extraSkipPattern?: RegExp;      // additional skip islands (e.g., blockquotes)
};

export type AutoLinkStats = {
  affiliateCount: number;
  internalCount: number;
  anchors: Array<{ type: "affiliate" | "internal"; text: string; href: string; count: number }>;
  changed: boolean;
};

export type AutoLinkResult = { html: string; stats: AutoLinkStats };

/**
 * Auto-link affiliate and internal anchors in owner-authored HTML.
 * Avoids mutating content inside existing anchors, code/pre blocks, and headings.
 */
export function autoLink(inputHtml: string, options: AutoLinkOptions = {}): AutoLinkResult {
  if (!inputHtml || typeof inputHtml !== "string") {
    return { html: inputHtml || "", stats: emptyStats() };
  }

  const {
    affiliateAnchors = [],
    products = [],
    internalLinks = [],
    firstOccurrenceOnly = true,
    caseSensitive = false,
    matchWhole = false,
    maxPerAnchor = 1,
    skipHeadings = true,
    skipLinks = true,
    skipCode = true,
    extraSkipPattern,
  } = options;

  const flags = caseSensitive ? "g" : "gi";

  // Build "skip islands" regex: segments we won't modify.
  const skipParts: string[] = [];
  if (skipLinks) skipParts.push("(<a\\b[^>]*>.*?<\\/a>)");
  if (skipCode) {
    skipParts.push("(<code\\b[^>]*>.*?<\\/code>)");
    skipParts.push("(<pre\\b[^>]*>.*?<\\/pre>)");
  }
  if (skipHeadings) skipParts.push("(<h[1-6]\\b[^>]*>.*?<\\/h[1-6]>)");
  if (extraSkipPattern) {
    // We can only integrate the source; ensure it's non-capturing or wrap it.
    skipParts.push(`(${stripRegexDelimiters(extraSkipPattern)})`);
  }

  const SKIP_RE = skipParts.length
    ? new RegExp(skipParts.join("|"), "gis")
    : null;

  const chunks = SKIP_RE ? splitPreservingDelimiters(inputHtml, SKIP_RE) : [inputHtml];

  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(String(p.key), p);

  let affiliateCount = 0;
  let internalCount = 0;
  const anchors: AutoLinkStats["anchors"] = [];

  // 1) Affiliates: only link if product exists & has URL
  for (const a of affiliateAnchors) {
    const prod = productMap.get(String(a.key));
    if (!prod || !prod.url) continue;

    const href = withUtm(prod.url, prod.utm);
    const rel = prod.rel || "sponsored nofollow noopener noreferrer";
    const target = prod.target || "_blank";

    const out = linkAcrossChunks({
      chunks,
      needle: a.text,
      flags,
      firstOnly: firstOccurrenceOnly,
      maxCount: maxPerAnchor,
      matchWhole,
      replacement: (m) =>
        `<a href="${escapeAttr(href)}" rel="${escapeAttr(rel)}" target="${escapeAttr(
          target
        )}" data-analytics="aff_click">${m}</a>`,
    });

    if (out.linked > 0) {
      affiliateCount += out.linked;
      anchors.push({ type: "affiliate", text: a.text, href, count: out.linked });
      mutateArray(chunks, out.chunks);
    }
  }

  // 2) Internal links: after affiliates to avoid stacking nested anchors
  for (const l of internalLinks) {
    const href = normalizeInternalHref(l.slug);

    const out = linkAcrossChunks({
      chunks,
      needle: l.anchor,
      flags,
      firstOnly: firstOccurrenceOnly,
      maxCount: maxPerAnchor,
      matchWhole,
      replacement: (m) => `<a href="${escapeAttr(href)}">${m}</a>`,
    });

    if (out.linked > 0) {
      internalCount += out.linked;
      anchors.push({ type: "internal", text: l.anchor, href, count: out.linked });
      mutateArray(chunks, out.chunks);
    }
  }

  const html = chunks.join("");
  return {
    html,
    stats: {
      affiliateCount,
      internalCount,
      anchors,
      changed: html !== inputHtml,
    },
  };
}

/* ------------------------- helpers ------------------------- */

function withUtm(url: string, utm?: string): string {
  if (!utm) return url;
  return url.includes("?") ? `${url}&${utm}` : `${url}?${utm}`;
}

function normalizeInternalHref(slug: string): string {
  if (!slug) return "/";
  if (slug.startsWith("http://") || slug.startsWith("https://") || slug.startsWith("/")) return slug;
  // default to blog posts
  return `/post/${slug}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(s: string): string {
  return String(s).replace(/"/g, "&quot;");
}

function emptyStats(): AutoLinkStats {
  return { affiliateCount: 0, internalCount: 0, anchors: [], changed: false };
}

/**
 * Split a string by a regex while keeping the matched delimiters in the result.
 * Example: "a<code>x</code>b" => ["a", "<code>x</code>", "b"]
 */
function splitPreservingDelimiters(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(s))) {
    const start = m.index!;
    const end = re.lastIndex!;
    if (start > lastIndex) out.push(s.slice(lastIndex, start));
    out.push(s.slice(start, end)); // the delimiter itself
    lastIndex = end;
    if (m[0].length === 0) re.lastIndex++; // avoid zero-length loops
  }
  if (lastIndex < s.length) out.push(s.slice(lastIndex));
  return out;
}

/**
 * Link across non-skip chunks with optional single/limited occurrence.
 */
function linkAcrossChunks(params: {
  chunks: string[];
  needle: string;
  replacement: (match: string) => string;
  flags: string; // e.g., "gi"
  firstOnly: boolean;
  maxCount: number;
  matchWhole: boolean;
}): { chunks: string[]; linked: number } {
  const { chunks, needle, replacement, flags, firstOnly, maxCount, matchWhole } = params;
  if (!needle) return { chunks: chunks.slice(), linked: 0 };

  const re = buildNeedleRegex(needle, flags, matchWhole);
  let remaining = Math.max(1, maxCount || 1);
  let linked = 0;
  const out = chunks.slice();

  for (let i = 0; i < out.length; i++) {
    // Skip islands: <a>, <code>, <pre>, <hN> etc.
    if (isSkipIsland(out[i])) continue;

    if (firstOnly && linked > 0) break;
    if (remaining <= 0) break;

    const before = out[i];
    const r = replaceFirstOrLimited(before, re, replacement, firstOnly, remaining);
    if (r.linked > 0) {
      out[i] = r.text;
      linked += r.linked;
      remaining -= r.linked;
    }
  }
  return { chunks: out, linked };
}

function buildNeedleRegex(needle: string, flags: string, matchWhole: boolean): RegExp {
  const core = escapeRegex(needle);
  // Word boundaries can be tricky around non-word characters; we only apply when the ends are word-ish.
  if (matchWhole) {
    // (^|[^\\w]) (needle) (?=[^\\w]|$)
    return new RegExp(`(^|[^\\w])(${core})(?=[^\\w]|$)`, flags);
  }
  return new RegExp(core, flags);
}

function ensureNonGlobal(re: RegExp): RegExp {
  return re.global ? new RegExp(re.source, re.flags.replace("g", "")) : re;
}

function replaceFirstOrLimited(
  text: string,
  re: RegExp,
  replacement: (match: string) => string,
  firstOnly: boolean,
  limit: number
): { text: string; linked: number } {
  let linked = 0;

  if (firstOnly) {
    // IMPORTANT: use a NON-GLOBAL regex so only the first match is replaced.
    const single = ensureNonGlobal(re);
    const m = text.match(single);
    if (!m) return { text, linked: 0 };
    if (single.source.startsWith("(^|[^\\w])(")) {
      // matchWhole case: preserve leading boundary char
      return {
        text: text.replace(single, (_all, lead: string, core: string) => {
          linked = 1;
          return `${lead}${replacement(core)}`;
        }),
        linked,
      };
    }
    return {
      text: text.replace(single, (m0) => {
        linked = 1;
        return replacement(m0);
      }),
      linked,
    };
  }

  // Limited global-style replacement up to `limit`
  let output = "";
  let lastIndex = 0;
  const global = re.global ? re : new RegExp(re.source, re.flags + "g");
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = global.exec(text))) {
    if (linked >= limit) break;
    const start = match.index!;
    const end = start + match[0].length;
    output += text.slice(lastIndex, start);

    if (re.source.startsWith("(^|[^\\w])(") && match.length >= 3) {
      const lead = match[1] || "";
      const core = match[2] || "";
      output += `${lead}${replacement(core)}`;
    } else {
      output += replacement(match[0]);
    }

    lastIndex = end;
    linked++;
    if (match[0] === "") global.lastIndex++; // protect against zero-length matches
  }
  output += text.slice(lastIndex);
  return { text: linked > 0 ? output : text, linked };
}

function isSkipIsland(s: string): boolean {
  // Heuristic: if the chunk starts with a tag we skip (<a ...>, <code ...>, <pre ...>, <hN ...>)
  return /^<\s*(a|code|pre|h[1-6])\b/i.test(s);
}

function mutateArray<T>(target: T[], src: T[]) {
  target.length = 0;
  for (const x of src) target.push(x);
}

/** Utility to integrate a user-provided / pre-built RegExp into our union */
function stripRegexDelimiters(r: RegExp): string {
  return r.source;
}

/* --------------------- Optional sanitizers ---------------------
   For owner-authored content only. If processing untrusted HTML,
   use a robust sanitizer (e.g., DOMPurify on the server).
----------------------------------------------------------------- */

export function stripScripts(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export function stripInlineHandlers(html: string): string {
  // remove on*="..." and on*='...'
  return html
    .replace(/\s(on\w+)\s*=\s*"[^"]*"/gi, "")
    .replace(/\s(on\w+)\s*=\s*'[^']*'/gi, "");
}

/* --------------------------- Example ---------------------------
import { autoLink } from "./linker";

const { html, stats } = autoLink(inputHtml, {
  affiliateAnchors: [{ key: "plannerA5", text: "A5 planner" }],
  products: [{ key: "plannerA5", url: "https://shop.example.com/a5", utm: "utm_source=witchclick" }],
  internalLinks: [{ slug: "tea-ritual-for-focus", anchor: "tea ritual" }],
  firstOccurrenceOnly: true,
  matchWhole: false,
});
------------------------------------------------------------------ */
