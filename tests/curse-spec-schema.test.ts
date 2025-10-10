import { describe, expect, it } from 'vitest';
import {
  CURSE_TAGS,
  CURSE_TONES,
  CURSE_TARGETS,
  CURSE_TYPES,
  CurseSpecSchema,
} from '../server/lib/curseSpecSchema.js';

function makeWords(count: number, prefix = 'word'): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(`${prefix}${i + 1}`);
  }
  return words.join(' ');
}

describe('CurseSpecSchema', () => {
  it('accepts a valid payload', () => {
    const data = {
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'illuminate-withheld-echoes-with-uncompromised-grace',
      openingReflection: makeWords(80),
      invocation: 'May the withheld truth return as a clear chime.',
      method: makeWords(170, 'step'),
      closure: makeWords(60, 'after'),
      safetyNotes: 'Speak the invocation softly and ground afterward.',
      generator: {
        type: CURSE_TYPES[0],
        target: CURSE_TARGETS[0],
        tone: CURSE_TONES[0],
        sigilName: 'Echo Lantern',
        altarItem: 'Clear quartz',
        journalingFollowUp: 'What truth did the echo reveal?',
      },
      tags: [...CURSE_TAGS],
    } as const;

    const parsed = CurseSpecSchema.safeParse(data);
    expect(parsed.success).toBe(true);
  });

  it('rejects payloads with invalid title length', () => {
    const result = CurseSpecSchema.safeParse({
      specVersion: 1,
      title: 'Too short',
      slug: 'too-short',
      openingReflection: makeWords(80),
      invocation: 'May the withheld truth return as a clear chime.',
      method: makeWords(170, 'step'),
      closure: makeWords(60, 'after'),
      generator: {
        type: CURSE_TYPES[0],
        target: CURSE_TARGETS[0],
        tone: CURSE_TONES[0],
      },
      tags: [...CURSE_TAGS],
    });

    expect(result.success).toBe(false);
  });

  it('rejects payloads with newline invocation', () => {
    const result = CurseSpecSchema.safeParse({
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'illuminate-withheld-echoes-with-uncompromised-grace',
      openingReflection: makeWords(80),
      invocation: 'Line one\nLine two',
      method: makeWords(170, 'step'),
      closure: makeWords(60, 'after'),
      generator: {
        type: CURSE_TYPES[0],
        target: CURSE_TARGETS[0],
        tone: CURSE_TONES[0],
      },
      tags: [...CURSE_TAGS],
    });

    expect(result.success).toBe(false);
  });

  it('requires the canonical tag set', () => {
    const result = CurseSpecSchema.safeParse({
      specVersion: 1,
      title: 'Illuminate withheld echoes with uncompromised grace',
      slug: 'illuminate-withheld-echoes-with-uncompromised-grace',
      openingReflection: makeWords(80),
      invocation: 'May the withheld truth return as a clear chime.',
      method: makeWords(170, 'step'),
      closure: makeWords(60, 'after'),
      generator: {
        type: CURSE_TYPES[0],
        target: CURSE_TARGETS[0],
        tone: CURSE_TONES[0],
      },
      tags: [...CURSE_TAGS.slice(0, CURSE_TAGS.length - 1)],
    });

    expect(result.success).toBe(false);
  });
});
