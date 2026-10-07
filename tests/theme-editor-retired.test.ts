import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const retired = [
  'scripts/apocapalette-to-theme.mjs',
  'src/scripts/theme-editor-entry.ts',
  'src/lib/theme-editor.ts',
  'src/lib/theme-manager.ts',
  'src/lib/theme-editor-comprehensive.ts',
  'src/lib/theme-variable-keys.ts',
  'src/lib/theme-scopes.ts',
  ...['save.json.ts', 'set-active.json.ts', 'delete.json.ts', 'list.json.ts', '_shared.ts']
    .map(file => `src/pages/api/themes/${file}`),
];
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

function sources(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sources(file) : /\.(astro|[cm]?js|tsx?)$/.test(file) ? [file] : [];
  });
}

describe('retired editor client and Astro API layer', () => {
  it.each(retired)('keeps %s absent', file => {
    expect(fs.existsSync(path.join(root, file))).toBe(false);
  });

  it('has no executable source or package references to retired modules or wrappers', () => {
    const reference = /(?:from\s*|import\s*\(?|require\s*\(|fetch\s*\()\s*['"][^'"]*(?:theme-editor(?:-entry|-comprehensive)?|theme-manager|theme-variable-keys|theme-scopes|\/api\/themes\/)/;
    for (const file of [...sources('src'), ...sources('scripts')]) {
      expect(read(file), file).not.toMatch(reference);
    }
    expect(JSON.parse(read('package.json')).scripts).not.toEqual(expect.objectContaining({
      'theme-editor': expect.anything(),
    }));
    expect(JSON.stringify(JSON.parse(read('package.json')).scripts)).not.toMatch(/theme-editor|theme-manager|api\/themes/);
  });

  it('keeps the shelf manifest-driven and free of legacy editor dependencies', () => {
    const viewer = read('src/pages/admin/theme.astro');
    expect(viewer).toContain('from "@/lib/ingested-palettes"');
    expect(viewer).toContain('const palettes = discoverIngestedPalettes();');
    expect(viewer).toContain('data-theme-manifest-viewer');
    expect(viewer).not.toMatch(/theme-editor|ThemeEditor|ThemeManager|\/api\/themes|<form\b|localStorage|sessionStorage/);
  });

  it('retains generic utilities while retiring theme HTTP handlers', () => {
    for (const file of ['src/lib/undo-redo.ts', 'src/lib/contrast-checker.ts', 'src/lib/theme/colors.cjs', 'dev-api.js']) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
    const dev = read('dev-api.js');
    expect(dev).not.toContain('THEME_EDITOR_FROZEN');
    for (const route of ['/themes/list', '/themes/list-backgrounds', '/themes/save', '/themes/set-active', '/themes/delete', '/upload/theme-background', '/color-tokens/get', '/color-tokens/save']) {
      expect(dev).not.toContain(route);
    }
  });
});
