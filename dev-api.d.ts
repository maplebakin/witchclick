import type {
  PrepareSpecOptions,
  PreparedSpec,
  PersistResult,
} from "./server/lib/specPreparation.js";

export declare function savePostFromWrite(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  postPath: string;
  createdEntities: string[];
  warnings?: string[];
}>;

export declare function slugify(value: string): string;
export declare function markdownToPlainText(markdown: string): string;
export declare function generateExcerpt(
  markdown: string,
  options?: Record<string, unknown>,
): string;
export declare function generateMetaDescription(
  markdown: string,
  options?: Record<string, unknown>,
): string;
export declare function normalizeTags(tags: unknown): string[];
export declare function buildGenprompt(options: Record<string, unknown>): { prompt: string };

export declare function prepareSpecForPersistence(
  rawSpec: unknown,
  options?: PrepareSpecOptions,
): PreparedSpec;
export declare function persistPreparedSpec(prepared: PreparedSpec): Promise<PersistResult>;

export interface AdminPipelineHelpers {
  savePostFromWrite: typeof savePostFromWrite;
  slugify: typeof slugify;
  markdownToPlainText: typeof markdownToPlainText;
  generateExcerpt: typeof generateExcerpt;
  generateMetaDescription: typeof generateMetaDescription;
  normalizeTags: typeof normalizeTags;
  buildGenprompt: typeof buildGenprompt;
  prepareSpecForPersistence: typeof prepareSpecForPersistence;
  persistPreparedSpec: typeof persistPreparedSpec;
}

export declare const adminPipelineHelpers: AdminPipelineHelpers;
