import { describe, expect, it } from 'vitest';
import { validateStructure } from '../server/lib/structureValidation.js';
import type { PostSpecV2 } from '../src/lib/postSpecSchema';

function createBaseSpec(): PostSpecV2 {
  return {
    specVersion: 2,
    title: 'Test Ritual',
    slug: 'test-ritual',
    contentType: 'ritual',
    metaDescription: 'm'.repeat(150),
    tags: ['rituals', 'focus', 'tea', 'calm'],
    excerpt: 'A short excerpt.',
    outline: [{ heading: 'Opening Reflection', id: 'opening-reflection' }],
    sections: [
      { heading: 'Opening Reflection', markdown: 'Magic focus introduction sets the scene.' },
      { heading: 'Quick Ritual', markdown: 'Quick steps for focus and journal practice.' },
      { heading: 'Deep Ritual', markdown: 'A deeper dive for magic and mindful focus journaling.' },
      { heading: 'Checklist', markdown: 'Summary points for magic focus practice.' },
      { heading: 'Reflection Prompt', markdown: 'Journal about your magic focus journey.' },
    ],
    entities: [],
    heroImagePrompt: null,
    altTexts: [],
    internalLinkHints: [
      { anchor: 'magic', rationale: 'Link to magic overview.' },
      { anchor: 'focus', rationale: 'Link to focus guide.' },
      { anchor: 'journal', rationale: 'Link to journaling prompts.' },
    ],
    affiliateHints: [],
    cta: { type: 'none' },
    adPlacements: [],
  };
}

describe('validateStructure contentType handling', () => {
  it('defaults contentType to ritual when missing', () => {
    const spec = createBaseSpec();
    delete spec.contentType;

    const result = validateStructure(spec, 0);

    expect(result.errors).toHaveLength(0);
    expect(spec.contentType).toBe('ritual');
  });

  it('requires variants for ritual posts', () => {
    const spec = createBaseSpec();
    spec.sections = spec.sections.filter(
      (section: PostSpecV2["sections"][number]) => !/Quick|Deep/.test(section.heading),
    );

    const result = validateStructure(spec, 0);

    expect(result.errors).toContain('Ritual posts require both Quick/Low-Energy and Deep variants.');
  });

  it('allows non-ritual posts without ritual variants', () => {
    const spec = createBaseSpec();
    spec.contentType = 'guide';
    spec.sections = spec.sections.filter(
      (section: PostSpecV2["sections"][number]) => !/Quick|Deep/.test(section.heading),
    );

    const result = validateStructure(spec, 0);

    expect(result.errors).toHaveLength(0);
  });
});
