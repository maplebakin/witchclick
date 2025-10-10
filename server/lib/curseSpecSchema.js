// server/lib/curseSpecSchema.js
// Schema and helpers for White Magic Curses workflow.

import { z } from 'zod';

export const CURSE_TYPES = ['reveal', 'return', 'mirror', 'sever', 'echo'];
export const CURSE_TARGETS = ['space', 'person', 'dynamic', 'memory', 'habit'];
export const CURSE_TONES = ['gentle', 'poetic', 'scathing', 'restrained'];
export const CURSE_TAGS = [
  'white-magic',
  'ethical-curse',
  'returning-energy',
  'truthwork',
  'mirrorcasting',
  'clean-cursing',
];

function wordCount(input) {
  const str = String(input || '').trim();
  if (!str) return 0;
  return str
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean).length;
}

function enforceWordRange(label, min, max) {
  return z
    .string()
    .min(1, `${label} is required`)
    .transform((value) => value.trim())
    .refine(
      (value) => {
        const count = wordCount(value);
        return count >= min && count <= max;
      },
      `${label} must be between ${min} and ${max} words`,
    );
}

function enforceCharacterRange(label, min, max) {
  return z
    .string()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .transform((value) => value.trim());
}

function enforceSingleLine(label) {
  return z
    .string()
    .min(1, `${label} is required`)
    .transform((value) => value.trim())
    .refine((value) => !/\r|\n/.test(value), `${label} must be a single line`);
}

export const CurseGeneratorInputSchema = z.object({
  type: z.enum(CURSE_TYPES),
  target: z.enum(CURSE_TARGETS),
  tone: z.enum(CURSE_TONES),
  sigilName: z
    .string()
    .trim()
    .min(1, 'Sigil name must be at least 1 character')
    .max(80, 'Sigil name must be at most 80 characters')
    .optional(),
  altarItem: z
    .string()
    .trim()
    .min(1, 'Altar item must be at least 1 character')
    .max(80, 'Altar item must be at most 80 characters')
    .optional(),
  journalingFollowUp: z
    .string()
    .trim()
    .min(1, 'Journaling follow-up must be at least 1 character')
    .max(160, 'Journaling follow-up must be at most 160 characters')
    .optional(),
});

const TagsSchema = z
  .array(z.enum(CURSE_TAGS))
  .length(CURSE_TAGS.length, 'Tags must include the canonical curse tags')
  .refine((value) => {
    const seen = new Set(value);
    return CURSE_TAGS.every((tag) => seen.has(tag));
  }, 'Tags must include all canonical curse tags exactly once');

export const CurseSpecSchema = z.object({
  specVersion: z.literal(1),
  title: enforceCharacterRange('Title', 50, 60),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case (lowercase, numbers, hyphen)'),
  openingReflection: enforceWordRange('Opening reflection', 75, 100),
  invocation: enforceSingleLine('Invocation'),
  method: enforceWordRange('Method', 150, 200),
  closure: enforceWordRange('Closure / aftercare', 50, 75),
  safetyNotes: z
    .string()
    .trim()
    .min(20, 'Safety notes must be at least 20 characters')
    .max(200, 'Safety notes must be at most 200 characters')
    .optional(),
  generator: CurseGeneratorInputSchema,
  tags: TagsSchema,
});

const DOC_LINES = [
  '{',
  '  "specVersion": 1,',
  '  "title": string (50-60 chars),',
  '  "slug": string (kebab-case),',
  '  "openingReflection": string (75-100 words),',
  '  "invocation": string (single line),',
  '  "method": string (150-200 words),',
  '  "closure": string (50-75 words),',
  '  "safetyNotes"?: string (20-200 chars),',
  '  "generator": {',
  '    "type": "reveal"|"return"|"mirror"|"sever"|"echo",',
  '    "target": "space"|"person"|"dynamic"|"memory"|"habit",',
  '    "tone": "gentle"|"poetic"|"scathing"|"restrained",',
  '    "sigilName"?: string,',
  '    "altarItem"?: string,',
  '    "journalingFollowUp"?: string',
  '  },',
  '  "tags": ["white-magic", "ethical-curse", "returning-energy", "truthwork", "mirrorcasting", "clean-cursing"]',
  '}',
];

export function generateCurseSchemaDocumentation() {
  return DOC_LINES.join('\n');
}

export function countWords(value) {
  return wordCount(value);
}

export default CurseSpecSchema;
