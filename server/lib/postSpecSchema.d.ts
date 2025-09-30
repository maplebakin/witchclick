import type { z } from 'zod';

export const ENTITY_TYPES: ['crystal', 'herb', 'moonPhase', 'tarot', 'planetaryDay', 'ritual'];
export const CONTENT_TYPES: ['ritual', 'guide', 'spread'];
export const EntityTypeSchema: z.ZodEnum<typeof ENTITY_TYPES>;
export const PostContentTypeSchema: z.ZodEnum<typeof CONTENT_TYPES>;
export const PostSpecV2Schema: z.ZodObject<{
  specVersion: z.ZodLiteral<2>;
  title: z.ZodString;
  slug: z.ZodString;
  contentType: z.ZodOptional<z.ZodEnum<typeof CONTENT_TYPES>>;
  metaDescription: z.ZodString;
  tags: z.ZodArray<z.ZodString>;
  excerpt: z.ZodString;
  outline: z.ZodArray<z.ZodObject<{ heading: z.ZodString; id: z.ZodString; }, "strip", z.ZodTypeAny, { heading: string; id: string; }, { heading: string; id: string; }>>;
  sections: z.ZodArray<z.ZodObject<{ heading: z.ZodString; markdown: z.ZodString; }, "strip", z.ZodTypeAny, { heading: string; markdown: string; }, { heading: string; markdown: string; }>>;
  entities: z.ZodArray<z.ZodObject<{ type: z.ZodEnum<typeof ENTITY_TYPES>; slug: z.ZodString; }, "strip", z.ZodTypeAny, { type: "crystal" | "herb" | "moonPhase" | "tarot" | "planetaryDay" | "ritual"; slug: string; }, { type: "crystal" | "herb" | "moonPhase" | "tarot" | "planetaryDay" | "ritual"; slug: string; }>>;
  heroImagePrompt: z.ZodNullable<z.ZodString>;
  altTexts: z.ZodArray<z.ZodString>;
  internalLinkHints: z.ZodArray<z.ZodObject<{ anchor: z.ZodString; rationale: z.ZodString; }, "strip", z.ZodTypeAny, { anchor: string; rationale: string; }, { anchor: string; rationale: string; }>>;
  affiliateHints: z.ZodArray<z.ZodObject<{ key: z.ZodString; anchor: z.ZodString; rationale: z.ZodString; }, "strip", z.ZodTypeAny, { key: string; anchor: string; rationale: string; }, { key: string; anchor: string; rationale: string; }>>;
  cta: z.ZodObject<{ type: z.ZodEnum<["kofi", "download", "none"]>; id: z.ZodOptional<z.ZodString>; }, "strip", z.ZodTypeAny, { type: "kofi" | "download" | "none"; id?: string | undefined; }, { type: "kofi" | "download" | "none"; id?: string | undefined; }>;
  adPlacements: z.ZodArray<z.ZodEnum<["lead", "mid", "end"]>>;
}, "strip", z.ZodTypeAny, {
  specVersion: 2;
  title: string;
  slug: string;
  contentType?: PostContentType | undefined;
  metaDescription: string;
  tags: string[];
  excerpt: string;
  outline: { heading: string; id: string; }[];
  sections: { heading: string; markdown: string; }[];
  entities: { type: EntityType; slug: string; }[];
  heroImagePrompt: string | null;
  altTexts: string[];
  internalLinkHints: { anchor: string; rationale: string; }[];
  affiliateHints: { key: string; anchor: string; rationale: string; }[];
  cta: { type: "kofi" | "download" | "none"; id?: string | undefined; };
  adPlacements: ("lead" | "mid" | "end")[];
}, {
  specVersion: 2;
  title: string;
  slug: string;
  contentType?: PostContentType | undefined;
  metaDescription: string;
  tags: string[];
  excerpt: string;
  outline: { heading: string; id: string; }[];
  sections: { heading: string; markdown: string; }[];
  entities: { type: EntityType; slug: string; }[];
  heroImagePrompt: string | null;
  altTexts: string[];
  internalLinkHints: { anchor: string; rationale: string; }[];
  affiliateHints: { key: string; anchor: string; rationale: string; }[];
  cta: { type: "kofi" | "download" | "none"; id?: string | undefined; };
  adPlacements: ("lead" | "mid" | "end")[];
}>;

export type EntityType = typeof ENTITY_TYPES[number];
export type PostContentType = typeof CONTENT_TYPES[number];
export type PostSpecV2 = z.infer<typeof PostSpecV2Schema>;

export function generateSchemaDocumentation(): string;
export function stripMarkdownToPlainText(markdown: unknown): string;
export default PostSpecV2Schema;
