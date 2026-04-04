// server/lib/postSpecSchema.js
// Canonical PostSpec v2 schema and documentation helpers.

import { z } from 'zod';

export const ENTITY_TYPES = ['crystal', 'herb', 'moonPhase', 'planet', 'tarot', 'spread', 'planetaryDay', 'ritual'];
export const CONTENT_TYPES = ['ritual', 'guide', 'spread', 'reflection', 'story', 'tarotSpread', 'spellwork', 'crystals'];
export const POST_CATEGORIES = ['ritual', 'meandering'];
export const TOPIC_CLUSTERS = [
  'tarot-spreads',
  'rituals-practices',
  'clean-cursing',
  'ai-narrative-magic',
  'shadow-work',
  'cozy-witchcraft',
  'motherquest',
  'spellcraft-theory',
  'magical-productivity'
];

export const EntityTypeSchema = z.enum(ENTITY_TYPES);
export const PostContentTypeSchema = z.enum(CONTENT_TYPES);
export const PostCategorySchema = z.enum(POST_CATEGORIES);
export const TopicClusterSchema = z.enum(TOPIC_CLUSTERS);

const OutlineItemSchema = z.object({
  heading: z.string().min(1),
  id: z.string().min(1),
});

const SectionSchema = z.object({
  heading: z.string().min(1),
  markdown: z.string().min(1),
});

const EntitySchema = z.object({
  type: EntityTypeSchema,
  slug: z.string().min(1),
});

const InternalLinkHintSchema = z.object({
  anchor: z.string().min(1),
  rationale: z.string().min(1),
});

const AffiliateHintSchema = z.object({
  key: z.string().min(1),
  anchor: z.string().min(1),
  rationale: z.string().min(1),
});

const CtaSchema = z.object({
  type: z.enum(['kofi', 'download', 'none']),
  id: z.string().min(1).optional(),
});

const AdPlacementSchema = z.enum(['lead', 'mid', 'end']);

const ExternalLinkSchema = z.object({
  url: z.string().url(),
  anchor: z.string().min(1),
  description: z.string().min(1),
});

export const PostSpecV2Schema = z.object({
  specVersion: z.literal(2),
  title: z.string().min(1),
  slug: z.string().min(1),
  category: PostCategorySchema.optional(),
  contentType: PostContentTypeSchema.optional(),
  cluster: TopicClusterSchema.optional(),
  metaDescription: z.string().min(1),
  tags: z.array(z.string()).min(4).max(7),
  excerpt: z.string().min(1),
  outline: z.array(OutlineItemSchema).min(1),
  sections: z.array(SectionSchema).min(1),
  entities: z.array(EntitySchema),
  heroImagePrompt: z.string().nullable(),
  altTexts: z.array(z.string()),
  internalLinkHints: z.array(InternalLinkHintSchema),
  affiliateHints: z.array(AffiliateHintSchema),
  externalLink: ExternalLinkSchema.optional(),
  cta: CtaSchema,
  adPlacements: z.array(AdPlacementSchema),
});

const DOC_LINES = [
  '{',
  '  "specVersion": 2,',
  '  "title": string (50-60 chars),',
  '  "slug": string (kebab-case),',
  '  "category": "ritual"|"meandering" (optional, defaults to "ritual" - use "ritual" for magickal content, "meandering" for non-magickal rambles),',
  '  "contentType": "ritual"|"guide"|"spread"|"reflection"|"story"|"tarotSpread"|"spellwork"|"crystals" (optional, defaults to "ritual"),',
  '  "cluster": "tarot-spreads"|"rituals-practices"|"clean-cursing"|"ai-narrative-magic"|"shadow-work"|"cozy-witchcraft"|"motherquest"|"spellcraft-theory"|"magical-productivity" (optional, topic cluster for SEO),',
  '  "metaDescription": string (150-160 chars),',
  '  "tags": string[4-7],',
  '  "excerpt": string (1-2 sentences),',
  '  "outline": { "heading": string, "id": string }[],',
  '  "sections": { "heading": string, "markdown": string }[],',
  '  "entities": { "type": "crystal"|"herb"|"moonPhase"|"planet"|"tarot"|"spread"|"planetaryDay"|"ritual", "slug": string }[],',
  '  "heroImagePrompt": string | null,',
  '  "altTexts": string[],',
  '  "internalLinkHints": { "anchor": string, "rationale": string }[],',
  '  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],',
  '  "externalLink": { "url": string, "anchor": string, "description": string } (optional, one authoritative external reference),',
  '  CRITICAL - externalLink format rules:',
  '  - "url" must be a plain URL string ONLY,',
  '  - Never combine url and anchor into one string,',
  '  - Never use markdown link syntax in the url field,',
  '  - Never wrap the url in brackets or parentheses,',
  '  - "anchor" and "url" are always separate fields,',
  '  - Valid:   {"url": "https://example.com", "anchor": "text here", "description": "..."},',
  '  - Invalid: {"url": "[text here](https://example.com)", ...},',
  '  - Invalid: {"url": "https://example.com%22,%22anchor%22:%22text", ...},',
  '  - If you cannot produce a clean url string, omit externalLink entirely rather than malforming it,',
  '  Never include a "sourceNote" field in the output,',
  '  sourceNote is an internal LLM artifact and must not appear in the JSON,',
  '  "cta": { "type": "kofi"|"download"|"none", "id"?: string },',
  '  "adPlacements": ("lead"|"mid"|"end")[]',
  '}',
];

export function generateSchemaDocumentation() {
  return DOC_LINES.join('\n');
}

export function stripMarkdownToPlainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\\*_#>~\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default PostSpecV2Schema;
