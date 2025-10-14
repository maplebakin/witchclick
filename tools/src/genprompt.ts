// tools/src/genprompt.ts
import fs from 'node:fs';
import path from 'node:path';

import { buildMasterPrompt } from '../../server/lib/promptBuilder.js';
import { collectPostMetadata } from '../../scripts/lib/postInventory.js';
import { readSlugHistory, writeSlugHistory } from '../../scripts/lib/slugHistory.js';

function readJSON<T = any>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
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

  const metadata = collectPostMetadata(CWD);
  const existingPostTitles = metadata.map((item) => item.title).filter(Boolean);
  const currentSlugs = metadata.map((item) => item.slug).filter(Boolean);
  const historicSlugs = readSlugHistory(CWD);
  const mergedSlugSet = new Set<string>([...historicSlugs, ...currentSlugs]);
  const mergedSlugs = Array.from(mergedSlugSet);
  writeSlugHistory(CWD, mergedSlugs);

  const prompt = buildMasterPrompt({
    topic,
    words,
    ads,
    kofi,
    brandName: settings.brandName ?? 'WitchClick',
    siteUrl: settings.siteUrl ?? 'https://example.com',
    existingPostTitles,
    existingPostSlugs: mergedSlugs,
    allowedAffiliateKeys: allowedKeys,
  });

  return { prompt };
}
