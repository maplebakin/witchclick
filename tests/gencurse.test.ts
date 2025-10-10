import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const { gencurse } = await import('../tools/src/gencurse.ts');

describe('gencurse CLI helper', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gencurse-test-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes prompt file to tmp directory', () => {
    const { file, prompt } = gencurse({ type: 'mirror', target: 'person', tone: 'poetic' });
    expect(prompt).toContain('WHITE MAGIC CURSE GENERATOR');
    expect(fs.existsSync(file)).toBe(true);
  });
});
