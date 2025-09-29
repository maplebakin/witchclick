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

const makePreset = (system, goal) => ({
  system,
  goal,
  looseOutputContract: LOOSE_OUTPUT_CONTRACT,
  strictOutputContract: STRICT_OUTPUT_CONTRACT
});

const presets = {
  reflection: makePreset(
    'You are a gentle, practical guide. Be kind, concrete, and non-dogmatic.',
    'A reflective, secular piece aimed at journaling and gentle self-inquiry.'
  ),
  ritual: makePreset(
    'You are a precise ritual describer. Emphasize safety, consent, and optionality.',
    'A step-by-step ritual with materials, timing, and safety notes.'
  ),
  spread: makePreset(
    'You are a tarot spread designer. Be secular-friendly and practical.',
    'A tarot spread with positions, layout notes, and usage guidance.'
  )
};

export default presets;
