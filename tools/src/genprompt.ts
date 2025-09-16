// tools/src/genprompt.ts
import fs from 'node:fs';
import path from 'node:path';

function readJSON(p: string) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function listExistingTitles(postsDir: string) {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(postsDir, f), 'utf8');
      const m = raw.match(/^title:\s*(.+)$/m);
      return m ? m[1].trim().replace(/^"|"$/g, '') : '';
    })
    .filter(Boolean);
}

export function genprompt({
  topic,
  words,
  ads,
  kofi,
}: {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
}) {
  const CWD = process.cwd();
  const settings =
    readJSON(path.join(CWD, 'content', 'settings.json')) ||
    { brandName: 'WitchClick', siteUrl: 'https://example.com' };

  const products =
    readJSON(path.join(CWD, 'content', 'products.json')) || { products: [] };

  const allowedKeys = Array.isArray(products.products)
    ? products.products.map((p: any) => p.key)
    : [];

  const existingPostTitles = listExistingTitles(
    path.join(CWD, 'content', 'posts')
  );

  const prompt = [
    'WITCHCLICK PASSIVE-INCOME POST GENERATOR — MASTER PROMPT',
    '(Role, rules, inputs, and exact JSON contract. Paste this whole thing into a fresh chat, then edit the INPUTS block.)',
    '',
    `—you are my Head of Content Ops, SEO, and Affiliate Strategy for a metaphysical blog called "${settings.brandName}." Your job is to produce a single, production-ready article spec that maximizes search intent coverage, internal linking potential, and affiliate conversion while staying gentle, ethical, and cozy.`,
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
    `existingPostTitles: ${JSON.stringify(existingPostTitles)}`,
    `allowedAffiliateKeys: ${JSON.stringify(allowedKeys)}`,
    '',
    'PROCESS & CONSTRAINTS (follow step-by-step)',
    '... (same as above, shortened here for brevity)',
    '',
    'GOLDEN JSON EXAMPLE (minimally valid shape — copy the structure, not the content):',
    '{"specVersion":2,"title":"t","slug":"t","metaDescription":"t","tags":["a","b","c","d"],"excerpt":"t","outline":[{"heading":"Opening Reflection","id":"opening-reflection"}],"sections":[{"heading":"Opening Reflection","markdown":"M"}],"entities":[],"heroImagePrompt":null,"altTexts":[],"internalLinkHints":[{"anchor":"a","rationale":"r"}],"affiliateHints":[{"key":"journal","anchor":"a","rationale":"r"}],"cta":{"type":"none"},"adPlacements":[]}'
  ].join('\n');

  return { prompt };
}