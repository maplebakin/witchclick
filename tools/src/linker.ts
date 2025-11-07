// tools/src/linker.ts
// Robust, DOM-free auto-linker for affiliate + internal links and a CLI to
// populate `internalLinks` frontmatter from `internalLinkHints`.
// - First occurrence only per anchor text (configurable)
// - Skips <a>, <code>, <pre>, and headings by default (configurable)
// - Adds rel="sponsored nofollow noopener noreferrer" + target for affiliate anchors
// - Optional UTM handling for affiliate URLs
// - Supports internal post links
// - Returns stats so pages can decide whether to show disclosures, etc.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

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
        )}" data-affiliate="true" data-analytics="aff_click" data-analytics-meta="${escapeAttr(prod.key)}">${m}</a>`,
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
type FrontmatterLink = { slug: string; anchor: string; title?: string };

type PostRecord = {
  file: string;
  slug: string;
  title: string;
  href: string;
  slugNorm: string;
  titleNorm: string;
};

type PostIndex = {
  bySlug: Map<string, PostRecord>;
  byTitle: Map<string, PostRecord>;
  all: PostRecord[];
};

type LinkerFlags = {
  apply: boolean;
  debug: boolean;
  dir?: string;
};

export async function linkerCmd(argv: string[] = []): Promise<number> {
  const effectiveArgv = resolveCliArgv(argv);
  const flags = parseLinkerArgv(effectiveArgv);
  const debugLog = (...args: any[]) => {
    if (flags.debug) console.log('[linker]', ...args);
  };

  const candidateDirs = flags.dir
    ? [path.resolve(flags.dir)]
    : [
        path.join(process.cwd(), 'content', 'posts'),
        path.join(process.cwd(), 'src', 'content', 'posts'),
      ];

  const postsDir = candidateDirs.find((dir) => fs.existsSync(dir));
  if (!postsDir) {
    console.error('[linker] Posts directory not found. Checked:', candidateDirs.join(', '));
    return 1;
  }

  const files = readDirRecursive(postsDir);
  if (!files.length) {
    console.log(`[linker] No posts found in ${postsDir}`);
    return 0;
  }

  const index = buildIndex(files);
  let touched = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const slug = sanitizeSlug(parsed.data?.slug ?? slugFromFile(file));
    const hintsRaw = Array.isArray(parsed.data?.internalLinkHints)
      ? parsed.data.internalLinkHints
      : [];

    if (!hintsRaw.length) {
      debugLog('skip (no hints):', slug || path.basename(file));
      continue;
    }

    const desiredLinks: FrontmatterLink[] = [];
    for (const hint of hintsRaw) {
      const anchor = anchorFromHint(hint);
      if (!anchor) continue;
      const match = bestMatch(anchor, index, slug);
      if (!match || match.slug === slug) {
        debugLog(`no match for "${anchor}" from ${slug || path.basename(file)}`);
        continue;
      }
      desiredLinks.push({ slug: match.slug, anchor, title: match.title });
    }

    const uniqueDesired = uniqueLinks(desiredLinks);
    const currentLinks = normalizeExistingLinks(parsed.data?.internalLinks);

    if (linksEqual(currentLinks, uniqueDesired)) {
      debugLog('no change:', slug || path.basename(file));
      continue;
    }

    parsed.data.internalLinks = uniqueDesired.map((link) =>
      link.title
        ? { slug: link.slug, anchor: link.anchor, title: link.title }
        : { slug: link.slug, anchor: link.anchor },
    );

    if (flags.apply) {
      const output = matter.stringify(parsed.content, parsed.data);
      fs.writeFileSync(file, output, 'utf8');
      console.log(
        `[linker] ${slug || path.basename(file)} — wrote ${uniqueDesired.length} links (${path.relative(
          process.cwd(),
          file,
        )})`,
      );
      touched++;
    } else {
      console.log(
        `[linker][dry] ${slug || path.basename(file)} → would write ${uniqueDesired.length} links (${path.relative(
          process.cwd(),
          file,
        )})`,
      );
    }
  }

  console.log(
    flags.apply
      ? `[linker] Done. Updated ${touched} file(s).`
      : '[linker] Done. Rerun with --apply to write changes.',
  );
  return 0;
}

// aliases so wcMain can find one regardless
export const linker = linkerCmd;
export default linkerCmd;

function resolveCliArgv(argv: string[]): string[] {
  if (argv.length > 0) return argv;
  const raw = process.argv.slice(2);
  if (raw[0] === 'linker') return raw.slice(1);
  return raw;
}

