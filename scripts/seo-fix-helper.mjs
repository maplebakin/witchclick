#!/usr/bin/env node
// scripts/seo-fix-helper.mjs
// Surfaces SEO issues + internal link suggestions to speed manual fixes

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const defaultContentDirs = [
  'content/white-magic-curses',
  'content/posts',
  'src/content/posts',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    slug: null,
    limit: 10,
    all: false,
    dirs: [],
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--slug' && args[i + 1]) {
      params.slug = args[i + 1].toLowerCase();
      i += 1;
      continue;
    }
    if (arg === '--limit' && args[i + 1]) {
      params.limit = Number(args[i + 1]) || 10;
      i += 1;
      continue;
    }
    if (arg === '--all') {
      params.all = true;
      continue;
    }
    if (arg === '--dirs' && args[i + 1]) {
      params.dirs = args[i + 1].split(',').map((d) => d.trim()).filter(Boolean);
      i += 1;
      continue;
    }
  }

  return params;
}

function resolveContentDirs(dirArgs) {
  const dirs = dirArgs.length > 0 ? dirArgs : defaultContentDirs;
  return dirs.map((dir) => (path.isAbsolute(dir) ? dir : path.join(rootDir, dir)));
}

function countInternalLinks(markdown) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(linkRegex)];
  return matches.filter((m) => {
    const url = m[2];
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }).length;
}

function countExternalLinks(markdown) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(linkRegex)];
  return matches.filter((m) => {
    const url = m[2];
    return url.startsWith('http://') || url.startsWith('https://');
  }).length;
}

function hasIntroSection(markdown) {
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
  const conclusionKeywords = ['wrap', 'conclusion', 'closing', 'final', 'keep going', 'next steps'];
  const outlineArray = Array.isArray(outline) ? outline : [];

  const hasConclusionHeading = outlineArray.some((item) => {
    const heading = typeof item === 'string' ? item : item.heading || item;
    return conclusionKeywords.some((kw) => heading.toLowerCase().includes(kw));
  });

  const headingRegex = /^##\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingRegex)].map((m) => m[1].toLowerCase());
  const hasConclusionInMarkdown = headings.some((h) =>
    conclusionKeywords.some((kw) => h.includes(kw))
  );

  return hasConclusionHeading || hasConclusionInMarkdown;
}

function deriveDate(filePath, data) {
  const candidates = [
    data?.publishedAt,
    data?.pubDate,
    data?.date,
    data?.updatedAt,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(+date)) return date;
  }

  const stat = fs.statSync(filePath);
  return stat.mtime;
}

function countWords(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[#$>*_`~\-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function loadPosts(contentDirs) {
  const posts = [];

  for (const dir of contentDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = grayMatter(raw);
      const slug = (data?.slug || file.replace(/\.md$/, '')).toLowerCase();

      if (data?.draft === true) continue;

      const tags = Array.isArray(data?.tags) ? data.tags.map(String) : [];
      const wordCount = data?.wordCount ?? countWords(content);

      posts.push({
        slug,
        title: String(data?.title || slug),
        tags,
        outline: data?.outline,
        internalLinksFm: Array.isArray(data?.internalLinks) ? data.internalLinks.length : 0,
        externalLinksFm: Array.isArray(data?.externalLinks) ? data.externalLinks.length : 0,
        content,
        date: deriveDate(fullPath, data ?? {}),
        wordCount,
        filePath: fullPath,
      });
    }
  }

  return posts;
}

function auditPost(post) {
  const markdownInternal = countInternalLinks(post.content);
  const markdownExternal = countExternalLinks(post.content);
  const totalInternal = post.internalLinksFm + markdownInternal;
  const totalExternal = post.externalLinksFm + markdownExternal;
  const hasIntro = hasIntroSection(post.content);
  const hasConclusion = hasConclusionSection(post.content, post.outline);

  const issues = [];
  if (!hasIntro) issues.push('Missing intro (>100 chars after H1)');
  if (totalInternal < 3) issues.push(`Needs internal links (${totalInternal}/3)`);
  if (totalExternal < 1) issues.push('Missing external authoritative link');
  if (!hasConclusion) issues.push('Missing conclusion section');
  if (post.wordCount < 700) issues.push(`Word count low (${post.wordCount}<700)`);

  return {
    ...post,
    hasIntro,
    hasConclusion,
    internalLinks: totalInternal,
    externalLinks: totalExternal,
    issues,
  };
}

function suggestInternalLinks(post, allPosts, limit = 5) {
  const tagSet = new Set(post.tags.map((t) => t.toLowerCase()));
  const scored = [];

  for (const candidate of allPosts) {
    if (candidate.slug === post.slug) continue;
    const candidateTags = candidate.tags.map((t) => t.toLowerCase());
    const overlap = candidateTags.filter((t) => tagSet.has(t));
    const score = overlap.length;
    if (score === 0) continue;
    scored.push({
      slug: candidate.slug,
      title: candidate.title,
      overlap,
      score,
      date: candidate.date,
    });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return +b.date - +a.date;
    })
    .slice(0, limit);
}

function main() {
  const params = parseArgs();
  const contentDirs = resolveContentDirs(params.dirs);

  console.log('🔧 SEO Fix Helper');
  console.log('Directories:');
  contentDirs.forEach((dir) => console.log(` - ${dir}`));
  console.log('');

  const posts = loadPosts(contentDirs);
  if (posts.length === 0) {
    console.log('No posts found. Check directories or add content.');
    return;
  }

  const audited = posts.map(auditPost);
  const failing = audited.filter((p) => p.issues.length > 0);

  let targetPosts = failing;
  if (params.slug) {
    targetPosts = audited.filter((p) => p.slug === params.slug);
    if (targetPosts.length === 0) {
      console.log(`No post found for slug: ${params.slug}`);
      return;
    }
  } else if (!params.all) {
    targetPosts = failing.slice(0, params.limit);
  }

  if (targetPosts.length === 0) {
    console.log('✅ All scanned posts meet the SEO checks.');
    return;
  }

  for (const post of targetPosts) {
    console.log(`📄 ${post.slug} (${post.wordCount} words)`);
    if (post.issues.length === 0) {
      console.log('   ✅ No issues');
    } else {
      console.log('   Issues:');
      post.issues.forEach((issue) => console.log(`   • ${issue}`));
    }

    const suggestions = suggestInternalLinks(post, audited);
    if (suggestions.length > 0) {
      console.log('   Internal link ideas:');
      suggestions.forEach((s) => {
        const overlap = s.overlap.join(', ');
        console.log(`   → ${s.slug} — tags: ${overlap || 'n/a'}`);
      });
    } else {
      console.log('   Internal link ideas: (no tagged matches found)');
    }

    if (post.externalLinks === 0) {
      console.log('   External link reminder: add 1 authoritative citation.');
    }

    console.log('');
  }

  const remaining = failing.length - targetPosts.length;
  if (!params.slug && remaining > 0 && !params.all) {
    console.log(`...and ${remaining} more posts with issues (use --all or --slug <slug>)`);
  }
}

main();
