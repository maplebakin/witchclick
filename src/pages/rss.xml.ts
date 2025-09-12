// src/pages/rss.xml.ts
import fs from 'node:fs';
import matter from 'gray-matter';

export const get = async () => {
  const settings = JSON.parse(fs.readFileSync('./content/settings.json','utf8'));
  const postsDir = './content/posts';
  const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f=>f.endsWith('.md')) : [];
  const items = files.map(f=>{
    const raw = fs.readFileSync(`${postsDir}/${f}`,'utf8');
    const { data, content } = matter(raw);
    return { data, content };
  }).sort((a,b)=> (b.data.publishedAt||'').localeCompare(a.data.publishedAt||''));
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>WitchClick</title>
    <link>${settings.siteUrl}</link>
    <description>Cozy metaphysical guides</description>
    ${items.map(({data,content})=>`
    <item>
      <title>${escapeXml(data.title)}</title>
      <link>${settings.siteUrl}/post/${data.slug}</link>
      <guid>${settings.siteUrl}/post/${data.slug}</guid>
      <description>${escapeXml(data.excerpt||'')}</description>
      <pubDate>${new Date(data.publishedAt||Date.now()).toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' }});
};

function escapeXml(s:string=''){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}