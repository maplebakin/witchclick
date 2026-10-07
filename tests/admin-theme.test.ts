import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const retiredHelpers = [
  'listThemes', 'saveThemeRecord', 'setActiveThemeRecord', 'deleteThemeRecord',
  'readThemeRecord', 'readActiveThemeMapping', 'extractThemeValues',
  'mergeThemeSettings', 'normalizeThemeMode', 'toTitleCase',
];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(file) : /\.(astro|[cm]?js|tsx?)$/.test(file) ? [file] : [];
  });
}

describe('legacy preset runtime retirement', () => {
  it.each(['src/utils/theme.ts', 'shared/theme-cache.js', 'shared/theme-cache.d.ts'])('keeps %s absent', file => {
    expect(fs.existsSync(path.join(root, file))).toBe(false);
  });

  it('removes preset helpers, constants and the cache import from dev-api', () => {
    const source = read('dev-api.js');
    for (const name of retiredHelpers) expect(source).not.toMatch(new RegExp(`\\b${name}\\b`));
    expect(source).not.toMatch(/THEMES_DIR|ACTIVE_THEME_FILE|THEME_REQUIRED_FIELDS|THEME_EXTRA_FIELDS|THEME_OPTIONAL_FIELDS|THEME_ALL_FIELDS|DEFAULT_THEME_SETTINGS|theme-cache|resetThemeCache/);
    const declarations = read('dev-api.d.ts');
    for (const name of retiredHelpers.slice(0, 4)) {
      expect(declarations).not.toMatch(new RegExp(`export declare function ${name}\\b`));
    }
  });

  it('does not expose preset writers at runtime while retaining non-theme exports', async () => {
    const api = await import('../dev-api.js');
    for (const name of retiredHelpers) expect(api).not.toHaveProperty(name);
    for (const name of ['savePostFromWrite', 'attachHeroToPost', 'getEntity', 'parseBody', 'server']) {
      expect(api).toHaveProperty(name);
    }
  });

  it('leaves no executable preset resolver/cache consumers', () => {
    const reference = /(?:from\s*|import\s*\(?|require\s*\()\s*['"][^'"]*(?:utils\/theme(?:\.ts)?|theme-cache(?:\.js)?)['"]/;
    for (const file of [...sourceFiles('src'), ...sourceFiles('scripts'), ...sourceFiles('shared')]) {
      expect(read(file), file).not.toMatch(reference);
    }
    expect(JSON.stringify(JSON.parse(read('package.json')).scripts)).not.toMatch(/theme-cache|utils\/theme/);
  });
  it('preserves the archived data checksums and removes the old runtime paths', () => {
    const archive = 'docs/archive/theme-system';
    const entries = read(`${archive}/checksums.sha256`).trim().split('\n');
    expect(entries).toHaveLength(17);
    const paths = new Set<string>();
    for (const line of entries) {
      const match = /^([a-f0-9]{64}) {2}(.+)$/.exec(line);
      expect(match, line).not.toBeNull();
      const [, expected, file] = match!;
      expect(file).not.toMatch(/^(?:\/|\.\.)/);
      expect(paths.has(file!)).toBe(false);
      paths.add(file!);
      const bytes = fs.readFileSync(path.join(root, archive, file!));
      expect(createHash('sha256').update(bytes).digest('hex'), file).toBe(expected);
    }
    expect([...paths].filter(file => file.startsWith('legacy-presets/'))).toHaveLength(15);
    for (const file of ['content/themes', 'content/theme.json', 'content/color-tokens.json']) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(false);
    }
    expect(fs.existsSync(path.join(root, 'src/styles/color-tokens.generated.css'))).toBe(true);
    expect(read('scripts/themes-lint.mjs')).toContain('"docs", "archive", "theme-system", "legacy-presets"');
  });

});
