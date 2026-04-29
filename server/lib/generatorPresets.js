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
    '- metaDescription (meta, description, seoDescription) — concise, warm, non-clickbait summary.',
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
  curiousExplainer: [
    '',
    'Content Structure for Curious Explainer:',
    '- contentType: Set to "curiousExplainer"',
    '1. 2–4 main sections exploring the idea from different angles',
    '2. Practical Invitation: one section with low-pressure ways the reader might test the idea in real life',
    '3. Gentle Closing: a brief closing that leaves space for the reader\'s own experience',
    '- NO journaling prompts, NO ritual checklists, NO step-by-step instructions',
    '- Tone: practical-curious. Blog-style. Ideas and invitations, not authority or generic wellness advice.',
  ],
  practicalWorking: [
    '',
    'Content Structure for Practical Working:',
    '- contentType: Set to "practicalWorking"',
    '1. Quick / Low-Energy Variant: 3–5 numbered steps, acknowledges low-spoon readers',
    '2. Deep Variant: 4–7 numbered steps with optional add-ons and mindful pauses',
    '3. Reflection Prompt: one expansive question about attention, meaning, values, or perspective',
    '4. Checklist / Summary: scannable list of supplies, steps, outcomes',
    '5. Safety Note (if working involves heat, blades, or could be misconstrued as medical advice)',
    '- Headings MUST explicitly include "Quick" (or "Low-Energy") and "Deep"',
    '- Substitutions are always valid. Say so.',
  ],
  reflectiveEssay: [
    '',
    'Content Structure for Reflective Essay:',
    '- contentType: Set to "reflectiveEssay"',
    '1. 2–4 main sections exploring different angles of the topic',
    '2. Journaling Prompts: 3–5 open-ended questions for self-inquiry',
    '3. Gentle Closing: integration thoughts',
    '- NO ritual checklists, NO step-by-step instructions',
    '- Focus on introspection, questions, and meaning-making without turning the reader into a project',
  ],
  storyVignette: [
    '',
    'Content Structure for Story & Vignette:',
    '- contentType: Set to "storyVignette"',
    '1. 3–5 narrative sections with sensory detail and emotional arc',
    '2. Reflective Takeaway: brief closing reflection on what the story offers',
    '- Write in first-person or close third-person',
    '- NO checklists, NO prompts, NO instructional content',
    '- Focus on atmosphere, emotion, and symbolic meaning inside ordinary life',
  ],
  grimoireTarot: [
    '',
    'Content Structure for Grimoire Entry — Tarot:',
    '- contentType: Set to "grimoireTarot"',
    '1. Spread Layout or Card Overview: visual description of positions or card meaning',
    '2. Position Meanings or Interpretive Depth: detailed explanation (3–7 positions for spreads)',
    '3. Reading Tips: how to interpret connections, perspectives, or tensions in the card',
    '4. Reflection Questions: 2–3 questions to deepen the reading without treating it as prediction',
    '5. Gentle Closing: 1–2 paragraphs with integration thoughts and one internal link',
    '- Keep interpretations secular-friendly and archetypal',
    '- Focus on self-reflection rather than prediction',
  ],
  grimoireCrystal: [
    '',
    'Content Structure for Grimoire Entry — Crystal:',
    '- contentType: Set to "grimoireCrystal"',
    '1. Geological Properties: scientific facts about formation, composition, appearance',
    '2. Mindful Uses: secular, grounded applications for attention, sensory anchoring, or symbolic practice',
    '3. Care & Cleansing: how to physically care for the stone',
    '4. Pairing Ideas: what stones, practices, or intentions work well together',
    '5. Gentle Closing: 1–2 paragraphs inviting the reader to work with the stone',
    '- Balance scientific accuracy with metaphysical perspectives',
    '- NO medical claims. NO ritual checklists.',
  ],
  grimoireHerb: [
    '',
    'Content Structure for Grimoire Entry — Herb:',
    '- contentType: Set to "grimoireHerb"',
    '1. Botanical Profile: common name, plant family, brief growth notes',
    '2. Historical & Folk Use: how this herb has appeared across traditions',
    '3. Mindful Uses: secular applications — tea, smoke, tincture, kitchen, sensory anchor, or symbolic cue',
    '4. Care & Working With It: sourcing, preparation, safety notes',
    '5. Pairing Ideas: intentions, practices, or other herbs that work well alongside',
    '6. Gentle Closing: 1–2 paragraphs inviting the reader in without pressure',
    '- Be honest about what is botanical fact vs folk tradition vs personal practice',
    '- Always include safety notes around preparation and consumption',
  ],
  grimoireAstrology: [
    '',
    'Content Structure for Grimoire Entry — Astrology:',
    '- contentType: Set to "grimoireAstrology"',
    '1. Core Concepts: what this placement, sign, transit, or aspect actually means',
    '2. In Daily Life: how it shows up practically, not just symbolically',
    '3. Working With It: reflective practices, timing, intentions, and perspective shifts',
    '4. Common Misconceptions: honest, non-gatekeeping corrections',
    '5. Gentle Closing: 1–2 paragraphs that leave room for the reader\'s own experience',
    '- Treat astrology as symbolic language for self-reflection, not predictive science',
    '- Be honest about what astrology is and isn\'t',
  ],
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
    key: 'curiousExplainer',
    label: 'Curious Explainer',
    system: 'You are a thoughtful companion exploring an idea alongside the reader. You are not an authority delivering conclusions — you are someone genuinely curious about how symbols, attention, and perspective shape a life. Write practically and openly, with ideas and invitations rather than instructions or journaling prompts.',
    goal: 'A blog-style exploratory piece that helps the reader understand something and try it in their own way. Practical-curious in register. No checklists, no ritual steps, no journaling prompts — just honest exploration and a usable invitation.'
  },
  {
    key: 'practicalWorking',
    label: 'Practical Working',
    system: 'You are a careful, consent-first guide. Emphasize safety, optionality, and symbolic action as a way to choose a lens on purpose. Write like someone who has done this themselves and knows it doesn\'t always go perfectly — and that\'s fine.',
    goal: 'A practical guide to a ritual, spell, or working as reflective practice. Include both a quick/low-energy variant and a deep variant. Safety, consent, and substitutions are always acknowledged. No promised external outcomes.'
  },
  {
    key: 'reflectiveEssay',
    label: 'Reflective Essay',
    system: 'You are a thoughtful companion, not a teacher. Be genuinely curious, admit what you don\'t know, and write with the reader beside you. Leave room for the reader\'s own conclusions and their own measure of value.',
    goal: 'A reflective, secular piece aimed at questions, attention, and meaning-making. Focus on introspection and perspective rather than step-by-step instructions.'
  },
  {
    key: 'storyVignette',
    label: 'Story & Vignette',
    system: 'You are a patient narrator of ordinary symbolic moments. Write in first-person or close third. Let atmosphere arrive slowly. Don\'t rush the moment or overexplain the meaning.',
    goal: 'A narrative vignette that blends sensory detail, emotion, and reflective takeaways about attention, value, or perspective. No checklists or instructional content.'
  },
  {
    key: 'grimoireTarot',
    label: 'Grimoire Entry — Tarot',
    system: 'You are a secular tarot companion — practical, archetypal, and genuinely curious about what emerges. Treat cards as prompts, mirrors, and perspective tools, not answers. Stay unhurried.',
    goal: 'A tarot spread or card reference with positions, layout notes, and interpretive guidance. Focus on self-reflection, values, and narrative choice rather than prediction. Secular-friendly throughout.'
  },
  {
    key: 'grimoireCrystal',
    label: 'Grimoire Entry — Crystal',
    system: 'You are a careful observer who finds the geological and the meaningful equally interesting. Balance scientific accuracy with grounded, secular application and symbolic use. Don\'t oversell.',
    goal: 'A crystal profile covering geological properties, care instructions, mindful secular uses, sensory anchors, and pairing ideas. No medical claims. No ritual checklists.'
  },
  {
    key: 'grimoireHerb',
    label: 'Grimoire Entry — Herb',
    system: 'You are a grounded herbalist who respects both the botanical and the traditional without overstating either. Be honest about what is known, what is folk tradition, and what is personal symbolic practice.',
    goal: 'An herb profile covering botanical facts, historical and folk use, mindful secular applications, sensory or symbolic cues, care and preparation, and pairing ideas. Safety notes always included.'
  },
  {
    key: 'grimoireAstrology',
    label: 'Grimoire Entry — Astrology',
    system: 'You are a grounded astrology companion who treats the subject as a symbolic language for self-reflection and perspective, not a predictive science. Be honest about what astrology is and isn\'t. Correct misconceptions clearly and kindly.',
    goal: 'An astrology reference piece covering a placement, sign, transit, or aspect. Practical daily applications, reflective working suggestions, and honest correction of common misconceptions.'
  },
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
presets.ritual = presets.practicalWorking;
presets.reflection = presets.reflectiveEssay;
presets.story = presets.storyVignette;
presets.tarotSpread = presets.grimoireTarot;
presets.tarot = presets.grimoireTarot;
presets.spread = presets.grimoireTarot;
presets.crystals = presets.grimoireCrystal;
presets.spellwork = presets.practicalWorking;

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
