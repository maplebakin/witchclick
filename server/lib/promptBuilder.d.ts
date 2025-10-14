export interface MasterPromptOptions {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
  brandName: string;
  siteUrl: string;
  existingPostTitles?: string[];
  existingPostSlugs?: string[];
  allowedAffiliateKeys?: string[];
  strictJsonRules?: string[];
}

export function buildMasterPrompt(options: MasterPromptOptions): string;

export default buildMasterPrompt;
