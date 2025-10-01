// tools/src/types.ts
import type { EntityType } from '../../server/lib/postSpecSchema.js';

export type {
  EntityType,
  PostSpecV2,
} from '../../server/lib/postSpecSchema.js';

export type AdSlot = 'lead'|'mid'|'end';

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
  downloadId?: string;
  affiliateAnchors: { key: string; text: string; insertedCount: number }[];
  internalLinkHints: string[];
  /** renderer+export only need slug+anchor; title is optional for back-compat */
  internalLinks: { slug: string; anchor: string; title?: string }[];
  publishedAt: string;
  canonicalUrl: string;
  specVersion: 2;
}
