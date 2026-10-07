import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { parse as parseYaml } from 'yaml';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:http', () => ({ default: { createServer: vi.fn(() => ({ listen: vi.fn(), close: vi.fn() })) } }));
const read = (name: string) => fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const sources = ['HeroPostSelector', 'ImageUploader', 'HeroAttacher'].map(name => read(`components/admin/${name}.astro`));
const markup = (source: string) => source.split('\n---\n')[1]!.split('<script>')[0]!
  .replace(/<Card\b/g, '<li').replace(/<\/Card>/g, '</li>').replace(/<Input\b/g, '<input')
  .replace(/<Button\b/g, '<button').replace(/<\/Button>/g, '</button>');
const entries = [
  { slug: 'alpha', title: 'Alpha draft', draft: true, heroImage: '', heroImageAlt: '', heroAlt: '' },
  { slug: 'beta', title: 'Beta draft', draft: true, heroImage: '/images/hero/beta/existing.png', heroImageAlt: 'Old legacy text', heroAlt: 'Other old text' },
];
const windows: JSDOM[] = [];
afterEach(() => { windows.splice(0).forEach(dom => dom.window.close()); vi.restoreAllMocks(); vi.resetModules(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
type Handler = (url: string, body: any) => Promise<Response> | Response | undefined;

async function setup(handler?: Handler) {
  const dom = new JSDOM(`<section id="heroUploader" data-preselected-post="alpha">${sources.map(markup).join('')}<div data-hero-prompt-card></div></section>`, { runScripts: 'outside-only', url: 'http://localhost/admin/hero?post=alpha' });
  windows.push(dom);
  const win = dom.window;
  win.HTMLElement.prototype.scrollIntoView = () => {};
  win.URL.createObjectURL = () => 'blob:chosen-artwork'; win.URL.revokeObjectURL = () => {};
  (win as any).parseYaml = parseYaml;
  const calls: Array<{ url: string; body: any }> = [];
  let attached: any;
  win.fetch = vi.fn(async (input, options) => {
    const url = String(input); const body = JSON.parse(String(options?.body || '{}')); calls.push({ url, body });
    const custom = handler && await handler(url, body); if (custom) return custom;
    if (url.endsWith('/posts/list')) return response({ ok: true, items: structuredClone(entries) });
    if (url.endsWith('/upload/hero')) return response({ ok: true, path: `/images/hero/${body.slug}/${body.filename}` });
    if (url.endsWith('/posts/attach-hero')) { attached = body; return response({ ok: true }); }
    if (url.endsWith('/posts/load')) return response({ ok: true, slug: body.slug, frontmatter: `slug: ${body.slug}\ndraft: true\nheroImage: ${JSON.stringify(attached?.heroImage)}\nheroImageAlt: ${JSON.stringify(attached?.heroAlt)}\nheroAlt: ${JSON.stringify(attached?.heroAlt)}` });
    throw new Error('Unexpected endpoint');
  });
  await tick();
  win.eval(read('pages/admin/hero.astro').match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!);
  for (const source of sources) win.eval(ts.transpileModule(source.match(/<script>([\s\S]*?)<\/script>/)![1]!.replace(/^\s*import .*;$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText);
  win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  const q = <T extends Element = HTMLElement>(selector: string) => win.document.querySelector<T>(selector)!;
  const click = (selector: string) => q<HTMLButtonElement>(selector).click();
  const state = () => (win as any).heroUploaderState;
  const select = (slug: string) => click(`[data-post-slug="${slug}"]`);
  const alt = (value: string) => { q<HTMLInputElement>('[data-alt-input]').value = value; q('[data-alt-input]').dispatchEvent(new win.Event('input')); };
  const choose = (name = 'art.png') => { const file = new win.File([new Uint8Array([1, 2])], name, { type: 'image/png' }); Object.defineProperty(q('[data-file-input]'), 'files', { configurable: true, value: [file] }); q('[data-file-input]').dispatchEvent(new win.Event('change')); };
  await vi.waitFor(() => expect(state().selectedSlug).toBe('alpha'));
  const upload = async () => { click('[data-upload-confirm]'); await vi.waitFor(() => expect(state().uploadStatus).toBe('success')); };
  return { dom, q, click, state, select, alt, choose, upload, calls };
}

describe('Hero completion workspace', () => {
  it('clears files, preview, path, alt edits and success on every selection context', async () => {
    const ui = await setup(); ui.choose(); ui.alt('A candle beside a journal'); await ui.upload();
    expect(ui.q('[data-pending-uploads]').textContent).toContain('Uploaded — not attached yet');
    const token = ui.state().selectionToken; ui.select('beta');
    expect(ui.state()).toMatchObject({ selectedSlug: 'beta', uploadedImagePath: '', altText: 'Old legacy text', attachStatus: 'idle' });
    expect(ui.state().selectionToken).toBeGreaterThan(token);
    expect(ui.q('[data-preview]').classList.contains('hidden')).toBe(true);
    expect(ui.q<HTMLInputElement>('[data-file-input]').value).toBe('');
    expect(ui.q<HTMLButtonElement>('[data-upload-confirm]').disabled).toBe(true);
    ui.click('[data-upload-confirm]');
    expect(ui.calls.filter(call => call.url.endsWith('/upload/hero'))).toHaveLength(1);
    expect(ui.q('[data-pending-uploads]').textContent).toContain('alpha');
  });
  it('cannot upload a file chosen under A after selecting B', async () => {
    const ui = await setup(); ui.choose('alpha.png'); ui.alt('Artwork intended for alpha'); ui.select('beta');
    ui.click('[data-upload-confirm]');
    expect(ui.calls.some(call => call.url.endsWith('/upload/hero'))).toBe(false);
    expect(ui.state().altText).toBe('Old legacy text');
  });
  it('ignores a late upload response after switching, and captures the original file and slug', async () => {
    let resolve!: (value: Response) => void;
    const ui = await setup(url => url.endsWith('/upload/hero') ? new Promise<Response>(done => { resolve = done; }) : undefined);
    ui.choose('alpha.png'); ui.click('[data-upload-confirm]');
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    ui.select('beta'); resolve(response({ ok: true, path: '/images/hero/alpha/alpha.png' })); await tick();
    expect(ui.state()).toMatchObject({ selectedSlug: 'beta', uploadedImagePath: '', uploadStatus: 'idle' });
    expect(ui.q('[data-pending-uploads]').textContent).toContain('Upload may still finish');
    expect(ui.calls.find(call => call.url.endsWith('/upload/hero'))!.body).toMatchObject({ slug: 'alpha', filename: 'alpha.png' });
  });
  it.each(['', 'art.png', '/images/hero/alpha/art.png', '/some/path', 'https://example.com/art.png', 'ChatGPT-image-123'])('blocks useless alt %s', async value => {
    const ui = await setup(); ui.choose(); await ui.upload(); ui.alt(value);
    expect(ui.q<HTMLButtonElement>('[data-submit]').disabled).toBe(true);
    ui.click('[data-submit]'); expect(ui.calls.some(call => call.url.endsWith('/posts/attach-hero'))).toBe(false);
  });
  it('repairs existing artwork alt without upload and verifies both alt fields before success', async () => {
    const ui = await setup(); ui.select('beta'); ui.alt('A blue window beside a warm reading chair');
    expect(ui.q('[data-attach-summary]').textContent).toContain('Beta draft (beta)');
    expect(ui.q('[data-attach-summary]').textContent).toContain('/images/hero/beta/existing.png');
    ui.click('[data-submit]'); await vi.waitFor(() => expect(ui.state().attachStatus).toBe('success'));
    expect(ui.calls.some(call => call.url.endsWith('/upload/hero'))).toBe(false);
    expect(ui.calls.find(call => call.url.endsWith('/posts/attach-hero'))!.body).toEqual({ slug: 'beta', heroImage: '/images/hero/beta/existing.png', heroAlt: 'A blue window beside a warm reading chair' });
    expect(ui.q('[data-success]').textContent).toContain('Open in Posts');
    expect(ui.q('[data-success]').textContent).toContain('Review in Staging');
    expect(ui.q('[data-success]').textContent).not.toContain('View live');
    ui.alt('Updated description of the blue window');
    expect(ui.state().attachStatus).toBe('idle'); expect(ui.q('[data-success]').classList.contains('hidden')).toBe(true);
    expect(ui.q<HTMLButtonElement>('[data-submit]').disabled).toBe(false);
  });
  it('does not apply an attach response to another post workspace', async () => {
    let resolve!: (value: Response) => void;
    const ui = await setup(url => url.endsWith('/posts/attach-hero') ? new Promise<Response>(done => { resolve = done; }) : undefined);
    ui.select('beta'); ui.alt('A blue window in a reading room'); ui.click('[data-submit]');
    ui.select('alpha'); resolve(response({ ok: true })); await tick();
    expect(ui.state()).toMatchObject({ selectedSlug: 'alpha', attachStatus: 'idle', existingHeroPath: '' });
    expect(ui.calls.some(call => call.url.endsWith('/posts/load'))).toBe(false);
    expect(ui.q('[data-success]').classList.contains('hidden')).toBe(true);
  });
  it('shows saved but not verified on disagreement, and retries only the reread', async () => {
    let mismatch = true;
    const ui = await setup((url, body) => url.endsWith('/posts/load') ? response({ ok: true, slug: body.slug, frontmatter: `draft: false\nheroImage: /images/hero/beta/existing.png\nheroImageAlt: ${mismatch ? 'Stale legacy text' : 'A candle on a table'}\nheroAlt: A candle on a table` }) : undefined);
    ui.select('beta'); ui.alt('A candle on a table'); ui.click('[data-submit]');
    await vi.waitFor(() => expect(ui.state().attachStatus).toBe('unverified'));
    expect(ui.q('[data-status]').textContent).toContain('Saved but not verified');
    mismatch = false; ui.click('[data-retry-verification]');
    await vi.waitFor(() => expect(ui.state().attachStatus).toBe('success'));
    expect(ui.calls.filter(call => call.url.endsWith('/posts/attach-hero'))).toHaveLength(1);
    expect(ui.q('[data-success]').textContent).toContain('View live post');
  });
  it('ignores late reread verification after switching posts', async () => {
    let resolve!: (value: Response) => void;
    const ui = await setup(url => url.endsWith('/posts/load') ? new Promise<Response>(done => { resolve = done; }) : undefined);
    ui.select('beta'); ui.alt('A candle on a table'); ui.click('[data-submit]');
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    ui.select('alpha');
    resolve(response({ ok: true, slug: 'beta', frontmatter: 'draft: true\nheroImage: /images/hero/beta/existing.png\nheroImageAlt: A candle on a table\nheroAlt: A candle on a table' })); await tick();
    expect(ui.state()).toMatchObject({ selectedSlug: 'alpha', attachStatus: 'idle' });
    expect(ui.q('[data-success]').classList.contains('hidden')).toBe(true);
  });
  it('waits for reread before success and refreshes Hero indicators', async () => {
    let resolve!: (value: Response) => void;
    const ui = await setup(url => url.endsWith('/posts/load') ? new Promise<Response>(done => { resolve = done; }) : undefined);
    ui.choose(); ui.alt('A candle on a wooden desk'); await ui.upload(); ui.click('[data-submit]');
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    expect(ui.state().attachStatus).toBe('verifying'); expect(ui.q('[data-success]').classList.contains('hidden')).toBe(true);
    resolve(response({ ok: true, slug: 'alpha', frontmatter: 'draft: true\nheroImage: /images/hero/alpha/art.png\nheroImageAlt: A candle on a wooden desk\nheroAlt: A candle on a wooden desk' }));
    await vi.waitFor(() => expect(ui.state().attachStatus).toBe('success'));
    expect(ui.q('[data-pending-uploads]').textContent).toBe('');
    expect(ui.q('[data-existing-hero]').textContent).toContain('/images/hero/alpha/art.png');
    expect(ui.q('[data-missing-hero-posts]').textContent).not.toContain('Alpha draft');
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
