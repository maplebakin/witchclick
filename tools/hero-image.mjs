#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const dirIdx = argv.indexOf('--dir');
const DIR = dirIdx >= 0 ? path.resolve(argv[dirIdx + 1]) : path.join(process.cwd(), 'content', 'posts');
const slugIdx = argv.indexOf('--slug');
const ONE_SLUG = slugIdx >= 0 ? argv[slugIdx + 1] : null;
const OUT_DIR = path.join(process.cwd(), 'public', 'hero-images');

function readDirRecursive(dir){
  const out=[]; if(!fs.existsSync(dir)) return out; const stack=[dir];
  while(stack.length){ const cur=stack.pop();
    for(const e of fs.readdirSync(cur,{withFileTypes:true})){
      const p=path.join(cur,e.name);
      if(e.isDirectory()) stack.push(p);
      else if(e.isFile() && (/\.(md|mdx)$/i).test(e.name)) out.push(p);
    } }
  return out.sort();
}
const slugFromFile=(fp)=>path.basename(fp).replace(/\.(md|mdx)$/i,'');
const toTitle=(s)=>{ const t=String(s||'').trim(); return t.length>120?t.slice(0,117)+'…':t; };

function svgTemplate({ title, brand='WitchClick' }){
  const bg1='#f7f4f2', bg2='#efe7eb', accent='#7c6a80';
  const esc=(x)=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(120,140)">
      <rect x="-20" y="-28" width="12" height="120" fill="${accent}" opacity="0.5"/>
      <text x="20" y="0" font-family="Literata, Georgia, serif" font-size="84" font-weight="700" fill="#1f2937">
        <tspan x="20" dy="1em">${esc(title)}</tspan>
      </text>
    </g>
    <text x="120" y="820" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif" font-size="28" fill="#6b7280">${esc(brand)}</text>
  </svg>`;
}

async function ensureDir(p){ await fs.promises.mkdir(p,{recursive:true}); }
async function createHero({ slug, title, brandName }){
  await ensureDir(OUT_DIR);
  const svg = svgTemplate({ title: toTitle(title), brand: brandName || 'WitchClick' });
  const outPath = path.join(OUT_DIR, `${slug}.png`);
  await sharp(Buffer.from(svg,'utf8')).png({ quality: 90 }).toFile(outPath);
  return outPath;
}
function loadPost(fp){
  const raw = fs.readFileSync(fp,'utf8');
  const fm = matter(raw);
  const slug = fm.data.slug || slugFromFile(fp);
  const title = fm.data.title || slug;
  const alt = fm.data.heroImageAlt || fm.data.heroImagePrompt || `${title} — hero image`;
  return { fp, raw, fm, slug, title, alt };
}
function saveFrontMatter(post, imageRel){
  post.fm.data.heroImageSrc = imageRel;
  if (!post.fm.data.heroImageAlt) post.fm.data.heroImageAlt = post.alt;
  const out = matter.stringify(post.fm.content, post.fm.data);
  fs.writeFileSync(post.fp, out, 'utf8');
}
async function processOne(fp){
  const p = loadPost(fp);
  await createHero({ slug: p.slug, title: p.title, brandName: 'WitchClick' });
  const rel = `/hero-images/${p.slug}.png`;
  saveFrontMatter(p, rel);
  console.log(`[hero] wrote ${rel} ← ${path.relative(process.cwd(), fp)}`);
}
async function run(){
  const files = readDirRecursive(DIR).filter(f => (/\.(md|mdx)$/i).test(f));
  if (!ALL && ONE_SLUG) {
    const single = files.find(f => slugFromFile(f) === ONE_SLUG || (matter(fs.readFileSync(f,'utf8')).data.slug === ONE_SLUG));
    if (!single) { console.error(`[hero] No post found for slug ${ONE_SLUG}`); process.exit(1); }
    await processOne(single); return;
  }
  if (!ALL) { console.log(`[hero] Nothing to do. Pass --slug <slug> or --all`); return; }
  for (const fp of files) await processOne(fp);
  console.log(`[hero] Done.`);
}
run().catch(e=>{ console.error(e); process.exit(1); });
