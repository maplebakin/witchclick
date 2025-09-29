// dev-api.js (ESM)
// Minimal local API for WitchClick admin with safe YAML quoting.
// Endpoints:
//   POST /ping
//   POST /genprompt    {topic, words, ads:'on'|'off', kofi:'on'|'off'}
//   POST /ingest       (PostSpec v2 JSON)
//   POST /bundle       (runs linker -> go:build)
//   POST /entities/list
//   POST /entities/get {type, slug}
//   POST /entities/save {type, slug, name, summary, properties, related[]}
//   POST /posts/save   {title, slug?, excerpt, metaDescription, tags, includeAds, includeKofi, entities, markdown}

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import generatorPresets from './server/lib/generatorPresets.js';
import generatorStyles from './server/lib/generatorStyles.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const CWD = process.cwd();

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(body);
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; });
    req.on('end', () => {
      if (!buf.trim()) return resolve(null);

      // Helper: remove backslashes before []{} only when OUTSIDE strings
      function deBackslashOutsideStrings(s) {
        let out = '', inStr = false, esc = false;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inStr) {
            out += ch;
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === '"') { inStr = false; }
          } else {
            if (ch === '"') {
              inStr = true; out += ch;
            } else if (ch === '\\') {
              const next = s[i + 1];
              if (next === '[' || next === ']' || next === '{' || next === '}') {
                // drop this backslash (it shouldn't be here at top level)
                continue;
              }
              out += ch;
            } else {
              out += ch;
            }
          }
        }
        return out;
      }

      // Existing cleanups: BOM + trailing commas (keep these)
      const base = buf.replace(/^\uFEFF/, '').replace(/,\s*([}\]])/g, '$1');

      // Strategy 1: normal parse
      try { return resolve(JSON.parse(base)); } catch {}

      // Strategy 2: fix stray backslashes outside strings (e.g. "tags":\[)
      const fixed = deBackslashOutsideStrings(base);
      try { return resolve(JSON.parse(fixed)); } catch {}

      // Strategy 3: double-encoded body (JSON string containing JSON)
      try {
        const maybe = JSON.parse(base);
        if (typeof maybe === 'string') {
          return resolve(JSON.parse(maybe));
        }
      } catch {}

      // Last resort: show a concise preview to help debug
      return reject(new Error('Invalid JSON after cleanup. Starts with: ' + base.slice(0, 120)));
    });
  });
}


// ---------- YAML-ish helpers ----------
const yq = (v) => JSON.stringify(String(v ?? '').replace(/\r\n?/g, '\n')); // JSON string literal (YAML 1.2-valid)
const ya = (arr) =>
  '[' + (Array.isArray(arr) ? arr : []).map((s) => JSON.stringify(String(s))).join(', ') + ']';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ---------- GENPROMPT (updated to enforce Opening Reflection) ----------
