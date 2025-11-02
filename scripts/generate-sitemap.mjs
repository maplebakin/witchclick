#!/usr/bin/env node
/**
 * Custom sitemap generator for WitchClick
 * Generates sitemap-index.xml and sitemaps for all built pages
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const siteUrl = 'https://witchclick.space';

const EXCLUDE_PREFIXES = ['/author', '/account', '/admin', '/api'];
const EXCLUDE_EXACT = new Set(['/author', '/account']);

function shouldIncludePathname(pathname) {
  if (!pathname) return true;
  if (EXCLUDE_EXACT.has(pathname)) return false;
  return !EXCLUDE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// Read settings to get the actual site URL
function getSiteUrl() {
  try {
    const settingsPath = path.join(__dirname, '..', 'content', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return settings.siteUrl || siteUrl;
  } catch {
    return siteUrl;
  }
}

// Recursively find all HTML files in dist
function findHtmlFiles(dir, baseDir = dir) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(findHtmlFiles(filePath, baseDir));
    } else if (file.endsWith('.html')) {
      // Get relative path from dist
      const relativePath = path.relative(baseDir, filePath);
      results.push(relativePath);
    }
  }

  return results;
}

// Convert file path to URL
function filePathToUrl(filePath, baseUrl) {
  let url = filePath
    .replace(/\\/g, '/') // Windows paths
    .replace(/index\.html$/, '') // Remove index.html
    .replace(/\.html$/, ''); // Remove .html

  // Ensure it starts with /
  if (!url.startsWith('/')) {
    url = '/' + url;
  }

  // Remove trailing slash for consistency (except root)
  if (url.length > 1 && url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  return baseUrl + url;
}

// Check if URL should be excluded
function shouldExclude(url) {
  const excludePatterns = [
    /\/admin(\/|$)/,
    /\/api\//,
    /\/404$/,
    /\/500$/,
  ];

  return excludePatterns.some(pattern => pattern.test(url));
}

// Generate sitemap XML
function generateSitemap(urls, siteUrl) {
  const now = new Date().toISOString();

  const urlEntries = urls.map(url => {
    // Determine priority and changefreq based on URL
    let priority = '0.5';
    let changefreq = 'weekly';

    if (url === siteUrl || url === siteUrl + '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (url.includes('/post/')) {
      priority = '0.8';
      changefreq = 'monthly';
    } else if (url.includes('/entities/')) {
      priority = '0.7';
      changefreq = 'monthly';
    } else if (url.includes('/hub/') || url.includes('/tag/')) {
      priority = '0.6';
      changefreq = 'weekly';
    }

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// Generate sitemap index
function generateSitemapIndex(sitemapUrls) {
  const now = new Date().toISOString();

  const sitemapEntries = sitemapUrls.map(url => {
    return `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
}

// Main execution
function main() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist directory not found. Run build first.');
    process.exit(1);
  }

  const baseUrl = getSiteUrl().replace(/\/$/, ''); // Remove trailing slash
  console.log('🗺️  Generating sitemap for:', baseUrl);

  // Find all HTML files
  const htmlFiles = findHtmlFiles(distDir);
  console.log(`📄 Found ${htmlFiles.length} HTML files`);

  // Convert to URLs and filter
  const urls = htmlFiles
    .map(file => filePathToUrl(file, baseUrl))
    .filter(url => !shouldExclude(url))
    .map(url => ({ url, pathname: new URL(url).pathname }))
    .filter(({ pathname }) => shouldIncludePathname(pathname))
    .map(({ url }) => url);

  const journalIndexUrl = `${baseUrl}/journal`;
  if (!urls.includes(journalIndexUrl)) {
    urls.push(journalIndexUrl);
  }

  const journalPageDir = path.join(distDir, 'journal', 'page');
  if (fs.existsSync(journalPageDir)) {
    const pages = fs
      .readdirSync(journalPageDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => /^\d+$/.test(name));

    for (const page of pages) {
      const url = `${baseUrl}/journal/page/${page}`;
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }

  urls.sort();

  console.log(`✅ Including ${urls.length} URLs in sitemap`);

  // Split into chunks of 50000 URLs (sitemap limit)
  const chunkSize = 50000;
  const chunks = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    chunks.push(urls.slice(i, i + chunkSize));
  }

  // Generate sitemaps
  const sitemapFiles = [];
  chunks.forEach((chunk, index) => {
    const filename = chunks.length === 1 ? 'sitemap-0.xml' : `sitemap-${index}.xml`;
    const sitemap = generateSitemap(chunk, baseUrl);
    const filepath = path.join(distDir, filename);

    fs.writeFileSync(filepath, sitemap, 'utf8');
    sitemapFiles.push(filename);
    console.log(`✓ Generated ${filename} with ${chunk.length} URLs`);
  });

  // Generate sitemap index
  const sitemapUrls = sitemapFiles.map(file => `${baseUrl}/${file}`);
  const sitemapIndex = generateSitemapIndex(sitemapUrls);
  const indexPath = path.join(distDir, 'sitemap-index.xml');

  fs.writeFileSync(indexPath, sitemapIndex, 'utf8');
  console.log(`✓ Generated sitemap-index.xml`);

  console.log('\n✨ Sitemap generation complete!');
  console.log(`📍 Sitemap URL: ${baseUrl}/sitemap-index.xml`);
}

main();
