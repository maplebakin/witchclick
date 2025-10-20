import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  persistPreparedCurse,
  prepareCurseForPersistence,
} from '../../server/lib/cursePreparation.js';
import { recordIngestEvent, recordPerformanceMetric } from '../../shared/telemetry/index.js';
import type { CurseSpec } from '../../shared/schema/index.js';

export async function ingestCurse(args: string[]) {
  const CWD = process.cwd();
  const CONTENT_DIR = path.join(CWD, 'content');
  const CURSE_DIR = path.join(CONTENT_DIR, 'white-magic-curses');
  const fromIdx = args.indexOf('--from-file');
  const dryRun = args.includes('--dry-run');
  const started = performance.now();

  try {
    let json: CurseSpec;
    let slug = '';

    if (fromIdx >= 0) {
      const sourcePath = args[fromIdx + 1];
      if (!sourcePath) {
        throw new Error('Missing value for --from-file');
      }
      json = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    } else {
      const raw = await new Promise<string>((resolve, reject) => {
        let buffer = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => (buffer += chunk));
        process.stdin.on('end', () => resolve(buffer));
        process.stdin.on('error', (err) => reject(err));
      });
      json = JSON.parse(raw);
    }

    const prepared = prepareCurseForPersistence(json, {
      cwd: CWD,
      directory: CURSE_DIR,
    });

    slug = prepared.spec.slug;

    if (!dryRun) {
      await persistPreparedCurse(prepared);
    }

    const relativePath = path.relative(CWD, prepared.markdown.filePath).replace(/\\/g, '/');
    const response = {
      ok: true,
      spec: prepared.spec,
      warnings: prepared.warnings,
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
      durationMs,
      path: relativePath,
    });
    recordPerformanceMetric({
      name: 'ingest:curse',
      durationMs,
      success: true,
      meta: { slug, saved: !dryRun },
    });
  } catch (error: any) {
    const response: Record<string, unknown> = {
      ok: false,
      error: error?.message || String(error),
    };
    if (Array.isArray(error?.errors)) {
      response.errors = error.errors;
    }
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exitCode = 1;

    const durationMs = performance.now() - started;
    recordIngestEvent({
      ok: false,
      warnings: Array.isArray(error?.warnings) ? error.warnings : [],
      durationMs,
    });
    recordPerformanceMetric({
      name: 'ingest:curse',
      durationMs,
      success: false,
      meta: { error: error?.message || String(error) },
    });
  }
}
