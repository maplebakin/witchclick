#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const DEBUG = argv.includes('--debug');
const dirIdx = argv.indexOf('--dir');
const DIR = dirIdx >= 0 ? path.resolve(argv[dirIdx + 1]) : null;

const CANDIDATE_DIRS = [
  path.join(process.cwd(), 'content', 'posts'),
  path.join(process.cwd(), 'src', 'content', 'posts'),
];
const POSTS_DIR = DIR || (CANDIDATE_DIRS.find((d) => fs.existsSync(d)) || CANDIDATE_DIRS[0]);

function log(...a){ if (DEBUG) console.log('[links]', ...a); }
function readDirRecursive(dir) {
  const out=[]; if (!fs.existsSync(dir)) return out; const stack=[dir];
  while (stack.length){ const cur=stack.pop();
    for (const e of fs.readdirSync(cur,{withFileTypes:true})){
      const p=path.join(cur,e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && (/\.(md|mdx)$/i).test(e.name)) out.push(p);
    } }
  return out.sort();
}
const slugFromFile=(fp)=>path.basename(fp).replace(/\.(md|mdx)$/i,'');
const normalise=(s)=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function buildIndex(files){
  const bySlug=Object.create(null), byTitle=Object.create(null), all=[];
  for (const fp of files){
    const fm = matter(fs.readFileSync(fp,'utf8'));
    const slug = fm.data.slug || slugFromFile(fp);
    const title = fm.data.title || slug;
    const rec = { file: fp, slug, href: `/post/${slug}`, title, slugNorm: normalise(slug), titleNorm: normalise(title) };
    bySlug[rec.slugNorm]=rec; byTitle[rec.titleNorm]=rec; all.push(rec);
  }
  return { bySlug, byTitle, all };
}
function bestMatch(hint, idx){
  const n = normalise(hint); if (!n) return null;
  if (idx.bySlug[n]) return idx.bySlug[n];
  if (idx.byTitle[n]) return idx.byTitle[n];
  return idx.all.find(p=>p.titleNorm.includes(n) || n.includes(p.slugNorm)) || null;
}
function uniqueByHref(arr){ const seen=new Set(), out=[]; for (const a of arr){ const k=`${a.href}\u0001${a.text}`; if(!seen.has(k)){seen.add(k); out.push(a);} } return out; }

function run(){
  const files = readDirRecursive(POSTS_DIR);
  if (!files.length){ console.log(`[links] No posts found in ${POSTS_DIR}`); return; }
  const idx = buildIndex(files);
  let touched=0;
  for (const fp of files){
    const fm = matter(fs.readFileSync(fp,'utf8'));
    const slug = fm.data.slug || slugFromFile(fp);
    const hintsRaw = fm.data.internalLinkHints || [];
    const hints = Array.isArray(hintsRaw) ? hintsRaw : [];
    if (!hints.length){ log('skip (no hints):', slug); continue; }

    const links=[];
    for (const h of hints){
      const text = typeof h === 'string' ? h : (h.text || h.target || h.slug || '');
      const match = bestMatch(text, idx);
      if (!match || match.slug === slug) continue;
      links.push({ text, href: match.href });
    }
    const current = Array.isArray(fm.data.internalLinks) ? fm.data.internalLinks : [];
    const merged = uniqueByHref([...current, ...links]);

    if (JSON.stringify(current) === JSON.stringify(merged)){ log('no change:', slug); continue; }

    fm.data.internalLinks = merged;
    if (APPLY) {
      fs.writeFileSync(fp, matter.stringify(fm.content, fm.data), 'utf8');
      console.log(`[links] ${slug} — wrote ${merged.length} links (${path.relative(process.cwd(), fp)})`);
      touched++;
    } else {
      console.log(`[links][dry] ${slug} → would write ${merged.length} links (${path.relative(process.cwd(), fp)})`);
    }
  }
  console.log(APPLY ? `[links] Done. Updated ${touched} file(s).` : `[links] Done. Rerun with --apply to write changes.`);
}
run();
