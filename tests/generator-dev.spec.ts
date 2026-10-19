import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const repo = fileURLToPath(new URL('../', import.meta.url));
let root: string, url: string, logs: string;
let children: ChildProcess[];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function freePort(): Promise<number> {
  return new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); }); });
}
function spec(slug: string) {
  return {
    specVersion: 2, title: 'A quiet comparison of ordinary choices', slug, category:'meandering',contentType:'guide',cluster:'cozy-witchcraft',
    metaDescription:'A practical explanation of ordinary choices.',tags:['choice','comparison','reflection','everyday'],excerpt:'A quiet comparison.',
    outline:[{heading:'Opening Reflection',id:'opening-reflection'},{heading:'Closing',id:'closing'}],
    sections:[{heading:'Opening Reflection',markdown:'Compare what matters without prescribing a ritual or an outcome.'},{heading:'Closing',markdown:'You can take time to decide.'}],
    entities:[],heroImagePrompt:'Painterly scene of two paths through a garden.',altTexts:[],internalLinkHints:[],affiliateHints:[],cta:{type:'none'},adPlacements:[],
  };
}
async function openGenerator(page: Page) {
  await page.goto(url+'/admin/generator',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-dev-session-ready="true"]')).toBeAttached();
  await expect(page.locator('[data-hero-mounted="true"]')).toBeAttached();
  // Ensure the HMR socket has subscribed before entering any workspace content.
  await page.evaluate(() => { (window as any).generatorMount = crypto.randomUUID(); });
  return page.evaluate(() => (window as any).generatorMount);
}
async function persisted(slug: string) {
  const raw = await fs.readFile(path.join(root,'src/content/posts',`${slug}.md`),'utf8');
  return parseYaml(raw.split('---')[1]!) as Record<string, any>;
}

