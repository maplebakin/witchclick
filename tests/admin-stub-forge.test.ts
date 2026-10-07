import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pageSource = fs.readFileSync(new URL('../src/pages/admin/stubs.astro', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../src/scripts/admin/admin-stub-dashboard.ts', import.meta.url), 'utf8');
const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
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

async function setup(fetcher = mockFetch(() => response({ ok: true, stubs: entries }))) {
  const dom = new JSDOM(`<body>${pageSource.slice(pageSource.indexOf('<div\n        class="grid'), pageSource.indexOf('  ) : ('))}</body>`, { runScripts: 'outside-only', url: 'http://localhost/admin/stubs' });
  windows.push(dom);
  const root = dom.window.document.querySelector('[data-stub-dashboard]')!;
  root.setAttribute('data-post-stubs', JSON.stringify(entries));
  dom.window.fetch = fetcher as unknown as typeof fetch;
  await tick();
  dom.window.eval(script);
  const q = <T extends Element = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector)!;
  const click = (selector: string) => q<HTMLButtonElement>(selector).click();
  const input = (value: string) => { q<HTMLTextAreaElement>('[data-draft-input]').value = value; q('[data-draft-input]').dispatchEvent(new dom.window.Event('input')); };
  return { dom, root, q, click, input, fetcher };
}

describe('Post Stub Forge behavior', () => {
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
