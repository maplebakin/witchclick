// src/pages/api/ingest.json.ts
export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

type EntityType = 'crystal'|'herb'|'moonPhase'|'tarot'|'planetaryDay'|'ritual';
const CONTENT_TYPES = ['ritual','guide','spread'] as const;
export type PostContentType = typeof CONTENT_TYPES[number];

export interface PostSpecV2 {
  specVersion: 2;
  title: string;
  slug: string;
  contentType?: PostContentType;
  metaDescription: string;
  tags: string[];
  excerpt: string;
  outline: { heading: string; id: string }[];
  sections: { heading: string; markdown: string }[];
  entities: { type: EntityType; slug: string }[];
  heroImagePrompt: string | null;
  altTexts: string[];
  internalLinkHints: { anchor: string; rationale: string }[];
  affiliateHints: { key: string; anchor: string; rationale: string }[];
  cta: { type: 'kofi'|'download'|'none'; id?: string };
  adPlacements: ('lead'|'mid'|'end')[];
}

/* ---------- helpers ---------- */

function safeReadJSON<T=any>(p:string, fallback:T): T {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; }
}

function ensureDirSync(dir:string){ fs.mkdirSync(dir, { recursive: true }); }

function slugify(s:string){
  return String(s||'')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function ensureUniqueSlug(base:string, postsDir:string){
  const safe = slugify(base) || 'post';
  let slug = safe, n = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) slug = `${safe}-${n++}`;
  return slug;
}

