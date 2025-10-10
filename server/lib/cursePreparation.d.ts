import type { CurseSpec } from './curseSpecSchema.js';

export interface PreparedCurse {
  spec: CurseSpec;
  frontmatter: Record<string, unknown>;
  markdown: {
    filePath: string;
    contents: string;
  };
  warnings: string[];
}

export interface PersistCurseResult {
  cursePath: string;
}

export interface PrepareCurseOptions {
  cwd?: string;
  directory?: string;
}

export declare function prepareCurseForPersistence(
  rawSpec: unknown,
  options?: PrepareCurseOptions,
): PreparedCurse;

export declare function persistPreparedCurse(prepared: PreparedCurse): Promise<PersistCurseResult>;

declare const _default: {
  prepareCurseForPersistence: typeof prepareCurseForPersistence;
  persistPreparedCurse: typeof persistPreparedCurse;
};

export default _default;
