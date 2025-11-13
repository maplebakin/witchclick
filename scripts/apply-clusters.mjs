#!/usr/bin/env node
// scripts/apply-clusters.mjs
// Applies suggested topic clusters to posts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const postsDir = path.join(rootDir, 'src/content/posts');

// Cluster keywords mapping (same as suggest-clusters.mjs)
const clusterKeywords = {
  'tarot-spreads': ['tarot', 'spread', 'card', 'reading', 'divination', 'secular tarot', 'deck'],
  'rituals-practices': ['ritual', 'practice', 'ceremony', 'grounding', 'meditation', 'breathing'],
  'clean-cursing': ['curse', 'cursing', 'banishment', 'return energy', 'hex', 'protective magic'],
  'ai-narrative-magic': ['ai', 'machine', 'narrative', 'emergence', 'human-machine', 'llm', 'technology'],
  'shadow-work': ['shadow', 'trauma', 'healing', 'inner work', 'therapy', 'mental health', 'depression', 'anxiety'],
  'cozy-witchcraft': ['cozy', 'gentle', 'soft', 'comfort', 'tea', 'blanket', 'low energy', 'spoon'],
  'motherquest': ['mother', 'parent', 'child', 'baby', 'pregnancy', 'postpartum', 'sick parent'],
  'spellcraft-theory': ['spell', 'spellwork', 'magic theory', 'witchcraft', 'crystal', 'herb', 'moon phase'],
  'magical-productivity': ['productivity', 'planning', 'focus', 'work', 'decision', 'organizational'],
};

function suggestCluster(post) {
  const { data } = post;
  const title = (data.title || '').toLowerCase();
  const tags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];
  const excerpt = (data.excerpt || '').toLowerCase();
  const slug = (data.slug || '').toLowerCase();

  const searchText = `${title} ${tags.join(' ')} ${excerpt} ${slug}`;

  const scores = {};
  for (const [cluster, keywords] of Object.entries(clusterKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += 1;
        if (title.includes(keyword)) {
          score += 2;
        }
      }
    }
    scores[cluster] = score;
  }

  const sortedClusters = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  return sortedClusters.length > 0 ? sortedClusters[0][0] : null;
}

function applyCluster(filePath, cluster) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = grayMatter(content);

  // Add cluster to frontmatter
  parsed.data.cluster = cluster;

  // Reconstruct the file
  const newContent = grayMatter.stringify(parsed.content, parsed.data);

  fs.writeFileSync(filePath, newContent, 'utf8');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`🏷️  Applying Topic Clusters ${dryRun ? '(DRY RUN)' : ''}\n`);
  console.log('=' .repeat(80));

  const files = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(postsDir, f));

  let applied = 0;
  let skipped = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = grayMatter(content);
    const { data } = parsed;

    const slug = data.slug || path.basename(filePath, '.md');
    const isDraft = data.draft === true;
    const hasCluster = Boolean(data.cluster);

    // Skip drafts, placeholders, and posts that already have clusters
    if (isDraft || data.wordCount < 50 || hasCluster) {
      skipped++;
      continue;
    }

    const suggestedCluster = suggestCluster(parsed);

    if (suggestedCluster) {
      console.log(`  ✓ ${slug} → ${suggestedCluster}`);

      if (!dryRun) {
        applyCluster(filePath, suggestedCluster);
      }

      applied++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Applied clusters to ${applied} posts`);
  console.log(`  − Skipped ${skipped} posts (already have clusters or are drafts)`);

  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to actually apply changes\n`);
  } else {
    console.log(`\n✅ Clusters applied successfully!\n`);
  }
}

main();
