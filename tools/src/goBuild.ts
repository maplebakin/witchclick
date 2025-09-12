import { readJSON, writeFileEnsure } from './utils';

export function goBuild(){
  const products = readJSON('./content/products.json').products || [];
  const redirects = products.filter((p:any)=>p.url).map((p:any)=>{
    const url = `${p.url.replace(/\/$/,'')}${p.utm?`?${p.utm}`:''}`;
    return `/go/${p.key} ${url} 301!`;
  }).join('\n') + '\n';
  writeFileEnsure('./public/_redirects', redirects);

  // Fallback pages (meta refresh in <head> via named slot)
  for(const p of products){
    const url = `${(p.url||'').replace(/\/$/,'')}${p.utm?`?${p.utm}`:''}`;
    const file = `---\nimport Base from '../../layouts/Base.astro';\n---\n<Base title="Redirecting…" description="Taking you to the resource.">\n  <Fragment slot="head">\n    <meta http-equiv="refresh" content="0;url=${url}" />\n  </Fragment>\n  <p>Redirecting…</p>\n</Base>\n`;
    writeFileEnsure(`./src/pages/go/${p.key}.astro`, file);
  }
  process.stdout.write('Built /go redirects and fallback pages.\n');
}
