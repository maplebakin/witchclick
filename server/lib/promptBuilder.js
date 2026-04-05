// server/lib/promptBuilder.js
// Shared prompt builder for production + local tooling.

import { generateSchemaDocumentation } from './postSpecSchema.js';
import {
  buildHeaderFragment,
  AUDIENCE_AND_VOICE_FRAGMENT,
  VOICE_EXAMPLES_FRAGMENT,
  SECULAR_TAROT_FRAGMENT,
  NON_NEGOTIABLES_FRAGMENT,
  SEO_REQUIREMENTS_FRAGMENT,
  buildBaseValidationFragment,
  TYPE_STRUCTURE_FRAGMENT,
  RETURN_FORMAT_FRAGMENT,
  SCHEMA_HEADING_FRAGMENT,
  buildInputsFragment,
  buildEngagementFragment,
  buildProcessFragment,
  RETURN_INSTRUCTIONS_FRAGMENT,
  GOLDEN_JSON_FRAGMENT,
} from './promptFragments.js';

const DEFAULT_STRICT_RULES = [
  'STRICT JSON OUTPUT RULES (do all of these):',
  '• Output a single JSON object. No markdown fences. No preface/suffix text.',
  '• Use straight quotes (\"). Never use “smart quotes”.',
  '• Inside markdown strings, avoid unescaped double quotes; prefer single quotes or escape like \\".',
  '• Do not escape brackets/braces unless inside strings: never emit \\[ or \\{ in the top-level structure.',
  '• No trailing commas. No comments. No undefined. Use [] for empty arrays and "" for empty strings. heroImagePrompt may be null.',
  '• Title must be 47–63 characters.',
  '• Meta description must be 150–160 characters.',
  '• The first outline item and first section must be "Opening Reflection" with id "opening-reflection".',
  '• CRITICAL - externalLink format rules: "url" must be a plain URL string ONLY.',
  '• Never combine url and anchor into one string, never use markdown link syntax in the url field, and never wrap the url in brackets or parentheses.',
  '• "anchor" and "url" are always separate fields.',
  '• Valid: {"url": "https://example.com", "anchor": "text here", "description": "..."}',
  '• Invalid: {"url": "[text here](https://example.com)", ...}',
  '• Invalid: {"url": "https://example.com%22,%22anchor%22:%22text", ...}',
  '• If you cannot produce a clean url string, omit externalLink entirely rather than malforming it.',
  '• Never include a "sourceNote" field; it is an internal LLM artifact.',
  '• Start your response with "{" and end with "}".',
  '• Self-check before sending: imagine running JSON.parse on your answer. If it would fail, correct and re-emit the entire object.',
];

function sanitizeArray(input) {
  return Array.isArray(input) ? input : [];
}

export function buildMasterPrompt(options = {}) {
  const {
    topic,
    words,
    contentType,
    styleDirective,
    ads,
    kofi,
    brandName,
    siteUrl,
    existingPostTitles = [],
    existingPostSlugs = [],
    allowedAffiliateKeys = [],
    strictJsonRules = DEFAULT_STRICT_RULES,
    engagementSignals = null,
  } = options;

  const schemaDoc = generateSchemaDocumentation();

  const lines = [
    // 1) ROLE + TONE
    ...buildHeaderFragment({ brandName }),
    ...AUDIENCE_AND_VOICE_FRAGMENT,
    ...VOICE_EXAMPLES_FRAGMENT,
    ...SECULAR_TAROT_FRAGMENT,

    // 2) CONTENT RULES
    ...NON_NEGOTIABLES_FRAGMENT,
    ...SEO_REQUIREMENTS_FRAGMENT,
    ...buildBaseValidationFragment(),
    ...TYPE_STRUCTURE_FRAGMENT,
    ...buildInputsFragment({
      brandName,
      siteUrl,
      topic,
      words,
      contentType,
      styleDirective,
      ads,
      kofi,
      existingPostTitles: sanitizeArray(existingPostTitles),
      existingPostSlugs: sanitizeArray(existingPostSlugs),
      allowedAffiliateKeys: sanitizeArray(allowedAffiliateKeys),
    }),
    ...buildEngagementFragment(engagementSignals || {}),
    ...buildProcessFragment(),
    'Generate original content for all body sections. You may and should use the provided topic, post titles, and slugs naturally in context.',

    // 3) LENGTH WINDOWS
    'TARGET WORD COUNT: Write sections totaling INPUTS.wordCount words (±10%). This is the single source of truth for length. Prioritize content quality if exact count cannot be achieved.',
    'Generate title and meta description after drafting the body, then refine them to fit their required character windows.',
    'Opening Reflection should stay concise, usually 1–2 short paragraphs.',

    // 4) STRICT JSON CONTRACT
    ...RETURN_FORMAT_FRAGMENT,
    ...RETURN_INSTRUCTIONS_FRAGMENT,
    ...sanitizeArray(strictJsonRules),
    ...GOLDEN_JSON_FRAGMENT,

    // 5) SCHEMA (last)
    ...SCHEMA_HEADING_FRAGMENT,
    schemaDoc,
  ];

  return lines.join('\n');
}

export default buildMasterPrompt;
