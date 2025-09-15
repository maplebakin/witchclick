#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled main and invoke
const { main } = await import(path.join(__dirname, '_compiled', 'wcMain.js'));
await main(process.argv.slice(2));
