#!/usr/bin/env node
// Backfill advisory triage metadata for existing post stubs.
// Dry-run by default. Use --write to persist frontmatter-only changes.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';

import { resolvePostsDirectories, slugify } from './lib/contentPaths.js';

const STUB_BODY_PHRASE = 'automatically created as a stub';

const STATUS_VALUES = new Set([
  'strong-article-candidate',
  'support-reference-candidate',
  'editorial-seed',
  'pop-culture-review',
  'template-section-artifact',
  'needs-human-decision',
  'possible-delete-merge-candidate',
]);

const ACTION_VALUES = new Set([
  'generate-full-article',
  'make-short-reference',
  'define-angle-before-generation',
  'review-pop-culture-fit',
  'keep-as-pattern',
  'review-manually',
  'merge-or-delete-later',
]);

const TRIAGE_GROUPS = [
  {
    status: 'strong-article-candidate',
    action: 'generate-full-article',
    note: 'Strong article candidate with enough source context to brief a full article. Review before generation.',
    slugs: [
      'ancient-tools-meet-modern-minds',
      'clean-cursing-ritual',
      'forgiveness-and-boundaries',
      'letting-things-slide',
      'post-ritual-grounding-methods',
      'practicing-with-consent-and-gentleness',
      'regulating-two-nervous-systems',
      'shared-narrative-presence',
      'staying-exactly-yourself',
      'tender-boundaries',
      'what-s-the-deal-with-the-rapture-a-gentle-inquiry',
      'when-the-waiting-period-feels-heavy',
    ],
  },
  {
    status: 'editorial-seed',
    action: 'define-angle-before-generation',
    note: 'Promising WitchClick-native concept, but needs a defined editorial angle before generation.',
    slugs: [
      'everyday-magic',
      'gentle-attention',
      'inner-narrative',
      'personal-myth',
      'present-moment-journaling',
      'quiet-permission',
      'quiet-progress',
      'rest-and-survival',
      'slow-season',
      'smallest-acts',
      'soft-kind-of-courage',
      'tender-patience',
      'toxic-positivity',
    ],
  },
  {
    status: 'pop-culture-review',
    action: 'review-pop-culture-fit',
    note: 'Exact media/game mention with source context. Review whether this belongs as a standalone WitchClick article.',
    slugs: [
      'disney-dreamlight-valley',
      'europa-universalis-v',
      'honeycomb-the-world-beyond',
      'hyrule-warriors-age-of-imprisonment',
      'kirby-air-riders',
      'pacific-drive',
      'spongebob-squarepants-titans-of-the-tide',
    ],
  },
  {
    status: 'template-section-artifact',
    action: 'keep-as-pattern',
    note: 'Likely generated from repeated section/template language. Do not generate as standalone article unless intentionally reframed.',
    slugs: [
      'closing-gratitude',
      'deep-heart-ritual-variant',
      'low-spoon-option',
      'medical-care-plan',
      'quick-low-energy-variant',
      'safety-notes',
    ],
  },
  {
    status: 'possible-delete-merge-candidate',
    action: 'merge-or-delete-later',
    note: 'Likely overlaps with an existing canonical article. Review for merge, redirect, or deletion later.',
    slugs: [
      'ascendant',
      'cozy-cursing-ritual',
      'discovering-magic-in-the-mundane',
      'double-crown',
      'energy-return-ritual',
      'gentle-rituals',
      'interpretation-of-colour',
      'journal',
      'refinding-yourself',
      'secular-tarot',
      'sun-sign',
      'tarot-as-a-secular-tool-pattern-reading-for-everyday-decisions',
      'using-different-perspectives',
      'waiting-period',
    ],
  },
  {
    status: 'needs-human-decision',
    action: 'review-manually',
    note: 'Needs human editorial decision before generation, merge, or deletion.',
    slugs: [
      'ancestral-patterns',
      'clarity-rite',
      'clarity-tarot-spread',
      'collective-intelligence',
      'consent-to-continue',
      'depression',
      'divining-spread',
      'gentle-attention-practice',
      'gentle-belonging',
      'gentle-heart-check-in',
      'human-connection',
      'inner-permission',
      'introspection',
      'introspection-practice',
      'journaling',
      'meditation',
      'morning-light',
      'pauses',
      'pillow-and-blanket-altar',
      'projection',
      'quiet-corners',
      'quiet-magic',
      'reflection-journal-pages',
      'secular-tarot-practice',
      'soft-gravity',
      'soft-green-mug',
      'stray',
      'the-confluence',
      'the-emergent-narrative',
      'the-human-voice',
      'the-machine-voice',
      'unfinished-projects',
      'your-chart',
    ],
  },
  {
    status: 'support-reference-candidate',
    action: 'make-short-reference',
    note: 'Likely better as a short reference, glossary, grimoire support page, or hub support page than a full article.',
    slugs: [
      'astrology-as-neurodivergent-social-pattern-mapper',
      'azazel-archetype',
      'azazel-in-demonology',
      'azazel-sigil-drawing',
      'basic-scrying-techniques',
      'birth-chart',
      'brain-fog',
      'different-perspectives-practice',
      'elemental-or-planetary-patterns',
      'emotional-palette',
      'emotional-reflection',
      'gentle-self-care-practices',
      'grounding-practices',
      'grounding-techniques',
      'mental-health',
      'mindful-breathing',
      'moon-sign',
      'north-node',
      'noticing-small-details',
      'reflection-journal',
      'reflection-journal-page',
      'self-care',
      'self-compassion',
      'small-altars-of-colour',
      'social-overload',
      'spellcraft-substitutions',
      'tarot-spread-for-clarity',
      'three-card-tarot-spread',
      'tiny-gratitude-rituals',
      'waxing-moon',
    ],
  },
];

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    write: flags.has('--write'),
    dryRun: flags.has('--dry-run') || !flags.has('--write'),
    force: flags.has('--force'),
  };
}

