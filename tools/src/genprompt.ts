// tools/src/genprompt.ts
import fs from 'node:fs';
import path from 'node:path';

type GenArgs = {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
};

function readJSON(p: string) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function listExistingTitles(postsDir: string): string[] {
  if (!fs.existsSync(postsDir)) return [];
  return fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(postsDir, f), 'utf8');
      const m = raw.match(/^title:\s*(.+)$/m);
      return m ? m[1].trim() : '';
    })
    .filter(Boolean);
}

export function genprompt({ topic, words, ads, kofi }: GenArgs): { prompt: string } {
  const CWD = process.cwd();
  const settings = readJSON(path.join(CWD, 'content', 'settings.json')) || { brandName: 'WitchClick', siteUrl: 'https://example.com' };
  const products = readJSON(path.join(CWD, 'content', 'products.json')) || { products: [] };
  const allowedKeys = Array.isArray(products.products) ? products.products.map((p: any) => p.key) : [];
  const existingPostTitles = listExistingTitles(path.join(CWD, 'content', 'posts'));

  const prompt = [
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
    `existingPostTitles: ${JSON.stringify(existingPostTitles)}`,
    `allowedAffiliateKeys: ${JSON.stringify(allowedKeys)}`,
    '',
    'PROCESS & CONSTRAINTS (follow step-by-step)',
    '1) Search intent & slug',
    '   • Infer primary intent + 2 secondary intents from the topic.',
    '   • Draft a slug in kebab-case reflecting the primary intent; avoid collisions with existingPostTitles.',
    '2) Title & meta',
    '   • Title 50–60 chars with primary keyword. Meta 150–160 chars; cozy, non-clickbait.',
    '3) Tags & excerpt',
    '   • 4–7 tags. Excerpt 1–2 sentences that entice the click.',
    '4) Outline',
    '   • H2/H3 flow: context → steps → variations → safety/ethics → wrap-up. Include exactly one short checklist.',
    '5) Sections',
    `   • Write ~${words} words total. Short paragraphs, sparse bulleted lists. One gentle disclaimer if advice could be misconstrued as medical.`,
    '6) Alt texts & optional image',
    '   • If you reference images in the markdown, provide equal-or-greater altTexts; else []. heroImagePrompt may be null.',
    '7) Internal links (hints)',
    '   • Provide 5–8 internalLinkHints as anchor phrases used in the prose; include a brief rationale.',
    '8) Affiliate strategy (hints only; do not insert links)',
    '   • ≤ 1 per ~250 words; keys must be from allowedAffiliateKeys.',
    '9) CTA & ads',
    '   • If Ko-fi, set cta.type="kofi". If download, set cta with id. If includeAds="on", choose from ["lead","mid","end"]; else [].',
    '10) Quality gate',
    '   • Title 50–60; Meta 150–160; 4–7 tags; Grade 6–8 readability; no raw HTML; anchors appear verbatim in markdown; altTexts if images appear.',
    '',
    'RETURN INSTRUCTIONS',
    '• Return a single, valid JSON object matching PostSpec v2 exactly, with all fields populated per the schema.',
    '• Do not include any explanations, headings, or code fences—JSON only.'
  ].join('\n');

  return { prompt };
}
