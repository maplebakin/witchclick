// dev-api.js (ESM)
// Minimal local API for WitchClick admin with safe YAML quoting.
// Endpoints:
//   POST /ping
//   POST /genprompt    {topic, words, ads:'on'|'off', kofi:'on'|'off'}
//   POST /ingest       (PostSpec v2 JSON)
//   POST /bundle       (runs linker -> go:build)

import http from 'node:http';
import fs from 'node:fs';
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
      try {
        const cleaned = buf.replace(/^\uFEFF/, '').replace(/,\s*([}\]])/g, '$1'); // strip BOM + trailing commas
        resolve(JSON.parse(cleaned));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ---------- YAML helpers ----------
const yq = (v) => JSON.stringify(String(v ?? '').replace(/\r\n?/g, '\n')); // JSON string literal (YAML 1.2-valid)
const ya = (arr) =>
  '[' + (Array.isArray(arr) ? arr : []).map((s) => JSON.stringify(String(s))).join(', ') + ']';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ---------- GENPROMPT ----------
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
    '• Audience: spiritual, planner-loving, neurodivergent, cottagecore; cozy gamers welcome.',
    '• Tone: gentle witchy friend; casual-persuasive, never pushy; practical and kind; avoid absolutist claims.',
    '• Reading level: Grade 6–8 (simple sentences; concrete verbs; short paragraphs).',
    '',
    'NON-NEGOTIABLES',
    '• Markdown-only (no raw HTML).',
    '• Avoid medical/health claims; no promises of outcomes. Use safety notes and disclaimers when relevant.',
    '• Use inclusive language and accessible phrasing; add at least one short practical checklist.',
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
    `allowedAffiliateKeys: ${JSON.stringify(allowed)}`
  ];
  return lines.join('\n');
}

// ---------- INGEST ----------
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

// ---------- HTTP SERVER ----------
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, { ok: true });

    if (req.method === 'POST' && req.url === '/ping') {
      return send(res, 200, { ok: true, got: null });
    }

    if (req.method === 'POST' && req.url === '/genprompt') {
      const body = (await parseBody(req)) || {};
      const topic = String(body.topic || 'tea ritual for focus');
      const words = Number(body.words || 1200);
      const ads = String(body.ads || 'off') === 'on' ? 'on' : 'off';
      const kofi = String(body.kofi || 'on') === 'on' ? 'on' : 'off';
      const prompt = buildGenprompt({ topic, words, ads, kofi });
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

    return send(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message || String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT}`);
});
