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

const EXCLUDE_PREFIXES = ['/author', '/account', '/admin', '/api', '/sampler'];
const EXCLUDE_EXACT = new Set(['/author', '/account']);
const NOINDEX_META_RE = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>/i;

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
      results.push({
        relativePath,
        filePath,
      });
    }
  }

  return results;
}

function normalizePathname(filePath) {
  let pathname = filePath
    .replace(/\\/g, '/') // Windows paths
    .replace(/index\.html$/, '') // Remove index.html
    .replace(/\.html$/, ''); // Remove .html

  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return pathname;
}

function encodePathSegment(segment) {
  if (!segment) return segment;
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

function encodePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  const segments = pathname.split('/').map(encodePathSegment);
  return segments.join('/').replace(/\/+/g, '/');
}

function fileHasNoindex(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    return NOINDEX_META_RE.test(html);
  } catch {
    return false;
  }
}

// Check if URL should be excluded
function shouldExcludePathname(pathname) {
  const excludePatterns = [
    /\/admin(\/|$)/,
    /\/api(\/|$)/,
    /\/404$/,
    /\/500$/,
  ];

  return excludePatterns.some(pattern => pattern.test(pathname));
}

// Generate sitemap XML
function generateSitemap(entries, siteUrl) {
  const urlEntries = entries.map(({ url, lastmod }) => {
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
    <lastmod>${lastmod}</lastmod>
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
function generateSitemapIndex(sitemaps) {
  const sitemapEntries = sitemaps.map(({ url, lastmod }) => {
    return `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
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

  const entries = htmlFiles
    .map(({ relativePath, filePath }) => {
      const pathname = normalizePathname(relativePath);
      const encodedPathname = encodePathname(pathname);
      const url = new URL(encodedPathname, `${baseUrl}/`).toString();
      const stat = fs.statSync(filePath);
      const lastmod = stat.mtime.toISOString();
      const noindex = fileHasNoindex(filePath);
      return {
        url,
        pathname: encodedPathname,
        lastmod,
        noindex,
      };
    })
    .filter(({ pathname }) => !shouldExcludePathname(pathname))
    .filter(({ pathname }) => shouldIncludePathname(pathname))
    .filter(({ noindex }) => !noindex)
    .sort((a, b) => a.url.localeCompare(b.url));

  console.log(`✅ Including ${entries.length} URLs in sitemap`);

  // Split into chunks of 50000 URLs (sitemap limit)
  const chunkSize = 50000;
  const chunks = [];
  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(entries.slice(i, i + chunkSize));
  }

  // Generate sitemaps
  const sitemapFiles = [];
  chunks.forEach((chunk, index) => {
    const filename = chunks.length === 1 ? 'sitemap-0.xml' : `sitemap-${index}.xml`;
    const sitemap = generateSitemap(chunk, baseUrl);
    const filepath = path.join(distDir, filename);

    fs.writeFileSync(filepath, sitemap, 'utf8');
    const chunkLastmod = chunk.reduce((latest, entry) => {
      if (!latest) return entry.lastmod;
      return new Date(entry.lastmod).getTime() > new Date(latest).getTime() ? entry.lastmod : latest;
    }, '');
    sitemapFiles.push({
      filename,
      lastmod: chunkLastmod || new Date().toISOString(),
    });
    console.log(`✓ Generated ${filename} with ${chunk.length} URLs`);
  });

  // Generate sitemap index
  const sitemapUrls = sitemapFiles.map(({ filename, lastmod }) => ({
    url: new URL(`/${filename}`, `${baseUrl}/`).toString(),
    lastmod,
  }));
  const sitemapIndex = generateSitemapIndex(sitemapUrls);
  const indexPath = path.join(distDir, 'sitemap-index.xml');

  fs.writeFileSync(indexPath, sitemapIndex, 'utf8');
  console.log(`✓ Generated sitemap-index.xml`);

  console.log('\n✨ Sitemap generation complete!');
  console.log(`📍 Sitemap URL: ${baseUrl}/sitemap-index.xml`);
}

main();
