// tools/src/genprompt.ts
import fs from 'node:fs';
import path from 'node:path';

import { buildMasterPrompt } from '../../server/lib/promptBuilder.js';

function readJSON<T = any>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

function listExistingTitles(postsDir: string) {
  if (!fs.existsSync(postsDir)) return [] as string[];
  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const match = raw.match(/^title:\s*(.+)$/m);
      return match ? match[1].trim().replace(/^"|"$/g, '') : '';
    })
    .filter(Boolean);
}

export function genprompt({
  topic,
  words,
  ads,
  kofi,
}: {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
}) {
  const CWD = process.cwd();
  const settings =
    readJSON<{ brandName?: string; siteUrl?: string }>(
      path.join(CWD, 'content', 'settings.json')
    ) || { brandName: 'WitchClick', siteUrl: 'https://example.com' };

  const products =
    readJSON<{ products?: { key?: string }[] }>(
      path.join(CWD, 'content', 'products.json')
    ) || { products: [] };

  const allowedKeys = Array.isArray(products.products)
    ? products.products
        .map((product) => String(product?.key || '').trim())
        .filter(Boolean)
    : [];

  const existingPostTitles = listExistingTitles(
    path.join(CWD, 'content', 'posts')
  );

  const prompt = buildMasterPrompt({
    topic,
    words,
    ads,
    kofi,
    brandName: settings.brandName ?? 'WitchClick',
    siteUrl: settings.siteUrl ?? 'https://example.com',
    existingPostTitles,
    allowedAffiliateKeys: allowedKeys,
  });

  return { prompt };
}
