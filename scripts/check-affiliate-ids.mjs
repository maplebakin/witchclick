#!/usr/bin/env node
/**
 * Check for placeholder affiliate IDs that need to be configured
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, '..', 'content', 'products.json');

console.log('🔍 Checking affiliate configuration...\n');

try {
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  const placeholders = [];
  let hasAmazon = false;
  let hasBookshop = false;

  products.products.forEach(product => {
    // Check for Amazon placeholder
    if (product.url.includes('tag=YOURTAG-20')) {
      placeholders.push({
        key: product.key,
        issue: 'Amazon affiliate tag is placeholder "YOURTAG-20"',
        url: product.url
      });
      hasAmazon = true;
    }

    // Check for Bookshop placeholder
    if (product.url.includes('/a/YOUR_BOOKSHOP_ID/')) {
      placeholders.push({
        key: product.key,
        issue: 'Bookshop ID is placeholder "YOUR_BOOKSHOP_ID"',
        url: product.url
      });
      hasBookshop = true;
    }
  });

  if (placeholders.length === 0) {
    console.log('✅ All affiliate IDs configured correctly!');
    console.log(`   ${products.products.length} products checked\n`);
    process.exit(0);
  }

  console.log(`❌ Found ${placeholders.length} placeholder affiliate IDs:\n`);

  placeholders.slice(0, 5).forEach(p => {
    console.log(`   • ${p.key}`);
    console.log(`     ${p.issue}`);
  });

  if (placeholders.length > 5) {
    console.log(`   ... and ${placeholders.length - 5} more`);
  }

  console.log('\n📝 To fix:');
  console.log(`   1. Edit content/products.json`);

  if (hasAmazon) {
    console.log(`   2. Replace all "tag=YOURTAG-20" with your Amazon Associates tag`);
    console.log(`      Example: tag=yoursite-20`);
  }

  if (hasBookshop) {
    console.log(`   3. Replace all "/a/YOUR_BOOKSHOP_ID/" with your Bookshop.org affiliate ID`);
    console.log(`      Example: /a/12345/`);
  }

  console.log('\n⚠️  Do not deploy to production with placeholder IDs!\n');
  process.exit(1);

} catch (error) {
  console.error('❌ Error reading products.json:', error.message);
  process.exit(1);
}
