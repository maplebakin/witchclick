// server/lib/promptFragments.js
// Shared prompt fragments for buildMasterPrompt.

import { buildBaseFields, STRUCTURE_REQUIREMENTS, generatorPresetOptions } from './generatorPresets.js';

function formatScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  const fixed = score.toFixed(2);
  return fixed.replace(/\.0+$/, '').replace(/0+$/, '');
}

function formatTagSignal(signal) {
  if (!signal) return null;
  const tag = String(signal.tag || signal.name || signal.value || '').trim();
  if (!tag) return null;
  const details = [];
  const score = formatScore(signal.score ?? signal.weight ?? signal.priority ?? null);
  if (score) details.push(`score ${score}`);
  const recency = Number.isFinite(signal.recencyDays) ? Math.round(signal.recencyDays) : null;
  if (typeof recency === 'number' && recency > 0) {
    details.push(`${recency}d since feature`);
  }
  const note = String(signal.reason || signal.note || signal.notes || '').trim();
  if (note) details.push(note);
  return details.length ? `${tag} (${details.join(' — ')})` : tag;
}

function formatEntitySignal(signal) {
  if (!signal) return null;
  const slug = String(signal.slug || signal.id || '').trim();
  const label = String(signal.name || signal.label || slug).trim();
  const type = String(signal.type || signal.kind || '').trim();
  if (!slug && !label) return null;
  const head = type ? `${type}: ${label || slug}` : (label || slug);
  const details = [];
  const score = formatScore(signal.score ?? signal.weight ?? signal.priority ?? null);
  if (score) details.push(`score ${score}`);
  const recency = Number.isFinite(signal.recencyDays) ? Math.round(signal.recencyDays) : null;
  if (typeof recency === 'number' && recency > 0) {
    details.push(`${recency}d since mention`);
  }
  const note = String(signal.reason || signal.note || signal.notes || '').trim();
  if (note) details.push(note);
  const appendix = details.length ? ` (${details.join(' — ')})` : '';
  return `${head}${appendix}`;
}

export function buildHeaderFragment({ brandName }) {
  const safeBrand = brandName || 'WitchClick';
  return [
    'WITCHCLICK PASSIVE-INCOME POST GENERATOR — MASTER PROMPT',
    '(Role, rules, inputs, and JSON contract. Paste this whole thing into a fresh chat, then edit the INPUTS block.)',
    '',
    `—you are my Head of Content Ops, SEO, and Affiliate Strategy for a metaphysical blog called "${safeBrand}". Your job is to produce a single, production-ready article spec that maximizes search intent coverage, internal linking potential, and affiliate conversion while staying gentle, ethical, and cozy.`,
    '',
  ];
}

export const AUDIENCE_AND_VOICE_FRAGMENT = [
  'AUDIENCE & VOICE',
  '• Audience: spiritual, planner-loving, neurodivergent, cottagecore; cozy gamers and creatives welcome.',
  '• Voice: write like a gentle, imperfect guide — a friend sharing what helped them, not a guru giving decrees.',
  '• Tone rules:',
  '  - Practical, kind, and honest; admit uncertainty; invite adaptation.',
  '  - Use playful metaphors from games, cozy rituals, and everyday life.',
  '  - Avoid absolutes or predictions; empower reader choice.',
  '• Reading level: Grade 6–8 (simple sentences; concrete verbs; short paragraphs).',
  '',
];

export const VOICE_EXAMPLES_FRAGMENT = [
  'VOICE EXAMPLES',
  '• Good: "I brewed chamomile tea and shuffled slowly, letting my shoulders drop; here’s how the cards nudged me forward."',
  '• Good: "Think of this like a cozy side-quest — you can pause, tweak, or skip steps based on your spoons today."',
  '• Bad: "This ritual guarantees abundance if you follow every instruction exactly."',
  '• Bad: "Only true witches will understand the power of this spread."',
  '',
];

export const SECULAR_TAROT_FRAGMENT = [
  'SECULAR TAROT CLAUSE',
  '• When writing about tarot: treat it as a tool for reflection and creativity, not prediction.',
  '• Present cards as prompts/archetypes/characters. If traditional meanings appear, pair with open-ended interpretations.',
  '• Avoid implying divine insight or supernatural accuracy; focus on noticing feelings, options, and narratives.',
  '',
];

