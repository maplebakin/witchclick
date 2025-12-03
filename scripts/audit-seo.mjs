#!/usr/bin/env node
// scripts/audit-seo.mjs
// Audits all posts for SEO requirements compliance

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const defaultContentDirs = [
  'content/white-magic-curses', // legacy curses archive
  'content/posts',              // legacy meanderings path
  'src/content/posts',          // primary Astro content collection
];

function resolveContentDirs() {
  const inputDirs = process.argv.slice(2).filter(Boolean);
  const dirs = inputDirs.length > 0 ? inputDirs : defaultContentDirs;
  return dirs.map((dir) => (path.isAbsolute(dir) ? dir : path.join(rootDir, dir)));
}

const contentDirs = resolveContentDirs();

function countInternalLinks(markdown) {
  // Count markdown links that point to internal paths
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(linkRegex)];
  return matches.filter(m => {
    const url = m[2];
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }).length;
}

function countExternalLinks(markdown) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(linkRegex)];
  return matches.filter(m => {
    const url = m[2];
    return url.startsWith('http://') || url.startsWith('https://');
  }).length;
}

function hasIntroSection(markdown) {
  // Check if first paragraph (after first heading) is substantive (>100 chars)
  const lines = markdown.split('\n');
  let firstParagraph = '';
  let foundFirstHeading = false;

  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      foundFirstHeading = true;
      continue;
    }
    if (foundFirstHeading && line.trim().length > 0 && !line.trim().startsWith('#')) {
      firstParagraph = line.trim();
      break;
    }
  }

  return firstParagraph.length > 100;
}

function hasConclusionSection(markdown, outline) {
  // Check for conclusion-like headings
  const conclusionKeywords = ['wrap', 'conclusion', 'closing', 'final', 'keep going', 'next steps'];
  const outlineArray = Array.isArray(outline) ? outline : [];

  const hasConclusionHeading = outlineArray.some(item => {
    const heading = typeof item === 'string' ? item : item.heading || item;
    return conclusionKeywords.some(kw => heading.toLowerCase().includes(kw));
  });

  // Also check markdown headings
  const headingRegex = /^##\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingRegex)].map(m => m[1].toLowerCase());
  const hasConclusionInMarkdown = headings.some(h =>
    conclusionKeywords.some(kw => h.includes(kw))
  );

  return hasConclusionHeading || hasConclusionInMarkdown;
}

function auditPost(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data, content: markdown } = grayMatter(content);

  const slug = data.slug || path.basename(filePath, '.md');
  const isDraft = data.draft === true;

  // Count links in frontmatter
  const frontmatterInternalLinks = Array.isArray(data.internalLinks) ? data.internalLinks.length : 0;

  // Count links in markdown content
  const markdownInternalLinks = countInternalLinks(markdown);
  const totalInternalLinks = frontmatterInternalLinks + markdownInternalLinks;

  const externalLinks = countExternalLinks(markdown);

  const hasIntro = hasIntroSection(markdown);
  const hasConclusion = hasConclusionSection(markdown, data.outline);
  const hasCluster = Boolean(data.cluster || data.category || data.contentType);
  const hasMeta = Boolean(data.publishedAt && data.readingMinutes);
  const hasHeroImage = Boolean(data.heroImage || data.heroImageSrc);
  const wordCount = data.wordCount || 0;

  return {
    slug,
    isDraft,
    hasIntro,
    hasConclusion,
    internalLinks: totalInternalLinks,
    externalLinks,
    hasCluster,
    hasMeta,
    hasHeroImage,
    wordCount,
    issues: [
      !hasIntro && 'Missing SEO intro paragraph',
      totalInternalLinks < 3 && `Only ${totalInternalLinks} internal link(s) (need 3-5)`,
      externalLinks < 1 && 'Missing external authoritative link',
      !hasConclusion && 'Missing conclusion section',
      !hasCluster && 'Missing topic cluster',
      wordCount < 700 && `Word count ${wordCount} below minimum 700`,
    ].filter(Boolean)
  };
}

function main() {
  console.log('🔍 SEO Audit Report\n');
  console.log('=' .repeat(80));

  console.log('Scanning directories:');
  contentDirs.forEach((dir) => console.log(` - ${dir}`));

  const files = contentDirs.flatMap(dir => {
    if (!fs.existsSync(dir)) {
      // It's okay for a content directory not to exist (e.g., /posts is often empty)
      return [];
    }
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(dir, f));
  });

  const results = files.map(auditPost);

  // Filter out drafts and placeholders
  const publishedResults = results.filter(r => !r.isDraft && r.wordCount >= 50);

  console.log(`\n📊 Summary (${publishedResults.length} published posts):\n`);

  const missingIntro = publishedResults.filter(r => !r.hasIntro).length;
  const missingConclusion = publishedResults.filter(r => !r.hasConclusion).length;
  const insufficientInternalLinks = publishedResults.filter(r => r.internalLinks < 3).length;
  const missingExternalLinks = publishedResults.filter(r => r.externalLinks < 1).length;
  const missingCluster = publishedResults.filter(r => !r.hasCluster).length;
  const lowWordCount = publishedResults.filter(r => r.wordCount < 700).length;

  console.log(`  ❌ Missing SEO intro paragraph: ${missingIntro} posts`);
  console.log(`  ❌ Missing conclusion section: ${missingConclusion} posts`);
  console.log(`  ⚠️  Insufficient internal links (<3): ${insufficientInternalLinks} posts`);
  console.log(`  ❌ Missing external link: ${missingExternalLinks} posts`);
  console.log(`  ⚠️  Missing topic cluster: ${missingCluster} posts`);
  console.log(`  ⚠️  Low word count (<700): ${lowWordCount} posts`);

  console.log(`\n\n📋 Posts needing attention:\n`);

  const postsWithIssues = publishedResults.filter(r => r.issues.length > 0);

  postsWithIssues.slice(0, 20).forEach(result => {
    console.log(`\n  📄 ${result.slug}`);
    result.issues.forEach(issue => {
      console.log(`     • ${issue}`);
    });
  });

  if (postsWithIssues.length > 20) {
    console.log(`\n  ... and ${postsWithIssues.length - 20} more posts with issues`);
  }

  console.log('\n' + '='.repeat(80));
  const compliantCount = publishedResults.filter(r => r.issues.length === 0).length;
  console.log(`\n✅ ${compliantCount} posts are fully compliant`);
  console.log(`⚠️  ${postsWithIssues.length} posts need updates\n`);

  if (publishedResults.length === 0) {
    console.log('ℹ️  No published posts found to audit (drafts or low-wordcount posts are ignored).');
    return;
  }

  if (postsWithIssues.length > 0) {
    console.log('❌ SEO audit failed: fix the issues above.');
    process.exitCode = 1;
  } else {
    console.log('🎉 SEO audit passed with no issues.');
  }
}

main();
