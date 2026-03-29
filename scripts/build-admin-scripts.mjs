import path from 'node:path';

const ROOT = process.cwd();
const entryPoints = [
  path.join(ROOT, 'src', 'scripts', 'admin', 'adminWrite.ts'),
  path.join(ROOT, 'src', 'scripts', 'admin', 'adminPostEditor.ts'),
  path.join(ROOT, 'src', 'scripts', 'admin', 'adminEntities.ts'),
];

try {
  const { build } = await import('esbuild');

  await build({
    entryPoints,
    bundle: false,
    format: 'esm',
    logLevel: 'silent',
    outdir: path.join(ROOT, 'src', 'scripts', 'admin'),
    platform: 'browser',
    target: 'es2022',
  });

  console.log('[admin-build] compiled admin TypeScript scripts');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[admin-build] ${message}`);
  process.exit(1);
}
