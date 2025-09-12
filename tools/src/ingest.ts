// tools/src/ingest.ts
import fs from 'node:fs';
import matter from 'gray-matter';
import { ensureEntityStubs, ensureUniqueSlug, readJSON, readingMinutes, slugify, toYAML, wordCountFromMarkdown, writeFileEnsure } from './utils';
import type { PostSpecV2, Frontmatter } from './types';

export async function ingest(args:string[]){
  const fromIdx = args.indexOf('--from-file');
  let json: PostSpecV2;
  if (fromIdx>=0) {
    json = JSON.parse(fs.readFileSync(args[fromIdx+1],'utf8'));
  } else {
    const raw = await new Promise<string>(res=>{
      let s=''; process.stdin.setEncoding('utf8');
      process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>res(s));
    });
    json = JSON.parse(raw);
  }

  assertSpec(json);
  const settings = readJSON('./content/settings.json');

  const baseSlug = slugify(json.slug || json.title);
  const slug = ensureUniqueSlug(baseSlug);
  const totalWords = json.sections.reduce((n,s)=> n + wordCountFromMarkdown(s.markdown), 0);
  const fm: Frontmatter = {
    title: json.title,
    slug,
    excerpt: json.excerpt,
    metaTitle: json.title,
    metaDescription: json.metaDescription,
    tags: json.tags,
    outline: json.outline.map(o=>o.heading),
    wordCount: totalWords,
    readingMinutes: readingMinutes(totalWords),
    entities: json.entities || [],
    includeAds: json.adPlacements && json.adPlacements.length>0,
    includeKofi: json.cta?.type === 'kofi',
    affiliateAnchors: (json.affiliateHints||[]).map(h=>({ key: h.key, text: h.anchor, insertedCount: 0 })),
    internalLinks: [],
    publishedAt: new Date().toISOString(),
    canonicalUrl: `${settings.siteUrl.replace(/\/$/,'')}/post/${slug}`,
    specVersion: 2
  };

  ensureEntityStubs(fm.entities);

  const body = json.sections.map(s=>`## ${s.heading}\n\n${s.markdown.trim()}\n`).join('\n');
  const file = `---\n${toYAML(fm)}\n---\n\n${body}\n`;
  writeFileEnsure(`./content/posts/${slug}.md`, file);
  process.stdout.write(`Created content/posts/${slug}.md\n`);
}

function assertSpec(s:PostSpecV2){
  if(s.specVersion!==2) throw new Error('specVersion must be 2');
  const req = ['title','slug','metaDescription','tags','excerpt','outline','sections','affiliateHints','internalLinkHints','cta','adPlacements'] as const;
  for(const k of req) if((s as any)[k]===undefined) throw new Error(`Missing field: ${k}`);
  if(s.tags.length<4 || s.tags.length>7) throw new Error('tags must be 4–7');
  if(s.metaDescription.length<150 || s.metaDescription.length>160) console.warn('[warn] metaDescription length out of range');
}
