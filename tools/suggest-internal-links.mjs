#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const DEBUG = argv.includes('--debug');
const topIdx = argv.indexOf('--top');
const TOP = topIdx >= 0 ? Math.max(1, parseInt(argv[topIdx + 1] || '3', 10)) : 3;
const dirIdx = argv.indexOf('--dir');
const DIR = dirIdx >= 0 ? path.resolve(argv[dirIdx + 1]) : null;

const CANDIDATE_DIRS = [
  path.join(process.cwd(), 'content', 'posts'),
  path.join(process.cwd(), 'src', 'content', 'posts'),
];
const POSTS_DIR = DIR || (CANDIDATE_DIRS.find((d) => fs.existsSync(d)) || CANDIDATE_DIRS[0]);

function log(...a){ if (DEBUG) console.log('[suggest]', ...a); }
function readDirRecursive(dir) {
  const out = []; if (!fs.existsSync(dir)) return out; const stack = [dir];
  while (stack.length) { const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && (/\.(md|mdx)$/i).test(e.name)) out.push(p);
    } }
  return out.sort();
}
const slugFromFile = (fp) => path.basename(fp).replace(/\.(md|mdx)$/i, '');
const norm = (s)=> String(s||'').toLowerCase();
const tokenizeTitle = (s)=> norm(s).split(/[^a-z0-9]+/g).filter(Boolean).filter(w=>w.length>=3);

function loadPosts(files){
  return files.map(fp => {
    const raw = fs.readFileSync(fp, 'utf8');
    const fm = matter(raw);
    const slug = fm.data.slug || slugFromFile(fp);
    const title = fm.data.title || slug;
    const tags = Array.isArray(fm.data.tags) ? fm.data.tags.map(norm) : [];
    const titleTokens = tokenizeTitle(title);
    const existingLinks = Array.isArray(fm.data.internalLinks) ? fm.data.internalLinks.map(l => l.text).map(norm) : [];
    const existingHints = Array.isArray(fm.data.internalLinkHints) ? fm.data.internalLinkHints.map(h => typeof h === 'string' ? norm(h) : norm(h.text||h.target||h.slug)) : [];
    return { fp, raw, fm, slug, title, tags, titleTokens, existingLinks, existingHints };
  });
}
const jaccard = (aSet,bSet)=>{ const a=new Set(aSet),b=new Set(bSet); const inter=[...a].filter(x=>b.has(x)).length; const union=new Set([...a,...b]).size||1; return inter/union; };
function score(a,b){
  if (a.slug===b.slug) return -1;
  let s = jaccard(a.tags,b.tags)*0.6 + jaccard(a.titleTokens,b.titleTokens)*0.4;
  if (norm(a.title).includes(b.slug) || norm(b.title).includes(a.slug)) s += 0.1;
  return s;
}
function suggestForOne(posts, i, topN){
  const me = posts[i];
  const ranked = posts.map((p,j)=>({p,s:score(me,p)})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s);
  const taken = new Set([...me.existingLinks, ...me.existingHints]);
  const out = [];
  for (const {p} of ranked) { const text=p.title; const key=norm(text); if (taken.has(key)) continue; out.push(text); if (out.length>=topN) break; }
  return out;
}
function run(){
  const files = readDirRecursive(POSTS_DIR);
  if (!files.length) { console.log(`[suggest] No posts under ${POSTS_DIR}`); return; }
  const posts = loadPosts(files);
  console.log(`[suggest] Loaded ${posts.length} posts from ${POSTS_DIR}`);
  let wrote=0;
  for (let i=0;i<posts.length;i++){
    const me = posts[i];
    const hints = suggestForOne(posts, i, TOP);
    const rel = path.relative(process.cwd(), me.fp);
    if (!APPLY) {
      console.log(`\n---\n# ${me.title}\n# File: ${rel}\ninternalLinkHints:`);
      for (const h of hints) console.log(`  - ${h}`);
      continue;
    }
    const cur = Array.isArray(me.fm.data.internalLinkHints) ? me.fm.data.internalLinkHints.slice() : [];
    const merged = [...cur]; for (const h of hints) if (!merged.includes(h)) merged.push(h);
    me.fm.data.internalLinkHints = merged;
    fs.writeFileSync(me.fp, matter.stringify(me.fm.content, me.fm.data), 'utf8');
    wrote++; console.log(`[suggest] wrote ${merged.length} hints → ${rel}`);
  }
  if (APPLY) console.log(`\n[suggest] Updated ${wrote} file(s).`);
}
run();