function parseLinkerArgv(argv: string[]): LinkerFlags {
  const flags: LinkerFlags = { apply: false, debug: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      flags.apply = true;
      continue;
    }
    if (arg === '--debug') {
      flags.debug = true;
      continue;
    }
    if (arg === '--dir') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags.dir = next;
        i++;
      }
      continue;
    }
  }
  return flags;
}

function readDirRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function slugFromFile(file: string): string {
  return path.basename(file).replace(/\.(md|mdx)$/i, '');
}

function sanitizeSlug(slug: string): string {
  let out = String(slug || '').trim();
  if (!out) return '';
  if (out.startsWith('/post/')) out = out.slice('/post/'.length);
  out = out.replace(/^\/+/, '').replace(/\/+$/, '');
  return out;
}

function normalizeText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugFromHref(href: string): string {
  let target = String(href || '').trim();
  if (!target) return '';
  try {
    const url = new URL(target, 'https://example.com');
    target = url.pathname;
  } catch {
    // ignore
  }
  return sanitizeSlug(target);
}

function buildIndex(files: string[]): PostIndex {
  const bySlug = new Map<string, PostRecord>();
  const byTitle = new Map<string, PostRecord>();
  const all: PostRecord[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const slug = sanitizeSlug(parsed.data?.slug ?? slugFromFile(file));
    const title = String(parsed.data?.title ?? slug) || slug;
    const record: PostRecord = {
      file,
      slug,
      title,
      href: `/post/${slug}`,
      slugNorm: normalizeText(slug),
      titleNorm: normalizeText(title),
    };
    if (record.slugNorm) bySlug.set(record.slugNorm, record);
    if (record.titleNorm) byTitle.set(record.titleNorm, record);
    all.push(record);
  }

  return { bySlug, byTitle, all };
}

function bestMatch(anchor: string, index: PostIndex, currentSlug: string): PostRecord | null {
  const norm = normalizeText(anchor);
  if (!norm) return null;

  const slugMatch = index.bySlug.get(norm);
  if (slugMatch && slugMatch.slug !== currentSlug) return slugMatch;

  const titleMatch = index.byTitle.get(norm);
  if (titleMatch && titleMatch.slug !== currentSlug) return titleMatch;

  for (const record of index.all) {
    if (record.slug === currentSlug) continue;
    if (
      (record.titleNorm && record.titleNorm.includes(norm)) ||
      (record.slugNorm && norm.includes(record.slugNorm))
    ) {
      return record;
    }
  }

  return null;
}

function anchorFromHint(hint: any): string {
  if (typeof hint === 'string') return hint.trim();
  if (!hint || typeof hint !== 'object') return '';
  if (typeof hint.anchor === 'string') return hint.anchor.trim();
  if (typeof hint.text === 'string') return hint.text.trim();
  if (typeof hint.target === 'string') return hint.target.trim();
  return '';
}

function uniqueLinks(links: FrontmatterLink[]): FrontmatterLink[] {
  const seen = new Set<string>();
  const out: FrontmatterLink[] = [];
  for (const link of links) {
    if (!link.slug || !link.anchor) continue;
    const key = `${link.slug}__${normalizeText(link.anchor)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

function normalizeExistingLinks(raw: any): FrontmatterLink[] {
  if (!Array.isArray(raw)) return [];
  const out: FrontmatterLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const anchor = anchorFromLinkEntry(entry);
    const slug = slugFromLinkEntry(entry);
    if (!anchor || !slug) continue;
    const title = typeof entry.title === 'string' ? entry.title : undefined;
    out.push({ slug, anchor, title });
  }
  return uniqueLinks(out);
}

function anchorFromLinkEntry(entry: any): string {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry.anchor === 'string') return entry.anchor.trim();
  if (typeof entry.text === 'string') return entry.text.trim();
  return '';
}

function slugFromLinkEntry(entry: any): string {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.slug === 'string') return sanitizeSlug(entry.slug);
  if (typeof entry.href === 'string') return slugFromHref(entry.href);
  return '';
}

function linksEqual(a: FrontmatterLink[], b: FrontmatterLink[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].slug !== b[i].slug) return false;
    if (a[i].anchor !== b[i].anchor) return false;
    const titleA = a[i].title ?? '';
    const titleB = b[i].title ?? '';
    if (titleA !== titleB) return false;
  }
  return true;
}