function walkMarkdown(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdown(filePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(filePath);
    }
  }
  return files;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function isPostStub(data, body) {
  const tags = normalizeTags(data.tags).map((tag) => tag.toLowerCase());
  return tags.includes('stub') || tags.includes('placeholder') || String(body || '').includes(STUB_BODY_PHRASE);
}

function isMissing(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function readPost(file, cwd) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data || {};
  const slug = slugify(typeof data.slug === 'string' && data.slug.trim() ? data.slug : path.basename(file, '.md'));
  const body = typeof parsed.content === 'string' ? parsed.content : '';
  return {
    file,
    relativePath: path.relative(cwd, file).replace(/\\/g, '/'),
    data,
    body,
    slug,
    isStub: isPostStub(data, body),
  };
}

function buildAssignments() {
  const assignments = new Map();
  const duplicates = [];
  for (const group of TRIAGE_GROUPS) {
    if (!STATUS_VALUES.has(group.status)) throw new Error(`Invalid triage status: ${group.status}`);
    if (!ACTION_VALUES.has(group.action)) throw new Error(`Invalid suggested action: ${group.action}`);
    for (const rawSlug of group.slugs) {
      const slug = slugify(rawSlug);
      if (assignments.has(slug)) duplicates.push(slug);
      assignments.set(slug, {
        stubTriageStatus: group.status,
        stubSuggestedAction: group.action,
        stubTriageNotes: group.note,
      });
    }
  }
  if (duplicates.length) {
    throw new Error(`Duplicate triage assignments: ${Array.from(new Set(duplicates)).join(', ')}`);
  }
  return assignments;
}

function proposedChanges(post, assignment, force) {
  const next = {};
  const skipped = [];
  for (const [key, value] of Object.entries(assignment)) {
    if (force || isMissing(post.data[key])) {
      next[key] = value;
    } else {
      skipped.push(key);
    }
  }
  return { next, skipped };
}

