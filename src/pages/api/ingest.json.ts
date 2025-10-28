// src/pages/api/ingest.json.ts

export type { PostSpecV2 } from '../../lib/postSpecSchema';
import fs from 'node:fs';
import path from 'node:path';

import { normalizePostSpec } from '../../../server/lib/ingestionAdapter.js';
import { validateStructure } from '../../../server/lib/structureValidation.js';
import { PostSpecV2Schema, type PostSpecV2 } from '../../lib/postSpecSchema';
import type { EntityType } from '../../lib/postSpecSchema';
import { validatePostSpec } from '../../lib/postSpecValidator';
import { slugify } from '../../../shared/slugify.js';
import type { ZodIssue } from 'zod';

/* ---------- helpers ---------- */

function safeReadJSON<T=any>(p:string, fallback:T): T {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; }
}

function ensureDirSync(dir:string){ fs.mkdirSync(dir, { recursive: true }); }

function ensureUniqueSlug(base:string, postsDir:string){
  const safe = slugify(base) || 'post';
  let slug = safe, n = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) slug = `${safe}-${n++}`;
  return slug;
}

function _wordCount(md:string){
  const withoutCode = md.replace(/```[\s\S]*?```/g,' ').replace(/`[^`]*`/g,' ');
  const withoutMd = withoutCode.replace(/<[^>]+>/g,' ').replace(/[\\*_#>~\\-]+/g,' ');
  const m = withoutMd.match(/\b[\p{L}\p{N}'']+\b/gu);
  return m ? m.length : 0;
}

function readingMinutes(words:number){ return Math.max(1, Math.round(words / 200)); }

function ensureEntityStubs(entities: {type:EntityType; slug:string}[]){
  const root = path.join(process.cwd(), 'content', 'entities');
  for (const e of entities||[]) {
    const dir = path.join(root, e.type);
    ensureDirSync(dir);
    const p = path.join(dir, `${e.slug}.json`);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, JSON.stringify({
        type: e.type, name: e.slug.replace(/-/g,' '), slug: e.slug,
        summary: `${e.slug.replace(/-/g,' ')} — stub entity`,
        properties: {}, related: []
      }, null, 2), 'utf8');
    }
  }
}

function ensurePostStubs(internalLinkHints: string[], postsDir: string, siteUrl: string): string[] {
  const createdStubs: string[] = [];

  for (const anchor of internalLinkHints || []) {
    if (!anchor) continue;

    const candidateSlug = slugify(anchor);
    if (!candidateSlug) continue;

    const postPath = path.join(postsDir, `${candidateSlug}.md`);
    if (fs.existsSync(postPath)) continue; // Post already exists

    const title = anchor.replace(/\b\w/g, (m) => m.toUpperCase());
    const frontmatter = {
      title,
      slug: candidateSlug,
      excerpt: `Placeholder post for "${title}".`,
      metaTitle: title,
      metaDescription: `This is a placeholder post that was auto-generated from an internal link reference. Content coming soon.`,
      tags: ['placeholder', 'stub'],
      outline: ['Placeholder'],
      wordCount: 50,
      readingMinutes: 1,
      entities: [],
      includeAds: false,
      includeKofi: false,
      affiliateAnchors: [],
      internalLinkHints: [],
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${siteUrl}/post/${candidateSlug}`,
      specVersion: 2 as const,
      draft: true,
    };

    const contents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n## Placeholder\n\nThis post was automatically created as a stub from an internal link reference. Please replace this content.\n`;

    fs.writeFileSync(postPath, contents, 'utf8');
    createdStubs.push(`content/posts/${candidateSlug}.md`);
  }

  return createdStubs;
}

function toFrontmatterYAML(obj: Record<string, any>) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) { lines.push(`${k}: null`); continue; }
    if (typeof v === 'string') { lines.push(`${k}: ${JSON.stringify(v)}`); continue; }
    if (typeof v === 'number' || typeof v === 'boolean') { lines.push(`${k}: ${v}`); continue; }
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

function normalizeCta(cta:any): { type:'kofi'|'download'|'none'; id?:string }{
  if (!cta || typeof cta !== 'object') return { type:'none' };
  const t = String(cta.type||'').toLowerCase();
  if (t==='kofi') return { type:'kofi', id: cta.id || undefined };
  if (t==='download') return { type:'download', id: cta.id || undefined };
  return { type:'none' };
}

/* ---------- handler ---------- */