function buildGenprompt({ topic, words, ads, kofi }) {
  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { brandName: 'WitchClick', siteUrl: 'https://example.com' };
  const products = readJSON(path.join(CWD, 'content', 'products.json')) || { products: [] };
  const allowed = Array.isArray(products.products) ? products.products.map((p) => p.key) : [];
  const postsDir = path.join(CWD, 'content', 'posts');
  const existingTitles = fs.existsSync(postsDir)
    ? fs.readdirSync(postsDir).filter(f=>f.endsWith('.md')).map(f=>{
        const m = fs.readFileSync(path.join(postsDir,f),'utf8').match(/^title:\s*(.+)$/m);
        return m ? m[1].trim().replace(/^"(.*)"$/,'$1') : '';
      }).filter(Boolean)
    : [];

  const lines = [
    'WITCHCLICK PASSIVE-INCOME POST GENERATOR — MASTER PROMPT',
    '(Role, rules, inputs, and exact JSON contract. Paste this whole thing into a fresh chat, then edit the INPUTS block.)',
    '',
    `—you are my Head of Content Ops, SEO, and Affiliate Strategy for a metaphysical blog called “${settings.brandName}.” Your job is to produce a single, production-ready article spec that maximizes search intent coverage, internal linking potential, and affiliate conversion while staying gentle, ethical, and cozy.`,
    '',
    'AUDIENCE & VOICE',
    '• Audience: spiritual, planner-loving, neurodivergent, cottagecore; cozy gamers and creatives welcome.',
    '• Voice: write like a gentle, imperfect guide — a friend sharing what helped them, not a guru giving decrees.',
    '• Tone rules:',
    '  - Practical, kind, and honest; admit uncertainty; invite adaptation.',
    '  - Use playful metaphors from games, cozy rituals, and everyday life.',
    '  - Avoid absolutes or predictions; empower reader choice.',
    '• Reading level: Grade 6–8 (simple sentences; concrete verbs; short paragraphs).',
    '',
    'SECULAR TAROT CLAUSE',
    '• When writing about tarot: treat it as a tool for reflection and creativity, not prediction.',
    '• Present cards as prompts/archetypes/characters. If traditional meanings appear, pair with open-ended interpretations.',
    '• Avoid implying divine insight or supernatural accuracy; focus on noticing feelings, options, and narratives.',
    '',
    'NON-NEGOTIABLES',
    '• Markdown-only (no raw HTML).',
    '• Accessibility-first: short paragraphs, scannable lists; include a checklist box.',
    '• Avoid medical/health claims; add a gentle safety note if content could be misconstrued as medical/therapeutic or if fire/sharp objects are involved.',
    '• Use inclusive language; no gendered assumptions; no gatekeeping.',
    '• REQUIRED: The first outline item AND the first section MUST be **Opening Reflection** with id **opening-reflection** (1–2 short paragraphs).',
    '',
    'STRUCTURE (must-follow)',
    '1) Opening Reflection (first section): 1–2 short paragraphs setting a relatable, human scene.',
    '2) Main Ritual/Spread: provide TWO variants:',
    '   - Quick / Low-Energy (≈5 minutes) for readers with limited spoons.',
    '   - Deep Dive version for when they have time/energy.',
    '   Write steps like a recipe or quest log (numbered).',
    '3) Reflection Prompt: end with a single open-ended journaling question.',
    '4) Checklist / Summary Box: explicit bullet list for skimmers.',
    '5) Safety Note (if relevant): brief, gentle, non-alarmist.',
    '',
    'RETURN FORMAT',
    '• Return JSON ONLY. No backticks, no commentary. Valid JSON, double-quoted keys/strings.',
    '• Must match PostSpec v2 exactly.',
    '',
    'SCHEMA (PostSpec v2)',
    '{',
    '  "specVersion": 2,',
    '  "title": string,',
    '  "slug": string,',
    '  "metaDescription": string,',
    '  "tags": string[],',
    '  "excerpt": string,',
    '  "outline": { "heading": string, "id": string }[],',
    '  "sections": { "heading": string, "markdown": string }[],',
    '  "entities": { "type": "crystal"|"herb"|"moonPhase"|"tarot"|"planetaryDay"|"ritual", "slug": string }[],',
    '  "heroImagePrompt": string | null,',
    '  "altTexts": string[],',
    '  "internalLinkHints": { "anchor": string, "rationale": string }[],',
    '  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],',
    '  "cta": { "type": "kofi"|"download"|"none", "id"?: string },',
    '  "adPlacements": ["lead"|"mid"|"end"]',
    '}',
    '',
    'INPUTS',
    `brandName: "${settings.brandName}"`,
    `siteUrl: "${settings.siteUrl}"`,
    `topic: "${topic}"`,
    `wordCount: ${words}`,
    `includeAds: "${ads}"`,
    `includeKofi: "${kofi}"`,
    `existingPostTitles: ${JSON.stringify(existingTitles)}`,
    `allowedAffiliateKeys: ${JSON.stringify(allowed)}`,
    '',
    'PROCESS & CONSTRAINTS (follow step-by-step)',
    '1) Search intent & slug',
    '   • Infer primary intent + 2 secondary intents from the topic.',
    '   • Draft a slug in kebab-case reflecting the primary intent; avoid collisions with existingPostTitles.',
    '2) Title & meta',
    '   • Title 50–60 chars with primary keyword. Meta 150–160 chars; cozy, non-clickbait.',
    '3) Tags & excerpt',
    '   • 4–7 tags. Excerpt 1–2 sentences that entice the click without hype.',
    '4) Outline',
    '   • H2/H3 flow MUST include, in this order:',
    '     - Opening Reflection (id: opening-reflection) → Steps (Quick & Deep) → Variations/Accessibility → Safety/Ethics → Wrap-up with Reflection Prompt.',
    '   • The FIRST outline item must be exactly {"heading":"Opening Reflection","id":"opening-reflection"}.',
    '   • Include exactly one short checklist section.',
    '5) Sections',
    `   • Write ~${words} words total. Short paragraphs, sparse bulleted lists. One gentle disclaimer if advice could be misconstrued as medical/therapeutic.`,
    '   • Steps must be numbered and include Quick vs Deep variants.',
    '   • The FIRST section object must have "heading":"Opening Reflection".',
    '6) Alt texts & optional image',
    '   • If images are referenced in markdown, provide equal-or-greater altTexts; else []. Set heroImagePrompt to a descriptive scene OR null.',
    '7) Internal links (hints)',
    '   • Provide 5–8 internalLinkHints as anchor phrases used verbatim in the prose; include a brief rationale.',
    '8) Affiliate strategy (hints only; do not insert links)',
    '   • ≤ 1 per ~250 words; "key" MUST be one of allowedAffiliateKeys.',
    '9) CTA & ads',
    '   • If includeKofi="on", set cta.type="kofi". If download, set cta with id. If includeAds="on", choose from ["lead","mid","end"]; else [].',
    '10) Quality gate',
    '   • Title 50–60; Meta 150–160; 4–7 tags; Grade 6–8 readability; no raw HTML;',
    '   • Anchors appear verbatim in markdown; altTexts if images appear;',
    '   • Opening Reflection is first in outline (id opening-reflection) AND first in sections; Quick/Deep; Reflection Prompt; Checklist present.',
    '',
    'RETURN INSTRUCTIONS',
    '• Return a single, valid JSON object matching PostSpec v2 exactly, with all fields populated per the schema.',
    '• Do not include any explanations, headings, or code fences—JSON only.',
    '',
    'STRICT JSON OUTPUT RULES (do all of these):',
    '• Output a single JSON object. No markdown fences. No preface/suffix text.',
    '• Use straight quotes ("). Never use “smart quotes”.',
    '•Inside all markdown strings, avoid unescaped double quotes; prefer single quotes or escape like \" within JSON strings.',
    '• Do not escape brackets/braces unless inside strings: never emit \\[ or \\{ in the top-level structure.',
    '• No trailing commas. No comments. No undefined. Use [] for empty arrays and "" for empty strings. heroImagePrompt may be null.',
    '• Start your response with "{" and end with "}".',
    '• Self-check before sending: imagine running JSON.parse on your answer. If it would fail, correct and re-emit the entire object.',
    '',
    'GOLDEN JSON EXAMPLE (minimally valid shape — copy the structure, not the content):',
    '{"specVersion":2,"title":"t","slug":"t","metaDescription":"t","tags":["a","b","c","d"],"excerpt":"t","outline":[{"heading":"Opening Reflection","id":"opening-reflection"}],"sections":[{"heading":"Opening Reflection","markdown":"M"}],"entities":[],"heroImagePrompt":null,"altTexts":[],"internalLinkHints":[{"anchor":"a","rationale":"r"}],"affiliateHints":[{"key":"journal","anchor":"a","rationale":"r"}],"cta":{"type":"none"},"adPlacements":[]}'
  ];
  lines.push('');
  lines.push('Note: If the model returns relaxed keys (e.g., description, sections[].content), the server will normalize them to PostSpec v2 by default (strict=false). Set strict=true to require exact PostSpec v2.');
  return lines.join('\n');
}

