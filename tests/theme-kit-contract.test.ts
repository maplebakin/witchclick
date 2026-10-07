import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type ModeValue = {
  status: 'present' | 'missing';
  variable?: string;
  value?: string;
  reason?: string;
  source?: { file: string; variable: string };
};

type Role = {
  id: string;
  requirement: 'required' | 'optional';
  status: 'required' | 'optional' | 'missing';
  classification?: 'KIT ROLE' | 'ADAPTER RECIPE' | 'COMPONENT/DATA-OWNED' | 'UNRESOLVED';
  owningLayer?: string;
  sourceEvidence?: {
    summary: string;
    modes: Record<string, {
      runtimeValue: string;
      citations: Array<{ file: string; line: number; excerpt: string }>;
      inputs?: Array<{ token: string; value: string; context?: string }>;
      resolution?: string;
    }>;
  };
  modes: Record<string, ModeValue>;
};

type Manifest = {
  schemaVersion: string;
  contractVersion: string;
  kitId: string;
  version: string;
  cssFile: string;
  namespace: string;
  supportedModes: string[];
  integrity: { algorithm: string; sha256: string };
  roles: Role[];
  contrasts: Array<{
    mode: string;
    foregroundRole: string;
    backgroundRole: string;
    foregroundVariable: string;
    backgroundVariable: string;
    ratio: number;
  }>;
  missingContrastPairs: Array<{
    mode: string;
    foregroundRole: string;
    backgroundRole: string;
    reason: string;
  }>;
  excludedWitchClickConcerns: string[];
};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const kitDirectory = 'src/theme-kits/autumn-window/1.0.0';
const css = read(`${kitDirectory}/kit.css`);
const manifest = JSON.parse(read(`${kitDirectory}/manifest.json`)) as Manifest;

function parseBlocks(source: string) {
  const uncommented = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({
    selector: selector.trim(),
    declarations: Object.fromEntries(
      [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [name, value.trim()]),
    ) as Record<string, string>,
  }));
}

function sourceModeValues(mode: string) {
  const tokenBlocks = parseBlocks(read('src/styles/autumn-window.tokens.css'));
  const appBlocks = parseBlocks(read('src/styles/autumn-window.css'));
  const base = tokenBlocks.find(({ selector }) => selector === ':root[data-theme="autumn-window"]')?.declarations;
  const dawn = tokenBlocks.find(({ selector }) => selector === ':root[data-theme="autumn-window"][data-comfort-theme="dawn"]')?.declarations;
  const app = appBlocks.find(({ selector }) => selector.startsWith(':root[data-theme="autumn-window"],') && selector.includes('data-comfort-theme="dawn"'))?.declarations;
  if (!base || !dawn || !app) throw new Error('Autumn Window source token blocks were not found');
  return { ...base, ...(mode === 'dawn' ? dawn : {}), ...app };
}

