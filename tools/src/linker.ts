// tools/src/linker.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { listPostFiles, writeFileEnsure } from './utils';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const MAX_LINKS = 7;

// Common fluff we don't want as anchors
const STOPWORDS = new Set([
  'guide','ritual','spread','simple','gentle','cozy','basic','easy','steps',
  'how','what','when','where','why','and','with','for','from','into','your',
  'the','a','an','of','to','in','on','day','night','week','month','year'
]);

export function linkerCmd() {
  const files = listPostFiles();
  const posts = files.map(f => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const { data, content } = matter(raw);
    return {
      file: f,
      slug: f.replace(/\.md$/,''),
      title: String(data.title || ''),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      outline: Array.isArray(data.outline) ? data.outline.map(String) : [],
      content: String(content || ''),
      data
    };
  });

  // Precompute candidate anchors for every target post
  const candidateMap = new Map<string, string[]>();
  for (const p of posts) {
    candidateMap.set(p.slug, buildCandidates(p.title, p.tags, p.outline));
  }

  let linkedCount = 0;

  for (const src of posts) {
    const others = posts.filter(o => o.slug !== src.slug);
    const usedAnchors = new Set<string>();
    const links: Array<{ slug: string; anchor: string }> = [];

    const sourceProse = stripCodeBlocks(src.content);

    for (const tgt of others) {
      if (links.length >= MAX_LINKS) break;

      const candidates = candidateMap.get(tgt.slug) || [];
      const anchor = firstAnchorMatch(sourceProse, candidates, usedAnchors);
      if (!anchor) continue;

      links.push({ slug: tgt.slug, anchor });
      usedAnchors.add(anchor.toLowerCase());
    }

    // Write updated frontmatter only if changed
    const filePath = path.join(POSTS_DIR, src.file);
    const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
    const prev = JSON.stringify(data.internalLinks || []);
    const next = JSON.stringify(links);
    if (prev !== next) {
      data.internalLinks = links;
      const yaml = matter.stringify(content, data);
      writeFileEnsure(filePath, yaml);
      linkedCount++;
    }
  }

  process.stdout.write(`Linked ${linkedCount}/${posts.length} posts.\n`);
}

/* ---------- helpers ---------- */

/** Build ordered candidate anchor phrases from title, tags, and outline headings */
function buildCandidates(title: string, tags: string[], outline: string[]): string[] {
  const set = new Set<string>();

  // 1) Tags first (often concise, high-intent)
  for (const t of tags) addCandidate(set, t);

  // 2) Title: bigrams/trigrams over meaningful words
  const titleTokens = tokenWords(title);
  for (const n of [3, 2]) {
    for (let i = 0; i + n <= titleTokens.length; i++) {
      addCandidate(set, titleTokens.slice(i, i + n).join(' '));
    }
  }
  // fallback single strong words from title
  for (const w of titleTokens) addCandidate(set, w);

  // 3) Outline headings: take first clause before punctuation, then n-grams
  for (const h of outline) {
    const base = String(h).split(/[:\-–—\(\[]/)[0]; // first clause
    const toks = tokenWords(base);
    for (const n of [3, 2]) {
      for (let i = 0; i + n <= toks.length; i++) {
        addCandidate(set, toks.slice(i, i + n).join(' '));
      }
    }
    for (const w of toks) addCandidate(set, w);
  }

  // Order by: longer phrases first, then alphabetically stable
  const ordered = Array.from(set)
    .filter(s => s.length >= 4 && s.length <= 40) // reasonable display length
    .sort((a, b) => (b.split(' ').length - a.split(' ').length) || a.localeCompare(b));

  return ordered.slice(0, 50); // cap to keep scanning quick
}

function addCandidate(set: Set<string>, phrase: string) {
  const p = normalizePhrase(phrase);
  if (!p) return;
  if (p.split(' ').every(w => STOPWORDS.has(w))) return; // all stopwords? skip
  set.add(p);
}

function normalizePhrase(s: string) {
  const cleaned = String(s).toLowerCase()
    .replace(/[`"'’]+/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  // drop anchors that start or end with stopwords (weak)
  const parts = cleaned.split(' ');
  while (parts.length && STOPWORDS.has(parts[0])) parts.shift();
  while (parts.length && STOPWORDS.has(parts[parts.length - 1])) parts.pop();
  return parts.join(' ').trim();
}

function tokenWords(s: string): string[] {
  return normalizePhrase(s)
    .split(' ')
    .filter(w => w && !STOPWORDS.has(w));
}

/** Pick the first candidate that appears as a whole phrase in the source prose */
function firstAnchorMatch(sourceProse: string, candidates: string[], used: Set<string>) {
  for (const c of candidates) {
    if (used.has(c.toLowerCase())) continue;
    // whole-word / hyphen-aware boundaries
    const re = new RegExp(`(^|[^a-z0-9-])(${escapeRegex(c)})(?=[^a-z0-9-]|$)`, 'i');
    if (re.test(sourceProse)) return c;
  }
  return '';
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove fenced code blocks and inline code to avoid false anchor matches inside code */
function stripCodeBlocks(md: string) {
  // remove fenced code blocks ``` ```
  let out = md.replace(/```[\s\S]*?```/g, '');
  // remove inline code `code`
  out = out.replace(/`[^`]*`/g, '');
  return out;
}
