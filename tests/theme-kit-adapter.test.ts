import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type KitRole = {
  id: string;
  status: 'required' | 'optional' | 'missing';
  modes: Record<string, { status: 'present' | 'missing'; variable?: string }>;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const base = read('src/layouts/Base.astro');
const adapter = read('src/styles/autumn-window-kit-adapter.css');
const kitCss = read('src/theme-kits/autumn-window/1.0.0/kit.css');
const manifest = JSON.parse(read('src/theme-kits/autumn-window/1.0.0/manifest.json')) as {
  supportedModes: string[];
  roles: KitRole[];
};

function parseRules(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '');
  return [...withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1]?.trim() ?? '',
    declarations: Object.fromEntries(
      (match[2] ?? '').split(';').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
        const [property, value] = entry.split(/:\s*/, 2);
        return [property ?? '', value ?? ''];
      }),
    ),
  }));
}

function runtimeCodeFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return runtimeCodeFiles(fullPath);
    return /\.(astro|js|mjs|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('default public Autumn Window kit adapter', () => {
  it('loads after the public Autumn Window source and enables only public kit roots', () => {
    const imports = [...base.matchAll(/import\s+["']([^"']+)["']/g)].map((match) => match[1] ?? '');
    const publicBaseIndex = imports.indexOf('@/styles/base.css');
    const kitIndex = imports.indexOf('@/theme-kits/autumn-window/1.0.0/kit.css');
    const adapterIndex = imports.indexOf('@/styles/autumn-window-kit-adapter.css');
    expect(publicBaseIndex).toBeGreaterThanOrEqual(0);
    expect(kitIndex).toBeGreaterThan(publicBaseIndex);
    expect(adapterIndex).toBeGreaterThan(kitIndex);
    expect(read('src/styles/base.css')).toContain('@import "./autumn-window.tokens.css";');
    expect(read('src/styles/base.css')).toContain('@import "./autumn-window.css";');
    expect(base).toContain('const useAutumnWindow = !/^\\/admin(?:\\/|$)/.test(Astro.url?.pathname ?? "/");');
    expect(base).toContain('useAutumnWindowKit = useAutumnWindow && !isAdminRoute;');
    expect(base).toContain('class:list={["h-full", useAutumnWindowKit && "wc-kit-autumn-window"]}');
    expect(base).toContain('data-wc-kit-mode={useAutumnWindowKit ? "midnight" : undefined}');
    expect(base).toContain("root.getAttribute('data-comfort-theme') === 'dawn' ? 'dawn' : 'midnight'");
    expect(base).toContain("new MutationObserver(syncKitMode).observe(root, {");
    expect(base).toContain("attributeFilter: ['data-comfort-theme']");

    const proofWriters = runtimeCodeFiles(path.join(root, 'src')).filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /setAttribute\s*\(\s*["']data-wc-kit-proof|dataset\.wcKitProof|data-wc-kit-proof\s*=/.test(source);
    });
    expect(proofWriters).toEqual([]);
    expect(base).not.toMatch(/data-wc-kit-proof\s*=/);
  });

  it('gates semantic overrides to the public Autumn Window mode and excludes admin and Plain mode', () => {
    const rules = parseRules(adapter);
    expect(rules).toHaveLength(manifest.supportedModes.length);
    for (const rule of rules) {
      expect(rule.selector).toMatch(/^:root\.wc-kit-autumn-window/);
      expect(rule.selector).toContain('[data-theme="autumn-window"]');
      expect(rule.selector).not.toContain('data-wc-kit-proof');
      expect(rule.selector).toContain('[data-wc-kit-mode=');
      expect(rule.selector).toContain(':not([data-admin-shell])');
      expect(rule.selector).toContain(':not([data-comfort-mode="plain"])');
      expect(rule.selector).not.toMatch(/[>+~\s]/);
      expect(Object.keys(rule.declarations).every((property) => property.startsWith('--'))).toBe(true);
    }
    expect(rules[0]?.selector).toContain('[data-wc-kit-mode="midnight"]');
    expect(rules[0]?.selector).toContain(':not([data-comfort-theme="dawn"])');
    expect(rules[1]?.selector).toContain('[data-comfort-theme="dawn"]');
    expect(rules[1]?.selector).toContain('[data-wc-kit-mode="dawn"]');
    expect(adapter).not.toMatch(/data-admin-nav|\.admin-nav|\.admin-panel/);
  });

  it('maps covered roles with fallbacks, excluding the incompatible footer channel token', () => {
    const rules = parseRules(adapter);
    const kitVariables = new Set([...kitCss.matchAll(/(--wc-kit-[\w-]+)\s*:/g)].map((match) => match[1] ?? ''));
    const sourceFiles = [
      'src/styles/tokens.css',
      'src/styles/base.css',
      'src/styles/autumn-window.tokens.css',
      'src/styles/autumn-window.css',
    ];
    const semanticVariables = new Set(sourceFiles.flatMap((file) =>
      [...read(file).matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] ?? ''),
    ));
    const expectedRoleVariables = new Set(manifest.roles
      .filter((role) => !role.id.startsWith('comfort.') && role.id !== 'footer.border')
      .filter((role) => manifest.supportedModes.every((mode) => role.modes[mode]?.status === 'present'))
      .map((role) => role.modes[manifest.supportedModes[0] ?? '']?.variable ?? '')
      .filter(Boolean));

    for (const mode of manifest.supportedModes) {
      const rule = rules.find((candidate) => candidate.selector.includes(`[data-wc-kit-mode="${mode}"]`));
      expect(rule, `${mode} adapter rule`).toBeDefined();
      const references = Object.values(rule?.declarations ?? {}).flatMap((value) =>
        [...value.matchAll(/var\((--wc-kit-[\w-]+)/g)].map((match) => match[1] ?? ''),
      );
      const expected = new Set(expectedRoleVariables);
      // Dawn tag ink uses the original body-ink/black recipe, not muted tag ink.
      if (mode === 'dawn') expected.delete('--wc-kit-tag-foreground');
      expect(new Set(references)).toEqual(expected);
      expect(references.every((variable) => kitVariables.has(variable))).toBe(true);
      expect(Object.keys(rule?.declarations ?? []).every((property) => semanticVariables.has(property))).toBe(true);
      for (const [property, value] of Object.entries(rule?.declarations ?? {})) {
        const mapping = value.match(/var\((--wc-kit-[\w-]+),\s*([^()]+|rgba?\([^()]+\))\)/);
        expect(mapping, `${property} ${mode} keeps a fallback`).not.toBeNull();
        expect(mapping?.[1]).toBeDefined();
        expect(mapping?.[2]).toBeTruthy();
        expect(mapping?.[2]).not.toMatch(/^var\(--wc-kit-/);
      }
      for (const role of manifest.roles) {
        if (role.id.startsWith('comfort.') || role.status === 'missing' || role.id === 'footer.border' || (mode === 'dawn' && role.id === 'tag.foreground')) continue;
        const variable = role.modes[mode]?.variable;
        expect(references, `${role.id} in ${mode}`).toContain(variable);
      }
    }

    expect(adapter).not.toMatch(/--wc-kit-(?:entity-icon|comfort-|status-)/);
    expect(adapter).not.toMatch(/--(?:theme-)?(?:success|warning|error|info)(?:-|\s*:)/);
    expect(adapter).not.toMatch(/--(?:status|comfort-chip|comfort-tray|comfort-hint)[\w-]*\s*:/);
    expect(expectedRoleVariables.size).toBe(52);
    for (const rule of rules) {
      expect(Object.keys(rule.declarations)).toHaveLength(52);
      expect(rule.declarations).not.toHaveProperty('--footer-border');
    }
  });


  it('preserves all retained values against the fallback cascade, including Dawn recipes', () => {
    // Model only the existing public root selectors. Resolve aliases at use time,
    // just as custom properties do; do not compare a colour literal to HSL channels.
    const sourceFiles = [
      'src/styles/tokens.css', 'src/styles/color-tokens.generated.css',
      'src/styles/autumn-window.tokens.css', 'src/styles/autumn-window.css',
      'src/styles/base.css', 'src/styles/cards.css',
    ];
    function resolve(value: string, tokens: Record<string, string>, seen: string[] = []): string {
      return expand(value);
      function expand(input: string): string {
        const start = input.indexOf('var(');
        if (start < 0) return input;
        let end = start + 4;
        let depth = 1;
        for (; end < input.length && depth; end++) {
          if (input[end] === '(') depth++;
          if (input[end] === ')') depth--;
        }
        const args = input.slice(start + 4, end - 1);
        const comma = args.indexOf(',');
        const name = (comma < 0 ? args : args.slice(0, comma)).trim();
        const fallback = comma < 0 ? undefined : args.slice(comma + 1).trim();
        expect(seen, `cyclic source alias ${name}`).not.toContain(name);
        const token = tokens[name] ?? fallback;
        expect(token, `source value for ${name}`).toBeDefined();
        const replacement = resolve(token ?? '', tokens, [...seen, name]);
        return expand(input.slice(0, start) + replacement + input.slice(end));
      }
    }
    const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();
    for (const mode of manifest.supportedModes) {
      const selectors = new Set([':root', ':root[data-theme="autumn-window"]']);
      if (mode === 'dawn') {
        selectors.add(':root[data-comfort-theme="dawn"]');
        selectors.add(':root[data-theme="autumn-window"][data-comfort-theme="dawn"]');
      }
      const applicable = sourceFiles.flatMap((file) => parseRules(read(file)).flatMap((rule) =>
        rule.selector.split(',').map((selector) => selector.trim()).filter((selector) => selectors.has(selector))
          .map((selector) => ({ ...rule, specificity: [...selector.matchAll(/:root|\[/g)].length })),
      )).sort((a, b) => a.specificity - b.specificity);
      const original = Object.assign({}, ...applicable.map((rule) => rule.declarations)) as Record<string, string>;
      const kit = parseRules(kitCss).find((rule) => rule.selector.includes(`[data-wc-kit-mode="${mode}"]`));
      const rule = parseRules(adapter).find((candidate) => candidate.selector.includes(`[data-wc-kit-mode="${mode}"]`));
      for (const [property, value] of Object.entries(rule?.declarations ?? {})) {
        expect(original[property], `${property} has an original source`).toBeDefined();
        expect(normalize(resolve(value, { ...original, ...kit?.declarations })), `${mode} ${property}`)
          .toBe(normalize(resolve(original[property] ?? '', original)));
      }
      if (mode === 'dawn') {
        const cards = parseRules(read('src/styles/cards.css')).find((candidate) => candidate.selector === ':root[data-comfort-theme="dawn"]');
        const recipes = ['--card-panel-border-soft', '--card-panel-border-strong', '--card-tag-bg', '--card-tag-text', '--card-tag-border'];
        for (const property of recipes) {
          expect(rule?.declarations[property]).toMatch(/^color-mix\(in srgb, var\(--wc-kit-/);
          expect(normalize(resolve(rule?.declarations[property] ?? '', { ...original, ...kit?.declarations })))
            .toBe(normalize(resolve(cards?.declarations[property] ?? '', original)));
        }
      }
    }
    expect(read('src/styles/base.css')).toContain('hsl(var(--footer-border))');
  });

  it('keeps the kit namespace inert and limits the adapter to semantic variable references', () => {
    const kitRules = parseRules(kitCss);
    for (const rule of kitRules) {
      expect(rule.selector).toMatch(/^\.wc-kit-autumn-window\[data-wc-kit-mode=/);
      expect(Object.keys(rule.declarations).every((property) => property.startsWith('--wc-kit-'))).toBe(true);
    }
    expect(adapter).not.toMatch(/(?:^|\s)(?:background|color|border|outline|box-shadow)\s*:/m);
    expect(adapter).not.toMatch(/--admin-[\w-]+\s*:/);
  });
});
