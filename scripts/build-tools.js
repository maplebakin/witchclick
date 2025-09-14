// scripts/build-tools.js
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, 'tools');
const OUT_DIR = path.join(TOOLS_DIR, '_compiled');
const TSCONFIG = path.join(TOOLS_DIR, 'tsconfig.json');
const RUNNER = path.join(TOOLS_DIR, 'wc.js');
const ENTRY_JS = path.join(OUT_DIR, 'wcMain.js'); // compiled entry

function log(msg) { console.log(`[tools] ${msg}`); }
function err(msg) { console.error(`[tools] ${msg}`); }

try {
  // 0) sanity
  if (!fs.existsSync(TSCONFIG)) {
    throw new Error(`Missing ${path.relative(ROOT, TSCONFIG)}`);
  }

  // 1) ensure out dir, clean old artifacts
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // simple clean: remove everything under OUT_DIR
  for (const f of fs.readdirSync(OUT_DIR)) {
    fs.rmSync(path.join(OUT_DIR, f), { recursive: true, force: true });
  }

  // 2) compile TS (ESM)
  log('Compiling TypeScript CLI…');
  execSync(`${os.platform() === 'win32' ? 'npx.cmd' : 'npx'} tsc -p "${TSCONFIG}"`, { stdio: 'inherit' });

  if (!fs.existsSync(ENTRY_JS)) {
    throw new Error(`Expected compiled entry missing: ${path.relative(ROOT, ENTRY_JS)}`);
  }

  // 3) write ESM runner (always up-to-date)
  const runnerSource = `#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled main and invoke
const { main } = await import(path.join(__dirname, '_compiled', 'wcMain.js'));
await main(process.argv.slice(2));
`;
  fs.writeFileSync(RUNNER, runnerSource, 'utf8');

  // 4) make runner executable on *nix
  try { fs.chmodSync(RUNNER, 0o755); } catch {}

  log(`Compiled CLI → ${path.relative(ROOT, OUT_DIR)}`);
  log(`Runner ready → ${path.relative(ROOT, RUNNER)}`);
} catch (e) {
  err(`Build failed: ${e?.message || e}`);
  process.exit(1);
}
