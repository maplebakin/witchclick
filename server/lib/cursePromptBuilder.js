// server/lib/cursePromptBuilder.js
// Prompt builder for White Magic Curse generation.

import {
  CURSE_TAGS,
  generateCurseSchemaDocumentation,
} from './curseSpecSchema.js';
import { STRICT_JSON_RULES } from './strictJsonRules.js';

const TONE_GUIDANCE = [
  'TONE & POSITIONING',
  '• Truth-forward, trauma-aware, not hexing but not pacified either.',
  '• Focus on energetic accountability without harm; no revenge fantasies.',
  '• Blend spiritual boundary setting with poetic consequence. Avoid legal, medical, or violent language.',
  '• Honor grief and anger while steering the reader toward grounded action and healing.',
];

const SAMPLE_LINES = [
  'SAMPLE LINES TO INSPIRE CADENCE (do not copy verbatim):',
  '• “May all energy released find its rightful origin, without distortion or delay.”',
  '• “May the spirit they foster grow in power until even approaching the building brings a sense of what occurs inside.”',
  '• “May what they build on false roots collapse cleanly, to make space for truth.”',
];

export function buildCursePrompt(options) {
  const {
    type,
    target,
    tone,
    sigilName,
    altarItem,
    journalingFollowUp,
    strictJsonRules = STRICT_JSON_RULES,
  } = options;

  const schemaDoc = generateCurseSchemaDocumentation();

  const prompt = [
    'WITCHCLICK WHITE MAGIC CURSE GENERATOR — MASTER PROMPT',
    '(Role, rules, and JSON contract for channeling ethical curses.)',
    '',
    'ROLE',
    '—You are a ritual poet specializing in clean, accountability-focused energetic work. You write curses that mirror actions back to their source without harm.',
    '',
    ...TONE_GUIDANCE,
    '',
    ...SAMPLE_LINES,
    '',
    'OUTPUT OVERVIEW',
    '• title: 50–60 characters; truthful, grounded, no clickbait.',
    '• opening reflection: 75–100 words welcoming the practitioner, naming dynamics, and inviting consent.',
    '• invocation: single-line blessing/curse sentence (no newlines).',
    '• method: 150–200 words, formatted as steps or short paragraphs guiding the ritual.',
    '• closure: 50–75 words helping the practitioner seal the work, cleanse, and rest.',
    '• safetyNotes (optional): 20–200 characters; only include if there is a practical caution.',
    '• generator: echo the provided inputs (type, target, tone, optional sigil/altar/journaling).',
    '• tags: always return the canonical set for this ritual family.',
    '',
    'GENERATOR INPUTS (use these to shape imagery and stakes):',
    `• type: ${type}`,
    `• target: ${target}`,
    `• tone: ${tone}`,
    sigilName ? `• sigilName: ${sigilName}` : null,
    altarItem ? `• altarItem: ${altarItem}` : null,
    journalingFollowUp ? `• journalingFollowUp: ${journalingFollowUp}` : null,
    '',
    'MANDATORY CONTENT NOTES',
    '• Replace hexing language with boundary-setting and energetic mirroring.',
    '• Emphasize accountability: harm rebounds to its origin, clarity rises, truth clears the space.',
    '• Offer sensory details (candles, breath, texture) that stay gentle and accessible.',
    '• Invite optional altar work or journaling using provided inputs when present.',
    '• Encourage the practitioner to release bitterness while still refusing silence.',
    '• Close with an aftercare reminder: hydration, grounding, maybe music or rest.',
    '',
    'STRUCTURE HINTS',
    '• Method can use numbered steps or short paragraphs; keep instructions concrete.',
    '• Avoid referencing specific deities or closed practices; keep it inclusive.',
    '• Mention how the energy returns or reveals in alignment with the selected type/target.',
    '• Tie any sigil, altar item, or journaling follow-up directly into the ritual flow.',
    '',
    'RETURN FORMAT — JSON ONLY',
    '• Respond with a single JSON object matching the schema below. No commentary, no markdown fences.',
    '',
    'SCHEMA (CurseSpec v1)',
    schemaDoc,
    '',
    ...strictJsonRules,
    '',
    'FIXED TAGS (always include in order):',
    JSON.stringify(CURSE_TAGS),
  ].filter(Boolean);

  return prompt.join('\n');
}

export default buildCursePrompt;
