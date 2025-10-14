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
  })
  .passthrough();

const PartnerSectionSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    partners: z.array(PartnerSchema).default([]),
  })
  .passthrough();

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
  })
  .passthrough();

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

export function readPartnerBlocks(): PartnerBlocks {
  const filePath = partnersFilePath();
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedBlocks && stat && stat.mtimeMs === cachedMtime) {
      return cachedBlocks;
    }

    if (!stat) {
      cachedBlocks = { sections: [], affiliateHighlights: [] };
      cachedMtime = 0;
      return cachedBlocks;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = PartnerBlocksSchema.parse(parsed);
    cachedBlocks = data;
    cachedMtime = stat.mtimeMs;
    return data;
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
