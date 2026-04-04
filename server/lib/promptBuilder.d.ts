export interface MasterPromptOptions {
  topic: string;
  words: number;
  contentType?: string;
  styleDirective?: string;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
  brandName: string;
  siteUrl: string;
  existingPostTitles?: string[];
  existingPostSlugs?: string[];
  allowedAffiliateKeys?: string[];
  strictJsonRules?: string[];
  engagementSignals?: {
    tags?: Array<{
      tag: string;
      reason?: string;
      score?: number;
      recencyDays?: number;
    }>;
    entities?: Array<{
      slug: string;
      type?: string;
      name?: string;
      reason?: string;
      score?: number;
      recencyDays?: number;
    }>;
  } | null;
}

export function buildMasterPrompt(options: MasterPromptOptions): string;

export default buildMasterPrompt;
