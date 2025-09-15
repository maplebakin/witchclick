// tools/src/wcMain.ts
// WitchClick CLI entry (TypeScript). Compiles to JS and is invoked via tools/wc.js.

import fs from 'node:fs';
import path from 'node:path';

type Flags = Record<string, string | boolean>;

function parseArgv(argv: string[]) {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const nxt = argv[i + 1];
        if (nxt && !nxt.startsWith('-')) {
          flags[key] = nxt;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (a.startsWith('-')) {
      flags[a.slice(1)] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJSON<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

function withUtm(url: string, utm?: string) {
  if (!url) return '/';
  if (!utm) return url;
  return url.includes('?') ? `${url}&${utm}` : `${url}?${utm}`;
}

// ---- Commands ----

async function cmdGenprompt(flags: Flags) {
  const topic = String(flags.topic ?? flags.t ?? 'tea ritual for focus');
  const words = Number(flags.words ?? flags.w ?? 1200);
  const ads = String(flags.ads ?? 'off') === 'on' ? 'on' : 'off';
  const kofi = String(flags.kofi ?? 'on') === 'on' ? 'on' : 'off';

  const mod = await import('./genprompt.js'); // compiled neighbor
  const { prompt } = (mod as any).genprompt({ topic, words, ads, kofi });

  const outDir = path.join(process.cwd(), 'tmp');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'generator_prompt.txt'), prompt, 'utf8');
  console.log(prompt);
}

async function cmdIngest(flags: Flags) {
  const fromFile = String((flags['from-file'] as string) ?? '');
  const mod = await import('./ingest.js');
  const args: string[] = [];
  if (fromFile) args.push('--from-file', fromFile);
  await (mod as any).ingest(args);
}

async function cmdLinker() {
  const mod = await import('./linker.js');
  // Be tolerant: linker may be exported as linkerCmd, linker, or default
  const fn: any =
    (mod as any).linkerCmd ??
    (mod as any).linker ??
    (typeof (mod as any).default === 'function' ? (mod as any).default : undefined);

  if (typeof fn !== 'function') {
    console.error('[linker] No callable export found (expected linkerCmd | linker | default).');
    process.exitCode = 1;
    return;
  }
  await fn();
}

async function cmdSEO(flags: Flags) {
  const slug = String(flags.slug ?? '');
  if (!slug) {
    console.error('Usage: seo --slug my-post [--apply]');
    process.exitCode = 1;
    return;
  }
  const mod = await import('./seo.js');
  await (mod as any).seoCmd(['--slug', slug, ...(flags.apply ? ['--apply'] : [])]);
}

async function cmdExport(flags: Flags) {
  const slug = String(flags.slug ?? '');
  const format = String(flags.format ?? 'html');
  if (!slug) {
    console.error('Usage: export --slug my-post [--format html]');
    process.exitCode = 1;
    return;
  }
  const mod = await import('./export.js');
  await (mod as any).exportCmd(['--slug', slug, '--format', format]);
}

async function cmdGoBuild() {
  const CWD = process.cwd();
  const products = readJSON<{ products: Array<{ key: string; url?: string; utm?: string }> }>(
    path.join(CWD, 'content', 'products.json'),
  );

  if (!products || !Array.isArray(products.products)) {
    console.error('[go:build] Invalid or missing content/products.json');
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [];
  // Hide admin in prod (e.g., Netlify)
  lines.push('/admin      /404  404');
  lines.push('/admin/*    /404  404');

  // Affiliate redirects
  for (const p of products.products) {
    const key = (p.key || '').trim();
    if (!key) continue;
    const target = withUtm(String(p.url || '').trim(), String(p.utm || '').trim());
    lines.push(`/go/${key}    ${target || '/'}   302`);
  }

  const outDir = path.join(CWD, 'public');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, '_redirects'), lines.join('\n') + '\n', 'utf8');

  console.log(
    `[go:build] wrote ${path.join('public', '_redirects')} with ${products.products.length} entries`,
  );
}

async function cmdHealth() {
  const mod = await import('./healthLinks.js');
  await (mod as any).healthLinks();
}

// ---- Main ----

export async function main(argv: string[] = process.argv.slice(2)) {
  const { positional, flags } = parseArgv(argv);
  const cmd = positional[0] || 'help';

  switch (cmd) {
    case 'genprompt':
      return cmdGenprompt(flags);
    case 'ingest':
      return cmdIngest(flags);
    case 'linker':
      return cmdLinker();
    case 'seo':
      return cmdSEO(flags);
    case 'export':
      return cmdExport(flags);
    case 'go:build':
      return cmdGoBuild();
    case 'health':
      return cmdHealth();
    case 'help':
    default:
      console.log(
        [
          'WitchClick CLI',
          '',
          'Usage:',
          '  node tools/wc.js genprompt --topic "..." --words 1200 --ads on|off --kofi on|off',
          '  node tools/wc.js ingest --from-file drafts/latest.json',
          '  node tools/wc.js linker',
          '  node tools/wc.js seo --slug my-post [--apply]',
          '  node tools/wc.js export --slug my-post --format html',
          '  node tools/wc.js go:build',
          '  node tools/wc.js health',
          '',
        ].join('\n'),
      );
  }
}

export default { main };
