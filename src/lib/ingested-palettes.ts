import fs from 'node:fs';
import path from 'node:path';

export const paletteAnchor = (kitId: string, version: string) => `palette-${kitId}-${version}`;

interface RoleMode { status: string; value?: string; variable?: string; reason?: string }
interface Role { id: string; requirement: string; classification?: string; owningLayer?: string; modes: Record<string, RoleMode> }
export interface PaletteManifest {
  kitId: string; version: string; name?: string; schemaVersion: string; contractVersion: string;
  cssFile: string; namespace: string; supportedModes: string[]; roles: Role[];
  integrity: { algorithm: string; sha256: string }; contrasts: unknown[]; missingContrastPairs: unknown[];
}
const examples = [
  ['surface.base', 'Base'], ['surface.panel', 'Panel'], ['surface.elevated', 'Elevated'],
  ['text.strong', 'Strong text'], ['text.body', 'Body text'], ['text.muted', 'Muted text'],
  ['brand.mulberry', 'Primary accent'], ['brand.window-blue', 'Secondary accent'],
  ['border.subtle', 'Border'], ['spoon.low', 'Spoon low'], ['spoon.medium', 'Spoon medium'], ['spoon.high', 'Spoon high'],
] as const;

export function summarizePalette(manifest: PaletteManifest, css: string) {
  const missing = manifest.roles.filter(role => manifest.supportedModes.some(mode => role.modes[mode]?.status !== 'present'));
  const missingRequired = missing.filter(role => role.requirement === 'required');
  const name = manifest.name || manifest.kitId.split('.').at(-1)!.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const modes = manifest.supportedModes.map(mode => ({ mode, swatches: examples.flatMap(([id, label]) => {
    const value = manifest.roles.find(role => role.id === id)?.modes[mode];
    if (value?.status !== 'present' || !value.value || !value.variable?.startsWith(manifest.namespace)) return [];
    // A swatch must be an actual kit declaration, not a fabricated display colour.
    const declarations = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)];
    if (!declarations.some(match => match[1] === value.variable && match[2]?.trim() === value.value)) return [];
    return [{ id, label, value: value.value }];
  }) }));
  return { name, modes, missing, missingRequired, requiredSemantics: missingRequired.length === 0 };
}

/** Conservative source evidence: imported CSS, imported adapter, matching host and kit references. */
export function isConsumedPalette(relativeCss: string, css: string, base: string, adapter: string) {
  const imports = [...base.matchAll(/import\s+["']([^"']+)["']/g)].map(match => match[1]);
  if (!imports.includes(`@/${relativeCss}`) || !imports.includes('@/styles/autumn-window-kit-adapter.css')) return false;
  const hosts = [...css.matchAll(/\.(wc-kit-[\w-]+)/g)].map(match => match[1]!);
  const references = [...adapter.matchAll(/var\((--wc-kit-[\w-]+)/g)].map(match => match[1]!);
  const definitions = new Set([...css.matchAll(/(--wc-kit-[\w-]+)\s*:/g)].map(match => match[1]));
  return hosts.some(host => base.includes(`"${host}"`) && adapter.includes(`.${host}[`)) && references.length > 0 && references.every(reference => definitions.has(reference));
}

export function discoverIngestedPalettes(repo = process.cwd()) {
  const root = path.join(repo, 'src/theme-kits');
  if (!fs.existsSync(root)) return [];
  const read = (file: string) => fs.existsSync(path.join(repo, file)) ? fs.readFileSync(path.join(repo, file), 'utf8') : '';
  const base = read('src/layouts/Base.astro');
  const adapter = read('src/styles/autumn-window-kit-adapter.css');
  const directories = (directory: string) => fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
  return directories(root).flatMap(kit => directories(path.join(root, kit.name)).flatMap(version => {
    const relative = `theme-kits/${kit.name}/${version.name}`;
    const manifestPath = `src/${relative}/manifest.json`;
    const cssPath = `src/${relative}/kit.css`;
    if (!fs.existsSync(path.join(repo, manifestPath)) || !fs.existsSync(path.join(repo, cssPath))) return [];
    const manifest = JSON.parse(read(manifestPath)) as PaletteManifest;
    const css = read(cssPath);
    return [{ manifest, ...summarizePalette(manifest, css), status: isConsumedPalette(`${relative}/kit.css`, css, base, adapter) ? 'Active' : 'Ingested' }];
  }));
}
