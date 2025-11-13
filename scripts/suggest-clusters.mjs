#!/usr/bin/env node
// scripts/suggest-clusters.mjs
// Suggests topic clusters for posts based on tags, title, and content

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const postsDir = path.join(rootDir, 'src/content/posts');

// Cluster keywords mapping
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
  const { data, content } = post;
  const title = (data.title || '').toLowerCase();
  const tags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];
  const excerpt = (data.excerpt || '').toLowerCase();
  const slug = (data.slug || '').toLowerCase();

  // Combine searchable text
  const searchText = `${title} ${tags.join(' ')} ${excerpt} ${slug}`;

  // Score each cluster
  const scores = {};
  for (const [cluster, keywords] of Object.entries(clusterKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += 1;
        // Title matches get extra weight
        if (title.includes(keyword)) {
          score += 2;
        }
      }
    }
    scores[cluster] = score;
  }

  // Find the highest scoring cluster
  const sortedClusters = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  return sortedClusters.length > 0 ? sortedClusters : null;
}

function main() {
  console.log('🏷️  Topic Cluster Suggestions\n');
  console.log('=' .repeat(80));

  const files = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(postsDir, f));

  const suggestions = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = grayMatter(content);
    const { data } = parsed;

    const slug = data.slug || path.basename(filePath, '.md');
    const isDraft = data.draft === true;
    const hasCluster = Boolean(data.cluster);

    // Skip drafts and posts that already have clusters
    if (isDraft || data.wordCount < 50) continue;

    const clusterSuggestions = suggestCluster(parsed);

    if (clusterSuggestions && clusterSuggestions.length > 0) {
      suggestions.push({
        slug,
        filePath,
        hasCluster,
        currentCluster: data.cluster || data.contentType || null,
        suggested: clusterSuggestions,
      });
    }
  }

  // Group by having/not having clusters
  const withClusters = suggestions.filter(s => s.hasCluster);
  const withoutClusters = suggestions.filter(s => !s.hasCluster);

  console.log(`\n📊 Summary:`);
  console.log(`  ✓ ${withClusters.length} posts already have clusters`);
  console.log(`  ⚠️  ${withoutClusters.length} posts need cluster assignment\n`);

  console.log(`\n🆕 Posts needing clusters (top 20):\n`);

  withoutClusters.slice(0, 20).forEach(item => {
    const topSuggestion = item.suggested[0];
    const alternatives = item.suggested.slice(1, 3).map(s => s[0]).join(', ');

    console.log(`  📄 ${item.slug}`);
    console.log(`     → Suggested: ${topSuggestion[0]} (score: ${topSuggestion[1]})`);
    if (alternatives) {
      console.log(`     → Alternatives: ${alternatives}`);
    }
    console.log();
  });

  if (withoutClusters.length > 20) {
    console.log(`  ... and ${withoutClusters.length - 20} more\n`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\nTo apply these suggestions, edit each post\'s frontmatter:');
  console.log('  cluster: "tarot-spreads"  # or other suggested value\n');
}

main();
