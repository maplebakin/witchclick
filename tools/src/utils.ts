// tools/src/utils.ts
import fs from 'node:fs';
import path from 'node:path';

export function readJSON<T=any>(p:string): T {
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

export function writeFileEnsure(p:string, data:string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}

export function slugify(s:string){
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

export function wordCountFromMarkdown(md:string){
  return (md.replace(/[`*_#>\-\n]/g,' ').match(/\b[\w’']+\b/g)||[]).length;
}

export function readingMinutes(words:number){
  const wpm = 200;
  return Math.max(1, Math.round(words / wpm));
}

export function listPostFiles(){
  const dir = './content/posts';
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith('.md'));
}

export function parseFrontmatter(raw:string){
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!m) return { data: {}, body: raw };
  const yaml = m[1], body = m[2];
  const data = Object.fromEntries(yaml.split('\n').filter(Boolean).map(line=>{
    const idx = line.indexOf(':');
    const k = line.slice(0,idx).trim();
    let v = line.slice(idx+1).trim();
    if(v.startsWith('[')) try { v = JSON.parse(v); } catch {}
    return [k, v];
  }));
  return { data, body };
}

export function toYAML(obj:any){
  const lines:string[] = [];
  for(const [k,v] of Object.entries(obj)){
    if(Array.isArray(v)) lines.push(`${k}: ${JSON.stringify(v)}`);
    else if(typeof v === 'string') lines.push(`${k}: ${v.includes(':') || v.includes('- ') ? JSON.stringify(v) : v}`);
    else lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

export function ensureEntityStubs(entities:{type:string;slug:string}[]){
  for(const e of entities){
    const p = `./content/entities/${e.type}/${e.slug}.json`;
    if(!fs.existsSync(p)){
      writeFileEnsure(p, JSON.stringify({
        type: e.type, name: e.slug.replace(/-/g,' '), slug: e.slug,
        summary: `${e.slug.replace(/-/g,' ')} — stub entity`,
        properties: {}, related: []
      }, null, 2));
    }
  }
}

export function ensureUniqueSlug(baseSlug:string){
  let slug = baseSlug, n=2;
  while(fs.existsSync(`./content/posts/${slug}.md`)){
    slug = `${baseSlug}-${n++}`;
  }
  return slug;
}

export function clamp(n:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, n)); }