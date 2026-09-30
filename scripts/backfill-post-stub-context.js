#!/usr/bin/env node
// Backfill conservative source/context metadata for existing post stubs.
// Dry-run by default. Use --write to persist frontmatter-only changes.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';

import { resolvePostsDirectories, slugify } from './lib/contentPaths.js';

const STUB_BODY_PHRASE = 'automatically created as a stub';
const DEFAULT_RATIONALE_WITH_SOURCE = 'Created as a missing article suggested by existing WitchClick content.';
const DEFAULT_RATIONALE_NO_SOURCE = 'Backfilled from existing stub metadata. No clear source post context was found.';
const MAX_SOURCE_CONTEXT = 3;
const MAX_EXCERPT_CHARS = 240;
const MAX_RELATED_THEMES = 8;
const MAX_RELATED_ENTITIES = 8;
const MAX_MATCHED_TERMS = 8;

const BROAD_TERMS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it', 'of',
  'on', 'or', 'the', 'this', 'to', 'with', 'without', 'you', 'your',
  'article', 'post', 'guide', 'practice', 'practices', 'ritual', 'rituals', 'spell', 'spells', 'spread',
  'spreads', 'tarot', 'reflection', 'energy', 'magic', 'magical', 'gentle', 'cozy', 'secular',
]);

const THEME_KEYWORDS = [
  ['clean cursing', /\b(clean[-\s]?cursing|clean curse|curse|cursing|refusal|accountability|energy return)\b/i],
  ['boundaries', /\b(boundary|boundaries|consent|refusal|accountability)\b/i],
  ['release', /\b(release|releasing|return|banish|banishment|closure|letting go)\b/i],
  ['reflection', /\b(reflect|reflection|journal|journaling|introspection|self-inquiry)\b/i],
  ['tarot', /\b(tarot|card pull|spread)\b/i],
  ['ritual', /\b(ritual|working|altar|spellwork|grounding|scrying)\b/i],
  ['grounding', /\b(ground|grounding|calm|regulat|breath|nervous system)\b/i],
  ['focus', /\b(focus|clarity|attention|decision|planning)\b/i],
  ['shadow work', /\b(shadow|projection|self-delusion|pattern)\b/i],
  ['astrology', /\b(astrology|astrological|chart|transit|sun sign|moon sign|ascendant|node)\b/i],
  ['creativity', /\b(creative|creativity|writing|project|worldbuilding|story)\b/i],
  ['rest', /\b(rest|burnout|low[-\s]?spoon|recovery|pause|survival)\b/i],
  ['self-trust', /\b(self[-\s]?trust|inner|permission|confidence|courage)\b/i],
  ['grief', /\b(grief|loss|heart|healing|forgiveness)\b/i],
  ['neurodivergence', /\b(neurodiverg|adhd|overwhelm|sensory)\b/i],
];

function isSafeExactPhrase(phrase) {
  const terms = importantTerms(phrase);
  if (terms.length >= 2) return true;
  return terms.length === 1 && terms[0].length >= 8;
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    write: flags.has('--write'),
    dryRun: flags.has('--dry-run') || !flags.has('--write'),
    force: flags.has('--force'),
    verbose: flags.has('--verbose'),
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

function normalizeEntities(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entity) => {
    if (typeof entity === 'string') return entity.trim();
    if (entity && typeof entity === 'object') {
      const type = typeof entity.type === 'string' ? entity.type.trim() : '';
      const slug = typeof entity.slug === 'string' ? slugify(entity.slug) : '';
      if (type && slug) return `${type}:${slug}`;
      if (slug) return slug;
    }
    return '';
  }).filter(Boolean);
}