function buildPresetPrompt({ preset, topic, strict, styleDirective }) {
  const lines = [`SYSTEM ROLE: ${preset.system}`];

  if (styleDirective) {
    lines.push(`STYLE DIRECTIVE: ${styleDirective}`);
  }

  lines.push(`Goal: ${preset.goal}`, '', `Topic: ${topic}`, '');

  if (strict) {
    lines.push('STRICT JSON CONTRACT:');
    lines.push(preset.strictOutputContract.join('\n'));
  } else {
    lines.push('LOOSE JSON CONTRACT:');
    lines.push(preset.looseOutputContract.join('\n'));
  }

  return lines.join('\n');
}

// ---------- POSTS ----------
function wordCount(md) {
  return String(md||'')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\*_#>~\-]+/g, ' ')
    .trim()
    .split(/\s+/).filter(Boolean).length;
}

async function savePostFromWrite(payload) {
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('title is required');
  const desiredSlug = payload.slug ? slugify(payload.slug) : slugify(title);
  if (!desiredSlug) throw new Error('slug could not be derived');

  const postsDir = path.join(CWD, 'content', 'posts');
  ensureDir(postsDir);

  let slug = desiredSlug;
  let i = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) slug = `${desiredSlug}-${i++}`;

  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { siteUrl: 'https://example.com' };
  const site = String(settings.siteUrl || 'https://example.com').replace(/\/$/, '');
  const canonical = `${site}/post/${slug}`;

  const tags = Array.isArray(payload.tags)
    ? payload.tags.map(String)
    : String(payload.tags||'')
        .split(',')
        .map(s=>s.trim())
        .filter(Boolean);

  const includeAds = !!payload.includeAds;
  const includeKofi = !!payload.includeKofi;
  const excerpt = String(payload.excerpt||'').trim();
  const metaDescription = String(payload.metaDescription || excerpt).trim();
  const markdown = String(payload.markdown||'').trim();

  const readingMinutes = Math.max(1, Math.round(wordCount(markdown)/200));

  const fm = [
    '---',
    `title: ${yq(title)}`,
    `slug: ${slug}`,
    `description: ${yq(excerpt)}`,
    `metaTitle: ${yq(title)}`,
    `metaDescription: ${yq(metaDescription)}`,
    `tags: ${ya(tags)}`,
    `readingMinutes: ${readingMinutes}`,
    `includeAds: ${includeAds ? 'true' : 'false'}`,
    `includeKofi: ${includeKofi ? 'true' : 'false'}`,
    `affiliateAnchors: []`,
    `internalLinks: []`,
    `publishedAt: ${yq(new Date().toISOString())}`,
    `canonicalUrl: ${yq(canonical)}`,
    'specVersion: 2',
    '---'
  ].join('\n');

  const filePath = path.join(postsDir, `${slug}.md`);
  await fsp.writeFile(filePath, fm + '\n' + markdown + '\n', 'utf8');

  return { slug, path: `content/posts/${slug}.md` };
}

