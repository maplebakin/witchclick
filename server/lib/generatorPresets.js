import { STRICT_JSON_RULES } from './strictJsonRules.js';

const LOOSE_OUTPUT_CONTRACT = [
  'Return a single JSON object that can be normalized into PostSpec v2 using relaxed keys and aliases.',
  '',
  'Required fields (aliases allowed):',
  '- title (name, headline) — 50–60 characters with the primary keyword.',
  '- slug (permalink, urlSlug) — kebab-case, ≤70 characters, no spaces.',
  '- metaDescription (meta, description, seoDescription) — 150–160 characters; cozy and non-clickbait.',
  '- tags (keywords, labels) — array of 4–7 short strings.',
  '- excerpt — 35–55 words across 1–2 sentences.',
  '- outline — array of { heading, id }. First item MUST be { "heading": "Opening Reflection", "id": "opening-reflection" }.',
  '- sections (body, content) — array of { heading, markdown|content } totaling ~800–1,100 words. First section heading must be "Opening Reflection" and ritual steps should be numbered.',
  '- internalLinkHints (internalLinks, linkHints) — array of 5–8 { anchor, rationale }; anchors must appear verbatim in sections.',
  '- affiliateHints — array (≤1 per ~250 words) of { key, anchor, rationale }; [] allowed.',
  '- cta — object { type: "kofi"|"download"|"none", id? }.',
  '- adPlacements — array containing zero or more of "lead", "mid", "end" (or []).',
  '',
  'Optional but recommended fields:',
  '- specVersion — number 2.',
  '- heroImagePrompt — descriptive string or null.',
  '- altTexts — array of strings matching any described images; [] if none.',
  '- entities — array of { type, slug } if referenced.',
  '',
  'Strict JSON output rules:',
  '- JSON only. No markdown fences or commentary outside the object.',
  '- Use double-quoted keys/strings with straight quotes and valid JSON syntax.',
  '- Follow the STRICT_JSON_RULES checklist; relaxed keys will be normalized by the server.',
  '',
  'Quality notes:',
  '- Keep tone gentle, practical, and secular-friendly per the preset goal.',
  '- Ensure outline/sections include Opening Reflection first, Quick/Low-Energy and Deep headings, Reflection Prompt, and a Checklist/Summary heading as required by the preset.',
  '- heroImagePrompt may be null; altTexts only required when images appear in markdown.'
];

const STRICT_OUTPUT_CONTRACT = [
  'You MUST return VALID JSON for PostSpec v2 with these keys ONLY:',
  '{',
  '  "specVersion": 2,',
  '  "title": "",',
  '  "slug": "",',
  '  "metaDescription": "",',
  '  "tags": [""],',
  '  "excerpt": "",',
  '  "outline": [',
  '    { "heading": "Opening Reflection", "id": "opening-reflection" }',
  '  ],',
  '  "sections": [',
  '    { "heading": "Opening Reflection", "markdown": "" }',
  '  ],',
  '  "entities": [],',
  '  "heroImagePrompt": null,',
  '  "altTexts": [],',
  '  "internalLinkHints": [],',
  '  "affiliateHints": [],',
  '  "cta": { "type": "none" },',
  '  "adPlacements": []',
  '}',
  "The first outline item and first section MUST be 'Opening Reflection' with id 'opening-reflection'.",
  'Do NOT include markdown fences or any commentary outside the JSON.',
  '',
  ...STRICT_JSON_RULES
];

const makePreset = ({ label, system, goal }) => ({
  label,
  system,
  goal,
  looseOutputContract: LOOSE_OUTPUT_CONTRACT,
  strictOutputContract: STRICT_OUTPUT_CONTRACT
});

const DEFINITIONS = [
  {
    key: 'reflection',
    label: 'Reflection Essay',
    system: 'You are a gentle, practical guide. Be kind, concrete, and non-dogmatic.',
    goal: 'A reflective, secular piece aimed at journaling and gentle self-inquiry.'
  },
  {
    key: 'ritual',
    label: 'Ritual Guide',
    system: 'You are a precise ritual describer. Emphasize safety, consent, and optionality.',
    goal: 'A step-by-step ritual with materials, timing, and safety notes.'
  },
  {
    key: 'story',
    label: 'Story / Vignette',
    system: 'You are a cozy storyteller sharing first-person snapshots of everyday magic.',
    goal: 'A narrative vignette that blends sensory detail, emotion, and gentle takeaways.'
  },
  {
    key: 'tarotSpread',
    label: 'Tarot Spread',
    system: 'You are a tarot spread designer. Be secular-friendly and practical.',
    goal: 'A tarot spread with positions, layout notes, and usage guidance.'
  },
  {
    key: 'spellwork',
    label: 'Spellwork Recipe',
    system: 'You are a careful spellcraft mentor. Highlight consent, substitutions, and mundane options.',
    goal: 'A spell or working with correspondences, timing, variations, and safety notes.'
  },
  {
    key: 'crystals',
    label: 'Crystal Profile',
    system: 'You are a crystal caretaker who balances geology with mindful, secular use.',
    goal: 'A crystal spotlight covering properties, care, and practical, grounded applications.'
  }
];

const presets = {};
for (const def of DEFINITIONS) {
  const preset = makePreset(def);
  presets[def.key] = preset;
  if (Array.isArray(def.aliases)) {
    for (const alias of def.aliases) {
      presets[alias] = preset;
    }
  }
}

// Back-compat aliases
presets.spread = presets.tarotSpread;
presets.tarot = presets.tarotSpread;

export const generatorPresetOptions = DEFINITIONS.map(({ key, label, goal }) => ({
  key,
  label,
  description: goal
}));

export default presets;
