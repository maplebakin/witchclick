import { describe, expect, it } from 'vitest';

import { buildFallbackHeroPrompt } from '../src/utils/heroPrompt';

describe('buildFallbackHeroPrompt', () => {
  it('always includes the post title in the fallback prompt', () => {
    const prompt = buildFallbackHeroPrompt({
      title: 'Tea Ritual for Focus',
      slug: 'tea-ritual-for-focus',
      tags: ['ritual', 'tea', 'focus'],
    });

    expect(prompt).toContain('post titled "Tea Ritual for Focus".');
    expect(prompt).toContain('Ceremonial and intentional atmosphere.');
    expect(prompt).toContain('Favor suggestive symbolic imagery over a literal scene.');
  });

  it('falls back to the slug label when the title is missing', () => {
    const prompt = buildFallbackHeroPrompt({
      slug: 'tea-ritual-for-focus',
      tags: ['tea'],
    });

    expect(prompt).toContain('post titled "tea-ritual-for-focus".');
  });

  it('varies the open-ended visual direction across regenerations', () => {
    const first = buildFallbackHeroPrompt({ title: 'Tea Ritual for Focus', tags: ['ritual'] }, 0);
    const second = buildFallbackHeroPrompt({ title: 'Tea Ritual for Focus', tags: ['ritual'] }, 1);

    expect(first).not.toBe(second);
    expect(second).toContain('Keep the composition interpretive and open-ended.');
  });
});
