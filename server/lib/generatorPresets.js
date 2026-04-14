import { STRICT_JSON_RULES } from './strictJsonRules.js';

function formatSectionsRequirement() {
  return '- sections (body, content) — array of { heading, markdown|content }.';
}

// Base contract fields that all presets share
export function buildBaseFields() {
  return [
    'Return a JSON object that can be normalized into PostSpec v2 using relaxed keys and aliases.',
    '',
    'Required fields (aliases allowed):',
    '- title (name, headline) — concise post title with the primary keyword.',
    '- slug (permalink, urlSlug) — kebab-case, ≤70 characters, no spaces.',
    '- contentType — one of: "ritual", "reflection", "story", "tarotSpread", "spellwork", "crystals". MUST match the preset mode you are using.',
    '- metaDescription (meta, description, seoDescription) — concise, cozy, non-clickbait summary.',
    '- tags (keywords, labels) — array of 4–7 short strings.',
    '- excerpt — 35–55 words across 1–2 sentences.',
    '- outline — array of { heading, id } aligned to sections in the same order.',
    formatSectionsRequirement(),
    '- internalLinkHints (internalLinks, linkHints) — array of 5–8 { anchor, slug, rationale }; anchors must appear verbatim in sections and each slug must be an exact value from existingPostSlugs.',
    '- affiliateHints — array (≤1 per ~250 words) of { key, anchor, rationale }; [] allowed.',
    '- cta — object { type: "kofi"|"download"|"none", id? }.',
    '- adPlacements — array containing zero or more of "lead", "mid", "end" (or []).',
    '',
    'Optional but recommended fields:',
    '- specVersion — number 2.',
    '- heroImagePrompt — a painterly, illustrative scene description (2–4 sentences) varying in setting, palette, and mood to match the post topic; or null.',
    '- altTexts — array of strings matching any described images; [] if none.',
    '- entities — array of { type, slug } if referenced.',
    '',
    'Strict JSON output rules are defined in the STRICT JSON OUTPUT RULES block.'
  ];
}

export const BASE_FIELDS = buildBaseFields();

// Preset-specific structure requirements
export const STRUCTURE_REQUIREMENTS = {
  reflection: [
    '',
    'Content Structure for Reflection Essays:',
    '- contentType: Set to "reflection"',
    '1. Main reflection sections: 2–4 sections exploring different angles of the topic',
    '2. Journaling Prompts: A section with 3–5 open-ended questions for self-inquiry',
    '3. Gentle Closing: A final section with integration thoughts',
    '- NO ritual checklists or step-by-step instructions needed',
    '- Focus on introspection, questions, and gentle exploration'
  ],
  ritual: [
    '',
    'Content Structure for Ritual Guides:',
    '- contentType: Set to "ritual"',
    '1. Quick/Low-Energy Variant: 3–5 numbered steps, acknowledges low-spoon readers',
    '2. Deep Variant: 4–7 numbered steps with optional add-ons and mindful pauses',
    '3. Reflection Prompt: One expansive journaling question',
    '4. Checklist/Summary: Scannable list summarizing supplies/steps/outcomes',
    '5. Safety Note (if needed): Include if ritual involves heat, blades, or could be misread as medical advice',
    '- Headings MUST explicitly include "Quick" (or "Low-Energy") and "Deep"'
  ],
  story: [
    '',
    'Content Structure for Story/Vignettes:',
    '- contentType: Set to "story"',
    '1. Story sections: 3–5 narrative sections with sensory details and emotional arc',
    '2. Gentle Takeaway: A brief closing reflection on what the story offers',
    '- Write in first-person or close third-person',
    '- NO checklists, prompts, or instructional content',
    '- Focus on atmosphere, emotion, and everyday magic'
  ],
  tarotSpread: [
    '',
    'Content Structure for Tarot Spreads:',
    '- contentType: Set to "tarotSpread"',
    '1. Spread Layout: Visual description of card positions',
    '2. Position Meanings: Detailed explanation of each position (3–7 positions typical)',
    '3. Reading Tips: How to interpret connections between cards',
    '4. Reflection Questions: 2–3 questions to deepen the reading',
    '5. Gentle Closing: 1–2 paragraphs with integration thoughts and one internal link',
    '- NO ritual steps or material checklists',
    '- Keep interpretations secular-friendly and archetypal',
    '- Focus on self-reflection rather than prediction'
  ],
  spellwork: [
    '',
    'Content Structure for Spellwork:',
    '- contentType: Set to "spellwork"',
    '1. Ingredients & Correspondences: What you\'ll need and why',
    '2. Step-by-Step Instructions: Numbered steps for the working',
    '3. Variations & Substitutions: Options for different needs/availability',
    '4. Closing & Grounding: How to complete and ground the working',
    '5. Safety Notes: Highlight consent, mundane alternatives, and physical safety',
    '- Emphasize that substitutions are valid',
    '- Include mundane action steps alongside magical ones'
  ],
  crystals: [
    '',
    'Content Structure for Crystal Profiles:',
    '- contentType: Set to "crystals"',
    '1. Geological Properties: Scientific facts about formation, composition, appearance',
    '2. Mindful Uses: Secular, grounded applications in daily life',
    '3. Care & Cleansing: How to physically care for the stone',
    '4. Pairing Ideas: What stones, practices, or intentions work well together',
    '5. Gentle Closing: 1–2 paragraphs inviting the reader to work with the stone gently',
    '- Balance scientific accuracy with metaphysical perspectives',
    '- NO ritual checklists',
    '- Avoid medical claims; focus on mindful intention-setting'
  ]
};

