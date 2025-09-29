const LOOSE_OUTPUT_CONTRACT = [
  'Return a JSON object using relaxed keys. Allowed keys and aliases:',
  '- title (aliases: name, headline)',
  '- description (aliases: meta, summary)',
  '- tags (aliases: keywords, labels) — array of strings',
  '- excerpt — short string',
  '- sections — array of { heading, content } (alias: body)',
  '- Optional: heroImagePrompt (string)',
  '',
  'Constraints:',
  '- JSON only; no markdown fences; no commentary outside JSON.',
  '- You MAY use the aliases above; the server will normalize to strict PostSpec v2.',
  '- Keep it minimal and coherent for the given topic and mode.'
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
  'Do NOT include markdown fences or any commentary outside the JSON.'
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
