// tools/src/types.ts
export type EntityType = 'crystal'|'herb'|'moonPhase'|'tarot'|'planetaryDay'|'ritual';

export interface PostSpecV2 {
  specVersion: 2;
  title: string;
  slug: string;
  metaDescription: string;
  tags: string[];
  excerpt: string;
  outline: { heading: string; id: string }[];
  sections: { heading: string; markdown: string }[];
  entities: { type: EntityType; slug: string }[];
  heroImagePrompt: string | null;
  altTexts: string[];
  internalLinkHints: { anchor: string; rationale: string }[];
  affiliateHints: { key: string; anchor: string; rationale: string }[];
  cta: { type: 'kofi'|'download'|'none'; id?: string };
  adPlacements: ('lead'|'mid'|'end')[];
}

export interface Frontmatter {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  outline: string[];
  wordCount: number;
  readingMinutes: number;
  entities: { type: EntityType; slug: string }[];
  includeAds: boolean;
  includeKofi: boolean;
  affiliateAnchors: { key: string; text: string; insertedCount: number }[];
  internalLinks: { title: string; slug: string; anchor: string }[];
  publishedAt: string;
  canonicalUrl: string;
  specVersion: 2;
}