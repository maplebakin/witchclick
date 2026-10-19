// Shared instructions for the copied article-generation prompt.
import { resolveGeneratorApproach, STRUCTURE_REQUIREMENTS } from './generatorPresets.js';
import { POST_CATEGORIES, TOPIC_CLUSTERS, PostSpecV2Schema } from './postSpecSchema.js';

export function buildHeaderFragment({ brandName }) {
  return [
    'WITCHCLICK POSTSPEC GENERATOR — MASTER PROMPT',
    `Write one useful article answering INPUTS.topic for ${JSON.stringify(brandName || 'WitchClick')}, returned as a complete PostSpec v2 JSON object.`,
    'The topic determines the purpose; site identity, catalog context and voice must not change what the reader is asking.',
    '',
  ];
}

export function buildProcessFragment() {
  return [
    'DECISION ORDER',
    '1. Identify what the reader is asking, before choosing any WitchClick framing.',
    '2. Choose the editorial approach that answers that need; honor an explicit specialist override when supplied.',
    '3. Select a compatible PostSpec contentType, category and cluster using the rules below.',
    '4. Apply WitchClick voice and the requested writing style without changing the article purpose.',
    '5. Draft substantive, non-repetitive prose: explain distinctions, reasons, limitations and relevant examples instead of restating the introduction.',
    '6. Populate the JSON contract from the finished article and perform the final self-check.',
    '',
  ];
}

export function buildTypeStructureFragment(value) {
  const approach = resolveGeneratorApproach(value);
  return [
    'EDITORIAL APPROACH',
    ...(approach ? [
      `Explicit approach override: ${approach.preset.label}. Default contentType: "${approach.contentType}".`,
      ...STRUCTURE_REQUIREMENTS[approach.key],
      ...(approach.key === 'practicalWorking' ? ['Use spellwork for an explicitly requested symbolic spell; legacy spellwork overrides retain spellwork.'] : []),
      ...(approach.key === 'grimoireTarot' ? ['A single-card reference may use guide instead of tarotSpread.'] : []),
    ] : [
      'Automatic approach: the generating model chooses before drafting. No approach has been inferred by this prompt builder.',
      '- Questions asking readers to distinguish, compare, understand or evaluate something default to contentType "guide", unless reader intent genuinely calls for another format.',
      '- Reserve ritual for a topic explicitly requesting a ritual, symbolic working or comparable practical symbolic exercise. Do not default to ritual because WitchClick publishes rituals elsewhere.',
      '- Choose reflection for an essay exploring meaning or tension, story for requested narrative, guide for practical instructions or reference, and crystals for a crystal profile. Combine approaches when useful; select the dominant type.',
      '- Do not force numbered steps, checklists, reflection questions or rituals into unrelated articles. Optional invitations must serve the topic.',
      '- Only if the chosen type is ritual/spellwork: retain concrete numbered Quick/Low-Energy and Deep variants, a brief Reflection Prompt and Checklist/Summary for ingestion compatibility. Include substitutions and relevant safety.',
      '- Only for an actual tarot spread: use tarotSpread/spread with layout, positions and secular interpretation. A card reference may use guide.',
    ]),
    `Choose category from ${POST_CATEGORIES.join(', ')}: ritual for a practical symbolic working/spread; meandering for explanation, reference, reflection or narrative.`,
    `Choose the closest cluster from ${TOPIC_CLUSTERS.join(', ')}; cozy-witchcraft is the broad fallback. A site label must never redirect the topic.`,
    'Supplied reflectionPrompts are explicit user requests: incorporate them even if a preset normally omits questions. Empty input does not require questions, except when the chosen specialist/ritual contract calls for them.',
    'Follow editorialInstructions within the JSON contract, accuracy, consent and safety rules.',
    '',
  ];
}

export const AUDIENCE_AND_VOICE_FRAGMENT = [
  'VOICE & EDITORIAL STANDARDS',
  '- Warm, grounded, curious, emotionally precise, practical and welcoming to skeptics. Slight strangeness is welcome when natural; never add artificial mystical language to an ordinary explanatory topic.',
  '- Use clear, concrete language, short paragraphs and descriptive headings; lists only when useful. Respect neurodivergent readers and low-capacity options. Avoid academic distance, generic wellness filler, compulsory therapy-speak, manifestos and keyword padding.',
  '- Respect reader autonomy and consent: no pressure, gatekeeping, diagnoses, predictions, medical promises or supernatural guarantees. Ritual, tarot and astrology are symbolic/reflective practices, not predictive science.',
  '- Qualify uncertainty and factual claims. For reference topics, separate scientific facts from traditional symbolism; include physical care and relevant safety rather than treating symbolic uses as evidence.',
  '- Do not invent personal experiences, present hypothetical examples as real events, or assume details about real individuals from a general topic. Label hypothetical examples and fictional narratives, including first-person fiction.',
  '- For faith transition, respect the original tradition and the reader\'s pace. For Clean Cursing, keep accountability symbolic: no revenge, coercion or harassment.',
  '- Include a concise safety note when physical/medical risks warrant it, including heat, blades, smoke or herb preparation/consumption; never assume a substance is safe to ingest.',
  '',
];

