import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';


function readSettings(){
try {
const p = path.join(process.cwd(), 'content', 'settings.json');
return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { siteUrl: 'https://example.com', brandName: 'WitchClick' };
} catch { return { siteUrl: 'https://example.com', brandName: 'WitchClick' }; }
}


function normalizeSite(u:string){
const s = String(u||'').trim().replace(/\/$/, '');
return s.startsWith('http') ? s : `https://${s||'example.com'}`;
}


export async function GET() {
const settings = readSettings();
const site = normalizeSite(settings.siteUrl);


const dir = path.join(process.cwd(), 'content', 'posts');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.endsWith('.md')) : [];


const items = files.map((file) => {
const full = path.join(dir, file);
const raw = fs.readFileSync(full, 'utf8');
const { data, content } = matter(raw);
const slug = (data?.slug ? String(data.slug) : file.replace(/\.md$/, '')).toLowerCase();
const url = `${site}/post/${slug}`;
const fronts = [data?.publishedAt, data?.pubDate, data?.date, data?.updatedAt].filter(Boolean) as string[];
let pub: string | undefined;
if (fronts.length) {
  const firstDate = fronts[0];
  if (firstDate) {
    const d = new Date(firstDate);
    if (!Number.isNaN(+d)) pub = d.toUTCString();
  }
}
if (!pub) { try { pub = fs.statSync(full).mtime.toUTCString(); } catch {}
}
const title = String(data?.title || slug);
const desc = String(data?.excerpt || data?.description || content.slice(0, 280));
return { url, title, desc, pubDate: pub };
}).sort((a,b) => +new Date(b.pubDate||0) - +new Date(a.pubDate||0));


const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`+
`<rss version="2.0">\n`+
` <channel>\n`+
` <title>${escapeXml(settings.brandName || 'WitchClick')}</title>\n`+
` <link>${site}</link>\n`+
` <description>${escapeXml(settings.brandName || 'WitchClick')}</description>\n`+
` ${items.map(i => `\n <item>\n <title>${escapeXml(i.title)}</title>\n <link>${i.url}</link>\n <guid>${i.url}</guid>\n ${i.pubDate ? `<pubDate>${i.pubDate}</pubDate>` : ''}\n <description>${escapeXml(i.desc)}</description>\n </item>`).join('')}\n`+
` </channel>\n`+
`</rss>`;


return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}


function escapeXml(s:string){
return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
}