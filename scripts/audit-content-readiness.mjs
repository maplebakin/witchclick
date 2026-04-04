#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import grayMatter from 'gray-matter';

const rootDir = process.cwd();
const postsDir = path.join(rootDir, 'src', 'content', 'posts');
const entitiesDir = path.join(rootDir, 'content', 'entities');
const distDir = path.join(rootDir, 'dist');

const placeholderPhrases = [
  'check back soon',
  'coming soon',
  'nothing here yet',
  'lore in progress',
  'no tools to share yet',
  'this area is brewing',
];

const entityStubStatuses = new Set(['draft', 'stub', 'placeholder', 'pending', 'wip']);
const entityStubSummaryPattern =
  /\b(stub|placeholder|coming soon|check back soon|nothing here yet|lore in progress|this area is brewing)\b/i;

function walkFiles(dir, extensionPattern) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, extensionPattern));
      continue;
    }

    if (entry.isFile() && extensionPattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parsePublishDate(frontmatter) {
  const candidate = frontmatter.date ?? frontmatter.publishDate ?? frontmatter.publishedAt ?? frontmatter.pubDate;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPublishedPost(frontmatter) {
  if (frontmatter.draft === true) return false;
  if (frontmatter.published === false) return false;

  const publishDate = parsePublishDate(frontmatter);
  if (!publishDate) return true;

  return publishDate.getTime() <= Date.now();
}

function relativeFromRoot(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function collectPostReadiness() {
  const postFiles = walkFiles(postsDir, /\.mdx?$/);
  const publishedPosts = [];
  const draftPosts = [];
  const missingMetaDescription = [];
  const missingHeroOrOg = [];

  for (const filePath of postFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data } = grayMatter(raw);
    const slug = data.slug || path.basename(filePath).replace(/\.mdx?$/, '');

    if (isPublishedPost(data)) {
      publishedPosts.push({ slug, filePath });

      if (!String(data.metaDescription ?? '').trim()) {
        missingMetaDescription.push(slug);
      }

      if (!data.heroImage && !data.heroImageSrc && !data.ogImage) {
        missingHeroOrOg.push(slug);
      }
    } else {
      draftPosts.push({ slug, filePath });
    }
  }

  return { publishedPosts, draftPosts, missingMetaDescription, missingHeroOrOg };
}

function collectPublicPlaceholderPages() {
  const htmlFiles = walkFiles(distDir, /\.html$/);
  const matches = [];

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8').toLowerCase();
    const foundPhrase = placeholderPhrases.find((phrase) => html.includes(phrase));
    if (!foundPhrase) continue;

    matches.push({
      route: `/${relativeFromRoot(filePath).replace(/^dist\//, '').replace(/\/index\.html$/, '/').replace(/\.html$/, '')}`,
      phrase: foundPhrase,
    });
  }

  return matches.map((match) => ({
    ...match,
    route: match.route === '/' ? '/' : match.route.replace(/\/{2,}/g, '/'),
  }));
}

function collectEntityStubCounts() {
  const entityFiles = walkFiles(entitiesDir, /\.json$/);
  const counts = new Map();

  for (const filePath of entityFiles) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const type = String(raw.type || path.basename(path.dirname(filePath)));
    const status = String(raw.status || '').toLowerCase();
    const summary = String(raw.summary || '');
    const isStub = entityStubStatuses.has(status) || entityStubSummaryPattern.test(summary);

    if (!isStub) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function printList(label, items) {
  console.log(`${label}: ${items.length}`);
  if (items.length === 0) return;
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function main() {
  const postReadiness = collectPostReadiness();
  const placeholderPages = collectPublicPlaceholderPages();
  const entityStubCounts = collectEntityStubCounts();

  console.log('Content readiness audit\n');
  console.log(`Published post count: ${postReadiness.publishedPosts.length}`);
  console.log(`Draft post count: ${postReadiness.draftPosts.length}`);
  printList('Posts missing metaDescription', postReadiness.missingMetaDescription);
  printList('Posts missing hero/OG image', postReadiness.missingHeroOrOg);

  console.log(`Public placeholder pages found: ${placeholderPages.length}`);
  for (const page of placeholderPages) {
    console.log(`- ${page.route} (${page.phrase})`);
  }

  console.log('Entity stub counts by type:');
  if (Object.keys(entityStubCounts).length === 0) {
    console.log('- none');
    return;
  }

  for (const [type, count] of Object.entries(entityStubCounts)) {
    console.log(`- ${type}: ${count}`);
  }
}

main();
