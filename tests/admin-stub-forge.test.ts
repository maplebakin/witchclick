import fs from 'node:fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { buildFallbackHeroPrompt } from '../src/utils/heroPrompt';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pageSource = fs.readFileSync(new URL('../src/pages/admin/stubs.astro', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../src/scripts/admin/admin-stub-dashboard.ts', import.meta.url), 'utf8');
const script = ts.transpileModule(source.replace(/^import .*;$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const workflowSource = fs.readFileSync(new URL('../src/scripts/admin/hero-workflow.ts', import.meta.url), 'utf8');
const workflowScript = ts.transpileModule(workflowSource.replace(/^import .*;$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const workflowMarkup = fs.readFileSync(new URL('../src/components/admin/HeroWorkflow.astro', import.meta.url), 'utf8').split('\n---\n')[1]!.split('<script>')[0]!
  .replace(/hidden=\{mode !== 'picker'\}/g, 'hidden').replace(/>\{lockedMessage\}</g, '>Locked — available once this stub has been replaced by an ingested draft.<')
  .replace(/data-mode=\{mode\}/g, 'data-mode="embedded"').replace(/data-hero-slug=\{slug\}/g, 'data-hero-slug=""')
  .replace(/data-locked-message=\{lockedMessage\}/g, 'data-locked-message="Locked — available once this stub has been replaced by an ingested draft."')
  .replace(/data-dev-api=\{devApi\}/g, 'data-dev-api="http://localhost:8787"').replace(/data-dev-key=\{devKey\}/g, 'data-dev-key=""');
const entries = [
  { slug: 'alpha', title: 'Alpha', filePath: 'src/content/posts/alpha.md', stubTriageStatus: 'editorial-seed', stubTriageNotes: 'A short idea awaiting development.' },
  { slug: 'beta', title: 'Beta', stubTriageStatus: 'support-reference-candidate' },
];
const markdown = (slug = 'alpha') => `\n---\ntitle: Full draft\nslug: ${slug}\ndraft: true\n---\n\nCompleted text.\n`;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const response = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status }));
const mockFetch = (implementation: () => Promise<Response>) => vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(implementation);
const windows: JSDOM[] = [];
afterEach(() => { windows.splice(0).forEach(dom => dom.window.close()); });

async function setup(fetcher = mockFetch(() => response({ ok: true, stubs: entries })), url = 'http://localhost/admin/stubs', historyState: unknown = null) {
  const dom = new JSDOM(`<body>${pageSource.slice(pageSource.indexOf('<div\n        class="grid'), pageSource.indexOf('  ) : (')).replace(/<HeroWorkflow[^>]*\/>/, workflowMarkup)}</body>`, { runScripts: 'outside-only', url });
  windows.push(dom);
  const root = dom.window.document.querySelector('[data-stub-dashboard]')!;
  root.setAttribute('data-post-stubs', JSON.stringify(entries));
  (dom.window as any).parseYaml = parseYaml;
  (dom.window as any).stringifyYaml = stringifyYaml;
  (dom.window as any).buildFallbackHeroPrompt = buildFallbackHeroPrompt;
  dom.window.history.replaceState(historyState, '');
  dom.window.fetch = fetcher as unknown as typeof fetch;
  await tick();
  dom.window.eval(workflowScript);
  dom.window.eval(script);
  const q = <T extends Element = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector)!;
  const click = (selector: string) => q<HTMLButtonElement>(selector).click();
  const input = (value: string) => { q<HTMLTextAreaElement>('[data-draft-input]').value = value; q('[data-draft-input]').dispatchEvent(new dom.window.Event('input')); };
  return { dom, root, q, click, input, fetcher };
}