function isMissing(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function isPostStub(data, body) {
  const tags = normalizeTags(data.tags).map((tag) => tag.toLowerCase());
  return tags.includes('stub') || tags.includes('placeholder') || String(body || '').includes(STUB_BODY_PHRASE);
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readPost(file, cwd) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data || {};
  const fileSlug = slugify(path.basename(file, '.md'));
  const slug = slugify(typeof data.slug === 'string' && data.slug.trim() ? data.slug : fileSlug);
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : titleFromSlug(slug);
  const body = typeof parsed.content === 'string' ? parsed.content : '';
  const relativePath = path.relative(cwd, file).replace(/\\/g, '/');
  return {
    file,
    relativePath,
    raw,
    data,
    body,
    slug,
    title,
    tags: normalizeTags(data.tags),
    entities: normalizeEntities(data.entities),
    category: typeof data.category === 'string' ? data.category.trim() : '',
    contentType: typeof data.contentType === 'string' ? data.contentType.trim() : '',
    isStub: isPostStub(data, body),
  };
}

function importantTerms(value) {
  const terms = String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !BROAD_TERMS.has(term));
  return Array.from(new Set(terms));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textForSearch(post) {
  return [
    post.title,
    post.slug,
    post.tags.join(' '),
    post.category,
    post.contentType,
    JSON.stringify(post.data.internalLinks || ''),
    JSON.stringify(post.data.internalLinkHints || ''),
    post.body,
  ].join('\n');
}

function hasDirectLink(source, stubSlug) {
  const raw = textForSearch(source);
  const slugPattern = escapeRegex(stubSlug);
  return new RegExp(`(?:/post/${slugPattern}(?:/|\\b)|slug["']?\\s*[:=]\\s*["']${slugPattern}["'])`, 'i').test(raw);
}

function findExcerpt(text, phrase) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  const needle = String(phrase || '').toLowerCase().trim();
  const index = needle ? lower.indexOf(needle) : -1;
  if (index === -1) return clean.slice(0, MAX_EXCERPT_CHARS).trim();
  const start = Math.max(0, index - 90);
  const end = Math.min(clean.length, index + needle.length + 130);
  const excerpt = clean.slice(start, end).trim();
  return `${start > 0 ? '...' : ''}${excerpt}${end < clean.length ? '...' : ''}`;
}

function inferThemes(...values) {
  const haystack = values.filter(Boolean).join(' ');
  const themes = [];
  for (const [theme, regex] of THEME_KEYWORDS) {
    if (regex.test(haystack)) themes.push(theme);
  }
  return themes;
}

function inferContentShape(stub) {
  const haystack = [stub.title, stub.slug, stub.tags.join(' ')].join(' ').toLowerCase();
  const result = {};

  if (/\b(clean[-\s]?cursing|clean curse|curse|cursing|refusal|accountability|energy[-\s]?return|boundary|boundaries)\b/.test(haystack)) {
    result.pillar = 'clean-cursing';
    result.category = 'ritual';
    result.contentType = /\b(spell|spellwork)\b/.test(haystack) ? 'spellwork' : 'ritual';
    return result;
  }

  if (/\b(tarot|spread|card pull)\b/.test(haystack)) {
    result.category = 'ritual';
    result.contentType = /\b(spread|card pull)\b/.test(haystack) ? 'tarotSpread' : 'reflection';
    return result;
  }

  if (/\b(ritual|working|grounding|altar|scrying)\b/.test(haystack)) {
    result.category = 'ritual';
    result.contentType = 'ritual';
    return result;
  }

  if (/\b(journal|journaling|reflection|introspection|self-inquiry|depression|motivation|overwhelm)\b/.test(haystack)) {
    result.category = 'ritual';
    result.contentType = 'reflection';
  }

  return result;
}

