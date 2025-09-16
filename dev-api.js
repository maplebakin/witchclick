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
function writeMarkdownFromSpec(spec) {
  if (spec.specVersion !== 2) throw new Error('specVersion must be 2');
  const title = String(spec.title || '').trim();
  if (!title) throw new Error('title is required');
  const initialSlug = slugify(spec.slug || title);
  if (!initialSlug) throw new Error('slug could not be derived');

  const sections = Array.isArray(spec.sections) ? spec.sections : [];
  const body = sections.map(sec => {
    const h = sec && sec.heading ? `## ${sec.heading}\n\n` : '';
    const md = String(sec && sec.markdown || '').trim();
    return h + md.trim();
  }).filter(Boolean).join('\n\n');

  const outline = Array.isArray(spec.outline) && spec.outline.length
    ? spec.outline.map(o => String(o.heading || '').trim()).filter(Boolean)
    : sections.map(s => String(s.heading || '').trim()).filter(Boolean);

  const tags = Array.isArray(spec.tags) ? spec.tags : [];
  const excerpt = String(spec.excerpt || '').trim();
  const metaDescription = String(spec.metaDescription || spec.excerpt || '').trim();

  const includeAds = Array.isArray(spec.adPlacements) && spec.adPlacements.length > 0;
  const includeKofi = !!(spec.cta && spec.cta.type === 'kofi');

  const words = (body.match(/\b\w+\b/g) || []).length;
  const readingMinutes = Math.max(1, Math.round(words / 200));

  const affiliateAnchors = Array.isArray(spec.affiliateHints)
    ? spec.affiliateHints.map(a => ({ key: a.key, text: a.anchor, insertedCount: 0 }))
    : [];

  const internalLinks = [];

  const ents = Array.isArray(spec.entities) ? spec.entities : [];
  for (const e of ents) {
    const type = String(e.type || '').trim();
    const slug = slugify(e.slug || '');
    if (!type || !slug) continue;
    const file = path.join(CWD, 'content', 'entities', type, `${slug}.json`);
    if (!fs.existsSync(file)) {
      ensureDir(path.dirname(file));
      const stub = {
        type,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase()),
        slug,
        summary: '',
        properties: {},
        related: []
      };
      fs.writeFileSync(file, JSON.stringify(stub, null, 2));
    }
  }

  const postsDir = path.join(CWD, 'content', 'posts');
  ensureDir(postsDir);
  let slug = initialSlug;
  let idx = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) {
    slug = `${initialSlug}-${idx++}`;
  }

  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { siteUrl: 'https://example.com' };
  const site = String(settings.siteUrl || 'https://example.com').replace(/\/$/, '');
  const canonical = `${site}/post/${slug}`;

  const fm = [
    '---',
    `title: ${yq(title)}`,
    `slug: ${slug}`,
    `excerpt: ${yq(excerpt)}`,
    `metaTitle: ${yq(title)}`,
    `metaDescription: ${yq(metaDescription)}`,
    `tags: ${ya(tags)}`,
    `outline: ${ya(outline)}`,
    `wordCount: ${words}`,
    `readingMinutes: ${readingMinutes}`,
    `includeAds: ${includeAds ? 'true' : 'false'}`,
    `includeKofi: ${includeKofi ? 'true' : 'false'}`,
    `affiliateAnchors: ${JSON.stringify(affiliateAnchors)}`,
    `internalLinks: ${JSON.stringify(internalLinks)}`,
    `publishedAt: ${yq(new Date().toISOString())}`,
    `canonicalUrl: ${yq(canonical)}`,
    'specVersion: 2',
    '---'
  ].join('\n');

  const full = fm + '\n' + body.trim() + '\n';

  const filePath = path.join(postsDir, `${slug}.md`);
  fs.writeFileSync(filePath, full, 'utf8');

  return { slug, path: `content/posts/${slug}.md` };
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
      const prompt = buildGenprompt({ topic, words, ads, kofi });

      // loud guard so stale prompts never slip through
      if (!prompt.includes('opening-reflection') || !prompt.includes('The FIRST outline item must be exactly {"heading":"Opening Reflection","id":"opening-reflection"}')) {
        return send(res, 500, { ok: false, error: 'Stale prompt detected (missing Opening Reflection guards). Check dev-api.js.' });
      }
      return send(res, 200, { ok: true, prompt });
    }

    if (req.method === 'POST' && req.url === '/ingest') {
      const spec = await parseBody(req);
      if (!spec) return send(res, 400, { ok: false, error: 'No JSON body provided. Paste a PostSpec v2 object.' });
      try {
        const result = writeMarkdownFromSpec(spec);
        return send(res, 200, { ok: true, ...result });
      } catch (e) {
        return send(res, 400, { ok: false, error: e.message || String(e) });
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