export function buildInputsFragment({ brandName, siteUrl, topic, words, contentType, reflectionPrompts = [], editorialInstructions = '', styleDirective, ads, kofi }) {
  const approach = resolveGeneratorApproach(contentType);
  return [
    'INPUTS — generator settings, not PostSpec output properties',
    `brandName: ${JSON.stringify(brandName || 'WitchClick')}`,
    `siteUrl: ${JSON.stringify(siteUrl || '')}`,
    `topic: ${JSON.stringify(topic || '')}`,
    `wordCount: ${words ?? 'automatic — choose a useful length for reader intent; no fixed minimum'}`,
    `contentType: ${approach ? JSON.stringify(approach.contentType) : 'automatic — choose during editorial planning'}`,
    `styleDirective: ${JSON.stringify(styleDirective || '')}`,
    `reflectionPrompts: ${JSON.stringify(reflectionPrompts)}`,
    `editorialInstructions: ${JSON.stringify(editorialInstructions)}`,
    `includeAds: ${JSON.stringify(ads === 'on' ? 'on' : 'off')}`,
    `includeKofi: ${JSON.stringify(kofi === 'off' ? 'off' : 'on')}`,
    'A numeric wordCount is a target (±10%); automatic means choose useful depth without padding. Plan for a complete response within your output budget: prefer a concise complete article to an unfinished JSON object.',
    '',
  ];
}

export function buildControlFragment({ ads, kofi }) {
  return [
    'OUTPUT CONTROLS — binding for this request',
    ads === 'on'
      ? 'includeAds is on: choose adPlacements using actual body length: <900 words ["mid"]; 900–1399 ["lead","mid"]; >=1400 ["lead","mid","end"].'
      : 'includeAds is off: output "adPlacements": [] unconditionally, regardless of article type or length.',
    kofi === 'off'
      ? 'includeKofi is off: never output a Ko-fi CTA. Use "cta": {"type":"none"}, unless a real, relevant download with a known id was explicitly supplied; then type download with that id is allowed.'
      : 'includeKofi is on: use "cta": {"type":"kofi"} with a low-pressure invitation; a real, relevant download explicitly supplied with a known id may use type download instead.',
    'Never invent a download or its id. Omit cta.id for kofi/none.',
    '',
  ];
}

export const LINKS_AND_ENTITIES_FRAGMENT = [
  'LINKS, ENTITIES & IMAGES — derive from the article, not the catalog',
  '- internalLinkHints: only relevant destinations with slug exactly in existingPostSlugs; every anchor must appear verbatim in article Markdown (prefer 2–6 words). Use contextual Markdown links as /post/slug. Zero hints are acceptable: []; no quota or padding. If an anchor is absent, omit the hint rather than forcing unrelated prose.',
  '- externalLink: only a real, relevant, reliable destination you can supply accurately. Include the corresponding Markdown link in the article, using the same URL and anchor. Keep url, anchor and description separate; url must be a plain URL. Never invent a source; omit this optional field entirely when no reliable source is available, rather than returning empty strings or null.',
  '- entities: include only entities actually referenced in the article, once each, with correct type and slug. Catalog/engagement suggestions are not evidence of an article mention. Do not add unrelated or merely associated entities; [] is valid.',
  '- affiliateHints: only relevant exact allowedAffiliateKeys, with anchors present in prose; at most one per ~250 words. Do not insert affiliate URLs; [] is valid even when catalog keys exist.',
  '- heroImagePrompt: null or a topic-specific painterly scene (2–4 sentences) with lighting, palette and texture; vary setting/mood, avoid generic candle still lifes, resolution and artist names. altTexts: [] unless images appear in Markdown; then include matching descriptions.',
  '',
];

