// server/lib/postSpecSchema.js
// Canonical PostSpec v2 schema and documentation helpers.

import { z } from 'zod';

export const ENTITY_TYPES = ['crystal', 'herb', 'moonPhase', 'tarot', 'planetaryDay', 'ritual'];
export const CONTENT_TYPES = ['ritual', 'guide', 'spread', 'reflection', 'story', 'tarotSpread', 'spellwork', 'crystals'];
export const POST_CATEGORIES = ['ritual', 'meandering'];

export const EntityTypeSchema = z.enum(ENTITY_TYPES);
export const PostContentTypeSchema = z.enum(CONTENT_TYPES);
export const PostCategorySchema = z.enum(POST_CATEGORIES);

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

export const PostSpecV2Schema = z.object({
  specVersion: z.literal(2),
  title: z.string().min(1),
  slug: z.string().min(1),
  category: PostCategorySchema.optional(),
  contentType: PostContentTypeSchema.optional(),
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
  '  "metaDescription": string (150-160 chars),',
  '  "tags": string[4-7],',
  '  "excerpt": string (1-2 sentences),',
  '  "outline": { "heading": string, "id": string }[],',
  '  "sections": { "heading": string, "markdown": string }[],',
  '  "entities": { "type": "crystal"|"herb"|"moonPhase"|"tarot"|"planetaryDay"|"ritual", "slug": string }[],',
  '  "heroImagePrompt": string | null,',
  '  "altTexts": string[],',
  '  "internalLinkHints": { "anchor": string, "rationale": string }[],',
  '  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],',
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