test.beforeEach(async ({context}) => {
  await context.route('**/*',route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  root=await fs.mkdtemp(path.join(os.tmpdir(),'wc-generator-browser-')); children=[]; logs='';
  // Independent files and no .env/.git: real API writes never touch the developer's WIP.
  for (const entry of ['shared','src','server','content','public','scripts','tools','astro.config.mjs','tsconfig.json','tailwind.config.cjs','postcss.config.cjs','package.json','dev-api.js']) {
    try { await fs.cp(path.join(repo,entry),path.join(root,entry),{recursive:true}); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
  await fs.symlink(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir');
  const apiPort=await freePort(), astroPort=await freePort(); url=`http://127.0.0.1:${astroPort}`;
  const env={...process.env,HOST:'127.0.0.1',DEV_API_HOST:'127.0.0.1',DEV_API_PORT:String(apiPort),PORT:String(apiPort),PUBLIC_DEV_API:`http://127.0.0.1:${apiPort}`,PUBLIC_ADMIN_KEY:'',PUBLIC_DEV_API_KEY:'',DEV_API_KEY:'',DEV_API_LOG:'false'};
  // Vite's default allow list follows the package root; permit the shared dependencies only in this isolated fixture.
  const config=await fs.readFile(path.join(root,'astro.config.mjs'),'utf8');
  await fs.writeFile(path.join(root,'astro.config.mjs'),config.replace('    define: {',`    cacheDir: ${JSON.stringify(path.join(root,'.vite'))},\n    server: { fs: { allow: [${JSON.stringify(root)}, ${JSON.stringify(path.join(repo,'node_modules'))}] } },\n    define: {`));
  const start=(args:string[])=>{const child=spawn(process.execPath,args,{cwd:root,env});children.push(child);child.stdout?.on('data',chunk=>{logs+=chunk;});child.stderr?.on('data',chunk=>{logs+=chunk;});};
  start(['dev-api.js']);start([path.join(repo,'node_modules/astro/astro.js'),'dev','--host','127.0.0.1','--port',String(astroPort)]);
  await expect.poll(async()=>{try{return (await fetch(url+'/admin/generator')).status;}catch{return 0;}},{timeout:60_000}).toBe(200);
});
test.afterEach(async ({browserName}, info) => {
  if (info.status !== info.expectedStatus) await info.attach(`${browserName}-dev-server.log`,{body:logs,contentType:'text/plain'});
  await Promise.all(children.map(child=>new Promise<void>(resolve=>{if(child.exitCode!==null || child.signalCode!==null){resolve();return;}child.once('exit',()=>resolve());child.kill('SIGTERM');})));
  await fs.rm(root,{recursive:true,force:true});
});

test('draft → persisted collision slug → prompt edit → upload → attach/retry remains mounted while public HMR still works', async ({page,context}, info) => {
  const slug='generator-continuity-fixture';
  await fs.writeFile(path.join(root,'src/content/posts',`${slug}.md`),`---\ntitle: Existing collision fixture\nslug: ${slug}\ndraft: true\n---\nUntouched original.\n`);
  const publicPage=await context.newPage(); await publicPage.goto(url+'/',{waitUntil:'domcontentloaded'});
  const marker=await openGenerator(page);
  let generatorNavigations=0,publicNavigations=0,saves=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())generatorNavigations++;});
  publicPage.on('framenavigated',frame=>{if(frame===publicPage.mainFrame())publicNavigations++;});
  page.on('request',request=>{if(new URL(request.url()).pathname==='/ingest'&&!request.url().includes('dryRun=true'))saves++;});
  const json=JSON.stringify(spec(slug),null,2);
  await page.fill('#spec',json); await page.fill('#topic','Retain this topic');await page.fill('#promptOut','Retain this generation prompt');
  await page.click('#previewBtn');await expect(page.locator('#preview')).toContainText('A quiet comparison');
  const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/ingest'&&!response.url().includes('dryRun=true'));
  await page.click('#ingestBtn');const saved=await (await response).json();expect(saved.saved).toBe(true);expect(saved.slug).not.toBe(slug);
  await expect(page.locator('#saveOutcome')).toContainText('Saved draft');
  const hero=page.locator('[data-generator-hero] [data-hero-workflow]');
  await expect(hero.locator('[data-workspace]')).toBeVisible();await expect(hero).toHaveAttribute('data-hero-slug',saved.slug);
  await expect(hero.locator('[data-workflow-identity]')).toContainText(spec(slug).title);
  await expect(hero.locator('[data-hero-prompt]')).toHaveValue(spec(slug).heroImagePrompt);
  await expect(page.locator('[data-dev-update-notice]')).toBeVisible();
  await expect.poll(()=>publicNavigations,{timeout:10_000}).toBeGreaterThan(0);
  await expect(page.locator('#spec')).toHaveValue(json);await expect(page.locator('#topic')).toHaveValue('Retain this topic');await expect(page.locator('#promptOut')).toHaveValue('Retain this generation prompt');
  await expect(page.locator('#preview')).toContainText('Compare what matters');
  await hero.locator('[data-hero-prompt]').fill('Painterly garden gate in morning light.');await hero.locator('[data-save-prompt]').click();
  await expect(hero.locator('[data-prompt-status]')).toContainText('saved');
  await hero.locator('[data-file-input]').setInputFiles({name:'garden.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4ioAAAAASUVORK5CYII=','base64')});
  await expect(hero.locator('[data-preview]')).toBeVisible();await hero.locator('[data-alt-input]').fill('A garden gate with warm morning light.');
  await hero.locator('[data-upload-confirm]').click();await expect(hero.locator('[data-upload-status]')).toContainText('Uploaded — not attached yet');
  let fail=true;
  await page.route('**/posts/attach-hero',route=>fail ? route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'Temporary attach failure'})}) : route.continue());
  await hero.locator('[data-submit]').click();await expect(hero.locator('[data-workflow-error]')).toContainText('Temporary attach failure');
  expect((await persisted(saved.slug)).heroImage).toBeUndefined();fail=false;
  await hero.locator('[data-submit]').click();await expect(hero.locator('[data-success]')).toBeVisible();
  await expect(hero.locator('[data-workflow-status]')).toContainText('verified');await expect(hero.locator('[data-success]')).toContainText('Draft remains private');
  const post=await persisted(saved.slug);
  expect(post).toMatchObject({draft:true,slug:saved.slug,heroImagePrompt:'Painterly garden gate in morning light.',heroImageAlt:'A garden gate with warm morning light.',heroAlt:'A garden gate with warm morning light.'});
  expect(post.heroImage).toContain(`/images/hero/${saved.slug}/`);expect((await persisted(slug)).heroImage).toBeUndefined();
  // Wait across Astro's debounced data-store write, then assert the original document survived.
  await sleep(1500);
  expect(await page.evaluate(()=>(window as any).generatorMount)).toBe(marker);expect(generatorNavigations).toBe(0);expect(saves).toBe(1);
  await expect(page).toHaveURL(url+'/admin/generator');await expect(page.locator('#spec')).toHaveValue(json);await expect(page.locator('#preview')).toContainText('A quiet comparison');
  await page.screenshot({path:info.outputPath('generator-hero.png'),fullPage:true,timeout:5000});
});

test('local publication and its real bundle keep the generator mounted and do not deploy', async ({page}) => {
  const marker=await openGenerator(page);let navigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  await page.fill('#spec',JSON.stringify(spec('generator-local-public-fixture')));
  await page.click('#validateBtn');await expect(page.locator('#ingestPublishBtn')).toBeEnabled();
  await page.click('#ingestPublishBtn');await expect(page.locator('#saveOutcome')).toContainText('publicly eligible locally');
  await expect(page.locator('#bundleStatus')).toContainText('Bundle completed',{timeout:30_000});
  await expect(page.locator('[data-hero-workflow] [data-workspace]')).toBeVisible();
  await sleep(1500);expect(await page.evaluate(()=>(window as any).generatorMount)).toBe(marker);expect(navigations).toBe(0);
  const slug=await page.locator('[data-hero-workflow]').getAttribute('data-hero-slug');expect((await persisted(slug!)).draft).not.toBe(true);
  await expect(page.locator('#bundleStatus')).toContainText('not been deployed');
});
