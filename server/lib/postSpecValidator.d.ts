import type { PostSpecV2 } from './postSpecSchema.js';

export interface PostSpecValidationOptions {
  targetWordCount?: number;
  allowedAffiliateKeys?: string[];
}

export interface PostSpecValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  wordCount: number;
}

export function validatePostSpec(
  spec: PostSpecV2,
  options?: PostSpecValidationOptions
): PostSpecValidationResult;

export default validatePostSpec;
