// src/pages/api/ingest.json.ts
export const prerender = false;

import fs from 'node:fs';

type EntityType = 'crystal'|'herb'|'moonPhase'|'tarot'|'planetaryDay'|'ritual';

interface PostSpecV2 {
  specVersion: 2;
  title: string;
  slug: string;
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

function slugify(s: string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function ensureUniqueSlug(base: string){
  const dir = './content/posts'; let slug = base, n = 2;
  while (fs.existsSync(`${dir}/${slug}.md`)) slug = `${base}-${n++}`;
  return slug;
}
function wordCount(md: string){ return (md.replace(/[`*_#>\-\n]/g,' ').match(/\b[\w’']+\b/g)||[]).length; }
function readingMinutes(words: number){ const wpm = 200; return Math.max(1, Math.round(words / wpm)); }
function ensureEntityStubs(entities: {type:EntityType; slug:string}[]){
  for (const e of entities) {
    const p = `./content/entities/${e.type}/${e.slug}.json`;
    if (!fs.existsSync(p)) {
      fs.mkdirSync(`./content/entities/${e.type}`, { recursive: true });
      fs.writeFileSync(p, JSON.stringify({
        type: e.type, name: e.slug.replace(/-/g,' '), slug: e.slug,
        summary: `${e.slug.replace(/-/g,' ')} — stub entity`,
        properties: {}, related: []
      }, null, 2));
    }
  }
}
function toFrontmatterYAML(obj: Record<string, any>) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) lines.push(`${k}: ${JSON.stringify(v)}`);
    else if (typeof v === 'string') lines.push(`${k}: ${v.includes(':') || v.includes('- ') ? JSON.stringify(v) : v}`);
    else lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

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

    // Basic validation
    const missing = ['specVersion','title','slug','metaDescription','tags','excerpt','outline','sections','affiliateHints','internalLinkHints','cta','adPlacements']
      .filter(k => (spec as any)[k] === undefined);
    if (missing.length) return json({ ok:false, error:`Missing fields: ${missing.join(', ')}` }, 400);
    if (spec.specVersion !== 2) return json({ ok:false, error:'specVersion must be 2' }, 400);
    if (!Array.isArray(spec.tags) || spec.tags.length < 4 || spec.tags.length > 7) return json({ ok:false, error:'tags must be 4–7' }, 400);

    // Compute slug and counts
    const baseSlug = slugify(spec.slug || spec.title);
    const slug = ensureUniqueSlug(baseSlug);
    const totalWords = spec.sections.reduce((n, s) => n + wordCount(s.markdown), 0);

    // Frontmatter
    const settings = JSON.parse(fs.readFileSync('./content/settings.json','utf8'));
    const fm = {
      title: spec.title,
      slug,
      excerpt: spec.excerpt,
      metaTitle: spec.title,
      metaDescription: spec.metaDescription,
      tags: spec.tags,
      outline: spec.outline.map(o=>o.heading),
      wordCount: totalWords,
      readingMinutes: readingMinutes(totalWords),
      entities: spec.entities || [],
      includeAds: !!(spec.adPlacements && spec.adPlacements.length),
      includeKofi: spec.cta?.type === 'kofi',
      affiliateAnchors: (spec.affiliateHints||[]).map(h=>({ key:h.key, text:h.anchor, insertedCount:0 })),
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${settings.siteUrl.replace(/\/$/,'')}/post/${slug}`,
      specVersion: 2 as const
    };

    ensureEntityStubs(fm.entities);

    const body = spec.sections.map(s => `## ${s.heading}\n\n${s.markdown.trim()}\n`).join('\n');
    const file = `---\n${toFrontmatterYAML(fm)}\n---\n\n${body}\n`;

    fs.mkdirSync('./content/posts', { recursive: true });
    fs.writeFileSync(`./content/posts/${slug}.md`, file);

    return json({ ok:true, slug, path:`content/posts/${slug}.md`, words: totalWords });
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