export async function POST({ request }: { request: Request }) {
  try {
    let input: unknown = null;

    // 1) Try JSON first
    try { input = await request.json(); } catch {}

    // 2) Fallback to text() → JSON.parse
    if (!input) {
      try {
        const txt = await request.text();
        if (txt && txt.trim()) input = JSON.parse(txt);
      } catch {}
    }

    // 3) Fallback to multipart/form-data
    if (!input) {
      try {
        const form = await request.formData();
        const raw = (form.get('json') || form.get('body') || '') as string;
        if (typeof raw === 'string' && raw.trim()) input = JSON.parse(raw);
      } catch {}
    }

    if (!input) {
      return json({ ok:false, error:'No JSON body provided. Paste a PostSpec v2 object.' }, 400);
    }

    const CWD = process.cwd();
    const PRODUCTS_PATH = path.join(CWD, 'content', 'products.json');
    const products = safeReadJSON<{ products: { key: string }[] }>(PRODUCTS_PATH, { products: [] });
    const allowedAffiliateKeys = Array.isArray(products.products)
      ? products.products.map((product) => String(product?.key || '').trim()).filter(Boolean)
      : [];

    let normalizationReport: string[] = [];
    let normalizationWarnings: string[] = [];
    let normalizedSpec: PostSpecV2;
    try {
      const { spec, report, warnings } = normalizePostSpec(input, { allowedAffiliateKeys });
      normalizedSpec = spec;
      normalizationReport = report;
      normalizationWarnings = Array.isArray(warnings) ? [...warnings] : [];
    } catch (error: any) {
      return json({ ok:false, error: error?.message || String(error) }, 400);
    }

    const parsed = PostSpecV2Schema.safeParse(normalizedSpec);
    if (!parsed.success) {
      const schemaErrors = parsed.error.issues.map((issue: ZodIssue) => {
        const path = issue.path.join('.') || 'root';
        return `${path}: ${issue.message}`;
      });
      return json({ ok:false, error: schemaErrors[0], errors: schemaErrors, warnings: normalizationWarnings, normalizations: normalizationReport }, 400);
    }

    const spec = parsed.data;

    const enforcement = validatePostSpec(spec, {
      targetWordCount: 1200,
      allowedAffiliateKeys,
    });
    if (!enforcement.valid) {
      const warnings = [...new Set([...normalizationWarnings, ...enforcement.warnings])];
      return json({ ok: false, error: enforcement.errors[0], errors: enforcement.errors, warnings, normalizations: normalizationReport }, 400);
    }

    const contentWords = enforcement.wordCount;

    // Structural + soft validation
    const structureResult = validateStructure(spec, contentWords);
    if (structureResult.errors.length) {
      const warnings = [...new Set([...normalizationWarnings, ...enforcement.warnings, ...structureResult.warnings])];
      return json({ ok:false, error: structureResult.errors[0], errors: structureResult.errors, warnings, normalizations: normalizationReport }, 400);
    }

    // Paths & settings
    const POSTS_DIR = path.join(CWD, 'content', 'posts');
    const SETTINGS_PATH = path.join(CWD, 'content', 'settings.json');
    ensureDirSync(POSTS_DIR);

    const settings = safeReadJSON(SETTINGS_PATH, { siteUrl: 'https://example.com' });

    // Slug + counts
    const baseSlug = slugify(spec.slug || spec.title);
    const slug = ensureUniqueSlug(baseSlug, POSTS_DIR);

    // Frontmatter
    const downloadId = spec.cta?.type === 'download' ? spec.cta.id ?? '' : undefined;

    const outlineHeadings = spec.outline.map(
      (outlineItem: PostSpecV2["outline"][number]) => outlineItem.heading,
    );
    const affiliateAnchors = (spec.affiliateHints || []).map(
      (hint: PostSpecV2["affiliateHints"][number]) => ({
        key: hint.key,
        text: hint.anchor,
        insertedCount: 0,
      }),
    );
    const internalLinkHints = (spec.internalLinkHints || [])
      .map((hint: PostSpecV2["internalLinkHints"][number]) =>
        String(hint?.anchor || "").trim(),
      )
      .filter((anchor: string) => anchor.length > 0);
    const fm = {
      title: spec.title,
      slug,
      excerpt: spec.excerpt,
      metaTitle: spec.title,
      metaDescription: spec.metaDescription,
      tags: spec.tags,
      outline: outlineHeadings,
      wordCount: contentWords,
      readingMinutes: readingMinutes(contentWords),
      entities: spec.entities || [],
      includeAds: !!(spec.adPlacements && spec.adPlacements.length),
      includeKofi: normalizeCta(spec.cta).type === 'kofi',
      downloadId,
      affiliateAnchors,
      internalLinkHints,
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${String(settings.siteUrl||'').replace(/\/$/,'')}/post/${slug}`,
      specVersion: 2 as const
    };

    ensureEntityStubs(fm.entities);

    const siteUrl = String(settings.siteUrl||'').replace(/\/$/,'');
    const createdPostStubs = ensurePostStubs(internalLinkHints, POSTS_DIR, siteUrl);

    const body = (spec.sections || [])
      .map((section: PostSpecV2["sections"][number]) =>
        `## ${section.heading}\n\n${String(section.markdown || '').trim()}\n`,
      )
      .join('\n');

    const file = `---\n${toFrontmatterYAML(fm)}\n---\n\n${body}\n`;

    const outPath = path.join(POSTS_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, file, 'utf8');

    const combinedWarnings = [...new Set([...normalizationWarnings, ...enforcement.warnings, ...structureResult.warnings])];

    return json({
      ok:true,
      slug,
      path:`content/posts/${slug}.md`,
      words: contentWords,
      warnings: combinedWarnings,
      normalizations: normalizationReport,
      createdPostStubs,
    });
  } catch (e: any) {
    return json({ ok:false, error: e?.message || String(e) }, 500);
  }
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
