// tools/src/healthLinks.ts
import { request } from 'undici';
import { readJSON } from './utils.js';

export async function healthLinks(){
  const settings = readJSON('./content/settings.json');
  const products = readJSON('./content/products.json').products || [];
  const urls = [
    settings.siteUrl,
    ...products.map((p:any)=>p.url).filter(Boolean)
  ];
  const results:any[] = [];
  for(const u of urls){
    try{
      const r = await request(u, { method:'HEAD', maxRedirections: 2 });
      results.push({ url: u, status: r.statusCode });
    }catch(e:any){
      results.push({ url: u, error: e?.message || String(e) });
    }
  }
  process.stdout.write(JSON.stringify({ checked: results.length, results }, null, 2)+'\n');
}