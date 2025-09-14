// src/pages/api/genprompt.json.ts
export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

function safeReadJSON<T = any>(filePath: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function listExistingTitles(postsDir: string) {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(postsDir, f), 'utf8');
      // frontmatter is YAML; this simple regex still catches quoted/unquoted title lines
      const m = raw.match(/^title:\s*(.+)$/m);
      return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : '';
    })
    .filter(Boolean);
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const topic = String((body as any).topic ?? 'tea ritual for focus').trim();
    const wordsRaw = Number((body as any).words ?? 1200);
    // keep posts human-sized
    const words = Number.isFinite(wordsRaw) ? Math.max(600, Math.min(4000, Math.round(wordsRaw))) : 1200;
    const ads = String((body as any).ads ?? 'off') === 'on' ? 'on' : 'off';
    const kofi = String((body as any).kofi ?? 'on') === 'on' ? 'on' : 'off';

    const cwd = process.cwd();
    const settingsPath = path.join(cwd, 'content', 'settings.json');
    const productsPath = path.join(cwd, 'content', 'products.json');
    const postsDir = path.join(cwd, 'content', 'posts');

    const settings = safeReadJSON(settingsPath, { brandName: 'WitchClick', siteUrl: 'https://example.com' });
    const productsFile = safeReadJSON(productsPath, { products: [] as Array<{ key: string }> });

    if (!settings) throw new Error('Invalid JSON in content/settings.json');
    if (!productsFile) throw new Error('Invalid JSON in content/products.json');

    const products = Array.isArray((productsFile as any).products) ? (productsFile as any).products : [];
    const allowedKeys = products.map((p: any) => p.key).filter(Boolean);
    const existingPostTitles = listExistingTitles(postsDir);

    const prompt = [
      'WITCHCLICK PASSIVE-INCOME POST GENERATOR — MASTER PROMPT',
      '(Role, rules, inputs, and exact JSON contract. Paste this whole thing into a fresh chat, then edit the INPUTS block.)',
      '',
      `—you are my Head of Content Ops, SEO, and Affiliate Strategy for a metaphysical blog called “${settings.brandName}.” Your job is to produce a single, production-ready article spec that maximizes search intent coverage, internal linking potential, and affiliate conversion while staying gentle, ethical, and cozy.`,
      '',
      'AUDIENCE & VOICE',
      '• Audience: spiritual, planner-loving, neurodivergent, cottagecore; cozy gamers and creatives welcome.',
      '• Voice: write like a gentle, imperfect guide — a friend sharing what helped them, not a guru making decrees.',
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
      '   • 4–7 tags. Excerpt 1–2 sentences that entice the click without hype.',
      '4) Outline',
      '   • H2/H3 flow MUST include: Opening Reflection → Steps (Quick & Deep) → Variations/Accessibility → Safety/Ethics → Wrap-up with Reflection Prompt.',
      '   • Include exactly one short checklist section.',
      '5) Sections',
      `   • Write ~${words} words total. Short paragraphs, sparse bulleted lists. One gentle disclaimer if advice could be misconstrued as medical/therapeutic.`,
      '   • Steps must be numbered and include Quick vs Deep variants.',
      '6) Alt texts & optional image',
      '   • If images are referenced in markdown, provide equal-or-greater altTexts; else []. Set heroImagePrompt to a descriptive scene OR null.',
      '7) Internal links (hints)',
      '   • Provide 5–8 internalLinkHints as anchor phrases used verbatim in the prose; include a brief rationale.',
      '8) Affiliate strategy (hints only; do not insert links)',
      '   • ≤ 1 per ~250 words; keys must be from allowedAffiliateKeys.',
      '9) CTA & ads',
      '   • If Ko-fi, set cta.type="kofi". If download, set cta with id. If includeAds="on", choose from ["lead","mid","end"]; else [].',
      '10) Quality gate',
      '   • Title 50–60; Meta 150–160; 4–7 tags; Grade 6–8 readability; no raw HTML; anchors appear verbatim in markdown; altTexts if images appear; Opening Reflection + Quick/Deep + Reflection Prompt + Checklist present.',
      '',
      'RETURN INSTRUCTIONS',
      '• Return a single, valid JSON object matching PostSpec v2 exactly, with all fields populated per the schema.',
      '• Do not include any explanations, headings, or code fences—JSON only.'
    ].join('\n');

    return new Response(JSON.stringify({ ok: true, prompt }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
