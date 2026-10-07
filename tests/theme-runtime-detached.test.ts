// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync(path.resolve('src/layouts/Base.astro'), 'utf8');
const inlineScripts = [...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
const bootstrap = inlineScripts.find((script) => script.includes("const STORAGE_KEY = 'witchclick-comfort'"))!;
const kitModeScript = inlineScripts.find((script) => script.includes('syncKitMode'))!;
const observers: MutationObserver[] = [];

afterEach(() => {
  observers.splice(0).forEach((observer) => observer.disconnect());
  document.documentElement.removeAttribute('style');
});

function runPreferences(admin: boolean, theme: string, mode: string, legacy: boolean) {
  const root = document.documentElement;
  [...root.attributes].forEach((attribute) => root.removeAttribute(attribute.name));
  root.setAttribute('data-theme-midnight', admin ? 'autumn-twilight' : 'autumn-window');
  root.setAttribute('data-theme-dawn', admin ? 'test-light' : 'autumn-window');
  if (admin) root.setAttribute('data-admin-shell', '');
  else root.classList.add('wc-kit-autumn-window');
  const values = new Map([['witchclick-comfort', JSON.stringify({ theme, mode, font: 'sans' })]]);
  if (legacy) values.set('wc-active-theme', JSON.stringify({ slug: 'bogus-dawn', tokens: { surfaceBase: 'hsl(120 100% 50%)' } }));
  const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn(), removeItem: vi.fn() };
  class ObservedMutationObserver extends MutationObserver {
    constructor(callback: MutationCallback) { super(callback); observers.push(this); }
  }
  const context = { document, localStorage: storage, MutationObserver: ObservedMutationObserver };
  runInNewContext(bootstrap, context);
  runInNewContext(kitModeScript, context);
  return { root, storage };
}

describe('Base detached from legacy preset state', () => {
  it('has no resolver import/call or saved-editor-state loader', () => {
    expect(source).not.toMatch(/getActiveThemes|getTheme\(|@\/utils\/theme|theme-cache|wc-active-theme/);
    expect(source).not.toMatch(/midnightTheme\?|dawnTheme\?|FALLBACK_COLORS/);
    expect(source).toContain('ADMIN_COMPATIBILITY_THEME');
    for (const value of ['#b8847a', '#be958d', '#1d1716', 'autumn-twilight', 'test-light']) expect(source).toContain(value);
    expect(source).toContain('useAutumnWindow ? "#242120" : ADMIN_COMPATIBILITY_THEME.primary');
  });

  it('preserves public ambient aliases, scope detection, and kit/admin wiring', () => {
    expect(source).toContain('--ambient-color: var(--surface-base); --ambient-highlight: var(--surface-elevated);');
    expect(source).toContain('const themeScope = detectThemeScope(currentPath);');
    expect(source).toContain('data-scope={themeScope || undefined}');
    expect(source).toContain('data-admin-shell={isAdminRoute || undefined}');
    expect(source).toContain('useAutumnWindowKit = useAutumnWindow && !isAdminRoute;');
    expect(source).toContain("attributeFilter: ['data-comfort-theme']");
  });

  for (const admin of [false, true]) for (const theme of ['midnight', 'dawn']) for (const mode of ['standard', 'calm', 'plain']) {
    it(`${admin ? 'admin' : 'public'} ${theme}/${mode} ignores legacy storage and preserves comfort preferences`, () => {
      for (const legacy of [false, true]) {
        const { root, storage } = runPreferences(admin, theme, mode, legacy);
        expect(root.getAttribute('data-comfort-mode')).toBe(mode === 'standard' ? null : mode);
        expect(root.getAttribute('data-comfort-font')).toBe('sans');
        expect(root.getAttribute('data-comfort-theme')).toBe(theme === 'dawn' ? 'dawn' : null);
        expect(root.getAttribute('data-theme')).toBe(admin ? (theme === 'dawn' ? 'test-light' : 'autumn-twilight') : 'autumn-window');
        expect(root.getAttribute('data-wc-kit-mode')).toBe(admin ? null : theme);
        expect(root.style.length).toBe(0);
        expect(storage.getItem.mock.calls.flat()).not.toContain('wc-active-theme');
        expect(storage.setItem).not.toHaveBeenCalled();
      }
    });
  }

  it('updates kit mode after Dawn changes without adding kit context to admin', async () => {
    const { root } = runPreferences(false, 'midnight', 'standard', true);
    root.setAttribute('data-comfort-theme', 'dawn');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.getAttribute('data-wc-kit-mode')).toBe('dawn');
    root.removeAttribute('data-comfort-theme');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.getAttribute('data-wc-kit-mode')).toBe('midnight');
  });
});
