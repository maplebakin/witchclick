// server/lib/promptContext.js
// Shared loader for prompt-generation context (settings, inventory, engagement signals).

import fs from 'node:fs';
import path from 'node:path';

import { collectPostMetadata } from '../../scripts/lib/postInventory.js';
import { readSlugHistory, writeSlugHistory } from '../../scripts/lib/slugHistory.js';
import { loadEngagementSignals } from './engagementSignals.js';

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listAllowedAffiliateKeys(products) {
  if (!products || !Array.isArray(products.products)) return [];
  return products.products
    .map((product) => String(product?.key || '').trim())
    .filter(Boolean);
}

function normalizeBrandName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || 'WitchClick';
}

function normalizeSiteUrl(value) {
  const siteUrl = typeof value === 'string' ? value.trim() : '';
  return siteUrl || 'https://example.com';
}

export function loadPromptContext(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const settingsPath = path.join(cwd, 'content', 'settings.json');
  const productsPath = path.join(cwd, 'content', 'products.json');

  const settings = options.settings ?? readJSON(settingsPath) ?? {};
  const products = readJSON(productsPath) ?? { products: [] };

  const allowedAffiliateKeys = listAllowedAffiliateKeys(products);

  const metadata = collectPostMetadata(cwd);
  const existingPostTitles = metadata.map((item) => item.title).filter(Boolean);
  const currentSlugs = metadata.map((item) => item.slug).filter(Boolean);

  const historicSlugs = readSlugHistory(cwd);
  const mergedSlugSet = new Set([...historicSlugs, ...currentSlugs]);
  const mergedSlugs = Array.from(mergedSlugSet);
  writeSlugHistory(cwd, mergedSlugs);

  const engagementSignals = loadEngagementSignals({ cwd, settings });

  return {
    brandName: normalizeBrandName(settings.brandName),
    siteUrl: normalizeSiteUrl(settings.siteUrl),
    existingPostTitles,
    existingPostSlugs: mergedSlugs,
    allowedAffiliateKeys,
    engagementSignals,
    settings,
  };
}

export default { loadPromptContext };
