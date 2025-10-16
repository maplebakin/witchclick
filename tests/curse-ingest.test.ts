import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ingestCurse } from '../tools/src/ingestCurse.ts';

function makeWords(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');
}

describe('ingestCurse CLI helper', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'curse-ingest-test-'));
    fs.mkdirSync(path.join(tmpDir, 'content', 'white-magic-curses'), { recursive: true });
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes curse markdown to content directory', async () => {
    const spec = {
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'illuminate-withheld-echoes-with-uncompromised-grace',
      openingReflection: makeWords(80),
      invocation: 'May withheld truth circle back with clarity.',
      method: makeWords(170),
      closure: makeWords(60),
      generator: {
        type: 'mirror',
        target: 'person',
        tone: 'poetic',
      },
      tags: [
        'white-magic',
        'ethical-curse',
        'returning-energy',
        'truthwork',
        'mirrorcasting',
        'clean-cursing',
      ],
    };
    const source = path.join(tmpDir, 'curse.json');
    fs.writeFileSync(source, JSON.stringify(spec), 'utf8');

    await ingestCurse(['--from-file', source]);

    const files = fs.readdirSync(path.join(tmpDir, 'content', 'white-magic-curses'));
    expect(files.length).toBe(1);
    const firstFile = files[0];
    if (!firstFile) {
      throw new Error('Expected generated curse markdown file');
    }
    const saved = fs.readFileSync(path.join(tmpDir, 'content', 'white-magic-curses', firstFile), 'utf8');
    expect(saved).toContain('Opening Reflection');
  });
});
