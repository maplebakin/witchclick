import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { exportCurses } from '../tools/src/exportCurses.ts';

function writeCurse(dir: string) {
  fs.writeFileSync(
    path.join(dir, 'mirror-truth.md'),
    `---\ntitle: Mirror Truth\nslug: mirror-truth\ninvocation: May reflections reveal.\ntags:\n  - white-magic\n  - ethical-curse\n  - returning-energy\n  - truthwork\n  - mirrorcasting\n  - clean-cursing\n---\n\n## Opening Reflection\nSee clearly.\n\n## Method\nStep one.\n\n## Closure & Aftercare\nRest well.\n`,
    'utf8',
  );
}

describe('exportCurses', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-curses-'));
    fs.mkdirSync(path.join(tmpDir, 'content', 'white-magic-curses'), { recursive: true });
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('renders printable HTML cards', () => {
    const dir = path.join(tmpDir, 'content', 'white-magic-curses');
    writeCurse(dir);
    exportCurses([]);
    const out = path.join(tmpDir, 'dist', 'exports', 'curses', 'curses.html');
    expect(fs.existsSync(out)).toBe(true);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).toContain('Mirror Truth');
  });
});