// ---------- INGEST (PostSpec v2) ----------
function pickFirstString(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function normalizeEOL(s) {
  if (s == null) return '';
  return String(s).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function startsWithHeading(markdown, heading) {
  if (!heading) return false;
  const normalizedHeading = String(heading).trim();
  if (!normalizedHeading) return false;
  const lines = normalizeEOL(markdown).split('\n');
  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const line = rawLine.trim();
    const match = line.match(/^#{1,6}\s*(.*?)\s*$/);
    if (!match) return false;
    let text = match[1];
    text = text.replace(/\s+#+\s*$/, '').trim();
    return text.toLowerCase() === normalizedHeading.toLowerCase();
  }
  return false;
}

function normalizeCta(rawCta, report) {
  const CTA_TYPES = new Set(['kofi', 'download', 'none']);
  if (typeof rawCta === 'string') {
    const lower = rawCta.trim().toLowerCase();
    if (!CTA_TYPES.has(lower)) {
      report.push('CTA type defaulted to none.');
      return { type: 'none' };
    }
    if (lower === 'download') {
      return { type: 'download' };
    }
    return { type: lower };
  }

  if (rawCta && typeof rawCta === 'object') {
    const type = pickFirstString(rawCta.type).toLowerCase();
    const id = pickFirstString(rawCta.id);
    if (!CTA_TYPES.has(type)) {
      report.push('CTA type defaulted to none.');
      return { type: 'none' };
    }
    if (type === 'download') {
      return id ? { type, id } : { type, id: '' };
    }
    return { type };
  }

  return { type: 'none' };
}

function normalizeAdPlacements(raw, report) {
  const VALID = new Set(['lead', 'mid', 'end']);
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const slot = pickFirstString(item).toLowerCase();
    if (!slot) continue;
    if (!VALID.has(slot)) {
      report.push(`Dropped invalid ad placement "${slot}".`);
      continue;
    }
    if (seen.has(slot)) continue;
    seen.add(slot);
    out.push(slot);
  }
  return out;
}

function normalizeLooseSpec(rawSpec) {
  const report = [];
  const input = rawSpec && typeof rawSpec === 'object' ? rawSpec : {};
  const spec = {
    specVersion: 2,
    title: '',
    slug: '',
    metaDescription: '',
    tags: [],
    excerpt: '',
    outline: [],
    sections: [],
    entities: [],
    heroImagePrompt: null,
    altTexts: [],
    internalLinkHints: [],
    affiliateHints: [],
    cta: { type: 'none' },
    adPlacements: []
  };

  const title = pickFirstString(input.title, input.name, input.headline);
  if (!title) throw new Error('Title required');
  spec.title = title;

  if (input.specVersion && Number(input.specVersion) !== 2) {
    report.push('specVersion forced to 2.');
  }

  const initialSlug = pickFirstString(input.slug, input.title, input.name, input.headline);
  spec.slug = slugify(initialSlug || spec.title);

  const excerpt = pickFirstString(input.excerpt, input.summary, input.description);
  spec.excerpt = excerpt;

  const metaDescription = pickFirstString(input.metaDescription, input.meta, input.description, input.summary, spec.excerpt);
  spec.metaDescription = metaDescription || spec.excerpt;

  const tags = Array.isArray(input.tags)
    ? input.tags
    : typeof input.tags === 'string'
      ? input.tags.split(',')
      : [];
  spec.tags = tags.map(t => pickFirstString(t)).filter(Boolean);

  const sections = Array.isArray(input.sections) ? input.sections : [];
  const normalizedSections = [];
  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    const heading = pickFirstString(section.heading, section.title, section.name);
    const rawMarkdown = section.markdown ?? section.content ?? section.body ?? '';
    const markdown = typeof rawMarkdown === 'string' ? String(rawMarkdown) : '';
    if (!heading && !markdown.trim()) continue;
    normalizedSections.push({
      heading,
      markdown
    });
  }
  spec.sections = normalizedSections;

  let outline = Array.isArray(input.outline) ? input.outline : [];
  const normalizedOutline = outline
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const heading = pickFirstString(item.heading, item.title, item.name);
      if (!heading) return null;
      let id = pickFirstString(item.id, item.slug);
      if (!id) id = slugify(heading);
      return { heading, id };
    })
    .filter(Boolean);
  if (!normalizedOutline.length && normalizedSections.length) {
    const derived = normalizedSections
      .map(sec => {
        const heading = pickFirstString(sec.heading);
        if (!heading) return null;
        return { heading, id: slugify(heading) };
      })
      .filter(Boolean);
    if (derived.length) {
      report.push('Derived outline from sections.');
      spec.outline = derived;
    } else {
      spec.outline = [];
    }
  } else {
    spec.outline = normalizedOutline;
  }

  const entities = Array.isArray(input.entities) ? input.entities : [];
  const normalizedEntities = [];
  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') continue;
    const type = pickFirstString(entity.type);
    const slug = slugify(pickFirstString(entity.slug, entity.name));
    if (!type || !slug) {
      report.push('Dropped invalid entity entry.');
      continue;
    }
    normalizedEntities.push({ type, slug });
  }
  spec.entities = normalizedEntities;

  const heroCandidate = input.heroImagePrompt ?? input.heroPrompt ?? input.heroImage;
  const hero = pickFirstString(heroCandidate);
  spec.heroImagePrompt = hero || null;

  const altTexts = Array.isArray(input.altTexts) ? input.altTexts : [];
  spec.altTexts = altTexts.map(t => pickFirstString(t)).filter(Boolean);

  const internalLinkHints = Array.isArray(input.internalLinkHints) ? input.internalLinkHints : [];
  spec.internalLinkHints = internalLinkHints
    .map(link => {
      if (!link || typeof link !== 'object') return null;
      const anchor = pickFirstString(link.anchor, link.text);
      if (!anchor) return null;
      const rationale = pickFirstString(link.rationale, link.reason, link.notes);
      return { anchor, rationale };
    })
    .filter(Boolean);

  const affiliateHints = Array.isArray(input.affiliateHints) ? input.affiliateHints : [];
  spec.affiliateHints = affiliateHints
    .map(hint => {
      if (!hint || typeof hint !== 'object') return null;
      const key = pickFirstString(hint.key);
      const anchor = pickFirstString(hint.anchor, hint.text);
      if (!key || !anchor) return null;
      const rationale = pickFirstString(hint.rationale, hint.reason);
      return { key, anchor, rationale };
    })
    .filter(Boolean);

  spec.cta = normalizeCta(input.cta, report);
  spec.adPlacements = normalizeAdPlacements(input.adPlacements, report);

  return { spec, report };
}