export const NON_NEGOTIABLES_FRAGMENT = [
  'NON-NEGOTIABLES',
  '• Markdown-only (no raw HTML).',
  '• All section content must be markdown strings inside the JSON object — not a separate markdown document.',
  '• Accessibility-first: short paragraphs, scannable lists; include a checklist box.',
  '• Avoid medical/health claims; add a gentle safety note if content could be misconstrued as medical/therapeutic or if fire/sharp objects are involved.',
  '• Faith transition and deconstruction topics: Write with extra care. Acknowledge that leaving or questioning a religious tradition can be emotionally complex. Never mock or minimize the original tradition. Center the reader\'s autonomy and pace. Avoid triumphalist "I escaped religion" framing; prefer curious, tender, non-prescriptive language.',
  '• Use inclusive language; no gendered assumptions; no gatekeeping.',
  '• Keep outline and section ordering aligned so each heading maps cleanly.',
  '',
];

export const SEO_REQUIREMENTS_FRAGMENT = [
  'SEO REQUIREMENTS (critical for ranking and discoverability):',
  '',
  '1. OPENING PARAGRAPH (SEO-friendly intro):',
  '   • Place directly under the hero image (in the Opening Reflection section).',
  '   • Summarize what the post is about in 2-3 sentences.',
  '   • Mention the main topic (tarot/spread/ritual/clean cursing/etc.).',
  '   • Include one keyword cluster naturally.',
  '   • Maintain your poetic, symbolic, conversational voice—no stiff SEO-speak.',
  '   • Example: "This spread explores the symbolic threshold where human intuition and machine insight meet, offering a reflective way to map your own creative emergence."',
  '',
  '2. INTERNAL LINKS (5-8 required):',
  '   • Naturally embed 5-8 internal links within body paragraphs.',
  '   • Link to: category pillar pages, related spreads/rituals, concept explainers, tarot primers, shadow work pages, clean cursing posts, or cluster hubs.',
  '   • Use the provided existingPostTitles and existingPostSlugs to create contextual links.',
  '   • Format: [anchor text](/post/slug-name)',
  '',
  '3. EXTERNAL LINK (1 required):',
  '   • Include ONE authoritative external reference.',
  '   • Examples: Wikipedia article on relevant archetype, trusted article about tarot symbolism, source on psychology/mythology, narrative identity research.',
  '   • Signals expertise, research, and authority.',
  '   • Include the external link in TWO places:',
  '     1. Embedded naturally in the markdown body or in a dedicated Further Reading section.',
  '     2. Also in the top-level externalLink JSON field with url, anchor, and description.',
  '   • Markdown format: [anchor text](https://example.com)',
  '',
  '4. TOPIC CLUSTER:',
  '   • Choose the most appropriate cluster from: tarot-spreads, rituals-practices, clean-cursing, ai-narrative-magic, shadow-work, cozy-witchcraft, motherquest, spellcraft-theory, magical-productivity.',
  '   • This will appear as a badge on the page.',
  '   • Add to JSON: "cluster": "tarot-spreads"',
  '',
  '5. CONCLUSION SECTION (required):',
  '   • Add a final heading like "Conclusion", "Wrap-up", "Closing Reflection", or "Keep Going".',
  '   • 2-3 paragraphs that:',
  '     - Summarize meaning',
  '     - Extend an invitation',
  '     - Give emotional closure',
  '     - Include ONE internal link',
  '     - Include ONE keyword reference',
  '   • Example: "Return to this spread whenever you feel a shift in your creative identity or your relationship with technology. It will meet you wherever you are—half magic, half machinery, fully yours."',
  '',
  '6. META INFORMATION:',
  '   • Ensure all required meta is present: publishedAt, readingMinutes, author, tags (3-5).',
  '   • These appear on-page and are trust signals for Google.',
  '',
  '7. CONTENT DEPTH:',
  '   • Deeply reflective language, layered metaphor, real substance.',
  '   • Google rewards longform witchcraft content.',
  '',
  '8. SEMANTIC STRUCTURE:',
  '   • Clear h1 (title), h2 (major sections), h3 (subsections).',
  '   • Paragraphs between headers, bullet lists when needed.',
  '   • Improves accessibility and indexing clarity.',
  '',
];

export function buildBaseValidationFragment() {
  return [
    'BASE VALIDATION (applies to every PostSpec):',
    ...buildBaseFields(),
    '- heroImagePrompt may be null; altTexts only required when images appear in markdown.',
    '',
  ];
}

export const BASE_VALIDATION_FRAGMENT = buildBaseValidationFragment();

function buildTypeStructureFragment() {
  const sections = [];
  sections.push('TYPE-SPECIFIC STRUCTURE CONTRACTS (apply the block that matches your chosen contentType):');
  for (const { key, label } of generatorPresetOptions) {
    const requirements = STRUCTURE_REQUIREMENTS[key] || [];
    sections.push('');
    sections.push(`${label.toUpperCase()} — set contentType: "${key}"`);
    if (!requirements.length) {
      sections.push('  • No additional structure requirements beyond the base validation.');
      continue;
    }
    for (const line of requirements) {
      if (!line) {
        sections.push('');
        continue;
      }
      sections.push(`  ${line}`);
    }
  }
  sections.push('');
  return sections;
}

