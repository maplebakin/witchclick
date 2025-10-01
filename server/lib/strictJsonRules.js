export const STRICT_JSON_RULES = [
  'STRICT JSON OUTPUT RULES (do all of these):',
  '• Output a single JSON object. No markdown fences. No preface/suffix text.',
  '• Use straight quotes ("). Never use “smart quotes”.',
  '•Inside all markdown strings, avoid unescaped double quotes; prefer single quotes or escape like \\" within JSON strings.',
  '• Do not escape brackets/braces unless inside strings: never emit \\[ or \\{ in the top-level structure.',
  '• No trailing commas. No comments. No undefined. Use [] for empty arrays and "" for empty strings. heroImagePrompt may be null.',
  '• Start your response with "{" and end with "}".',
  '• Self-check before sending: imagine running JSON.parse on your answer. If it would fail, correct and re-emit the entire object.',
  '',
  'GOLDEN JSON EXAMPLE (minimally valid shape — copy the structure, not the content):',
  '{"specVersion":2,"title":"t","slug":"t","metaDescription":"t","tags":["a","b","c","d"],"excerpt":"t","outline":[{"heading":"Opening Reflection","id":"opening-reflection"}],"sections":[{"heading":"Opening Reflection","markdown":"M"}],"entities":[],"heroImagePrompt":null,"altTexts":[],"internalLinkHints":[{"anchor":"a","rationale":"r"}],"affiliateHints":[{"key":"ritual-journal","anchor":"a","rationale":"r"}],"cta":{"type":"none"},"adPlacements":[]}'
];

export default STRICT_JSON_RULES;