function resolveSourceColor(name: string, values: Record<string, string>, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Autumn Window alias cycle at ${name}`);
  const raw = values[name];
  if (!raw) throw new Error(`Autumn Window source is missing ${name}`);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  if (alias?.[1]) return resolveSourceColor(alias[1], values, new Set([...seen, name]));
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw.toUpperCase();
  if (raw.toLowerCase() === 'transparent') return 'transparent';
  throw new Error(`Expected a literal source color for ${name}, received ${raw}`);
}

function declarationsByMode() {
  const blocks = parseBlocks(css);
  return Object.fromEntries(blocks.map(({ selector, declarations }) => {
    const mode = selector.match(/data-wc-kit-mode="([^"]+)"/)?.[1];
    return [mode, declarations];
  })) as Record<string, Record<string, string>>;
}

function relativeLuminance(color: string) {
  if (color === 'transparent') return 1;
  const hex = color.slice(1);
  const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex.slice(0, 6);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return Number(((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)).toFixed(2));
}

function sourceFilesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(fullPath);
    return /\.(astro|css|js|mjs|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('Autumn Window kit contract', () => {
  it('catalogs the required WitchClick color roles, including explicitly missing roles', () => {
    const requiredRoles = [
      'surface.base', 'surface.panel', 'surface.card', 'surface.elevated', 'surface.hover', 'surface.muted',
      'border.subtle', 'border.strong', 'text.strong', 'text.body', 'text.muted', 'link.foreground',
      'action.background', 'action.foreground', 'action.border', 'action.hover.background', 'action.hover.border',
      'card.background', 'card.hover.background', 'card.foreground', 'card.heading', 'card.muted', 'card.border',
      'card.border.strong', 'tag.background', 'tag.foreground', 'tag.border', 'header.background', 'header.border',
      'header.foreground', 'header.heading', 'header.link', 'footer.background', 'footer.border', 'footer.foreground',
      'footer.muted', 'footer.link', 'entity.surface.top', 'entity.surface.bottom', 'entity.heading',
      'entity.foreground', 'entity.muted', 'entity.border', 'entity.action', 'focus.foreground', 'focus.base',
      'comfort.surface', 'comfort.foreground', 'comfort.foreground.strong', 'comfort.input.background',
      'comfort.input.hover.background', 'comfort.input.border', 'comfort.input.focus', 'brand.mulberry',
      'brand.window-blue', 'spoon.low', 'spoon.medium', 'spoon.high',
      'status.success.foreground', 'status.success.background', 'status.warning.foreground', 'status.warning.background',
      'status.error.foreground', 'status.error.background', 'status.info.foreground', 'status.info.background',
    ];
    const roleIds = manifest.roles.map((role) => role.id);
    expect(new Set(roleIds).size).toBe(roleIds.length);
    expect(roleIds).toEqual(expect.arrayContaining(requiredRoles));
  });

  it('keeps CSS and manifest identity, namespace, modes, version, and integrity in sync', () => {
    const declarations = declarationsByMode();
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.contractVersion).toBe('1.0.0');
    expect(manifest.kitId).toBe('witchclick.autumn-window');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.cssFile).toBe('kit.css');
    expect(manifest.namespace).toBe('--wc-kit-');
    expect(Object.keys(declarations).sort()).toEqual([...manifest.supportedModes].sort());
    expect(css).toContain(`kit-id: ${manifest.kitId}`);
    expect(css).toContain(`contract-version: ${manifest.contractVersion}`);
    expect(css).toContain(`version: ${manifest.version}`);
    expect(css).toContain(`namespace: ${manifest.namespace}`);
    expect(css).toContain(`modes: ${manifest.supportedModes.join(', ')}`);
    expect(manifest.integrity.algorithm).toBe('SHA-256');
    expect(crypto.createHash('sha256').update(css).digest('hex')).toBe(manifest.integrity.sha256);
  });

  it('records every role as present in both modes or explicitly missing', () => {
    const declarations = declarationsByMode();
    for (const role of manifest.roles) {
      expect(['required', 'optional', 'missing']).toContain(role.status);
      for (const mode of manifest.supportedModes) {
        const mapping = role.modes[mode];
        expect(mapping, `${role.id} must describe ${mode}`).toBeDefined();
        if (mapping?.status === 'present') {
          expect(mapping.variable).toMatch(/^--wc-kit-/);
          expect(mapping.value).toMatch(/^(#[0-9A-Fa-f]{3,8}|transparent)$/);
          expect(declarations[mode]?.[mapping.variable ?? '']).toBe(mapping.value);
        } else {
          expect(mapping?.status).toBe('missing');
          expect(mapping?.reason).toBeTruthy();
          expect(role.status).toBe('missing');
        }
        if (role.requirement === 'required' && mapping?.status === 'missing') {
          expect(mapping.reason).toBeTruthy();
        }
      }
    }
  });

  it('matches each mapped role to the exact resolved Autumn Window source value', () => {
    for (const role of manifest.roles) {
      for (const mode of manifest.supportedModes) {
        const mapping = role.modes[mode];
        if (mapping?.status !== 'present' || !mapping.source) continue;
        expect(fs.existsSync(path.join(root, mapping.source.file))).toBe(true);
        const sourceValues = sourceModeValues(mode);
        expect(sourceValues[mapping.source.variable]).toBeDefined();
        expect(resolveSourceColor(mapping.source.variable, sourceValues)).toBe(mapping.value);
      }
    }
  });

  it('keeps spoon colors separate from status colors and reports missing contrast pairs', () => {
    const byId = new Map(manifest.roles.map((role) => [role.id, role]));
    for (const spoon of ['spoon.low', 'spoon.medium', 'spoon.high']) {
      expect(byId.get(spoon)?.status).toBe('required');
      for (const mode of manifest.supportedModes) expect(byId.get(spoon)?.modes[mode]?.status).toBe('present');
    }
    for (const status of ['success', 'warning', 'error', 'info']) {
      for (const part of ['foreground', 'background']) {
        const role = byId.get(`status.${status}.${part}`);
        expect(role?.status).toBe('missing');
        for (const mode of manifest.supportedModes) expect(role?.modes[mode]?.status).toBe('missing');
      }
    }
    expect(manifest.missingContrastPairs.length).toBeGreaterThan(0);
    for (const item of manifest.missingContrastPairs) {
      expect(item.reason).toBeTruthy();
      expect(manifest.supportedModes).toContain(item.mode);
    }
  });

  it('documents the source owner and classification for every original gap', () => {
    const expectedClassifications: Record<string, Role['classification']> = {
      'entity.border': 'ADAPTER RECIPE',
      'entity.action': 'KIT ROLE',
      'entity.action.hover': 'KIT ROLE',
      'entity.icon': 'COMPONENT/DATA-OWNED',
      'comfort.chip.background': 'ADAPTER RECIPE',
      'comfort.chip.border': 'ADAPTER RECIPE',
      'comfort.chip.accent': 'ADAPTER RECIPE',
      'comfort.tray.background': 'ADAPTER RECIPE',
      'comfort.tray.border': 'ADAPTER RECIPE',
      'comfort.hint': 'ADAPTER RECIPE',
      'status.success.foreground': 'ADAPTER RECIPE',
      'status.success.background': 'ADAPTER RECIPE',
      'status.warning.foreground': 'UNRESOLVED',
      'status.warning.background': 'ADAPTER RECIPE',
      'status.error.foreground': 'ADAPTER RECIPE',
      'status.error.background': 'ADAPTER RECIPE',
      'status.info.foreground': 'UNRESOLVED',
      'status.info.background': 'ADAPTER RECIPE',
    };
    const roleById = new Map(manifest.roles.map((role) => [role.id, role]));
    for (const [roleId, classification] of Object.entries(expectedClassifications)) {
      const role = roleById.get(roleId);
      expect(role?.classification, roleId).toBe(classification);
      expect(role?.owningLayer, roleId).toBeTruthy();
      expect(role?.sourceEvidence?.summary, roleId).toBeTruthy();
      for (const mode of manifest.supportedModes) {
        const evidence = role?.sourceEvidence?.modes[mode];
        expect(evidence?.runtimeValue, `${roleId} ${mode}`).toBeTruthy();
        expect(evidence?.citations.length, `${roleId} ${mode}`).toBeGreaterThan(0);
        for (const citation of evidence?.citations ?? []) {
          // The immutable kit records the former public early-return guard.
          // Base now removes that editor-state loader entirely, which preserves
          // the same absence of editor-supplied status tokens on public roots.
          if (citation.file === 'src/layouts/Base.astro' && citation.excerpt === 'if (document.documentElement.getAttribute("data-theme") === "autumn-window") return;') {
            expect(read(citation.file)).not.toContain('wc-active-theme');
            continue;
          }
          const sourceLines = read(citation.file).split('\n');
          const citedLine = sourceLines[citation.line - 1];
          const evidenceLine = citedLine?.includes(citation.excerpt)
            ? citedLine
            : sourceLines.find((line) => line.includes(citation.excerpt));
          expect(evidenceLine, `${citation.file}:${citation.line} or matching source excerpt`).toContain(citation.excerpt);
        }
        if (classification === 'KIT ROLE') {
          expect(role?.modes[mode]?.status).toBe('present');
          expect(role?.status).not.toBe('missing');
        } else {
          expect(role?.modes[mode]?.status).toBe('missing');
          expect(role?.modes[mode]?.reason).toBeTruthy();
          expect(role?.status).toBe('missing');
        }
      }
    }
  });

  it('maps entity CTA and hover CTA to the exact Autumn Window mulberry in both modes', () => {
    const roleById = new Map(manifest.roles.map((role) => [role.id, role]));
    for (const mode of manifest.supportedModes) {
      const mulberry = roleById.get('brand.mulberry')?.modes[mode]?.value;
      expect(roleById.get('entity.action')?.modes[mode]?.value).toBe(mulberry);
      expect(roleById.get('entity.action.hover')?.modes[mode]?.value).toBe(mulberry);
    }
    expect(manifest.missingContrastPairs.some((pair) => pair.foregroundRole === 'entity.action' || pair.foregroundRole === 'entity.action.hover')).toBe(false);
    expect(manifest.contrasts.filter((pair) => pair.foregroundRole === 'entity.action' || pair.foregroundRole === 'entity.action.hover')).toHaveLength(4);
  });

  it('keeps the per-category entity icon component-owned and unresolved as a global kit color', () => {
    const icon = manifest.roles.find((role) => role.id === 'entity.icon');
    expect(icon?.classification).toBe('COMPONENT/DATA-OWNED');
    expect(icon?.status).toBe('missing');
    expect(icon?.sourceEvidence?.modes['midnight']?.runtimeValue).toContain('<section.themeColor>');
    expect(icon?.sourceEvidence?.modes['midnight']?.runtimeValue).toContain('self-references');
    const activeRuntimeTokens = [
      read('src/styles/tokens.css'),
      read('src/styles/color-tokens.generated.css'),
      read('src/styles/autumn-window.tokens.css'),
      read('src/styles/autumn-window.css'),
    ].join('\n');
    expect(activeRuntimeTokens).not.toMatch(/--theme-entity-card-icon\s*:/);
  });

  it('keeps generated status tokens unresolved for the public Autumn Window scope', () => {
    const midnight = sourceModeValues('midnight');
    const dawn = sourceModeValues('dawn');
    for (const token of ['--theme-success', '--theme-warning', '--theme-error', '--theme-info']) {
      expect(midnight[token]).toBeUndefined();
      expect(dawn[token]).toBeUndefined();
    }
    const baseCss = read('src/styles/base.css');
    expect(baseCss).toContain('@import "./autumn-window.tokens.css"');
    expect(baseCss).toContain('@import "./autumn-window.css"');
    expect(baseCss).not.toContain('@import "./themes.generated.css"');
    const activeRuntimeTokens = [
      read('src/styles/tokens.css'),
      read('src/styles/color-tokens.generated.css'),
      read('src/styles/autumn-window.tokens.css'),
      read('src/styles/autumn-window.css'),
    ].join('\n');
    for (const token of ['--theme-success', '--theme-warning', '--theme-error', '--theme-info']) {
      expect(activeRuntimeTokens).not.toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it('contains only namespaced literal color variables and is consumed by the default public adapter', () => {
    const blocks = parseBlocks(css);
    expect(blocks).toHaveLength(manifest.supportedModes.length);
    for (const { selector, declarations } of blocks) {
      expect(selector).toMatch(/^\.wc-kit-autumn-window\[data-wc-kit-mode="(?:midnight|dawn)"\]$/);
      for (const [name, value] of Object.entries(declarations)) {
        expect(name.startsWith(manifest.namespace)).toBe(true);
        expect(value).toMatch(/^(#[0-9A-Fa-f]{3,8}|transparent)$/);
      }
    }
    expect(css).not.toMatch(/@import|url\(|@font-face|animation|font-family|\b(?:margin|padding|gap|width|height)\s*:/i);
    const baseLayout = read('src/layouts/Base.astro');
    const baseImport = baseLayout.indexOf('@/styles/base.css');
    const kitImport = baseLayout.indexOf('@/theme-kits/autumn-window/1.0.0/kit.css');
    const adapterImport = baseLayout.indexOf('@/styles/autumn-window-kit-adapter.css');
    expect(baseImport).toBeGreaterThanOrEqual(0);
    expect(kitImport).toBeGreaterThan(baseImport);
    expect(adapterImport).toBeGreaterThan(kitImport);
    expect(baseLayout).toContain('useAutumnWindowKit = useAutumnWindow && !isAdminRoute;');
    expect(baseLayout).toContain('class:list={["h-full", useAutumnWindowKit && "wc-kit-autumn-window"]}');
    expect(baseLayout).toContain('data-wc-kit-mode={useAutumnWindowKit ? "midnight" : undefined}');
    expect(baseLayout).not.toMatch(/data-wc-kit-proof\s*=/);
    const runtimeSource = sourceFilesUnder(path.join(root, 'src'))
      .filter((file) => /\.(astro|js|mjs|ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    expect(runtimeSource).not.toMatch(/setAttribute\s*\(\s*["']data-wc-kit-proof|dataset\.wcKitProof|data-wc-kit-proof\s*=/);
  });

  it('stores reproducible contrast ratios for all recorded pairs', () => {
    const roleById = new Map(manifest.roles.map((role) => [role.id, role]));
    for (const pair of manifest.contrasts) {
      const foreground = roleById.get(pair.foregroundRole)?.modes[pair.mode];
      const background = roleById.get(pair.backgroundRole)?.modes[pair.mode];
      expect(foreground?.status).toBe('present');
      expect(background?.status).toBe('present');
      expect(pair.foregroundVariable).toBe(foreground?.variable);
      expect(pair.backgroundVariable).toBe(background?.variable);
      expect(pair.ratio).toBe(contrastRatio(foreground?.value ?? '', background?.value ?? ''));
    }
  });
});
