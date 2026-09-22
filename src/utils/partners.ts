import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const PartnerSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string(),
    location: z.string().optional(),
    impactTag: z.string().optional(),
    ethicalNote: z.string().optional(),
    offerings: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    contact: z.string().optional(),
    notes: z.string().optional(),
    published: z.boolean().default(false),
    verified: z.boolean().default(false),
  })
  .catchall(z.unknown());

const PartnerSectionSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    partners: z.array(PartnerSchema).default([]),
  })
  .catchall(z.unknown());

const AffiliateHighlightSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string(),
    impactTag: z.string().optional(),
    ethicalNote: z.string().optional(),
    ctaLabel: z.string().optional(),
    image: z.string().optional(),
    published: z.boolean().default(false),
    verified: z.boolean().default(false),
  })
  .catchall(z.unknown());

const PartnerBlocksSchema = z
  .object({
    sections: z.array(PartnerSectionSchema).default([]),
    affiliateHighlights: z.array(AffiliateHighlightSchema).default([]),
    updatedAt: z.string().optional(),
  })
  .strict();

export type PartnerRecord = z.infer<typeof PartnerSchema>;
export type PartnerSection = z.infer<typeof PartnerSectionSchema>;
export type AffiliateHighlight = z.infer<typeof AffiliateHighlightSchema>;
export type PartnerBlocks = z.infer<typeof PartnerBlocksSchema>;

let cachedBlocks: PartnerBlocks | null = null;
let cachedMtime = 0;

function partnersFilePath(): string {
  return path.join(process.cwd(), "content", "blocks", "partners.json");
}

export interface ReadPartnerBlocksOptions {
  includeUnpublished?: boolean;
}

function publicPartnerBlocks(blocks: PartnerBlocks): PartnerBlocks {
  const sections = blocks.sections
    .map((section) => ({
      ...section,
      partners: section.partners.filter((partner) => partner.published && partner.verified),
    }))
    .filter((section) => section.partners.length > 0);

  return {
    ...blocks,
    sections,
    affiliateHighlights: blocks.affiliateHighlights.filter(
      (highlight) => highlight.published && highlight.verified,
    ),
  };
}

export function readPartnerBlocks(options: ReadPartnerBlocksOptions = {}): PartnerBlocks {
  const filePath = partnersFilePath();
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedBlocks && stat && stat.mtimeMs === cachedMtime) {
      return options.includeUnpublished ? cachedBlocks : publicPartnerBlocks(cachedBlocks);
    }

    if (!stat) {
      cachedBlocks = { sections: [], affiliateHighlights: [] };
      cachedMtime = 0;
      return options.includeUnpublished ? cachedBlocks : publicPartnerBlocks(cachedBlocks);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = PartnerBlocksSchema.parse(parsed);
    cachedBlocks = data;
    cachedMtime = stat.mtimeMs;
    return options.includeUnpublished ? data : publicPartnerBlocks(data);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[partners] Unable to read partner blocks", error);
    }
    cachedBlocks = { sections: [], affiliateHighlights: [] };
    cachedMtime = 0;
    return cachedBlocks;
  }
}

export function resetPartnerBlocksCache() {
  cachedBlocks = null;
  cachedMtime = 0;
}
