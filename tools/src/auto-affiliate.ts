// tools/src/auto-affiliate.ts
// Auto-detect affiliate anchor phrases from product metadata and link the first sensible match.
// Uses the existing autoLink() so it still skips <a>, <code>, <pre>, <hN> and adds proper rel/target.

import { autoLink, type Product } from "./linker";

export type AutoAffOpts = {
  // hard cap per article to avoid overlinking
  maxLinksPerPost?: number; // default 3
  // if true, we only link products whose name (or derived phrase) actually appears
  // (always true here; just keeping option for the future)
  cautious?: boolean; // default true
};

export type AutoAffResult = {
  html: string;
  used: Array<{ key: string; anchor: string }>;
  count: number;
};

const COMMON_ADJ = new Set([
  "soft", "minimal", "premium", "classic", "pro", "starter", "bundle", "set",
  "mesh", "fine", "portable", "eco", "basic", "deluxe", "kit", "pack", "gift",
  "dawn", "sunrise", "midnight"
]);

const COLORS = new Set([
  "black","white","grey","gray","silver","gold","beige","brown","red","orange","yellow","green","blue","purple","violet","pink","teal","navy","cream"
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = String(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function titlecase(s: string) {
  return s.replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
}

function buildTagPhrase(tags?: string[]): string | null {
  if (!Array.isArray(tags)) return null;
  const tl = tags.map((t) => t.toLowerCase().trim());
  // simple combos we care about
  if (tl.includes("tea") && tl.includes("strainer")) return "tea strainer";
  if (tl.includes("oracle") && tl.includes("deck")) return "oracle deck";
  if (tl.includes("tarot") && tl.includes("deck")) return "tarot deck";
  if (tl.includes("planner") && tl.some((t) => /^a\d$/.test(t))) {
    const size = tl.find((t) => /^a\d$/.test(t))!;
    return `${size.toUpperCase()} planner`;
  }
  return null;
}

function deriveAnchorsFromName(name?: string, brand?: string): string[] {
  if (!name) return [];
  const raw = String(name).trim();

  const anchors: string[] = [];

  // 1) full product name as-is
  anchors.push(raw);

  const toks = tokenize(raw).filter((w) => !(COMMON_ADJ.has(w) || COLORS.has(w)));
  const brandTok = brand ? tokenize(brand)[0] : null;

  // drop brand if it leads
  const core = brandTok && toks[0] === brandTok ? toks.slice(1) : toks.slice();

  // 2) if looks like "A5 planner", ensure that exact phrase
  const aSize = raw.match(/\bA[0-9]\b/i);
  if (aSize && core.includes("planner")) {
    anchors.push(`${aSize[0].toUpperCase()} planner`);
  }

  // 3) last two words (common for things like "tea strainer", "oracle deck")
  if (core.length >= 2) {
    anchors.push(`${core[core.length - 2]} ${core[core.length - 1]}`);
  }

  // 4) last noun-ish word alone if it’s meaningful
  const last = core[core.length - 1];
  if (last && last.length >= 4) anchors.push(last);

  // Massage: collapse spaces, limit length, titlecase where it helps readability
  return dedupe(
    anchors
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 4 && s.length <= 48)
      .map((s) => /\b[a-z]/.test(s) && /[A-Z]/.test(name!) ? s : titlecase(s)) // try to look human without shouting
  );
}

export function suggestAnchorsForProduct(p: Product & { name?: string; brand?: string; tags?: string[] }): string[] {
  const list = [
    ...deriveAnchorsFromName(p.name, p.brand),
  ];
  const tagPhrase = buildTagPhrase(p.tags);
  if (tagPhrase) list.push(titlecase(tagPhrase));
  return dedupe(list);
}

/**
 * Try to auto-insert up to `maxLinksPerPost` affiliate links by scanning the HTML
 * and attempting one good anchor per product, first occurrence only.
 */
export function autoLinkAffiliates(
  inputHtml: string,
  products: Array<Product & { name?: string; brand?: string; tags?: string[] }>,
  opts: AutoAffOpts = {}
): AutoAffResult {
  const maxLinksPerPost = opts.maxLinksPerPost ?? 3;
  let html = String(inputHtml || "");
  const used: Array<{ key: string; anchor: string }> = [];
  let count = 0;

  for (const prod of products) {
    if (count >= maxLinksPerPost) break;
    if (!prod?.key || !prod?.url) continue;

    const anchors = suggestAnchorsForProduct(prod);
    if (!anchors.length) continue;

    let linked = false;

    for (const a of anchors) {
      if (count >= maxLinksPerPost) break;

      const { html: nextHtml, stats } = autoLink(html, {
        affiliateAnchors: [{ key: prod.key, text: a }],
        products: [prod],
        firstOccurrenceOnly: true,
      });

      if (stats.affiliateCount > 0) {
        html = nextHtml;
        used.push({ key: prod.key, anchor: a });
        count++;
        linked = true;
        break; // one link per product max
      }
    }

    // if this product had no usable anchors in the content, move on
    if (!linked) continue;
  }

  return { html, used, count };
}
