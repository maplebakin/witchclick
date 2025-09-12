#!/usr/bin/env node
import('./_compiled/wcMain.js').then(m => m.main(process.argv.slice(2))).catch(err => {
  console.error('[wc] error:', err?.message || err);
  process.exit(1);
});