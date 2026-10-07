import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { buildFallbackHeroPrompt } from '../src/utils/heroPrompt';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('node:http', () => ({ default: { createServer: vi.fn(() => ({ listen: vi.fn(), close: vi.fn() })) } }));
const read = (name: string) => fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const markup = read('components/admin/HeroWorkflow.astro').split('\n---\n')[1]!.split('<script>')[0]!
  .replace(/hidden=\{mode !== 'picker'\}/g, '').replace(/\{lockedMessage\}/g, 'Locked — available after this post is saved.')
  .replace(/data-mode=\{mode\}/g, 'data-mode="picker"').replace(/data-hero-slug=\{slug\}/g, 'data-hero-slug=""')
  .replace(/data-dev-api=\{devApi\}/g, 'data-dev-api="http://localhost:8787"').replace(/data-dev-key=\{devKey\}/g, 'data-dev-key=""');
const script = ts.transpileModule(read('scripts/admin/hero-workflow.ts').replace(/^import .*;$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const entries = [
  { slug: 'alpha', title: 'Alpha draft', draft: true },
  { slug: 'beta', title: 'Beta draft', draft: true, heroImage: '/images/hero/beta/existing.png', heroImageAlt: 'Old legacy text', heroAlt: 'Other old text' },
];
const windows: JSDOM[] = [];
afterEach(() => { windows.splice(0).forEach(dom => dom.window.close()); vi.restoreAllMocks(); vi.resetModules(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
type Handler = (url: string, body: any) => Promise<Response | undefined> | Response | undefined;
async function setup(handler?: Handler, mode = 'picker') {
  const dom = new JSDOM(markup, { runScripts: 'outside-only', url: 'http://localhost/admin/hero?post=alpha' }); windows.push(dom);
  const win = dom.window; win.URL.createObjectURL = () => 'blob:art'; win.URL.revokeObjectURL = () => {};
  Object.assign(win, { parseYaml, stringifyYaml, buildFallbackHeroPrompt });
  const calls: Array<{url:string;body:any}> = []; const records = structuredClone(entries) as Array<Record<string, any>>;
  win.fetch = vi.fn(async (input, options) => {
    const url = String(input), body = JSON.parse(String(options?.body || '{}')); calls.push({url,body});
    const custom = handler && await handler(url,body); if (custom) return custom;
    if (url.endsWith('/posts/list')) return response({ok:true,items:records});
    if (url.endsWith('/posts/load')) return response({ok:true,slug:body.slug,frontmatter:stringifyYaml(records.find(post=>post.slug===body.slug)),markdown:'Body'});
    if (url.endsWith('/upload/hero')) return response({ok:true,path:`/images/hero/${body.slug}/${body.filename}`});
    if (url.endsWith('/posts/attach-hero')) { Object.assign(records.find(post=>post.slug===body.slug)!,{heroImage:body.heroImage,heroImageAlt:body.heroAlt,heroAlt:body.heroAlt}); return response({ok:true}); }
    return response({ok:true});
  });
  await tick();
  win.eval(script+'\nwindow.testMount = mountHeroWorkflow;');
  const root = win.document.querySelector<HTMLElement>('[data-hero-workflow]')!; root.dataset.mode=mode;
  const instance = (win as any).testMount(root);
  const q = <T extends HTMLElement = HTMLElement>(s:string) => root.querySelector<T>(s)!;
  const click = (s:string) => q<HTMLButtonElement>(s).click();
  const select = async(slug:string) => { await instance.setPost({slug}); };
  const alt = (value:string) => { q<HTMLInputElement>('[data-alt-input]').value=value;q('[data-alt-input]').dispatchEvent(new win.Event('input')); };
  const choose = (name='art.png') => { Object.defineProperty(q('[data-file-input]'),'files',{configurable:true,value:[new win.File([new Uint8Array([1])],name,{type:'image/png'})]});q('[data-file-input]').dispatchEvent(new win.Event('change')); };
  const upload = async() => { click('[data-upload-confirm]'); await vi.waitFor(()=>expect(q('[data-upload-status]').textContent).toContain('Uploaded — not attached yet')); };
  if(mode==='picker') await vi.waitFor(()=>expect(q('[data-workspace]').hidden).toBe(false));
  return {dom,root,instance,q,click,select,alt,choose,upload,calls,records};
}

describe('Shared instance-scoped hero workflow',()=>{
 it('preserves standalone URL preselection and clears file, preview, alt and uploaded path on selection',async()=>{
  const ui=await setup();expect(ui.root.dataset.heroSlug).toBe('alpha');ui.choose();ui.alt('A candle beside a notebook');await ui.upload();
  await ui.select('beta');expect(ui.q<HTMLInputElement>('[data-file-input]').value).toBe('');expect(ui.q('[data-preview]').hidden).toBe(true);
  expect(ui.q<HTMLInputElement>('[data-alt-input]').value).toBe('Old legacy text');expect(ui.q<HTMLButtonElement>('[data-upload-confirm]').disabled).toBe(true);
  expect(ui.q('[data-attach-summary]').textContent).not.toContain('/alpha/');expect(ui.q('[data-pending-uploads]').textContent).toContain('alpha');
 });
 it('cannot upload artwork selected under A into B, including late responses',async()=>{
  let resolve!:(r:Response)=>void;
  const ui=await setup(url=>url.endsWith('/upload/hero')?new Promise<Response>(done=>{resolve=done;}):undefined);
  ui.choose('alpha.png');ui.click('[data-upload-confirm]');await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));
  await ui.select('beta');resolve(response({ok:true,path:'/images/hero/alpha/alpha.png'}));await tick();
  expect(ui.q('[data-attach-summary]').textContent).not.toContain('/alpha/');expect(ui.q('[data-pending-uploads]').textContent).toContain('Upload may still finish');
  expect(ui.calls.find(call=>call.url.endsWith('/upload/hero'))!.body).toMatchObject({slug:'alpha',filename:'alpha.png'});
  ui.click('[data-upload-confirm]');expect(ui.calls.filter(call=>call.url.endsWith('/upload/hero'))).toHaveLength(1);
 });
 it.each(['','art.png','/images/hero/alpha/art.png','/some/path','https://example.com/art.png','ChatGPT-image-123'])('rejects useless alt %s',async value=>{
  const ui=await setup();ui.choose();await ui.upload();ui.alt(value);expect(ui.q<HTMLButtonElement>('[data-submit]').disabled).toBe(true);
  ui.click('[data-submit]');expect(ui.calls.some(c=>c.url.endsWith('/posts/attach-hero'))).toBe(false);
 });
 it('repairs existing artwork without upload, rereads canonical alt, and clears success after editing',async()=>{
  const ui=await setup();await ui.select('beta');ui.alt('A blue window beside a warm chair');ui.click('[data-submit]');
  await vi.waitFor(()=>expect(ui.q('[data-workflow-status]').textContent).toContain('verified'));
  expect(ui.calls.some(c=>c.url.endsWith('/upload/hero'))).toBe(false);expect(ui.q('[data-success]').textContent).toContain('Review in Staging');
  expect(ui.q('[data-success]').textContent).not.toContain('View live');ui.alt('A changed description');expect(ui.q('[data-success]').hidden).toBe(true);
  expect(ui.q<HTMLButtonElement>('[data-submit]').disabled).toBe(false);
 });
 it('reports saved but unverified on stale legacy alt and retries only the reread',async()=>{
  let afterAttach=false,mismatch=true;
  const ui=await setup((url,body)=>{
   if(url.endsWith('/posts/attach-hero')) afterAttach=true;
   if(url.endsWith('/posts/load')&&afterAttach) return response({ok:true,slug:body.slug,frontmatter:stringifyYaml({slug:body.slug,title:'Beta draft',draft:false,heroImage:'/images/hero/beta/existing.png',heroImageAlt:mismatch?'Stale alt':'A candle on a table',heroAlt:'A candle on a table'})});
  });
  await ui.select('beta');ui.alt('A candle on a table');ui.click('[data-submit]');await vi.waitFor(()=>expect(ui.q('[data-workflow-status]').textContent).toContain('Saved but not verified'));
  expect(ui.q('[data-success]').hidden).toBe(true);mismatch=false;ui.click('[data-retry-verification]');await vi.waitFor(()=>expect(ui.q('[data-success]').textContent).toContain('View live post'));
  expect(ui.calls.filter(c=>c.url.endsWith('/posts/attach-hero'))).toHaveLength(1);
 });
 it.each(['attach','reread'])('ignores late %s responses after the host slug changes',async phase=>{
  let resolve!:(r:Response)=>void;let attaching=false;
  const ui=await setup((url)=>{
   if(url.endsWith('/posts/attach-hero')){attaching=true;if(phase==='attach')return new Promise<Response>(done=>{resolve=done;});}
   if(url.endsWith('/posts/load')&&attaching&&phase==='reread')return new Promise<Response>(done=>{resolve=done;});
  },'embedded');
  await ui.select('beta');ui.alt('A candle on a table');ui.click('[data-submit]');await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));
  attaching=false;await ui.select('alpha');resolve(response({ok:true,slug:'beta',frontmatter:stringifyYaml({slug:'beta',title:'Beta draft',draft:true,heroImage:'/images/hero/beta/existing.png',heroImageAlt:'A candle on a table',heroAlt:'A candle on a table'})}));await tick();
  expect(ui.root.dataset.heroSlug).toBe('alpha');expect(ui.q('[data-success]').hidden).toBe(true);expect(ui.q('[data-attach-summary]').textContent).not.toContain('/beta/');
 });
 it('isolates two mounted roots and gates embedded identity before enabling writes',async()=>{
  const ui=await setup(undefined,'embedded');const clone=ui.root.cloneNode(true) as HTMLElement;ui.root.after(clone);
  const second=(ui.dom.window as any).testMount(clone);await ui.instance.setPost({slug:'alpha',expectedTitle:'Wrong title',requireDraft:true});
  expect(ui.q('[data-workspace]').hidden).toBe(true);expect(ui.q('[data-workflow-status]').textContent).toContain('could not be loaded');
  await second.setPost({slug:'beta'});expect(clone.dataset.heroSlug).toBe('beta');expect(ui.root.dataset.heroSlug).toBe('alpha');
  ui.instance.reset();expect(clone.querySelector<HTMLElement>('[data-workspace]')!.hidden).toBe(false);
  second.dispose();expect(clone.querySelector<HTMLElement>('[data-workspace]')!.hidden).toBe(true);
 });
 it('reuses the fallback prompt and saves/regenerates/copies it only for the current root',async()=>{
  const ui=await setup();expect(ui.q<HTMLTextAreaElement>('[data-hero-prompt]').value).toBe(buildFallbackHeroPrompt(entries[0]!));
  ui.click('[data-regenerate-prompt]');const prompt=ui.q<HTMLTextAreaElement>('[data-hero-prompt]').value;expect(prompt).not.toBe(buildFallbackHeroPrompt(entries[0]!));
  const copy=vi.fn().mockResolvedValue(undefined);Object.defineProperty(ui.dom.window.navigator,'clipboard',{value:{writeText:copy}});
  ui.click('[data-copy-hero-prompt]');await tick();expect(copy).toHaveBeenCalledWith(prompt);
  ui.click('[data-save-prompt]');await vi.waitFor(()=>expect(ui.q('[data-prompt-status]').textContent).toContain('saved'));
  expect(ui.calls.find(c=>c.url.endsWith('/posts/update'))!.body.originalSlug).toBe('alpha');
 });
});
describe('Canonical hero alt persistence', () => {
  it('updates stale legacy alt, rejects useless alt, and retains cross-slug safeguards', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-hero-phase5-'));
    try {
      fs.mkdirSync(path.join(directory, 'src/content/posts'), { recursive: true });
      fs.mkdirSync(path.join(directory, 'public/images/hero/alpha'), { recursive: true });
      fs.writeFileSync(path.join(directory, 'public/images/hero/alpha/art.png'), 'fixture');
      const file = path.join(directory, 'src/content/posts/alpha.md');
      fs.writeFileSync(file, '---\ntitle: Alpha\nslug: alpha\ndraft: true\nheroImageAlt: |\n  Stale legacy alt\nheroAlt: Old alt\n---\nBody unchanged.');
      vi.spyOn(process, 'cwd').mockReturnValue(directory); vi.resetModules();
      const { attachHeroToPost } = await import('../dev-api.js');
      for (const heroAlt of ['', 'art.png', '/images/hero/alpha/art.png']) await expect(attachHeroToPost({ slug: 'alpha', heroImage: '/images/hero/alpha/art.png', heroAlt })).rejects.toThrow('descriptive alt');
      await expect(attachHeroToPost({ slug: 'alpha', heroImage: '/images/hero/beta/art.png', heroAlt: 'A warm window' })).rejects.toThrow('hero directory');
      await expect(attachHeroToPost({ slug: 'alpha', heroImage: '/images/hero/alpha/missing.png', heroAlt: 'A warm window' })).rejects.toThrow('not found on disk');
      await attachHeroToPost({ slug: 'alpha', heroImage: '/images/hero/alpha/art.png', heroAlt: 'A warm window beside a desk' });
      const data = parseYaml(fs.readFileSync(file, 'utf8').split('---')[1]!) as Record<string, unknown>;
      expect(data).toMatchObject({ draft: true, heroImage: '/images/hero/alpha/art.png', heroImageAlt: 'A warm window beside a desk', heroAlt: 'A warm window beside a desk' });
      expect(fs.readFileSync(file, 'utf8')).toContain('Body unchanged.');
    } finally { vi.restoreAllMocks(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
