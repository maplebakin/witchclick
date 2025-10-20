// tools/src/lintSpec.ts
// CLI helper for linting PostSpec payloads without persisting changes.

import fs from 'node:fs';
import path from 'node:path';

import { prepareSpecForPersistence } from '../../server/lib/specPreparation.js';
import { resolvePostsDirectories } from '../../scripts/lib/contentPaths.js';

export type LintSpecOptions = {
  cwd?: string;
  targetWordCount?: number;
  generatedAt?: string;
};

export type LintSpecResult = {
  ok: boolean;
  wordCount?: number;
  warnings: string[];
  normalizations: string[];
  promptMetadata?: Record<string, unknown> | null;
  errors?: string[];
};

export async function lintSpec(specPath: string, options: LintSpecOptions = {}): Promise<LintSpecResult> {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const absolutePath = path.resolve(cwd, specPath);

  let raw: string;
  try {
    raw = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read spec at ${absolutePath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON: ${message}`);
  }

  const postsDirectories = resolvePostsDirectories({ root: cwd });

  try {
    const prepared = prepareSpecForPersistence(parsed, {
      cwd,
      postsDirectories,
      targetWordCount: options.targetWordCount,
      sourcePath: absolutePath,
      generatedAt: options.generatedAt,
    });

    return {
      ok: true,
      wordCount: prepared.wordCount,
      warnings: prepared.warnings ?? [],
      normalizations: prepared.normalizationReport ?? [],
      promptMetadata: prepared.promptMetadata ?? null,
    };
  } catch (error) {
    const err = error as any;
    const errors = Array.isArray(err?.errors) && err.errors.length
      ? err.errors.map((item: unknown) => String(item))
      : [String(err?.message || 'Spec validation failed.')];
    const warnings = Array.isArray(err?.warnings)
      ? err.warnings.map((item: unknown) => String(item))
      : [];
    const normalizations = Array.isArray(err?.normalizations)
      ? err.normalizations.map((item: unknown) => String(item))
      : [];

    return {
      ok: false,
      errors,
      warnings,
      normalizations,
    };
  }
}

export default { lintSpec };
