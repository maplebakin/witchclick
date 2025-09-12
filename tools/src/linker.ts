// tools/src/linker.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { listPostFiles, writeFileEnsure } from './utils';

export function linkerCmd(){
  const files = listPostFiles();
  const posts = files.map(f=>{
    const raw = fs.readFileSync(path.join('./content/posts',f),'utf8');
    const { data, content } = matter(raw);
    return { file:f, slug: f.replace(/\.md$/,''), title: data.title, content, data };
  });

  for(const p of posts){
    const others = posts.filter(o=>o.slug!==p.slug);
    const anchors:string[] = [];
    const links:any[] = [];
    for(const o of others){
      if(anchors.length>=7) break;
      const anchor = pickAnchor(o);
      if(anchor && p.content.toLowerCase().includes(anchor.toLowerCase())){
        anchors.push(anchor);
        links.push({ title: o.title, slug: o.slug, anchor });
      }
    }
    const { data, content } = matter(fs.readFileSync(path.join('./content/posts',p.file),'utf8'));
    data.internalLinks = links;
    const yaml = matter.stringify(content, data);
    writeFileEnsure(path.join('./content/posts',p.file), yaml);
  }

  process.stdout.write(`Linked ${posts.length} posts.\n`);
}

function pickAnchor(p:{title:string, content:string}){
  const words = p.title.split(/\s+/).filter(w=>w.length>3);
  return words.slice(0,2).join(' ') || words[0] || p.title.split(' ')[0];
}
