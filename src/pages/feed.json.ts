// src/pages/feed.json.ts
import fs from 'node:fs';
import matter from 'gray-matter';

export const get = async () => {
  const settings = JSON.parse(fs.readFileSync('./content/settings.json','utf8'));
  const postsDir = './content/posts';
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f=>f.endsWith('.md')) : [];
  const items = files.map(f=>{
    const raw = fs.readFileSync(`${postsDir}/${f}`,'utf8');
    const { data, content } = matter(raw);
    return {
      title: data.title,
      url: `${settings.siteUrl}/post/${data.slug}`,
      excerpt: data.excerpt,
      tags: data.tags || [],
      publishedAt: data.publishedAt || null
    };
  }).sort((a,b)=> (b.publishedAt||'').localeCompare(a.publishedAt||''));
  return new Response(JSON.stringify({ version: 1, home_page_url: settings.siteUrl, items }), { headers: { 'Content-Type': 'application/json' }});
};