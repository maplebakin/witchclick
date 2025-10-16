import type { PostSpecV2 } from "../server/lib/postSpecSchema.js";

export interface IngestOptions {
  dir?: string;
  dry?: boolean;
  inputPath?: string | null;
  logger?: ((event: Record<string, unknown>) => void) | null;
}

export interface IngestResult {
  dryRun: boolean;
  path: string;
  slug: string;
  bytes: number;
  spec: PostSpecV2;
  warnings: string[];
  normalizationReport: string[];
  entityStubs: Array<{ file: string; payload: Record<string, unknown> }>;
  markdown: string;
  createdEntities: string[];
  source: string | null;
}

export declare class IngestValidationError extends Error {
  constructor(details?: unknown);
  errors: string[];
  warnings: string[];
  normalizations: string[];
}

export declare function ingestFromFile(
  filePath: string,
  options?: IngestOptions,
): Promise<IngestResult>;
export declare function ingestFromSpec(
  input: unknown,
  options?: IngestOptions,
): Promise<IngestResult>;
