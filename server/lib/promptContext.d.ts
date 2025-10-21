// server/lib/promptContext.d.ts
// Type declarations for promptContext.js

export interface PromptContext {
  brandName: string;
  siteUrl: string;
  existingPostTitles: string[];
  existingPostSlugs: string[];
  allowedAffiliateKeys: string[];
  engagementSignals: any;
  settings: any;
}

export interface LoadPromptContextOptions {
  cwd?: string;
  settings?: any;
}

export function loadPromptContext(options?: LoadPromptContextOptions): PromptContext;

declare const _default: {
  loadPromptContext: typeof loadPromptContext;
};

export default _default;
