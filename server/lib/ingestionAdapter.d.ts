import type { PostSpecV2 } from './postSpecSchema.js';

export interface NormalizePostSpecResult {
  spec: PostSpecV2;
  report: string[];
  warnings: string[];
}

export function normalizePostSpec(raw: unknown): NormalizePostSpecResult;

export default normalizePostSpec;
