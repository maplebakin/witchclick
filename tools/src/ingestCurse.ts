import fs from 'node:fs';
import path from 'node:path';

import {
  persistPreparedCurse,
  prepareCurseForPersistence,
} from '../../server/lib/cursePreparation.js';
import type { CurseSpec } from '../../server/lib/curseSpecSchema.js';

export async function ingestCurse(args: string[]) {
  const CWD = process.cwd();
  const ARCHIVE_DIR = path.join(CWD, 'archive', 'curses');
  const fromIdx = args.indexOf('--from-file');
  const dryRun = args.includes('--dry-run');

  try {
    let json: CurseSpec;

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
      directory: ARCHIVE_DIR,
    });

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
  }
}
