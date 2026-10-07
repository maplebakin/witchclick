import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverIngestedPalettes, isConsumedPalette, summarizePalette, paletteAnchor, type PaletteManifest } from '../src/lib/ingested-palettes';

const repo = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(repo, file), 'utf8');
const source = read('src/pages/admin/theme.astro');
const manifest = JSON.parse(read('src/theme-kits/autumn-window/1.0.0/manifest.json')) as PaletteManifest;
const css = read('src/theme-kits/autumn-window/1.0.0/kit.css');
const temporary: string[] = [];
afterEach(() => { for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-palette-discovery-'));
  temporary.push(directory);
  const add = (name: string, version: string, data = manifest, styles = css) => {
    const folder = path.join(directory, 'src/theme-kits', name, version);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(data));
    fs.writeFileSync(path.join(folder, 'kit.css'), styles);
  };
  return { directory, add };
}

describe('ingested palette shelf', () => {
  it('discovers each manifest/CSS pair once and renders one entry per discovered palette', () => {
    const { directory, add } = fixture();
    add('autumn-window', '1.0.0');
    add('future-palette', '2.0.0', { ...manifest, kitId: 'sample.future-palette', version: '2.0.0', supportedModes: ['dawn'] });
    const palettes = discoverIngestedPalettes(directory);
    expect(palettes).toHaveLength(2);
    expect(palettes.map(palette => palette.name)).toEqual(['Autumn Window', 'Future Palette']);
    expect(palettes[1]?.manifest.version).toBe('2.0.0');
    expect(palettes[1]?.modes.map(mode => mode.mode)).toEqual(['dawn']);
    expect(palettes.every(palette => palette.status === 'Ingested')).toBe(true);
    expect(source).toContain('const palettes = discoverIngestedPalettes();');
    expect(source).toContain('palettes.map(palette => (');
    expect(source.match(/data-palette=\{/g)).toHaveLength(1);
    expect(source).not.toMatch(/autumn-window\/1\.0\.0|import manifest/);
    fs.unlinkSync(path.join(directory, 'src/theme-kits/future-palette/2.0.0/kit.css'));
    expect(discoverIngestedPalettes(directory)).toHaveLength(1);
  });

  it('derives Autumn Window active status from actual imports, host and adapter references', () => {
    expect(discoverIngestedPalettes(repo)).toHaveLength(1);
    expect(discoverIngestedPalettes(repo)[0]?.status).toBe('Active');
    const base = read('src/layouts/Base.astro');
    const adapter = read('src/styles/autumn-window-kit-adapter.css');
    const relative = 'theme-kits/autumn-window/1.0.0/kit.css';
    expect(isConsumedPalette(relative, css, base, adapter)).toBe(true);
    expect(isConsumedPalette(relative, css, base.replace(relative, 'other.css'), adapter)).toBe(false);
    expect(isConsumedPalette(relative, css, base, '')).toBe(false);
    expect(isConsumedPalette(relative, css, base, `${adapter}\nvar(--wc-kit-not-defined)`)).toBe(false);
  });

  it('uses real per-mode kit values for all twelve swatch examples', () => {
    const palette = summarizePalette(manifest, css);
    for (const { mode, swatches } of palette.modes) {
      expect(swatches).toHaveLength(12);
      for (const swatch of swatches) {
        expect(swatch.value).toBe(manifest.roles.find(role => role.id === swatch.id)?.modes[mode]?.value);
        expect(css).toContain(`${manifest.roles.find(role => role.id === swatch.id)?.modes[mode]?.variable}: ${swatch.value};`);
      }
    }
    expect(source).toContain('style={`background-color: ${swatch.value};`}');
    expect(summarizePalette(manifest, '').modes.every(mode => mode.swatches.length === 0)).toBe(true);
  });

  it('reports No with sixteen total gaps, nine required; optional gaps do not decide readiness', () => {
    const palette = summarizePalette(manifest, css);
    expect(palette.requiredSemantics).toBe(false);
    expect(palette.missing).toHaveLength(16);
    expect(palette.missingRequired).toHaveLength(9);
    expect(palette.missing.map(role => role.id)).toEqual(manifest.roles.filter(role => manifest.supportedModes.some(mode => role.modes[mode]?.status === 'missing')).map(role => role.id));
    const optionalGaps = { ...manifest, roles: manifest.roles.map(role => palette.missing.includes(role) ? { ...role, requirement: 'optional' } : role) };
    expect(summarizePalette(optionalGaps, css).requiredSemantics).toBe(true);
    expect(source).toContain('`No — ${palette.missing.length} roles missing`');
  });

  it('keeps missing roles, integrity and contrast facts only in collapsed native details', () => {
    const details = source.match(/<details>([\s\S]*?)<\/details>/)![1]!;
    const shelf = source.replace(/<details>[\s\S]*?<\/details>/, '');
    for (const marker of ['data-kit-missing-role', 'data-kit-integrity', 'data-kit-contrast-count', 'manifest.missingContrastPairs', 'manifest.schemaVersion', 'manifest.namespace']) {
      expect(details).toContain(marker);
      expect(shelf).not.toContain(marker);
    }
    expect(details).toContain('palette.missing.map');
    expect(source).not.toMatch(/<details[^>]*\bopen\b/);
    expect(source).not.toMatch(/WitchClick-owned layers|Present kit roles|Roles outside the kit|Recorded contrast|comfort recipes|adapter does not own/);
    expect(source).toContain('<h1>Ingested palettes</h1>');
  });

  it('keeps legacy editors, theme APIs and stored credentials out of the ingestion shelf', () => {
    expect(source).not.toMatch(/theme-editor-entry|ThemeEditor|ThemeManager|\/themes\/|\/color-tokens\//);
    expect(source).not.toMatch(/<\s*form\b|localStorage|sessionStorage|PUBLIC_DEV_API_KEY|data-dev-key/i);
    expect(source).toContain('/palettes/ingest');
    expect(source).toContain('Shelved, not active.');
    expect(source).toContain('data-admin-token type="password"');
    expect(source).not.toMatch(/data-wc-kit-mode|wc-kit-autumn-window|data-theme-preview/);
    expect(source).toContain('background: var(--admin-surface-muted)');
    expect(source).toContain('color: var(--admin-text-body)');
  });
  it('uses the same stable anchor contract for cards and the palette jump dropdown', () => {
    expect(paletteAnchor('witchclick.autumn-window', '1.0.0')).toBe('palette-witchclick.autumn-window-1.0.0');
    expect(source).toContain('id={paletteAnchor(palette.manifest.kitId, palette.manifest.version)}');
    expect(source).toContain('value={paletteAnchor(palette.manifest.kitId, palette.manifest.version)}');
    expect(source).toContain('data-palette-jump');
    expect(source).toContain('location.hash = jump.value');
    expect(source).toContain('card.focus({ preventScroll: true })');
    expect(source).toContain('card.scrollIntoView');
    expect(source).toContain("window.addEventListener('hashchange', focusPalette)");
  });

});
