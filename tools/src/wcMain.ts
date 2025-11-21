// tools/src/wcMain.ts
// WitchClick CLI entry (TypeScript). Compiles to JS and is invoked via tools/wc.js.

import fs from 'node:fs';
import path from 'node:path';

type Flags = Record<string, string | boolean>;

function parseArgv(argv: string[]) {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (typeof arg !== "string") continue;
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
        continue;
      }
      const key = arg.slice(2);
      const next = argv[i + 1];
      const nextValue = typeof next === "string" && !next.startsWith("-") ? next : undefined;
      if (nextValue !== undefined) {
        flags[key] = nextValue;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
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
  const mode = typeof flags.mode === 'string' ? flags.mode : undefined;
  const style = typeof flags.style === 'string' ? flags.style : undefined;
  const strictFlag = flags.strict ?? flags.s;
  const strict = typeof strictFlag === 'string'
    ? strictFlag === 'true' || strictFlag === '1'
    : Boolean(strictFlag);

  const mod = await import('./genprompt.js'); // compiled neighbor
  const { prompt } = (mod as any).genprompt({ topic, words, ads, kofi, mode, style, strict });

  const outDir = path.join(process.cwd(), 'tmp');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'generator_prompt.txt'), prompt, 'utf8');
  console.log(prompt);
}