export const TYPE_STRUCTURE_FRAGMENT = buildTypeStructureFragment();

export const RETURN_FORMAT_FRAGMENT = [
  'RETURN FORMAT',
  '• Return JSON ONLY. No backticks, no commentary. Valid JSON, double-quoted keys/strings.',
  '• Return a JSON object that can be normalized into PostSpec v2. Common field aliases are accepted. The server handles normalization.',
  '',
];

export const SCHEMA_HEADING_FRAGMENT = [
  'SCHEMA (PostSpec v2)',
];

export function buildInputsFragment({
  brandName,
  siteUrl,
  topic,
  words,
  contentType,
  styleDirective,
  ads,
  kofi,
  existingPostTitles,
  existingPostSlugs,
  allowedAffiliateKeys,
}) {
  const resolvedContentType =
    typeof contentType === 'string' && contentType.trim()
      ? contentType.trim()
      : 'ritual';

  return [
    'INPUTS',
    `brandName: "${brandName}"`,
    `siteUrl: "${siteUrl}"`,
    `topic: "${topic}"`,
    `wordCount: ${words}`,
    `contentType: "${resolvedContentType}" (match the selected template/content type unless you intentionally need a different structure)`,
    styleDirective ? `styleDirective: "${styleDirective}"` : 'styleDirective: ""',
    `includeAds: "${ads}"`,
    `includeKofi: "${kofi}"`,
    `existingPostTitles: ${JSON.stringify(existingPostTitles)}`,
    `existingPostSlugs: ${JSON.stringify(existingPostSlugs)}`,
    `allowedAffiliateKeys: ${JSON.stringify(allowedAffiliateKeys)}`,
    '',
  ];
}

export function buildEngagementFragment(signals = {}) {
  const tags = Array.isArray(signals.tags) ? signals.tags.map(formatTagSignal).filter(Boolean) : [];
  const entities = Array.isArray(signals.entities) ? signals.entities.map(formatEntitySignal).filter(Boolean) : [];
  if (!tags.length && !entities.length) {
    return [];
  }
  const lines = ['ENGAGEMENT FOCUS (bias ideation toward under-served areas):'];
  if (tags.length) {
    lines.push(`• Tags to uplift: ${tags.join('; ')}.`);
  }
  if (entities.length) {
    lines.push(`• Entities worth weaving: ${entities.join('; ')}.`);
  }
  lines.push('');
  return lines;
}

export function buildProcessFragment() {
  return [
    'PROCESS & CONSTRAINTS (follow step-by-step)',
    '1) Search intent & slug',
    '   • Infer primary intent + 2 secondary intents from the topic.',
    '   • Draft a slug in kebab-case reflecting the primary intent; avoid collisions with existingPostTitles and existingPostSlugs.',
    '2) Title, contentType & meta',
    '   • Title 47–63 chars with primary keyword.',
    '   • Set contentType to match the content structure you will generate. Choose from ritual, reflection, story, tarotSpread, spellwork, or crystals.',
    '   • Meta 150–160 chars; cozy, non-clickbait.',
    '3) Tags & excerpt',
    '   • 4–7 tags. Excerpt 1–2 sentences that entice the click without hype.',
    '4) Outline',
    '   • The FIRST outline item must be {"heading":"Opening Reflection","id":"opening-reflection"}, and the FIRST section must use "heading":"Opening Reflection".',
    '   • Outline headings must match section headings character-for-character.',
    '   • After the Opening Reflection, follow the TYPE-SPECIFIC STRUCTURE CONTRACT for your chosen contentType (see above).',
    '5) Sections',
    '   • Keep paragraphs short, enforce numbered steps or narrative flow as required by the type-specific contract (e.g., numbered Quick/Deep steps for rituals, journaling prompts for reflections).',
    '   • Include a gentle safety note whenever the TYPE-SPECIFIC contract or safety triggers apply.',
    '5b) Entities extraction',
    '   • Identify crystals, herbs, tarot cards, moon phases, planetary days, and rituals named in the markdown; add them once with correct type/slug.',
    '6) Alt texts & optional image',
    '   • If images are referenced in markdown, provide equal-or-greater altTexts; else []. Set heroImagePrompt to a descriptive scene OR null.',
    '7) Internal links (hints)',
    '   • Provide 5–8 internalLinkHints objects as {"anchor","slug","rationale"}.',
    '   • Anchors are 2–6 words and must appear verbatim in the sections; slug must match one value from existingPostSlugs exactly.',
    '   • If no matching existingPostSlugs value exists, omit the hint rather than inventing a slug.',
    '8) Affiliate strategy (hints only; do not insert links)',
    '   • ≤ 1 recommendation per ~250 words. Zero is acceptable. Do not invent or paraphrase keys. Requires: "key" ∈ allowedAffiliateKeys verbatim (case-sensitive match), else omit the hint. If no relevant keys, set affiliateHints: [].',
    '9) CTA & ads',
    '   • CTA: If includeKofi="on" return {"type":"kofi"}; if a download is relevant, include id and {"type":"download"}; otherwise {"type":"none"}. Never supply an id for kofi/none.',
    '   • Ads: If includeAds="off", return []. If "on", choose placements based on wordCount buckets — <900 words: ["mid"], 900–1399: ["lead","mid"], ≥1400: ["lead","mid","end"].',
    '10) Quality gate',
    '   • Verify: tags count 4–7; each section heading matches outline exactly; mandatory headings present (Quick/Low-Energy, Deep, Reflection Prompt, Checklist/Summary, Safety Note when triggered).',
    '   • Ensure 5–8 internalLinkHints objects with anchor+slug+rationale; each slug comes from existingPostSlugs exactly and each anchor appears verbatim in markdown.',
    '   • Confirm the external link appears in BOTH places: markdown body/Further Reading and top-level externalLink { url, anchor, description }.',
    '   • Confirm entities extracted once each with correct type/slug; ≤1 affiliate anchor per ~250 words; CTA/ad rules satisfied based on include toggles and wordCount buckets; altTexts count matches referenced images; heroImagePrompt null unless clearly described; no raw HTML; tone matches voice examples.',
    '',
  ];
}

