#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledMain = path.join(__dirname, '_compiled', 'wcMain.js');

if (fs.existsSync(compiledMain)) {
  const { main } = await import(compiledMain);
  await main(process.argv.slice(2));
} else {
  // Fallback: run TypeScript entry directly when compiled bundle is unavailable.
  const tsMain = path.join(__dirname, 'src', 'wcMain.ts');
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      '-e',
      `import(${JSON.stringify(tsMain)}).then((m)=>m.main(process.argv.slice(1)))`,
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit' },
  );
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exit(code ?? 0);
    });
    child.on('close', resolve);
  });
}