function buildMarkdownFromSpec(spec) {
  const sections = Array.isArray(spec && spec.sections) ? spec.sections : [];
  const chunks = [];

  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    const heading = section.heading ? String(section.heading).trim() : '';
    const normalizedMarkdown = normalizeEOL(section.markdown);
    const cleanedMarkdown = normalizedMarkdown
      ? normalizedMarkdown.replace(/[ \t]+$/gm, '')
      : '';
    const body = cleanedMarkdown
      ? cleanedMarkdown.replace(/^\n+/, '').replace(/\n+$/, '')
      : '';
    const hasBody = !!body;

    if (!heading && !hasBody) continue;

    const parts = [];
    if (heading) {
      if (!startsWithHeading(cleanedMarkdown, heading)) {
        parts.push(`## ${heading}`);
        if (hasBody) parts.push('');
      }
    }

    if (hasBody) parts.push(body);

    const chunk = parts.join('\n');
    if (chunk) chunks.push(chunk);
  }

  const doc = chunks.join('\n\n');
  if (!doc) return '';
  return doc.endsWith('\n') ? doc : `${doc}\n`;
}

function prepareNormalizedSpec(rawSpec) {
  const { spec, report } = normalizeLooseSpec(rawSpec);

  const desiredSlug = spec.slug || slugify(spec.title);
  const normalizedSlug = slugify(desiredSlug || spec.title);
  if (normalizedSlug && normalizedSlug !== spec.slug) {
    report.push(`Slug normalized to ${normalizedSlug}.`);
  }
  let slug = normalizedSlug || slugify(spec.title);
  if (!slug) throw new Error('Title required');

  const postsDir = path.join(CWD, 'content', 'posts');
  let uniqueSlug = slug;
  let idx = 2;
  while (fs.existsSync(path.join(postsDir, `${uniqueSlug}.md`))) {
    uniqueSlug = `${slug}-${idx++}`;
  }
  if (uniqueSlug !== slug) {
    report.push(`Slug collision resolved as ${uniqueSlug}.`);
  }
  spec.slug = uniqueSlug;

  const outlineHeadings = spec.outline.map(o => o.heading);
  if (!outlineHeadings.length) {
    const fallbackOutline = spec.sections
      .map(sec => pickFirstString(sec.heading))
      .filter(Boolean);
    spec.outline = fallbackOutline.map(h => ({ heading: h, id: slugify(h) }));
  }

  const markdownBody = buildMarkdownFromSpec(spec);
  const words = wordCount(markdownBody);
  const readingMinutes = Math.max(1, Math.round(words / 200));
  const includeAds = spec.adPlacements.length > 0;
  const includeKofi = spec.cta && spec.cta.type === 'kofi';
  const excerpt = pickFirstString(spec.excerpt);
  const metaDescription = pickFirstString(spec.metaDescription, excerpt);

  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { siteUrl: 'https://example.com' };
  const site = String(settings.siteUrl || 'https://example.com').replace(/\/$/, '');
  const canonical = `${site}/post/${uniqueSlug}`;

  const fm = [
    '---',
    `title: ${yq(spec.title)}`,
    `slug: ${uniqueSlug}`,
    `excerpt: ${yq(excerpt)}`,
    `metaTitle: ${yq(spec.title)}`,
    `metaDescription: ${yq(metaDescription)}`,
    `tags: ${ya(spec.tags)}`,
    `outline: ${ya(spec.outline.map(o => o.heading))}`,
    `wordCount: ${words}`,
    `readingMinutes: ${readingMinutes}`,
    `includeAds: ${includeAds ? 'true' : 'false'}`,
    `includeKofi: ${includeKofi ? 'true' : 'false'}`,
    `affiliateAnchors: ${JSON.stringify(spec.affiliateHints.map(a => ({ key: a.key, text: a.anchor, insertedCount: 0 })))}`,
    `internalLinks: ${JSON.stringify([])}`,
    `publishedAt: ${yq(new Date().toISOString())}`,
    `canonicalUrl: ${yq(canonical)}`,
    'specVersion: 2',
    '---'
  ].join('\n');

  const postFilePath = path.join(CWD, 'content', 'posts', `${uniqueSlug}.md`);
  const postContents = fm + '\n' + (markdownBody || '');

  const entityStubs = spec.entities.map(entity => {
    const entityFile = path.join(CWD, 'content', 'entities', entity.type, `${entity.slug}.json`);
    const payload = {
      type: entity.type,
      name: entity.slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase()),
      slug: entity.slug,
      summary: '',
      properties: {},
      related: []
    };
    return { file: entityFile, payload };
  });

  return {
    spec,
    normalizationReport: report,
    post: {
      filePath: postFilePath,
      contents: postContents
    },
    entityStubs
  };
}

