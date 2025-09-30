import { describe, expect, it } from 'vitest';

import { normalizePostSpec } from '../server/lib/ingestionAdapter.js';

function createBase() {
  return {
    name: 'Cozy Focus Ritual',
    summary: 'A gentle ritual to regain focus.',
    tags: ['ritual', 'focus', 'tea', 'mindfulness'],
    sections: [
      { heading: 'Opening Reflection', body: 'Opening paragraph body text.' },
      { heading: 'Quick Variant', markdown: 'Quick steps.' },
    ],
    outline: [
      { title: 'Opening Reflection' },
      { title: 'Quick Variant' },
    ],
  };
}

describe('normalizePostSpec loose mode aliases', () => {
  it('maps name to title and generates slug', () => {
    const input = createBase();
    const result = normalizePostSpec(input);
    expect(result.spec.title).toBe('Cozy Focus Ritual');
    expect(result.spec.slug).toBe('cozy-focus-ritual');
    expect(result.report).toContain('name→title');
    expect(result.report).toContain('generated slug from title');
  });

  it('maps summary to metaDescription', () => {
    const input = createBase();
    const result = normalizePostSpec(input);
    expect(result.spec.metaDescription).toBe('A gentle ritual to regain focus.');
    expect(result.report).toContain('summary→metaDescription');
  });

  it('accepts sections[].body alias', () => {
    const input = createBase();
    const result = normalizePostSpec(input);
    expect(result.spec.sections[0]?.markdown).toBe('Opening paragraph body text.');
    expect(result.report).toContain('sections.body→sections.markdown');
  });

  it('handles mixed aliases with strict keys', () => {
    const input = createBase();
    input.title = 'Updated Title';
    input.metaDescription = 'Custom meta description.';
    input.sections[1] = { heading: 'Deep Variant', content: 'Deep steps go here.' };

    const result = normalizePostSpec(input);
    expect(result.spec.title).toBe('Updated Title');
    expect(result.spec.metaDescription).toBe('Custom meta description.');
    expect(result.spec.sections[1]?.markdown).toBe('Deep steps go here.');
    expect(result.report).toContain('sections.content→sections.markdown');
  });
});