describe('Post Stub Forge behavior', () => {
  it('selects the exact deep-linked stub after loading, clears restored filters, and keeps validation fresh', async () => {
    let resolve!: (value: Response) => void;
    const ui = await setup(mockFetch(() => new Promise<Response>(done => { resolve = done; })), 'http://localhost/admin/stubs?slug=beta');
    ui.q<HTMLInputElement>('[data-stub-search]').value = 'alpha';
    ui.q('[data-stub-search]').dispatchEvent(new ui.dom.window.Event('input'));
    ui.q<HTMLSelectElement>('[data-triage-filter]').value = 'editorial-seed';
    ui.q('[data-triage-filter]').dispatchEvent(new ui.dom.window.Event('change'));
    Object.defineProperty(ui.dom.window, 'innerWidth', { value: 390 });
    const scroll = vi.fn(); ui.q('[data-detail-panel]').scrollIntoView = scroll;
    resolve(new Response(JSON.stringify({ ok: true, stubs: entries }))); await tick();
    expect(ui.q('[data-selected-name]').textContent).toBe('Beta');
    expect(ui.q('[data-detail-panel]').classList.contains('hidden')).toBe(false);
    expect(ui.q('[data-stub-guidance]').textContent).toContain('support reference');
    expect(ui.q<HTMLInputElement>('[data-stub-search]').value).toBe('');
    expect(ui.q<HTMLSelectElement>('[data-triage-filter]').value).toBe('all');
    expect(ui.q('[data-stub-list]').querySelectorAll('[data-stub-item]')).toHaveLength(2);
    expect(ui.q('[data-stub-item="post:beta"]').classList.contains('border-primary')).toBe(true);
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
  });

  it('keeps generic arrivals unselected and reports a missing slug visibly with the full list usable', async () => {
    const generic = await setup(); await tick();
    expect(generic.q('[data-detail-panel]').classList.contains('hidden')).toBe(true);
    expect(generic.q('[data-empty-state]').textContent).toContain('Select a placeholder');
    const missing = await setup(undefined, 'http://localhost/admin/stubs?slug=missing%20idea%2F%26'); await tick();
    expect(missing.q('[data-forge-notice]').textContent).toContain('missing idea/&');
    expect(missing.q('[data-forge-notice]').textContent).toContain('completed, removed, or renamed');
    expect(missing.q('[data-forge-notice]').closest('.hidden')).toBeNull();
    expect(missing.q('[data-stub-list]').querySelectorAll('[data-stub-item]')).toHaveLength(2);
    missing.click('[data-stub-item="post:alpha"]');
    expect(missing.q('[data-selected-name]').textContent).toBe('Alpha');
  });

  it('shows loading, visible retryable failure, malformed failure, and recovery', async () => {
    let resolve!: (value: Response) => void;
    const fetcher = mockFetch(() => new Promise<Response>(done => { resolve = done; }));
    const ui = await setup(fetcher);
    expect(ui.q('[data-stub-list]').textContent).toContain('Loading');
    expect(ui.root.getAttribute('aria-busy')).toBe('true');
    resolve(new Response('{bad json')); await tick();
    expect(ui.q('[data-forge-notice]').textContent).toContain('could not be loaded');
    expect(ui.q('[data-forge-notice]').closest('.hidden')).toBeNull();
    fetcher.mockImplementation(() => response({ ok: true, stubs: {} }));
    ui.click('[data-forge-notice] button'); await tick();
    expect(ui.q('[data-forge-notice]').textContent).toContain('Malformed');
    fetcher.mockImplementation(() => response({ ok: true, stubs: entries }));
    ui.click('[data-forge-notice] button'); await tick();
    expect(ui.q('[data-stub-item]').textContent).toContain('Alpha');
    expect(ui.root.getAttribute('aria-busy')).toBe('false');
  });

  it('distinguishes empty, no matches, unselected, and selected guidance without fabricated reasons', async () => {
    const ui = await setup(); await tick();
    expect(ui.q('[data-empty-state]').textContent).toContain('2 post stubs');
    ui.click('[data-stub-item="post:alpha"]');
    expect(ui.q('[data-stub-guidance]').textContent).toContain('A short idea awaiting development.');
    expect(ui.q('[data-stub-guidance]').textContent).toContain('editorial seed');
    ui.click('[data-stub-item="post:beta"]');
    expect(ui.q('[data-stub-guidance]').textContent).toContain('No specific classification reason');
    expect(ui.q('[data-stub-guidance]').textContent).toContain('support reference');
    ui.q<HTMLInputElement>('[data-stub-search]').value = 'no match';
    ui.q('[data-stub-search]').dispatchEvent(new ui.dom.window.Event('input'));
    expect(ui.q('[data-stub-list]').textContent).toContain('No post stubs match');
    const empty = await setup(mockFetch(() => response({ stubs: [] }))); await tick();
    expect(empty.q('[data-stub-list]').textContent).toContain('No placeholder post stubs remain');
  });

  it.each([
    ['strong-article-candidate', 'Write the full draft'],
    ['support-reference-candidate', 'support reference'],
    ['editorial-seed', 'editorial seed'],
    ['pop-culture-review', 'Human decision needed'],
    ['template-section-artifact', 'Human decision needed'],
    ['needs-human-decision', 'Human decision needed'],
    ['possible-delete-merge-candidate', 'delete/merge candidate'],
  ])('suggests an action for %s using the existing category', async (category, action) => {
    const ui = await setup(mockFetch(() => response({ stubs: [{ slug: 'alpha', stubTriageStatus: category }] }))); await tick();
    ui.click('[data-stub-item]');
    expect(ui.q('[data-stub-guidance]').textContent).toContain(action);
    expect(ui.q('[data-stub-guidance]').textContent).toContain('No specific classification reason');
  });

  it('cannot enable Replace from malformed validation responses or a completed validation for another selection', async () => {
    const ui = await setup(); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    ui.fetcher.mockImplementation(() => response({}));
    ui.click('[data-validate-post]'); await tick();
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    ui.fetcher.mockImplementation(() => response({ ok: true }));
    ui.click('[data-validate-post]'); await tick();
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(false);
    ui.click('[data-stub-item="post:beta"]'); ui.input(markdown('beta'));
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
  });

  it('sends exact Markdown and invalidates validation on every edit, including whitespace and programmatic changes', async () => {
    const ui = await setup(); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    ui.fetcher.mockImplementation(() => response({ ok: true, path: 'actual/alpha.md' }));
    ui.click('[data-validate-post]'); await tick();
    expect(JSON.parse(String(ui.fetcher.mock.calls.at(-1)?.[1]?.body)).markdown).toBe(markdown());
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(false);
    ui.input(markdown() + ' ');
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    ui.click('[data-validate-post]'); await tick();
    ui.q<HTMLTextAreaElement>('[data-draft-input]').value += 'changed without event';
    ui.click('[data-save-post]');
    expect(ui.q('[data-confirm-modal]').classList.contains('hidden')).toBe(true);
  });

  it('rejects late validation after edit-and-undo or selection switch, and never reuses prior validation', async () => {
    const ui = await setup(); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    let resolve!: (value: Response) => void;
    ui.fetcher.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    ui.click('[data-validate-post]'); ui.input(markdown() + 'edit'); ui.input(markdown());
    resolve(new Response('{"ok":true}')); await tick();
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    ui.click('[data-validate-post]'); ui.click('[data-stub-item="post:beta"]'); ui.input(markdown('beta'));
    resolve(new Response('{"ok":true}')); await tick();
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    ui.click('[data-stub-item="post:alpha"]');
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
  });

  it('confirms supplied destination, replaces once with exact text, and shows draft-only onward links', async () => {
    const ui = await setup(); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    ui.fetcher.mockImplementation(() => response({ ok: true, path: 'actual/alpha.md' }));
    ui.click('[data-validate-post]'); await tick(); ui.click('[data-save-post]');
    expect(ui.q('[data-confirm-title]').textContent).toBe('Alpha');
    expect(ui.q('[data-confirm-slug]').textContent).toBe('alpha');
    expect(ui.q('[data-confirm-path]').textContent).toBe('actual/alpha.md');
    expect(ui.q('[data-confirm-modal]').textContent).toContain('forced to');
    let resolve!: (value: Response) => void;
    ui.fetcher.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    const before = ui.fetcher.mock.calls.length;
    ui.click('[data-confirm-replace]'); ui.click('[data-confirm-replace]');
    expect(ui.fetcher.mock.calls.length).toBe(before + 1);
    expect(JSON.parse(String(ui.fetcher.mock.calls.at(-1)?.[1]?.body)).markdown).toBe(markdown());
    ui.fetcher.mockImplementation(() => response({ stubs: [] }));
    resolve(new Response('{"ok":true,"path":"actual/alpha.md"}')); await tick(); await tick();
    expect(ui.q('[data-replacement-result]').textContent).toContain('has not been published');
    expect(ui.q<HTMLAnchorElement>('[data-replacement-result] a').getAttribute('href')).toBe('/admin/posts?slug=alpha');
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
    expect(ui.fetcher.mock.calls.every(call => !String(call[0]).includes('publish'))).toBe(true);
    ui.fetcher.mockImplementation(() => response({ ok: false, error: 'Refresh unavailable' }, 500));
    ui.click('[data-refresh]'); await tick();
    expect(ui.q('[data-forge-notice]').textContent).toContain('Refresh unavailable');
    expect(ui.q('[data-replacement-result] a').getAttribute('href')).toBe('/admin/posts?slug=alpha');
  });
});


