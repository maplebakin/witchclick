import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURSE_TAGS } from '../server/lib/curseSpecSchema.js';
import {
  persistPreparedCurse,
  prepareCurseForPersistence,
} from '../server/lib/cursePreparation.js';

function makeWords(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');
}

describe('cursePreparation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'curse-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prepares and persists a curse markdown file', async () => {
    const directory = path.join(tmpDir, 'archive', 'curses');
    const spec = {
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'illuminate-withheld-echoes-with-uncompromised-grace',
      openingReflection: makeWords(80),
      invocation: 'May all echoes carry truth back to their keeper.',
      method: makeWords(170),
      closure: makeWords(60),
      safetyNotes: 'Ground afterward and sip water to release residue.',
      generator: {
        type: 'reveal',
        target: 'space',
        tone: 'gentle',
        sigilName: 'Echo Lantern',
        altarItem: 'Clear quartz',
        journalingFollowUp: 'What truth rose when the echo returned?',
      },
      tags: [...CURSE_TAGS],
    } as const;

    const prepared = prepareCurseForPersistence(spec, {
      cwd: tmpDir,
      directory,
    });

    expect(prepared.markdown.filePath.endsWith('.md')).toBe(true);
    expect(prepared.frontmatter.slug).toBe(spec.slug);
    expect(prepared.warnings).toEqual([]);

    const result = await persistPreparedCurse(prepared);
    expect(fs.existsSync(result.cursePath)).toBe(true);

    const saved = fs.readFileSync(result.cursePath, 'utf8');
    expect(saved).toContain('## Opening Reflection');
    expect(saved).toContain('## Safety Notes');
  });

  it('deduplicates slug collisions', () => {
    const directory = path.join(tmpDir, 'archive', 'curses');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'existing-curse.md'), '---\nslug: existing-curse\n---\n');

    const spec = {
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'existing-curse',
      openingReflection: makeWords(80),
      invocation: 'May all echoes carry truth back to their keeper.',
      method: makeWords(170),
      closure: makeWords(60),
      generator: {
        type: 'mirror',
        target: 'person',
        tone: 'poetic',
      },
      tags: [...CURSE_TAGS],
    } as const;

    const prepared = prepareCurseForPersistence(spec, {
      cwd: tmpDir,
      directory,
    });

    expect(prepared.spec.slug).not.toBe('existing-curse');
    expect(prepared.spec.slug.startsWith('existing-curse-')).toBe(true);
  });
});
