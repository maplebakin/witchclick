// scripts/build-tools.js
import { execSync } from 'node:child_process';
import fs from 'node:fs';

try {
// Ensure tools/_compiled exists
fs.mkdirSync('tools/_compiled', { recursive: true });
// Compile TypeScript CLI
execSync('npx tsc -p tools/tsconfig.json', { stdio: 'inherit' });
// Make runner executable on *nix
try { fs.chmodSync('tools/wc.js', 0o755); } catch {}
console.log('[tools] Compiled CLI to tools/_compiled');
} catch (err) {
console.error('[tools] Build failed:', err?.message || err);
process.exit(1);
}