const loadedDraft = (fields: Record<string, unknown> = {}) => ({
  ok: true, slug: 'alpha', frontmatter: Object.entries({ title: 'Full draft', slug: 'alpha', draft: true, tags: ['comfort'], ...fields }).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n'),
});
async function replaceWithHero(fields: Record<string, unknown> = {}) {
  let replaced = false;
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith('/posts/load')) return new Response(JSON.stringify(loadedDraft(fields)));
    if (url.endsWith('/posts/replace-stub')) { replaced = true; return new Response('{"ok":true}'); }
    if (url.endsWith('?dryRun=true')) return new Response('{"ok":true}');
    return new Response(JSON.stringify({ ok: true, stubs: replaced ? [entries[1]] : entries }));
  });
  const ui = await setup(fetcher); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
  ui.click('[data-validate-post]'); await tick(); ui.click('[data-save-post]'); ui.click('[data-confirm-replace]');
  await vi.waitFor(() => expect(ui.q<HTMLElement>('[data-workspace]').hidden).toBe(false));
  return ui;
}

describe('Post Stub Forge hero step', () => {
  it('is visible but locked for a selected stub', async () => {
    const ui = await setup(); await tick(); ui.click('[data-stub-item="post:alpha"]');
    expect(ui.q<HTMLElement>('[data-forge-hero-step]').hidden).toBe(false);
    expect(ui.q('[data-forge-hero-step]').textContent).toContain('Step 4 — Hero image');
    expect(ui.q('[data-hero-workflow]').textContent).toContain('available once this stub has been replaced');
    expect(ui.q<HTMLElement>('[data-workspace]').hidden).toBe(true);
  });

  it.each([true, false])('uses the loaded draft’s saved prompt or shared fallback (saved=%s), copies and embeds the exact slug', async saved => {
    const fields = saved ? { heroImagePrompt: 'Specific saved artwork for the ingested draft.' } : {};
    const ui = await replaceWithHero(fields);
    const expected = saved ? fields.heroImagePrompt : buildFallbackHeroPrompt({ title: 'Full draft', slug: 'alpha', tags: ['comfort'] });
    expect(ui.q<HTMLTextAreaElement>('[data-hero-prompt]').value).toBe(expected);
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Hero missing');
    expect(ui.q<HTMLElement>('[data-hero-workflow]').dataset.heroSlug).toBe('alpha');
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Post: Full draft (alpha)');
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(ui.dom.window.navigator, 'clipboard', { value: { writeText: copy } });
    ui.click('[data-copy-hero-prompt]'); await tick(); expect(copy).toHaveBeenCalledWith(expected);
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Hero prompt copied');
    expect(ui.q<HTMLButtonElement>('[data-save-post]').disabled).toBe(true);
  });

  it('refreshes alt-needs-work to complete without repeating replacement', async () => {
    const ui = await replaceWithHero({ heroImage: '/images/hero/alpha/art.png', heroImageAlt: 'art.png' });
    expect(ui.q('[data-hero-workflow]').textContent).toContain('alt needs work');
    const replacements = ui.fetcher.mock.calls.filter(call => call[0].endsWith('/posts/replace-stub')).length;
    ui.fetcher.mockImplementation(async () => new Response(JSON.stringify(loadedDraft({ heroImage: '/images/hero/alpha/art.png', heroImageAlt: 'A warm reading chair beside a window', heroAlt: 'A warm reading chair beside a window' }))));
    ui.click('[data-refresh-hero]');
    await vi.waitFor(() => expect(ui.q('[data-hero-workflow]').textContent).toContain('Hero complete'));
    expect([...ui.q('[data-hero-workflow]').querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/admin/posts?slug=alpha', '/admin/staging?slug=alpha']);
    expect(ui.fetcher.mock.calls.filter(call => call[0].endsWith('/posts/replace-stub'))).toHaveLength(replacements);
  });

  it.each([{ title: 'Wrong title' }, { slug: 'beta' }, { draft: false }])('rejects mismatched loaded identity/state and allows a load-only retry: %j', async fields => {
    const ui = await replaceWithHero();
    ui.fetcher.mockImplementation(async () => new Response(JSON.stringify(loadedDraft(fields))));
    ui.click('[data-refresh-hero]');
    await vi.waitFor(() => expect(ui.q('[data-hero-workflow]').textContent).toContain('hero status could not be loaded'));
    expect(ui.q<HTMLElement>('[data-workspace]').hidden).toBe(true);
    ui.fetcher.mockImplementation(async () => new Response(JSON.stringify(loadedDraft())));
    ui.click('[data-load-retry]');
    await vi.waitFor(() => expect(ui.q('[data-hero-workflow]').textContent).toContain('Hero missing'));
  });

  it('resets on switching stubs and ignores a late hero refresh', async () => {
    const ui = await replaceWithHero({ heroImagePrompt: 'Alpha artwork prompt' });
    let resolve!: (value: Response) => void;
    ui.fetcher.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    ui.click('[data-refresh-hero]');
    ui.click('[data-stub-item="post:beta"]');
    resolve(new Response(JSON.stringify(loadedDraft()))); await tick();
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Locked');
    expect(ui.q('[data-hero-workflow]').textContent).not.toContain('alpha');
    expect(ui.q<HTMLElement>('[data-workspace]').hidden).toBe(true);
    expect(ui.q<HTMLTextAreaElement>('[data-hero-prompt]').value).toBe('');
  });

  it('does not lock selection while the initial post read is pending, and ignores that response after switching', async () => {
    let resolve!: (value: Response) => void;
    let replaced = false;
    const fetcher = vi.fn(async (url: string): Promise<Response> => {
      if (url.endsWith('/posts/load')) return new Promise<Response>(done => { resolve = done; });
      if (url.endsWith('/posts/replace-stub')) replaced = true;
      return new Response(JSON.stringify(url.endsWith('/posts/stubs') ? { ok: true, stubs: replaced ? [entries[1]] : entries } : { ok: true }));
    });
    const ui = await setup(fetcher); await tick(); ui.click('[data-stub-item="post:alpha"]'); ui.input(markdown());
    ui.click('[data-validate-post]'); await tick(); ui.click('[data-save-post]'); ui.click('[data-confirm-replace]');
    await vi.waitFor(() => expect(ui.q<HTMLTextAreaElement>('[data-draft-input]').disabled).toBe(false));
    expect(resolve).toBeTypeOf('function');
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Loading hero status');
    ui.click('[data-stub-item="post:beta"]'); resolve(new Response(JSON.stringify(loadedDraft()))); await tick();
    expect(ui.q('[data-hero-workflow]').textContent).toContain('Locked');
    expect(ui.q<HTMLElement>('[data-workspace]').hidden).toBe(true);
    expect(ui.q<HTMLTextAreaElement>('[data-hero-prompt]').value).toBe('');
  });

  it('restores only this history entry’s replaced draft after returning from Hero', async () => {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/posts/load') ? loadedDraft({ heroImage: '/images/hero/alpha/art.png', heroImageAlt: 'A warm window' }) : { ok: true, stubs: [entries[1]] })));
    const ui = await setup(fetcher, 'http://localhost/admin/stubs?slug=alpha', { postStubHero: { slug: 'alpha', title: 'Full draft' } });
    await vi.waitFor(() => expect(ui.q('[data-hero-workflow]').textContent).toContain('Hero complete'));
    expect(ui.fetcher.mock.calls.every(call => !call[0].includes('replace-stub'))).toBe(true);
    expect(ui.q<HTMLElement>('[data-forge-hero-step]').hidden).toBe(false);
  });
});
