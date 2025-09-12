// tools/src/seo.ts
import fs from 'node:fs';
import matter from 'gray-matter';
import { clamp, listPostFiles } from './utils';

export function seoCmd(args:string[]){
  const slug = getArg(args,'--slug');
  if(!slug) throw new Error('--slug required');

  const p = `./content/posts/${slug}.md`;
  if(!fs.existsSync(p)) throw new Error('post not found');
  const raw = fs.readFileSync(p,'utf8');
  const { data, content } = matter(raw);

  const errors:string[] = [];
  const fixes:any = {};
  const notes:string[] = [];

  const titleLen = (data.metaTitle||data.title||'').length;
  if (titleLen<50 || titleLen>60) {
    errors.push('Title length must be 50–60 chars');
    fixes.title = (data.metaTitle||data.title||'').slice(0,60);
  }

  const mdLen = (data.metaDescription||'').length;
  if (mdLen<150 || mdLen>160) {
    errors.push('metaDescription length must be 150–160 chars');
    fixes.metaDescription = (data.metaDescription||'').slice(0,160);
  }

  if (!Array.isArray(data.tags) || data.tags.length<4 || data.tags.length>7) {
    errors.push('tags must be 4–7');
  }

  const dupes = listPostFiles().filter(f=>f!==(slug+'.md')).map(f=>f.replace(/\.md$/,''));
  if (dupes.includes(slug)) {
    errors.push('slug not unique');
  }

  const words = (content.match(/\b[\w’']+\b/g)||[]).length;
  const sentences = Math.max(1, (content.match(/[.!?]+/g)||[]).length);
  const syllables = words * 1.3;
  const fk = 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59;
  const grade = clamp(fk, 1, 12);
  if (grade > 8.5) notes.push(`Readability is a bit high (≈${grade.toFixed(1)}). Try shorter sentences.`);

  const anchors = Array.isArray(data.affiliateAnchors)? data.affiliateAnchors.length : 0;
  const maxAnchors = Math.floor(words/250)+1;
  if (anchors > maxAnchors) errors.push(`Too many affiliate anchors: ${anchors} > ${maxAnchors}`);

  const ok = errors.length===0;
  const out = { ok, errors, fixes, notes };
  process.stdout.write(JSON.stringify(out, null, 2)+'\n');
  if(!ok) process.exit(1);
}

function getArg(a:string[], k:string){ const i=a.indexOf(k); return i>=0?a[i+1]:undefined; }
