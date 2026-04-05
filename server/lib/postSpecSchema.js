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
  '  "title": string,',
  '  "slug": string (kebab-case),',
  '  "contentType": "ritual"|"reflection"|"story"|"tarotSpread"|"spellwork"|"crystals" (Required. Must match the selected content structure contract.),',
  '  "cluster": "tarot-spreads"|"rituals-practices"|"clean-cursing"|"ai-narrative-magic"|"shadow-work"|"cozy-witchcraft"|"motherquest"|"spellcraft-theory"|"magical-productivity" (optional, topic cluster for SEO),',
  '  "metaDescription": string,',
  '  "tags": string[4-7],',
  '  "excerpt": string (1-2 sentences),',
  '  "outline": { "heading": string, "id": string }[],',
  '  "sections": { "heading": string, "markdown": string }[],',
  '  "entities": { "type": "crystal"|"herb"|"moonPhase"|"planet"|"tarot"|"spread"|"planetaryDay"|"ritual", "slug": string }[],',
  '  "heroImagePrompt": string | null,',
  '  "altTexts": string[],',
  '  "internalLinkHints": { "anchor": string, "slug": string, "rationale": string }[] (slug must match an existingPostSlugs value exactly),',
  '  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],',
  '  "externalLink": { "url": string, "anchor": string, "description": string } (required for generated specs; mirrors the authoritative link used in markdown; url stays plain and separate from anchor text),',
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