const makeLooseContract = (structureKey) => [
  ...buildBaseFields(),
  ...(STRUCTURE_REQUIREMENTS[structureKey] || STRUCTURE_REQUIREMENTS.reflection),
  '',
  '- heroImagePrompt may be null; if provided, must be a painterly scene description that varies in setting, palette, and mood — not a generic candles-and-crystals still life. altTexts only required when images appear in markdown.'
];

const STRICT_OUTPUT_CONTRACT = [
  'You MUST return VALID JSON for PostSpec v2 with these keys ONLY:',
  '{',
  '  "specVersion": 2,',
  '  "title": "",',
  '  "slug": "",',
  '  "contentType": "",',
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

const makePreset = ({ key, label, system, goal }) => ({
  label,
  system,
  goal,
  looseOutputContract: makeLooseContract(key),
  strictOutputContract: STRICT_OUTPUT_CONTRACT
});

const DEFINITIONS = [
  {
    key: 'reflection',
    label: 'Reflection Essay',
    system: 'You are a gentle, practical guide. Be kind, concrete, and non-dogmatic.',
    goal: 'A reflective, secular piece aimed at journaling and gentle self-inquiry. Focus on questions and introspection rather than step-by-step instructions.'
  },
  {
    key: 'ritual',
    label: 'Ritual Guide',
    system: 'You are a precise ritual describer. Emphasize safety, consent, and optionality.',
    goal: 'A step-by-step ritual with materials, timing, and safety notes. Include both quick and deep variants.'
  },
  {
    key: 'story',
    label: 'Story / Vignette',
    system: 'You are a cozy storyteller sharing first-person snapshots of everyday magic.',
    goal: 'A narrative vignette that blends sensory detail, emotion, and gentle takeaways. No checklists or instructional content.'
  },
  {
    key: 'tarotSpread',
    label: 'Tarot Spread',
    system: 'You are a tarot spread designer. Be secular-friendly and practical.',
    goal: 'A tarot spread with card positions, layout notes, and interpretive guidance. Focus on self-reflection rather than prediction.'
  },
  {
    key: 'spellwork',
    label: 'Spellwork Recipe',
    system: 'You are a careful spellcraft mentor. Highlight consent, substitutions, and mundane options.',
    goal: 'A spell or working with correspondences, timing, variations, and safety notes. Include both magical and mundane action steps.'
  },
  {
    key: 'crystals',
    label: 'Crystal Profile',
    system: 'You are a crystal caretaker who balances geology with mindful, secular use.',
    goal: 'A crystal spotlight covering geological properties, care instructions, and practical applications. Balance scientific accuracy with metaphysical perspectives.'
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

export function resolveGeneratorPresetKey(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (presets[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(presets)) {
    if (key.toLowerCase() === lower) return key;
  }
  return null;
}

export function getGeneratorPreset(value) {
  const key = resolveGeneratorPresetKey(value);
  return key ? presets[key] : undefined;
}

export default presets;