function confidenceRank(confidence) {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function findSourceMatches(stub, sourcesBySlug, nonStubPosts) {
  const matches = [];
  const titlePhrase = stub.title.toLowerCase();
  const slugPhrase = stub.slug.replace(/-/g, ' ').toLowerCase();
  const terms = importantTerms(`${stub.title} ${stub.slug}`);

  const parentSlug = typeof stub.data.stubParentSlug === 'string' ? slugify(stub.data.stubParentSlug) : '';
  if (parentSlug && sourcesBySlug.has(parentSlug)) {
    const source = sourcesBySlug.get(parentSlug);
    matches.push({
      source,
      confidence: 'high',
      reason: 'Existing stubParentSlug points to this source post.',
      matchedPhrase: parentSlug,
    });
  }

  for (const source of nonStubPosts) {
    if (source.slug === stub.slug) continue;
    const raw = textForSearch(source);
    const lower = raw.toLowerCase();
    let match = null;

    if (hasDirectLink(source, stub.slug)) {
      match = {
        confidence: 'high',
        reason: 'Source post links directly to this stub slug.',
        matchedPhrase: `/post/${stub.slug}`,
      };
    } else if (titlePhrase && isSafeExactPhrase(stub.title) && lower.includes(titlePhrase)) {
      match = {
        confidence: 'high',
        reason: 'Source post contains the exact stub title.',
        matchedPhrase: stub.title,
      };
    } else if (slugPhrase && slugPhrase !== titlePhrase && isSafeExactPhrase(slugPhrase) && lower.includes(slugPhrase)) {
      match = {
        confidence: 'high',
        reason: 'Source post contains the exact stub slug phrase.',
        matchedPhrase: slugPhrase,
      };
    } else if (terms.length >= 3) {
      const matchedTerms = terms.filter((term) => new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(raw));
      if (matchedTerms.length >= Math.min(4, terms.length)) {
        match = {
          confidence: 'medium',
          reason: 'Source post strongly overlaps with important terms from the stub title.',
          matchedPhrase: matchedTerms.join(', '),
        };
      }
    }

    if (!match) continue;
    const existing = matches.find((item) => item.source.slug === source.slug);
    if (existing) {
      if (confidenceRank(match.confidence) > confidenceRank(existing.confidence)) {
        existing.confidence = match.confidence;
        existing.reason = match.reason;
        existing.matchedPhrase = match.matchedPhrase;
      }
    } else {
      matches.push({ source, ...match });
    }
  }

  matches.sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.source.title.localeCompare(b.source.title));
  return matches.slice(0, MAX_SOURCE_CONTEXT);
}

function sourceContextRecord(match) {
  return {
    slug: match.source.slug,
    title: match.source.title,
    sourcePath: match.source.relativePath,
    reason: match.reason,
    matchedPhrase: match.matchedPhrase,
    excerpt: findExcerpt(textForSearch(match.source), match.matchedPhrase),
  };
}

function uniqueStrings(values, limit = Infinity) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const item = String(value || '').trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function buildProposedFields(stub, matches) {
  const sourceContext = matches.map(sourceContextRecord);
  const generatedFrom = sourceContext.map(({ slug, title, reason, matchedPhrase, excerpt }) => ({
    slug,
    title,
    reason,
    matchedPhrase,
    excerpt,
  }));

  const shape = inferContentShape(stub);
  const matchedTerms = uniqueStrings([
    ...sourceContext.flatMap((source) => String(source.matchedPhrase || '').split(',')),
    ...importantTerms(`${stub.title} ${stub.slug}`).slice(0, 5),
  ], MAX_MATCHED_TERMS);
  const relatedThemes = uniqueStrings([
    ...inferThemes(stub.title, stub.slug, stub.tags.join(' ')),
    ...matches.flatMap((match) => inferThemes(match.source.title, match.source.slug, match.source.tags.join(' '), match.source.body.slice(0, 2000))),
    ...matches.flatMap((match) => match.source.tags).filter((tag) => !['stub', 'placeholder'].includes(String(tag).toLowerCase())),
  ], MAX_RELATED_THEMES);
  const relatedEntities = uniqueStrings([
    ...stub.entities,
    ...matches.flatMap((match) => match.source.entities),
  ], MAX_RELATED_ENTITIES);

  const fields = {
    stubRationale: matches.length ? DEFAULT_RATIONALE_WITH_SOURCE : DEFAULT_RATIONALE_NO_SOURCE,
  };

  if (matches.length) {
    fields.generatedFrom = generatedFrom;
    fields.sourceContext = sourceContext;
  }
  if (relatedThemes.length) fields.relatedThemes = relatedThemes;
  if (relatedEntities.length) fields.relatedEntities = relatedEntities;
  if (matchedTerms.length) fields.matchedTerms = matchedTerms;
  if (shape.pillar) fields.pillar = shape.pillar;
  if (shape.category) fields.category = shape.category;
  if (shape.contentType) fields.contentType = shape.contentType;

  return fields;
}