async function cmdLint(positional: string[], flags: Flags) {
  const fileArg = positional[0] || String(flags.file ?? flags.f ?? '');
  if (!fileArg) {
    console.error('Usage: lint <spec.json> [--target 1200]');
    process.exitCode = 1;
    return;
  }

  const targetValue = flags.target ?? flags.words ?? flags.wordCount;
  const numericTarget =
    typeof targetValue === "number"
      ? targetValue
      : typeof targetValue === "string" && targetValue.trim()
        ? Number(targetValue)
        : undefined;
  const resolvedTarget =
    typeof numericTarget === "number" && Number.isFinite(numericTarget) && numericTarget > 0
      ? numericTarget
      : undefined;

  const mod = await import('./lintSpec.js');

  try {
    const result = await (mod as any).lintSpec(fileArg, {
      targetWordCount: resolvedTarget,
      cwd: process.cwd(),
    });

    if (!result?.ok) {
      console.error(`✖ Spec validation failed for ${fileArg}`);
      const errors: string[] = Array.isArray(result?.errors) ? result.errors : [];
      for (const err of errors) {
        console.error(`  • ${err}`);
      }
      const warnings: string[] = Array.isArray(result?.warnings) ? result.warnings : [];
      if (warnings.length) {
        console.warn('Warnings:');
        for (const warning of warnings) {
          console.warn(`  • ${warning}`);
        }
      }
      const normalizations: string[] = Array.isArray(result?.normalizations) ? result.normalizations : [];
      if (normalizations.length) {
        console.warn('Normalizations applied:');
        for (const note of normalizations) {
          console.warn(`  • ${note}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    const wordCount = typeof result.wordCount === 'number' ? result.wordCount : 'unknown';
    console.log(`✓ Spec valid (${wordCount} words).`);

    const normalizations: string[] = Array.isArray(result.normalizations) ? result.normalizations : [];
    if (normalizations.length) {
      console.log('Normalizations:');
      for (const note of normalizations) {
        console.log(`  • ${note}`);
      }
    }

    const warnings: string[] = Array.isArray(result.warnings) ? result.warnings : [];
    if (warnings.length) {
      console.log('Warnings:');
      for (const warning of warnings) {
        console.log(`  • ${warning}`);
      }
    }

    if (result.promptMetadata) {
      console.log('Prompt metadata:');
      console.log(JSON.stringify(result.promptMetadata, null, 2));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✖ ${message}`);
    process.exitCode = 1;
  }
}

async function cmdCurses(flags: Flags) {
  const type = String(flags.type ?? flags.t ?? 'mirror');
  const target = String(flags.target ?? flags.g ?? 'person');
  const tone = String(flags.tone ?? flags.o ?? 'poetic');
  const sigilName = typeof flags.sigil === 'string' ? flags.sigil : undefined;
  const altarItem = typeof flags.altar === 'string' ? flags.altar : undefined;
  const journalingFollowUp = typeof flags.journal === 'string' ? flags.journal : undefined;

  const mod = await import('./gencurse.js');
  (mod as any).gencurse({ type, target, tone, sigilName, altarItem, journalingFollowUp });
}

async function cmdIngest(flags: Flags) {
  const fromFile = String((flags['from-file'] as string) ?? '');
  const mod = await import('./ingest.js');
  const args: string[] = [];
  if (fromFile) args.push('--from-file', fromFile);
  const dryRunValue = flags['dry-run'] ?? flags['dryRun'];
  const dryRun = typeof dryRunValue === 'string'
    ? dryRunValue === 'true' || dryRunValue === '1'
    : Boolean(dryRunValue);
  if (dryRun) args.push('--dry-run');
  await (mod as any).ingest(args);
}

async function cmdCursesIngest(flags: Flags) {
  const fromFile = String((flags['from-file'] as string) ?? '');
  const mod = await import('./ingestCurse.js');
  const args: string[] = [];
  if (fromFile) args.push('--from-file', fromFile);
  const dryRunValue = flags['dry-run'] ?? flags['dryRun'];
  const dryRun = typeof dryRunValue === 'string'
    ? dryRunValue === 'true' || dryRunValue === '1'
    : Boolean(dryRunValue);
  if (dryRun) args.push('--dry-run');
  await (mod as any).ingestCurse(args);
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
    console.error('Usage: export --slug my-post [--format html|pdf]');
    process.exitCode = 1;
    return;
  }
  const mod = await import('./export.js');
  try {
    await (mod as any).exportCmd(['--slug', slug, '--format', format]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[export] ${message}`);
    process.exitCode = 1;
  }
}

async function cmdCursesExport(flags: Flags) {
  const slug = String(flags.slug ?? '');
  const mod = await import('./exportCurses.js');
  const args: string[] = [];
  if (slug) args.push('--slug', slug);
  await (mod as any).exportCurses(args);
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

async function cmdStubPrompts(flags: Flags) {
  const cwd = process.cwd();
  const outArg = typeof flags.out === 'string' ? flags.out : '';
  const outFile = outArg ? path.resolve(cwd, outArg) : path.join(cwd, 'tmp', 'entity-stub-prompts.md');
  const mod = await import('./stubPrompts.js');
  const { generateStubPrompts } = mod as any;
  const result = generateStubPrompts({ cwd });

  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, result.output, 'utf8');

  const relPath = path.relative(cwd, outFile) || outFile;
  console.log(`Generated ${result.total} stub prompt${result.total === 1 ? '' : 's'} → ${relPath}`);
}

// ---- Main ----

export async function main(argv: string[] = process.argv.slice(2)) {
  const { positional, flags } = parseArgv(argv);
  const cmd = positional[0] || 'help';
  const args = positional.slice(1);

  switch (cmd) {
    case 'genprompt':
      return cmdGenprompt(flags);
    case 'lint':
      return cmdLint(args, flags);
    case 'curses':
      return cmdCurses(flags);
    case 'ingest':
      return cmdIngest(flags);
    case 'curses:ingest':
      return cmdCursesIngest(flags);
    case 'linker':
      return cmdLinker();
    case 'seo':
      return cmdSEO(flags);
    case 'export':
      return cmdExport(flags);
    case 'curses:export':
      return cmdCursesExport(flags);
    case 'go:build':
      return cmdGoBuild();
    case 'health':
      return cmdHealth();
    case 'stubprompts':
      return cmdStubPrompts(flags);
    case 'help':
    default:
      console.log(
        [
          'WitchClick CLI',
          '',
          'Usage:',
          '  node tools/wc.js genprompt --topic "..." --words 1200 --ads on|off --kofi on|off',
          '  node tools/wc.js lint spec.json [--target 1200]',
          '  node tools/wc.js curses --type mirror --target person --tone poetic [--sigil "Sigil"] [--altar "Item"] [--journal "Question"]',
          '  node tools/wc.js curses:ingest --from-file curse.json [--dry-run]',
          '  node tools/wc.js curses:export [--slug curse-slug]',
          '  node tools/wc.js ingest --from-file drafts/latest.json',
          '  node tools/wc.js linker',
          '  node tools/wc.js seo --slug my-post [--apply]',
          '  node tools/wc.js export --slug my-post --format html|pdf',
          '      (PDF output requires `npm run tools:export:install` once)',
          '  node tools/wc.js go:build',
          '  node tools/wc.js health',
          '  node tools/wc.js stubprompts [--out tmp/entity-stub-prompts.md]',
          '',
        ].join('\n'),
      );
  }
}

export default { main };
