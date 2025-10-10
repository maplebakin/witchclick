import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadAllCurses, resetCurseCache } from '../src/utils/curses';

function createCurse(dir: string, slug: string, body: string) {
  fs.writeFileSync(
    path.join(dir, `${slug}.md`),
    `---\ntitle: Test Curse\nslug: ${slug}\ninvocation: May clarity return.\ntags:\n  - white-magic\n  - ethical-curse\n  - returning-energy\n  - truthwork\n  - mirrorcasting\n  - clean-cursing\n---\n\n${body}\n`,
    'utf8',
  );
}

describe('loadAllCurses', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'curse-loader-'));
    fs.mkdirSync(path.join(tmpDir, 'content', 'white-magic-curses'), { recursive: true });
    process.chdir(tmpDir);
    resetCurseCache();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    resetCurseCache();
  });

  it('returns parsed curses with sections', () => {
    const dir = path.join(tmpDir, 'content', 'white-magic-curses');
    createCurse(
      dir,
      'mirror-truth',
      '## Opening Reflection\nWords here.\n\n## Method\nStep one.\n\n## Closure & Aftercare\nRest now.',
    );

    const curses = loadAllCurses();
    expect(curses.length).toBe(1);
    expect(curses[0].slug).toBe('mirror-truth');
    expect(curses[0].sections.length).toBeGreaterThan(0);
  });
});
