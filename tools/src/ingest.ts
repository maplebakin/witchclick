// tools/src/ingest.ts
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  prepareSpecForPersistence,
  persistPreparedSpec,
} from '../../server/lib/specPreparation.js';
import { resolvePostsDirectories } from '../../scripts/lib/contentPaths.js';
import { recordIngestEvent, recordPerformanceMetric } from '../../shared/telemetry/index.js';
import type { PostSpecV2 } from './types';

// --- path helpers ---
const CWD = process.cwd();
const postsDirectories = resolvePostsDirectories({ root: CWD });

export async function ingest(args: string[]) {
  const fromIdx = args.indexOf('--from-file');
  const dryRun = args.includes('--dry-run');
  const started = performance.now();

  try {
    let json: PostSpecV2;
    let slug = '';

    if (fromIdx >= 0) {
      const sourcePath = args[fromIdx + 1];
      if (!sourcePath) {
        throw new Error('Missing value for --from-file');
      }
      json = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    } else {
      const raw = await new Promise<string>((res, rej) => {
        let s = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (d) => (s += d));
        process.stdin.on('end', () => res(s));
        process.stdin.on('error', (err) => rej(err));
      });
      json = JSON.parse(raw);
    }

    const prepared = prepareSpecForPersistence(json, {
      cwd: CWD,
      postsDirectories,
    });

    slug = prepared.spec.slug;

    if (!dryRun) {
      await persistPreparedSpec(prepared);
    }

    const relativePath = path.relative(CWD, prepared.post.filePath).replace(/\\/g, '/');
    const response = {
      ok: true,
      spec: prepared.spec,
      normalizationReport: prepared.normalizationReport,
      normalizations: prepared.normalizationReport,
      warnings: prepared.warnings,
      validationWarnings: prepared.warnings,
      wordCount: prepared.wordCount,
      saved: !dryRun,
      slug: prepared.spec.slug,
      path: relativePath,
    };

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);

    const durationMs = performance.now() - started;
    recordIngestEvent({
      slug,
      ok: true,
      warnings: prepared.warnings,
      normalizations: prepared.normalizationReport,
      durationMs,
      path: relativePath,
    });
    recordPerformanceMetric({
      name: 'ingest:post',
      durationMs,
      success: true,
      meta: { slug, saved: !dryRun },
    });
  } catch (error: any) {
    const warnings = Array.isArray(error?.warnings) ? error.warnings : [];
    const normalizations = Array.isArray(error?.normalizations)
      ? error.normalizations
      : [];
    const response: Record<string, unknown> = {
      ok: false,
      error: error?.message || String(error),
      warnings,
      normalizations,
    };
    if (Array.isArray(error?.errors)) {
      response.errors = error.errors;
    }

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exitCode = 1;

    const durationMs = performance.now() - started;
    recordIngestEvent({
      ok: false,
      warnings,
      normalizations,
      durationMs,
    });
    recordPerformanceMetric({
      name: 'ingest:post',
      durationMs,
      success: false,
      meta: { error: error?.message || String(error) },
    });
  }
}