function applyMissingFields(existing, proposed, force) {
  const additions = {};
  const skipped = [];
  for (const [key, value] of Object.entries(proposed)) {
    if (isMissing(value)) continue;
    if (force || isMissing(existing[key])) {
      additions[key] = value;
    } else {
      skipped.push(key);
    }
  }
  return { additions, skipped };
}

function summarizeChange(stub, additions, matches, skipped) {
  const fields = Object.keys(additions);
  const sourceList = matches.map((match) => `${match.source.slug} (${match.confidence})`).join(', ') || 'none';
  const skippedText = skipped.length ? `; preserved existing: ${skipped.join(', ')}` : '';
  return `- ${stub.slug}: add ${fields.join(', ')}; sources: ${sourceList}${skippedText}`;
}

async function writePostFrontmatter(post, additions) {
  const nextData = { ...post.data, ...additions };
  const nextRaw = matter.stringify(post.body, nextData);
  await fsp.writeFile(post.file, nextRaw, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv);
  const cwd = process.cwd();
  const dirs = resolvePostsDirectories({ root: cwd });
  const posts = dirs.flatMap((dir) => walkMarkdown(dir).map((file) => readPost(file, cwd)));
  const stubs = posts.filter((post) => post.isStub);
  const nonStubPosts = posts.filter((post) => !post.isStub);
  const sourcesBySlug = new Map(nonStubPosts.map((post) => [post.slug, post]));
  const changes = [];
  const unchanged = [];

  for (const stub of stubs) {
    const matches = findSourceMatches(stub, sourcesBySlug, nonStubPosts);
    const proposed = buildProposedFields(stub, matches);
    const { additions, skipped } = applyMissingFields(stub.data, proposed, options.force);
    if (Object.keys(additions).length === 0) {
      unchanged.push({ stub, matches, skipped });
      continue;
    }
    changes.push({ stub, matches, additions, skipped });
  }

  console.log(`Post stub context backfill (${options.write ? 'WRITE' : 'DRY RUN'})`);
  console.log(`Project: ${cwd}`);
  console.log(`Post directories: ${dirs.map((dir) => path.relative(cwd, dir)).join(', ')}`);
  console.log(`Detected post stubs: ${stubs.length}`);
  console.log(`Non-stub source posts searched: ${nonStubPosts.length}`);
  console.log(`Stubs with proposed metadata changes: ${changes.length}`);
  console.log(`Stubs unchanged: ${unchanged.length}`);
  console.log(`Existing fields are ${options.force ? 'overwritten when proposed values exist (--force enabled)' : 'preserved unless missing'}.`);
  console.log('');

  if (changes.length) {
    console.log('Proposed changes:');
    for (const change of changes) {
      console.log(summarizeChange(change.stub, change.additions, change.matches, change.skipped));
      if (options.verbose) {
        for (const match of change.matches) {
          console.log(`  source: ${match.source.slug} | ${match.confidence} | ${match.reason} | ${match.matchedPhrase}`);
        }
      }
    }
  } else {
    console.log('No changes proposed.');
  }

  const notEnriched = changes
    .filter((change) => !change.matches.length)
    .map((change) => change.stub.slug);
  if (notEnriched.length) {
    console.log('');
    console.log(`Stubs receiving fallback rationale only/no source context: ${notEnriched.length}`);
    console.log(notEnriched.map((slug) => `- ${slug}`).join('\n'));
  }

  if (!options.write) {
    console.log('');
    console.log('Dry run only. Re-run with --write to update frontmatter.');
    return;
  }

  for (const change of changes) {
    await writePostFrontmatter(change.stub, change.additions);
  }
  console.log('');
  console.log(`Wrote metadata updates to ${changes.length} post stub${changes.length === 1 ? '' : 's'}.`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
