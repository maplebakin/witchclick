// src/pages/api/genprompt.json.ts
export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

function safeReadJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
      return m ? m[1].trim() : '';
    })
    .filter(Boolean);
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const topic = String((body as any).topic ?? 'tea ritual for focus');
    const words = Number((body as any).words ?? 1200);
    const ads = String((body as any).ads ?? 'off') === 'on' ? 'on' : 'off';
    const kofi = String((body as any).kofi ?? 'on') === 'on' ? 'on' : 'off';

    const cwd = process.cwd();
    const settingsPath = path.join(cwd, 'content', 'settings.json');
    const productsPath = path.join(cwd, 'content', 'products.json');
    const postsDir = path.join(cwd, 'content', 'posts');

    if (!fs.existsSync(settingsPath)) throw new Error('Missing file: content/settings.json');
    if (!fs.existsSync(productsPath)) throw new Error('Missing file: content/products.json');

    const settings = safeReadJSON(settingsPath);
    if (!settings) throw new Error('Invalid JSON in content/settings.json');
    const productsFile = safeReadJSON(productsPath);
    if (!productsFile) throw new Error('Invalid JSON in content/products.json');

    const products = Array.isArray(productsFile.products) ? productsFile.products : [];
    const allowedKeys = products.map((p: any) => p.key);
    const existingPostTitles = listExistingTitles(postsDir);

    const prompt = `
WITCHCLICK PASSIVE-INCOME POST GENERATOR — MASTER PROMPT
(Role, rules, inputs, and exact JSON contract. Paste this whole thing into a fresh chat, then edit the INPUTS block.)

—you are my Head of Content Ops, SEO, and Affiliate Strategy for a metaphysical blog called “${settings.brandName}.” Your job is to produce a single, production-ready article spec that maximizes search intent coverage, internal linking potential, and affiliate conversion while staying gentle, ethical, and cozy.

AUDIENCE & VOICE
• Audience: spiritual, planner-loving, neurodivergent, cottagecore; cozy gamers welcome.
• Tone: gentle witchy friend; casual-persuasive, never pushy; practical and kind; avoid absolutist claims.
• Reading level: Grade 6–8 (simple sentences; concrete verbs; short paragraphs).

NON-NEGOTIABLES
• Content must be Markdown-only (no raw HTML).
• Avoid medical/health claims; no promises of outcomes. Use safety notes and disclaimers when relevant.
• Use inclusive language and accessible phrasing; add at least one short practical checklist.

OUTPUT FORMAT
• Return JSON ONLY. No backticks, no commentary. Valid JSON, double-quoted keys/strings.
• JSON must match the PostSpec schema exactly (see SCHEMA). Do not add extra fields.

SCHEMA (must match exactly)
PostSpec:
{
  "specVersion": 2,
  "title": string,
  "slug": string,
  "metaDescription": string,
  "tags": string[],
  "excerpt": string,
  "outline": { "heading": string, "id": string }[],
  "sections": { "heading": string, "markdown": string }[],
  "entities": { "type": "crystal"|"herb"|"moonPhase"|"tarot"|"planetaryDay"|"ritual", "slug": string }[],
  "heroImagePrompt": string | null,
  "altTexts": string[],
  "internalLinkHints": { "anchor": string, "rationale": string }[],
  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],
  "cta": { "type": "kofi"|"download"|"none", "id"?: string },
  "adPlacements": ["lead"|"mid"|"end"][]
}

INPUTS (edit these values before sending)
brandName: "${settings.brandName}"
siteUrl: "${settings.siteUrl}"
topic: "${topic}"
wordCount: ${words}
includeAds: "${ads}"
includeKofi: "${kofi}"
existingPostTitles: ${JSON.stringify(existingPostTitles)}
allowedAffiliateKeys: ${JSON.stringify(allowedKeys)}

PROCESS & CONSTRAINTS (follow step-by-step)
• Title 50–60; Meta 150–160; 4–7 tags.
• Logical H2/H3 flow: context → steps → variations → safety/ethics → wrap-up.
• Include exactly one short practical checklist section.
• Affiliate density ≤ ~1 per 250 words; anchors must appear verbatim in markdown.
• If images are referenced, altTexts length ≥ image count.
• CTA “kofi” adds a warm 1–2 sentence sign-off. Ads allowed only in ["lead","mid","end"] when on.

RETURN INSTRUCTIONS
• Return a single, valid JSON object matching PostSpec exactly, with all fields populated per the schema.
• Do not include any explanations, headings, or code fences—JSON only.
`.trim();

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
