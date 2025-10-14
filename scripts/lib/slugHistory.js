// scripts/lib/slugHistory.js
// Shared helpers for persisting normalized post slug history between prompt runs.
import fs from 'node:fs';
import path from 'node:path';

const HISTORY_FILE = 'post-slug-history.json';

export function readSlugHistory(root) {
  try {
    const historyPath = path.join(root, '.cache', HISTORY_FILE);
    const raw = fs.readFileSync(historyPath, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item) => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeSlugHistory(root, slugs) {
  const cacheDir = path.join(root, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const historyPath = path.join(cacheDir, HISTORY_FILE);
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  fs.writeFileSync(historyPath, JSON.stringify(unique, null, 2), 'utf8');
}

export default {
  readSlugHistory,
  writeSlugHistory,
};
