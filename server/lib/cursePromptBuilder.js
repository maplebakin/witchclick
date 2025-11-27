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
    topic,
    sigilName,
    altarItem,
    journalingFollowUp,
    strictJsonRules = STRICT_JSON_RULES,
  } = options;

  const schemaDoc = generateCurseSchemaDocumentation();

  const prompt = [
    'WITCHCLICK WHITE MAGIC CURSE GENERATOR — MASTER PROMPT',
    '(Archive-only; print/PDF. Role, rules, and JSON contract for ethical curses.)',
    '',
    // 1) ROLE + TONE
    'ROLE',
    '—You are a ritual poet specializing in clean, accountability-focused energetic work. You write curses that mirror actions back to their source without harm.',
    '',
    ...TONE_GUIDANCE,
    '',
    ...SAMPLE_LINES,
    '',
    // 2) CONTENT RULES
    'CONTENT RULES',
    '• Replace hexing language with boundary-setting and energetic mirroring.',
    '• Emphasize accountability: harm rebounds to its origin, clarity rises, truth clears the space.',
    '• Offer sensory details (candles, breath, texture) that stay gentle and accessible.',
    '• Invite optional altar work or journaling using provided inputs when present.',
    '• Encourage the practitioner to release bitterness while still refusing silence.',
    '• Weave the specified topic into the stakes, imagery, and aftercare without drifting into unrelated themes.',
    '• No internal links, CTAs, or ads—this is for a print/PDF manual archive, not the web.',
    '• Never reuse, paraphrase, or reformat any text the user provides. Generate original content for every field.',
    '',
    'GENERATOR INPUTS (use these to shape imagery and stakes):',
    `• type: ${type}`,
    `• target: ${target}`,
    `• tone: ${tone}`,
    topic ? `• topic: ${topic}` : null,
    sigilName ? `• sigilName: ${sigilName}` : null,
    altarItem ? `• altarItem: ${altarItem}` : null,
    journalingFollowUp ? `• journalingFollowUp: ${journalingFollowUp}` : null,
    '',
    // 3) LENGTH WINDOWS
    'LENGTH WINDOWS (COUNT LITERALLY — NO ESTIMATES):',
    '• If any field violates its length rules, the entire output is invalid. Regenerate internally until every field meets its exact window before returning JSON.',
    '• Title: 5–13 words. Count words literally. Generate the title only after all other fields are written, then adjust its length last to fit.',
    '• OpeningReflection: 80–110 words. If you generate more or fewer words, shrink or expand it while maintaining tone.',
    '• Invocation: single line, max 16 words.',
    '• Method: 130–260 words.',
    '• Closure & Aftercare: 50–120 words.',
    '• SafetyNotes (optional): 25–200 characters.',
    '• Tags: canonical set exactly once, in order.',
    '• Count words literally. Do not approximate or estimate.',
    '',
    // 4) STRICT JSON CONTRACT
    'STRICT JSON CONTRACT',
    '• Respond with a single JSON object matching the schema. No commentary, no markdown fences.',
    '• START with "{" and END with "}". Double quotes only. No trailing commas. No comments. No undefined.',
    '• If any field is out of range, regenerate internally before returning.',
    '• Self-check: imagine running JSON.parse on your answer; fix and re-emit if it would fail.',
    ...strictJsonRules,
    '',
    'FIXED TAGS (always include in order):',
    JSON.stringify(CURSE_TAGS),
    '',
    // 5) SCHEMA (CurseSpec v1) — last
    'SCHEMA (CurseSpec v1)',
    schemaDoc,
  ].filter(Boolean);

  return prompt.join('\n');
}

export default buildCursePrompt;
