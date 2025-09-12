// tools/src/export.ts
import fs from 'node:fs';
import matter from 'gray-matter';
import { renderMarkdown } from './render';
import { readJSON, writeFileEnsure } from './utils';

export function exportCmd(args:string[]){
  const slug = getArg(args,'--slug');
  const format = getArg(args,'--format','html');
  if(!slug) throw new Error('--slug required');

  const p = `./content/posts/${slug}.md`;
  if(!fs.existsSync(p)) throw new Error(`post not found: ${slug}`);
  const raw = fs.readFileSync(p,'utf8');
  const { data, content } = matter(raw);
  const settings = readJSON('./content/settings.json');
  const products = readJSON('./content/products.json').products || [];

  // Respect post flag: if includeAds is true, include all three slots; else none.
  const adSlots: ('lead'|'mid'|'end')[] = data.includeAds ? ['lead','mid','end'] : [];

  const html = renderMarkdown(content, {
    adPlacements: adSlots,
    affiliateAnchors: (data.affiliateAnchors||[]).map((a:any)=>({ key:a.key, text:a.text })),
    internalLinks: (data.internalLinks||[]).map((l:any)=>({ slug:l.slug, anchor:l.anchor })),
    siteUrl: settings.siteUrl,
    products,
    kofiUsername: settings.kofiUsername || '',
    includeKofi: data.includeKofi
  });

  if (format === 'html') {
    const page = `<!doctype html><meta charset="utf-8"><title>${data.title}</title><meta name="viewport" content="width=device-width, initial-scale=1"><div class="post">${html}</div>`;
    const out = `./dist/exports/${slug}.html`;
    writeFileEnsure(out, page);
    process.stdout.write(`Wrote ${out}\n`);
  } else if (format === 'pdf') {
    throw new Error('PDF export not implemented in this build. Use --format html.');
  } else {
    throw new Error('Unknown format');
  }
}

function getArg(a:string[], k:string, def?:string){ const i=a.indexOf(k); return i>=0?a[i+1]:def; }
