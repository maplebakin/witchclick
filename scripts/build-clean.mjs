#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const env = { ...process.env };
const removedKeys = [
  'npm_config_http_proxy',
  'npm_config_http-proxy',
  'npm_config_https_proxy',
  'npm_config_proxy'
].filter((key) => {
  if (key in env) {
    delete env[key];
    return true;
  }
  return false;
});

const scriptDir = dirname(fileURLToPath(import.meta.url));
const astroBin = process.platform === 'win32' ? 'astro.cmd' : 'astro';
const astroPath = join(scriptDir, '..', 'node_modules', '.bin', astroBin);

const child = spawn(astroPath, ['build'], { env, stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (removedKeys.length > 0) {
    console.log(
      `ℹ️  Ignored npm proxy config for build: ${removedKeys.join(', ')}`
    );
  }
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (error) => {
  console.error('Failed to run Astro build:', error);
  process.exit(1);
});
