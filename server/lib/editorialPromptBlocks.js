import {
  CONTENT_TYPES,
  ENTITY_TYPES,
  POST_CATEGORIES,
  TOPIC_CLUSTERS,
} from './postSpecSchema.js';

export const WITCHCLICK_IDENTITY_BLOCK = [
  'WitchClick identity:',
  '- WitchClick is a secular mystical publishing hub and living grimoire for symbolic self-work.',
  '- The voice is cozy, strange, grounded, emotionally precise, practical, and welcoming to skeptics.',
  '- Ritual, tarot, grimoire, and symbolic language are reflective tools for attention, meaning, boundaries, and self-understanding, not supernatural guarantees.',
];

export const ANTI_GENERIC_OUTPUT_RULES = [
  'Anti-generic rules:',
  '- Avoid generic wellness-blog language, SEO sludge, vague mystical fluff, and overpromising transformation.',
  '- Avoid clinical therapy voice, excessive disclaimers, placeholder/TODO language, and detached summary.',
  '- Do not invent source context or pretend to know more than the supplied context supports.',
  '- Do not mention that the article was generated from a stub or prompt.',
  '- When JSON is required, return JSON only with no Markdown fences.',
];

export const SOURCE_CONTEXT_USAGE_RULES = [
  'Source context usage:',
  '- Use source context as thematic grounding and internal continuity, not as material to summarize.',
  '- Connect the new piece to existing WitchClick concepts when the connection is natural.',
  '- Do not quote source excerpts excessively.',
  '- Preserve the new piece as its own useful article, not a collage of source excerpts.',
];

export const CLEAN_CURSING_SAFETY_BLOCK = [
  'Clean Cursing frame:',
  '- Clean Cursing means ethical clean refusal, truth-centered energetic return, symbolic accountability, boundary work, and emotional precision.',
  '- It is not revenge, harassment, manipulation, coercion, or a promise of supernatural harm.',
  '- Keep the work grounded in consent, accountability, protection, release, and refusal to carry what is not the reader\'s.',
];

export const RITUALS_AND_SPREADS_BLOCK = [
  'Rituals & Spreads frame:',
  '- This is practical symbolic practice, not proof that the universe will obey.',
  '- Include reflective steps, a low-energy option, a deeper version when appropriate, and closure or aftercare.',
  '- Make substitutions valid. Keep claims symbolic, accessible, and non-dogmatic.',
];

export const RITUAL_REFERENCE_GUIDE_BLOCK = [
  'Ritual/reference guide guidance:',
  '- This should read like a practical guide, not a single spell.',
  '- Include several grounding or integration methods the reader can choose from when relevant.',
  '- Include a low-energy option.',
  '- Include an aftercare or closure section.',
  '- Keep claims symbolic and reflective.',
  '- Avoid medical, psychological, or supernatural guarantees.',
  '- Make the article useful as a linked reference from other rituals.',
];

export const GRIMOIRE_REFERENCE_BLOCK = [
  'Grimoire/reference frame:',
  '- Keep it short, useful, and reference-friendly unless the topic truly needs an essay.',
  '- Include symbolic correspondences, practical uses, related practices, and gentle cautions where relevant.',
  '- Do not pad a glossary or grimoire support page into a long article just to sound substantial.',
];

export const FIELD_NOTES_BLOCK = [
  'Field Notes frame:',
  '- Write reflective, essay-like, human, and exploratory content.',
  '- Prefer meaning-making over instruction. Avoid fake certainty and heavy CTA pressure.',
  '- Let questions remain alive when the topic calls for uncertainty.',
];

export const TAROT_SAFETY_BLOCK = [
  'Tarot/spread frame:',
  '- Treat tarot as secular pattern-reading: cards are prompts, mirrors, archetypes, and story tools.',
  '- Include positions, questions, and interpretation guidance for spreads.',
  '- Do not claim the cards decide the future, reveal guaranteed truth, or override reader agency.',
];

export const POP_CULTURE_REVIEW_BLOCK = [
  'Pop-culture/game reflection frame:',
  '- Treat pop-culture pieces as optional editorial experiments, not generic reviews.',
  '- Connect play, attention, ritual, symbolism, comfort, or meaning-making to WitchClick only when the fit is intentional.',
  '- Do not generate a standalone media article without editorial approval when the stub is only an exact title mention.',
];

export function renderPostSpecV2Skeleton({
  title = '',
  slug = '',
  category = 'ritual',
  contentType = 'ritual',
  cluster = 'rituals-practices',
  includeExternalLink = false,
} = {}) {
  const safeCategory = POST_CATEGORIES.includes(category) ? category : 'ritual';
  const safeContentType = CONTENT_TYPES.includes(contentType) ? contentType : 'ritual';
  const safeCluster = TOPIC_CLUSTERS.includes(cluster) ? cluster : 'rituals-practices';
  const skeleton = {
    specVersion: 2,
    title,
    slug,
    category: safeCategory,
    contentType: safeContentType,
    cluster: safeCluster,
    metaDescription: '',
    tags: [],
    excerpt: '',
    outline: [
      {
        heading: '',
        id: '',
      },
    ],
    sections: [
      {
        heading: '',
        markdown: '',
      },
    ],
    entities: [],
    heroImagePrompt: '',
    altTexts: [],
    internalLinkHints: [],
    affiliateHints: [],
    cta: {
      type: 'none',
    },
    adPlacements: [],
  };

  if (includeExternalLink) {
    skeleton.externalLink = {
      url: '',
      anchor: '',
      description: '',
    };
  }

  return JSON.stringify(skeleton, null, 2);
}

export function renderEntityJsonSkeleton({ type = '', slug = '', name = '' } = {}) {
  const safeType = ENTITY_TYPES.includes(type) ? type : 'ritual';
  return JSON.stringify({
    type: safeType,
    name,
    slug,
    summary: '',
    properties: {},
    related: [],
  }, null, 2);
}

export function buildContentIntentBlock({ purpose, readerNeed, role }) {
  return [
    'Content intent:',
    `- What this piece is for: ${purpose || 'Help the reader understand and use the topic in a WitchClick-native way.'}`,
    `- Reader need: ${readerNeed || 'A clear, grounded next step or reflective lens without pressure or certainty theater.'}`,
    `- Role on WitchClick: ${role || 'A useful article that belongs in the living grimoire and can support internal links.'}`,
  ];
}
