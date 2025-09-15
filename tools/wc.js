// tools/wc.js  (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const CWD = process.cwd();
const compiled = path.join(CWD, 'tools', '_compiled', 'wcMain.js');
const srcTs = path.join(CWD, 'tools', 'src', 'wcMain.ts');
const args = process.argv.slice(2);

(async () => {
  // 1) Prefer compiled JS if available
  if (fs.existsSync(compiled)) {
    const mod = await import(pathToFileURL(compiled).href);
    if (typeof mod.main !== 'function') {
      console.error('[wc] compiled wcMain.js missing exported main()');
      process.exit(1);
    }
    const code = await mod.main(args);
    process.exit(typeof code === 'number' ? code : 0);
  }

  // 2) Fallback: run TS directly using tsx
  if (fs.existsSync(srcTs)) {
    // ensure tsx is available (dev dependency)
    const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(runner, ['tsx', srcTs, ...args], { stdio: 'inherit' });
    child.on('close', (code) => process.exit(code ?? 0));
    return;
  }

  console.error('[wc] Could not find tools/_compiled/wcMain.js or tools/src/wcMain.ts');
  process.exit(1);
})();
