import type { PostSpecV2 } from './postSpecSchema.js';

export interface PreparedSpec {
  spec: PostSpecV2;
  normalizationReport: string[];
  warnings: string[];
  wordCount: number;
  post: {
    filePath: string;
    contents: string;
  };
  frontmatter: Record<string, unknown>;
  entityStubs: { file: string; payload: Record<string, unknown> }[];
  promptMetadata?: Record<string, unknown> | null;
}

export interface PrepareSpecOptions {
  cwd?: string;
  postsDirectories?: string[];
  targetWordCount?: number;
  allowedAffiliateKeys?: string[];
  sourcePath?: string;
  generatedAt?: string;
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

export interface PersistResult {
  postPath: string;
  createdEntities: string[];
}

export function prepareSpecForPersistence(
  rawSpec: unknown,
  options?: PrepareSpecOptions
): PreparedSpec;

export function persistPreparedSpec(prepared: PreparedSpec): Promise<PersistResult>;

declare const specPreparation: {
  prepareSpecForPersistence: typeof prepareSpecForPersistence;
  persistPreparedSpec: typeof persistPreparedSpec;
};

export default specPreparation;
