import type { PersistResult, PreparedSpec } from './specPreparation.js';

export interface ExecuteIngestOptions {
  cwd?: string;
  postsDirectories?: string[];
  dryRun?: boolean;
  sourcePath?: string | null;
  generatedAt?: string;
  draft?: boolean;
  forceCategory?: string;
  targetWordCount?: number;
}

export interface ExecuteIngestResult {
  prepared: PreparedSpec;
  persistence: PersistResult | null;
  dryRun: boolean;
  postPath: string;
  bytesWritten: number;
}

export function executeIngest(rawSpec: unknown, options?: ExecuteIngestOptions): Promise<ExecuteIngestResult>;

declare const ingestExecutor: {
  executeIngest: typeof executeIngest;
};

export default ingestExecutor;