async function persistNormalizedSpec(prepared) {
  for (const stub of prepared.entityStubs) {
    if (fs.existsSync(stub.file)) continue;
    ensureDir(path.dirname(stub.file));
    await fsp.writeFile(stub.file, JSON.stringify(stub.payload, null, 2), 'utf8');
  }

  ensureDir(path.dirname(prepared.post.filePath));
  await fsp.writeFile(prepared.post.filePath, prepared.post.contents, 'utf8');
}

function run(cmd, args, cwd = CWD) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => resolve({ cmd: [cmd, ...args].join(' '), code, out, err }));
  });
}

// ---------- ENTITIES ----------
async function listEntities() {
  const base = path.join(CWD, 'content', 'entities');
  const result = {};
  if (!fs.existsSync(base)) return { items: result };

  const types = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const type of types) {
    const dir = path.join(base, type);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items = [];
    for (const f of files) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        items.push({
          type: j.type || type,
          slug: j.slug || f.replace(/\.json$/, ''),
          name: j.name || '',
          summary: j.summary || ''
        });
      } catch { /* ignore broken file */ }
    }
    items.sort((a,b)=> a.name.localeCompare(b.name));
    result[type] = items;
  }
  return { items: result };
}

async function getEntity({ type, slug }) {
  if (!type || !slug) throw new Error('type and slug are required');
  const file = path.join(CWD, 'content', 'entities', String(type), `${String(slug)}.json`);
  if (!fs.existsSync(file)) throw new Error('not found');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { data: j };
}