function wordCount(md:string){
  const withoutCode = md.replace(/```[\s\S]*?```/g,' ').replace(/`[^`]*`/g,' ');
  const withoutMd = withoutCode.replace(/<[^>]+>/g,' ').replace(/[\\*_#>~\\-]+/g,' ');
  const m = withoutMd.match(/\b[\p{L}\p{N}’']+\b/gu);
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

function needsSafetyNote(sections: {heading:string; markdown:string}[]){
  const text = sections.map(s => `${s.heading}\n${s.markdown}`).join('\n').toLowerCase();
  return /candle|open flame|fire|smoke|incense|knife|scissors|burn|trauma|panic|anxiety|depression/.test(text);
}

function hasSafetySection(sections: {heading:string; markdown:string}[]){
  return sections.some(sec => /safety|note|disclaimer/i.test(sec.heading));
}

function isPostContentType(value: unknown): value is PostContentType {
  return typeof value === 'string' && CONTENT_TYPES.includes(value as PostContentType);
}

function resolveContentType(spec: PostSpecV2, warnings: string[]): PostContentType {
  const raw = spec.contentType as unknown;
  if (isPostContentType(raw)) {
    spec.contentType = raw;
    return raw;
  }
  if (raw !== undefined && raw !== null) {
    warnings.push(`Unknown contentType "${raw}", defaulting to "ritual".`);
  }
  spec.contentType = 'ritual';
  return 'ritual';
}

export function validateStructure(spec: PostSpecV2, contentWords:number){
  const errors:string[] = [];
  const warnings:string[] = [];

  const contentType = resolveContentType(spec, warnings);

  const missing = ['specVersion','title','slug','contentType','metaDescription','tags','excerpt','outline','sections','affiliateHints','internalLinkHints','cta','adPlacements']
    .filter(k => (spec as any)[k] === undefined);
  if (missing.length) errors.push(`Missing fields: ${missing.join(', ')}`);

  if (spec.specVersion !== 2) errors.push('specVersion must be 2');
  if (!Array.isArray(spec.tags) || spec.tags.length < 4 || spec.tags.length > 7) errors.push('tags must be 4–7');

  const mdLen = (spec.metaDescription||'').length;
  if (mdLen < 150 || mdLen > 160) warnings.push(`metaDescription length ≈${mdLen} (target 150–160)`);

  // Required sections
  const heads = (spec.sections||[]).map(s => String(s.heading||'').toLowerCase());
  const body = (spec.sections||[]).map(s => s.markdown||'').join('\n').toLowerCase();

  const hasOpening =
    heads.includes('opening reflection') ||
    heads.some(h => /^opening/.test(h) && /reflection|scene|note/.test(h));
  if (!hasOpening) errors.push('Missing section: Opening Reflection');

  const hasQuick = heads.some(h => /quick|low[- ]?energy|5[- ]?minute/.test(h)) || /quick|low[- ]?energy/.test(body);
  const hasDeep  = heads.some(h => /deep( dive)?|long(er)?/.test(h)) || /deep( dive)?/.test(body);
  const variantsRequired = contentType === 'ritual';
  if (variantsRequired && !(hasQuick && hasDeep)) {
    errors.push('Ritual posts require both Quick/Low-Energy and Deep variants.');
  }

  const hasChecklist = heads.some(h => /checklist|summary|at a glance/.test(h));
  if (!hasChecklist) errors.push('Missing section: Checklist/Summary');

  const hasReflect = heads.some(h => /reflection prompt|journal|reflection/.test(h)) || /prompt|question/.test(body);
  if (!hasReflect) errors.push('Missing section: Reflection Prompt');

  // heroImagePrompt type
  if (!(typeof spec.heroImagePrompt === 'string' || spec.heroImagePrompt === null)) {
    errors.push('heroImagePrompt must be string or null');
  }

  // internal link hints count (soft)
  if (!Array.isArray(spec.internalLinkHints) || spec.internalLinkHints.length < 3) {
    warnings.push('internalLinkHints are sparse (aim 5–8).');
  }

  // anchors-in-prose check (soft)
  const prose = body.toLowerCase();
  const missingAnchors = (spec.internalLinkHints||[])
    .map(h => String(h.anchor||'').toLowerCase())
    .filter(a => a && !prose.includes(a));
  if (missingAnchors.length) {
    warnings.push(`Some internalLinkHints anchors not found verbatim in prose: ${missingAnchors.slice(0,5).join(', ')}${missingAnchors.length>5?'…':''}`);
  }

  // affiliate density (soft)
  const maxAnchors = Math.floor(contentWords/250) + 1;
  const affCount = Array.isArray(spec.affiliateHints) ? spec.affiliateHints.length : 0;
  if (affCount > maxAnchors) warnings.push(`Affiliate density high (${affCount} > ${maxAnchors}); aim ≤ ~1 per 250 words.`);

  // safety note heuristic (soft)
  if (needsSafetyNote(spec.sections) && !hasSafetySection(spec.sections)) {
    warnings.push('Content looks like it needs a safety note, but none was found.');
  }

  // image alt texts (soft)
  const imagesMentioned = (spec.sections||[]).some(s => /!\[[^\]]*\]\([^)]+\)/.test(s.markdown));
  if (imagesMentioned && (!Array.isArray(spec.altTexts) || spec.altTexts.length === 0)) {
    warnings.push('Images appear in markdown but altTexts is empty.');
  }

  return { errors, warnings };
}

/* ---------- handler ---------- */

export async function POST({ request }: { request: Request }) {
  try {
    let spec: PostSpecV2 | null = null;

    // 1) Try JSON first
    try { spec = await request.json(); } catch {}

    // 2) Fallback to text() → JSON.parse
    if (!spec) {
      try {
        const txt = await request.text();
        if (txt && txt.trim()) spec = JSON.parse(txt);
      } catch {}
    }

    // 3) Fallback to multipart/form-data
    if (!spec) {
      try {
        const form = await request.formData();
        const raw = (form.get('json') || form.get('body') || '') as string;
        if (typeof raw === 'string' && raw.trim()) spec = JSON.parse(raw);
      } catch {}
    }

    if (!spec) return json({ ok:false, error:'No JSON body provided. Paste a PostSpec v2 object.' }, 400);

    // Compute word count upfront for density checks
    const contentWords = (spec.sections||[]).reduce((n,s)=> n + wordCount(s.markdown||''), 0);

    // Structural + soft validation
    const { errors, warnings } = validateStructure(spec, contentWords);
    if (errors.length) return json({ ok:false, error: errors[0], errors, warnings }, 400);

    // Paths & settings
    const CWD = process.cwd();
    const POSTS_DIR = path.join(CWD, 'content', 'posts');
    const SETTINGS_PATH = path.join(CWD, 'content', 'settings.json');
    ensureDirSync(POSTS_DIR);

    const settings = safeReadJSON(SETTINGS_PATH, { siteUrl: 'https://example.com' });

    // Slug + counts
    const baseSlug = slugify(spec.slug || spec.title);
    const slug = ensureUniqueSlug(baseSlug, POSTS_DIR);

    // Frontmatter
    const downloadId = spec.cta?.type === 'download' ? spec.cta.id ?? '' : undefined;

    const fm = {
      title: spec.title,
      slug,
      excerpt: spec.excerpt,
      metaTitle: spec.title,
      metaDescription: spec.metaDescription,
      tags: spec.tags,
      outline: spec.outline.map(o=>o.heading),
      wordCount: contentWords,
      readingMinutes: readingMinutes(contentWords),
      entities: spec.entities || [],
      includeAds: !!(spec.adPlacements && spec.adPlacements.length),
      includeKofi: normalizeCta(spec.cta).type === 'kofi',
      downloadId,
      affiliateAnchors: (spec.affiliateHints||[]).map(h=>({ key:h.key, text:h.anchor, insertedCount:0 })),
      internalLinkHints: (spec.internalLinkHints||[])
        .map(h => String(h?.anchor || '').trim())
        .filter(anchor => anchor.length > 0),
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${String(settings.siteUrl||'').replace(/\/$/,'')}/post/${slug}`,
      specVersion: 2 as const
    };

    ensureEntityStubs(fm.entities);

    const body = (spec.sections||[])
      .map(s => `## ${s.heading}\n\n${String(s.markdown||'').trim()}\n`)
      .join('\n');

    const file = `---\n${toFrontmatterYAML(fm)}\n---\n\n${body}\n`;

    const outPath = path.join(POSTS_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, file, 'utf8');

    return json({ ok:true, slug, path:`content/posts/${slug}.md`, words: contentWords, warnings });
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