export const RETURN_INSTRUCTIONS_FRAGMENT = [
  'RETURN INSTRUCTIONS',
  '• Return a single valid JSON object that can be normalized into PostSpec v2.',
  '• Fill fields coherently and keep structure internally consistent.',
  '',
];

export const GOLDEN_JSON_FRAGMENT = [
  'GOLDEN JSON EXAMPLE (minimally valid shape — copy the structure, not the content):',
  '{"specVersion":2,"title":"Cozy Moon Bath Journal","slug":"cozy-moon-bath-journal","contentType":"ritual","cluster":"rituals-practices","metaDescription":"Soak, journal, and reset with a moonlit bath ritual that adapts to your spoons.","tags":["ritual","self-care","moon","journaling"],"excerpt":"Create a gentle moon bath ritual with low-energy and deep-dive paths.","outline":[{"heading":"Opening Reflection","id":"opening-reflection"},{"heading":"Quick Moon Bath Variant","id":"quick-moon-bath-variant"},{"heading":"Deep Moon Bath Variant","id":"deep-moon-bath-variant"},{"heading":"Reflection Prompt","id":"reflection-prompt"},{"heading":"Moon Bath Checklist","id":"moon-bath-checklist"},{"heading":"Gentle Safety Note","id":"gentle-safety-note"}],"sections":[{"heading":"Opening Reflection","markdown":"Two short paragraphs..."},{"heading":"Quick Moon Bath Variant","markdown":"1. Step one..."},{"heading":"Deep Moon Bath Variant","markdown":"1. Step one..."},{"heading":"Reflection Prompt","markdown":"### Reflection Prompt\nWhat surprised you..."},{"heading":"Moon Bath Checklist","markdown":"- Item one"},{"heading":"Gentle Safety Note","markdown":"Keep water warm, not hot..."}],"entities":[{"type":"crystal","slug":"rose-quartz"}],"heroImagePrompt":null,"altTexts":[],"internalLinkHints":[{"anchor":"journaling practice","slug":"journaling","rationale":"Link to the journaling post for deeper reflection support."}],"externalLink":{"url":"https://en.wikipedia.org/wiki/Moon","anchor":"moon phase reference","description":"Background context for lunar cycles."},"affiliateHints":[{"key":"mindfulness-journal","anchor":"reflection journal","rationale":"Natural fit for journaling content — a quality journal for tracking insights."}],"cta":{"type":"kofi"},"adPlacements":["lead","mid"]}',
];

export default {
  buildHeaderFragment,
  AUDIENCE_AND_VOICE_FRAGMENT,
  VOICE_EXAMPLES_FRAGMENT,
  SECULAR_TAROT_FRAGMENT,
  NON_NEGOTIABLES_FRAGMENT,
  BASE_VALIDATION_FRAGMENT,
  TYPE_STRUCTURE_FRAGMENT,
  RETURN_FORMAT_FRAGMENT,
  SCHEMA_HEADING_FRAGMENT,
  buildInputsFragment,
  buildEngagementFragment,
  buildProcessFragment,
  RETURN_INSTRUCTIONS_FRAGMENT,
  GOLDEN_JSON_FRAGMENT,
};
