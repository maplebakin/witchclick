import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const base = read('src/layouts/Base.astro');
const css = read('src/styles/admin.css');
const theme = read('src/pages/admin/theme.astro');

describe('admin theme boundary', () => {
  it('marks only admin routes and loads the shell even without AdminNav', () => {
    expect(base).toContain('currentPath === "/admin" || currentPath.startsWith("/admin/")');
    expect(base).toContain('data-admin-shell={isAdminRoute || undefined}');
    expect(base).toContain('import "@/styles/admin.css"');
  });
  it('owns the fixed admin palette without reading public token files', () => {
    const nav = read('src/components/AdminNav.astro');
    for (const source of [base, nav]) {
      expect(source).not.toContain('autumn-window.tokens.css');
      expect(source).not.toMatch(/autumnWindowTokens|adminThemeTokens|adminPaletteKeys/);
    }
    expect(base).not.toContain('set:html={`:root[data-admin-shell]');
    const palette = css.match(/:scope\[data-admin-shell\]\s*\{([^}]+)\}/)?.[1] ?? '';
    const expected = {
      'surface-base': '#242120', 'surface-panel': '#2A2624',
      'surface-elevated': '#302B28', 'text-strong': '#F0E8DD',
      'text-body': '#E8DED1', 'text-muted': '#BFB2A3',
      'border-subtle': '#504640', 'border-strong': '#84766B',
      'accent-mulberry': '#B98F9D', 'accent-blue': '#A8BBC3',
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(palette).toContain(`--admin-palette-${key}: ${value};`);
      expect(css).toContain(`var(--admin-palette-${key})`);
    }
    expect([...css.matchAll(/--admin-palette-[\w-]+\s*:/g)]).toHaveLength(10);
    expect(css).not.toMatch(/@import|--wc-kit-/);
  });
  it('keeps existing admin navigation compatibility aliases and modes inside the shell', () => {
    // These were formerly injected from the public stylesheet by AdminNav.
    // Preserve the existing root bindings while making their values admin-owned.
    expect(css).toContain(':scope:has([data-admin-nav]) {');
    expect(css).toContain('--surface-base: var(--admin-palette-surface-base);');
    expect(css).toContain('--text-body: var(--admin-palette-text-body);');
    expect(css).toContain(':scope:has([data-admin-nav])[data-comfort-theme="dawn"]');
    expect(css).toContain(':scope:has([data-admin-nav])[data-comfort-mode="calm"]');
    expect(css).toContain(':scope:has([data-admin-nav])[data-comfort-mode="plain"]');
    expect(css).not.toContain(':root[data-theme="autumn-window"]');
    expect(base).toContain('useAutumnWindowKit = useAutumnWindow && !isAdminRoute;');
  });
  it('contains all admin utilities and excludes candidate sample subtrees', () => {
    expect(css.trimStart()).toMatch(/^\/\*[^]*?\*\/\s*@scope \(\[data-admin-shell\]\) to \(\[data-theme-preview\]:not\(html\):not\(\[data-theme-swatches\]\)\)/);
    expect(css).toContain(':scope[data-admin-shell], body, main');
    expect(css).toContain('background: var(--admin-surface-base) !important');
    expect(css).toContain('background: var(--admin-surface-muted) !important');
  });
  it('keeps manifest swatches local and admin chrome on admin tokens', () => {
    expect(theme).not.toContain('data-theme-preview');
    expect(theme).not.toContain('data-wc-kit-mode');
    expect(theme).not.toContain('wc-kit-autumn-window');
    expect(theme).toContain('data-kit-swatch={swatch.id}');
    expect(theme).toContain('style={`background-color: ${swatch.value};`}');
    expect(theme).toContain('background: var(--admin-surface-muted)');
    expect(theme).toContain('color: var(--admin-text-body)');
  });
});