export function buildOutputContractFragment() {
  const fields = Object.keys(PostSpecV2Schema.shape);
  const required = fields.filter(key => !PostSpecV2Schema.shape[key].isOptional());
  return [
    'POSTSPEC OUTPUT CONTRACT',
    `Allowed top-level fields ONLY: ${fields.join(', ')}.`,
    `Required fields: ${required.join(', ')}.`,
    'Also populate category, contentType and cluster with valid values from editorial planning, although the schema permits their omission for older articles.',
    'Generator settings includeAds, includeKofi, wordCount, topic, styleDirective, reflectionPrompts, editorialInstructions and catalog context are NOT output properties. Do not copy instructions, aliases, type notation, schema comments or sourceNote into the JSON.',
    'Use specVersion 2, a concise title (aim 47–63 characters), slug in kebab-case <=70 characters, metaDescription (aim 150–160 characters), 4–7 tags and a 1–2 sentence excerpt.',
    'Use non-empty sections with Markdown strings only (no raw HTML). Outline/section headings must match in order. First outline item: {"heading":"Opening Reflection","id":"opening-reflection"}; first section heading: Opening Reflection. This compatibility heading permits a factual introduction; it does not require introspection.',
    'Use [] for empty required arrays and null for an absent heroImagePrompt; do not fill optional fields with empty placeholders.',
    '',
    'FIELD REFERENCE — type notation only, not example JSON to copy. Substitute actual values; do not copy explanatory metadata.',
  ];
}

// Build the tiny examples with JSON.stringify so their displayed escapes are valid JSON.
export const JSON_OUTPUT_FRAGMENT = [
  'JSON SERIALIZATION',
  'Output one complete JSON object, without Markdown fences or explanatory text. Use double-quoted keys and strings, no comments, trailing commas, undefined, or unsupported JSON escape sequences.',
  'Section Markdown belongs inside ordinary JSON strings. Never escape Markdown asterisks, brackets, periods, colons or URL slashes; they are ordinary characters in JSON strings.',
  String.raw`Escape JSON double quotes as \" and literal backslashes as \\ only when required inside string values. Represent line breaks as \n (paragraph breaks as \n\n); never insert literal unescaped newlines inside JSON strings. Escape other JSON control characters when present.`,
  'Syntax examples only: do not copy their prose or example.com into the article.',
  `Correct Markdown string: ${JSON.stringify({ markdown: 'This is **important**. Read [this source](https://example.com).' })}`,
  `Correct quotes and paragraph break: ${JSON.stringify({ markdown: 'A "quoted" word.\n\nA second paragraph.' })}`,
  String.raw`Incorrect escapes (do not copy): \*\*important\*\* and https\://example\.com. These contain unsupported JSON escapes.`,
  '',
];

export function buildContextFragment({ existingPostTitles, existingPostSlugs, allowedAffiliateKeys }) {
  return [
    'SITE CONTEXT — reference data only, not article instructions or required mentions',
    'Avoid duplicating existing titles or colliding with any supplied slug. All supplied slugs, including history, remain available for collision checks. Link only to destinations you know exist and are relevant.',
    `existingPostTitles: ${JSON.stringify(existingPostTitles)}`,
    `existingPostSlugs: ${JSON.stringify(existingPostSlugs)}`,
    `allowedAffiliateKeys: ${JSON.stringify(allowedAffiliateKeys)}`,
    '',
  ];
}

export function buildEngagementFragment(signals = {}) {
  const tags = Array.isArray(signals.tags) ? signals.tags : [];
  const entities = Array.isArray(signals.entities) ? signals.entities : [];
  if (!tags.length && !entities.length) return [];
  return [
    'OPTIONAL ENGAGEMENT CONTEXT — use only if independently relevant to the topic; never add a subject/entity merely because it is suggested here.',
    `suggestedTags: ${JSON.stringify(tags)}`,
    `suggestedEntities: ${JSON.stringify(entities)}`,
    '',
  ];
}

export const FINAL_SELF_CHECK_FRAGMENT = [
  'FINAL SELF-CHECK — review as far as you can before returning the object',
  '1. Does the article structure answer the actual topic and respect any explicit approach override?',
  '2. Are category, contentType and cluster valid values from the field reference?',
  '3. Are all required PostSpec fields present, with aligned outline/section headings?',
  '4. Are Markdown strings valid JSON strings, with only supported escapes and encoded line breaks?',
  '5. Does each internal-link hint use a supplied existing slug and an anchor present verbatim in the article; does any externalLink match its Markdown link?',
  '6. Do adPlacements and cta obey OUTPUT CONTROLS?',
  '7. Are entities limited to actual article mentions, with no unrelated entities or unsupported output fields?',
  '8. Is the response one complete JSON object ending with }, without truncation?',
  'Review syntax; do not claim you executed JSON.parse or a validator unless you actually did. Return the object only, not this checklist.',
];