async function saveEntity({ type, slug, name, summary, properties, related }) {
  if (!type) throw new Error('type required');
  if (!slug && !name) throw new Error('slug or name required');
  const s = slugify(slug || name);
  if (!s) throw new Error('invalid slug');
  const file = path.join(CWD, 'content', 'entities', String(type), `${s}.json`);
  ensureDir(path.dirname(file));
  const payload = {
    type: String(type),
    slug: s,
    name: String(name || '').trim() || s.replace(/-/g,' ').replace(/\b\w/g, m=>m.toUpperCase()),
    summary: String(summary || ''),
    properties: properties && typeof properties === 'object' ? properties : {},
    related: Array.isArray(related) ? related.map(String) : []
  };
  await fsp.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
  return { path: `content/entities/${type}/${s}.json`, slug: s, type };
}

// ---------- HTTP SERVER ----------
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, { ok: true });

    if (req.method === 'POST' && req.url === '/ping') {
      return send(res, 200, { ok: true, got: null });
    }

    if (req.method === 'POST' && req.url === '/genprompt') {
      const body = (await parseBody(req)) || {};
      const topic = String(body.topic || 'tea ritual for focus').trim();
      const rawWords = Number(body.words || 1200);
      const words = Number.isFinite(rawWords) ? Math.max(600, Math.min(4000, Math.round(rawWords))) : 1200;
      const ads = String(body.ads || 'off') === 'on' ? 'on' : 'off';
      const kofi = String(body.kofi || 'on') === 'on' ? 'on' : 'off';
      const rawMode = typeof body.mode === 'string' ? body.mode.trim() : '';
      const modeKey = rawMode.toLowerCase();
      const rawStyle = typeof body.style === 'string' ? body.style.trim() : '';
      const styleKey = rawStyle.toLowerCase();
      const styleDirective = generatorStyles[styleKey] || generatorStyles.cozy;
      const resolvedStyleKey = generatorStyles[styleKey] ? styleKey : 'cozy';
      const strict = body.strict === true || body.strict === 'true';
      const preset = modeKey ? generatorPresets[modeKey] : undefined;
      const prompt = preset
        ? buildPresetPrompt({ preset, topic, strict, styleDirective })
        : buildGenprompt({ topic, words, ads, kofi });

      // loud guard so stale prompts never slip through
      if (!preset && (!prompt.includes('opening-reflection') || !prompt.includes('The FIRST outline item must be exactly {"heading":"Opening Reflection","id":"opening-reflection"}'))) {
        return send(res, 500, { ok: false, error: 'Stale prompt detected (missing Opening Reflection guards). Check dev-api.js.' });
      }
      return send(res, 200, {
        ok: true,
        prompt,
        options: { topic, mode: rawMode || null, style: resolvedStyleKey, strict }
      });
    }

    if (req.method === 'POST') {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (parsedUrl.pathname === '/ingest') {
        const payload = await parseBody(req);
        if (!payload) {
          return send(res, 400, { error: 'No JSON body provided. Paste a PostSpec v2 object.' });
        }

        const queryDryRun = (() => {
          const flag = parsedUrl.searchParams.get('dryRun');
          return flag === 'true' || flag === '1';
        })();
        const bodyDryRun = typeof payload === 'object' && payload
          ? payload.dryRun === true || payload.dryRun === 'true'
          : false;
        const dryRun = queryDryRun || bodyDryRun;

        let rawSpec;
        if (payload && typeof payload === 'object' && payload.spec && typeof payload.spec === 'object') {
          rawSpec = payload.spec;
        } else if (payload && typeof payload === 'object') {
          const clone = { ...payload };
          delete clone.dryRun;
          rawSpec = clone;
        } else {
          rawSpec = payload;
        }

        if (rawSpec && typeof rawSpec === 'object' && !Array.isArray(rawSpec) && 'dryRun' in rawSpec) {
          rawSpec = { ...rawSpec };
          delete rawSpec.dryRun;
        }

        try {
          const prepared = prepareNormalizedSpec(rawSpec || {});
          if (!dryRun) {
            await persistNormalizedSpec(prepared);
          }
          return send(res, 200, {
            spec: prepared.spec,
            normalizationReport: prepared.normalizationReport,
            saved: !dryRun
          });
        } catch (e) {
          const message = e && e.message ? e.message : String(e);
          if (message === 'Title required') {
            return send(res, 400, { error: 'Title required' });
          }
          return send(res, 400, { error: message });
        }
      }
    }

    if (req.method === 'POST' && req.url === '/bundle') {
      const steps = [];
      steps.push(await run('node', ['tools/wc.js', 'linker']));
      steps.push(await run('node', ['tools/wc.js', 'go:build']));
      const ok = steps.every(s => s.code === 0);
      return send(res, ok ? 200 : 500, {
        ok,
        steps: steps.map(s => ({ cmd: s.cmd, code: s.code, out: s.out, err: s.err }))
      });
    }

    // ---- Entities
    if (req.method === 'POST' && req.url === '/entities/list') {
      try {
        const data = await listEntities();
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/entities/get') {
      try {
        const body = await parseBody(req);
        const data = await getEntity({ type: body?.type, slug: body?.slug });
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 404, { ok: false, error: e.message || String(e) });
      }
    }

    if (req.method === 'POST' && req.url === '/entities/save') {
      try {
        const body = await parseBody(req);
        const data = await saveEntity(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    // ---- Write page
    if (req.method === 'POST' && req.url === '/posts/save') {
      try {
        const body = await parseBody(req);
        const data = await savePostFromWrite(body || {});
        return send(res, 200, { ok: true, ...data });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
      }
    }

    return send(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
});
