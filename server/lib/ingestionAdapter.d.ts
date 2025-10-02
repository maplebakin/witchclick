import type { PostSpecV2 } from './postSpecSchema.js';

export interface NormalizePostSpecResult {
  spec: PostSpecV2;
  report: string[];
  warnings: string[];
}

export interface NormalizePostSpecOptions {
  allowedAffiliateKeys?: string[];
}

export function normalizePostSpec(raw: unknown, options?: NormalizePostSpecOptions): NormalizePostSpecResult;

export default normalizePostSpec;