async function writePostFrontmatter(post, additions) {
  const nextRaw = matter.stringify(post.body, { ...post.data, ...additions });
  await fsp.writeFile(post.file, nextRaw, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv);
  const cwd = process.cwd();
  const dirs = resolvePostsDirectories({ root: cwd });
  const posts = dirs.flatMap((dir) => walkMarkdown(dir).map((file) => readPost(file, cwd)));
  const stubs = posts.filter((post) => post.isStub);
  const stubBySlug = new Map(stubs.map((post) => [post.slug, post]));
  const assignments = buildAssignments();
  const changes = [];
  const unchanged = [];
  const skippedExisting = [];
  const unmatched = [];

  for (const [slug, assignment] of assignments) {
    const post = stubBySlug.get(slug);
    if (!post) {
      unmatched.push(slug);
      continue;
    }
    const { next, skipped } = proposedChanges(post, assignment, options.force);
    if (skipped.length) skippedExisting.push({ post, skipped });
    if (Object.keys(next).length === 0) {
      unchanged.push(post);
      continue;
    }
    changes.push({ post, assignment, next, skipped });
    if (options.write) await writePostFrontmatter(post, next);
  }

  const assignedCount = assignments.size;
  console.log(`Post stub triage backfill (${options.dryRun ? 'DRY RUN' : 'WRITE'})`);
  console.log(`Project: ${cwd}`);
  console.log(`Post directories: ${dirs.map((dir) => path.relative(cwd, dir).replace(/\\/g, '/')).join(', ') || '(none)'}`);
  console.log(`Detected post stubs: ${stubs.length}`);
  console.log(`Assigned slugs: ${assignedCount}`);
  console.log(`Files with proposed triage changes: ${changes.length}`);
  console.log(`Assigned stubs already unchanged: ${unchanged.length}`);
  console.log(`Assignments unmatched to post stubs: ${unmatched.length}`);
  console.log(`Existing non-empty triage fields ${options.force ? 'overwritten because --force was passed' : 'preserved'}: ${skippedExisting.length}`);
  console.log('');

  const statusCounts = new Map();
  for (const assignment of assignments.values()) {
    statusCounts.set(assignment.stubTriageStatus, (statusCounts.get(assignment.stubTriageStatus) || 0) + 1);
  }
  console.log('Assignments by status:');
  for (const status of STATUS_VALUES) {
    console.log(`- ${status}: ${statusCounts.get(status) || 0}`);
  }

  if (changes.length) {
    console.log('');
    console.log(options.write ? 'Applied changes:' : 'Proposed changes:');
    for (const { post, next, skipped } of changes) {
      const fields = Object.keys(next).join(', ');
      const skippedText = skipped.length ? `; preserved existing: ${skipped.join(', ')}` : '';
      console.log(`- ${post.slug}: set ${fields} (${post.relativePath})${skippedText}`);
    }
  }

  if (skippedExisting.length) {
    console.log('');
    console.log('Stubs with existing non-empty triage fields preserved:');
    for (const { post, skipped } of skippedExisting) {
      console.log(`- ${post.slug}: ${skipped.join(', ')}`);
    }
  }

  if (unmatched.length) {
    console.log('');
    console.log('Unmatched assigned slugs:');
    unmatched.forEach((slug) => console.log(`- ${slug}`));
  }

  const unassignedStubs = stubs.filter((post) => !assignments.has(post.slug));
  if (unassignedStubs.length) {
    console.log('');
    console.log('Detected post stubs without a triage assignment:');
    unassignedStubs.forEach((post) => console.log(`- ${post.slug} (${post.relativePath})`));
  }

  console.log('');
  if (options.dryRun) {
    console.log('Dry run only. Re-run with --write to update frontmatter.');
  } else {
    console.log('Write complete. Only frontmatter triage fields were updated.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
