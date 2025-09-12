// tools/src/wcMain.ts
// Tiny CLI entry for WitchClick (ESM). Commands:
//   node tools/wc.js genprompt --topic "..." --words 1200 --ads on|off --kofi on|off
//   node tools/wc.js go:build
//   node tools/wc.js linker

import fs from 'node:fs';
import path from 'node:path';

type Flags = Record<string, string | number | boolean>;

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

function readJSON<T = any>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function withUtm(url: string, utm: string) {
  if (!url) return '/';
  if (!utm) return url;
  return url.includes('?') ? `${url}&${utm}` : `${url}?${utm}`;
}

async function cmdGenprompt(flags: Flags) {
  const topic = String(flags.topic ?? flags.t ?? 'tea ritual for focus');
  const words = Number(flags.words ?? flags.w ?? 1200);
  const ads = String(flags.ads ?? 'off') === 'on' ? 'on' : 'off';
  const kofi = String(flags.kofi ?? 'on') === 'on' ? 'on' : 'off';

  // Lazy import so other commands don't require this file to exist
  const mod = await import('./genprompt.js');
  const { prompt } = mod.genprompt({ topic, words, ads, kofi });

  ensureDir(path.join(process.cwd(), 'tmp'));
  fs.writeFileSync(path.join(process.cwd(), 'tmp', 'generator_prompt.txt'), prompt);
  console.log(prompt);
}

async function cmdGoBuild() {
  const CWD = process.cwd();
  const products = readJSON<{ products: Array<{ key: string; url?: string; utm?: string }> }>(
    path.join(CWD, 'content', 'products.json')
  );

  if (!products || !Array.isArray(products.products)) {
    console.error('[go:build] Invalid or missing content/products.json');
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [];

  // Hide admin in prod via Netlify redirects (priority at top)
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
  fs.writeFileSync(path.join(outDir, '_redirects'), lines.join('\n') + '\n');

  console.log(`[go:build] wrote ${path.join('public', '_redirects')} with ${products.products.length} entries`);
}

async function cmdLinker() {
  // Minimal OK stub so dev-api "bundle" succeeds.
  const CWD = process.cwd();
  const postsDir = path.join(CWD, 'content', 'posts');
  let count = 0;
  if (fs.existsSync(postsDir)) {
    for (const f of fs.readdirSync(postsDir).filter(x => x.endsWith('.md'))) count++;
  }
  console.log(JSON.stringify({ ok: true, notes: `linker stub ran; ${count} post(s) scanned` }, null, 2));
}

// Exported entry point so tools/wc.js can call it.
export async function main(argv: string[] = process.argv.slice(2)) {
  const { positional, flags } = parseArgv(argv);
  const cmd = positional[0] || 'help';

  switch (cmd) {
    case 'genprompt':
      return cmdGenprompt(flags);
    case 'go:build':
      return cmdGoBuild();
    case 'linker':
      return cmdLinker();
    case 'help':
    default:
      console.log(
        [
          'WitchClick CLI',
          '',
          'Usage:',
          '  node tools/wc.js genprompt --topic "..." --words 1200 --ads on|off --kofi on|off',
          '  node tools/wc.js go:build',
          '  node tools/wc.js linker',
          ''
        ].join('\n')
      );
  }
}
