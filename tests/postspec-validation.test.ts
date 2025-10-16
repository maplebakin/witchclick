import { describe, expect, it } from 'vitest';

import { validatePostSpec } from '../src/lib/postSpecValidator';
import type { PostSpecV2 } from '../src/lib/postSpecSchema';

function createSpec(): PostSpecV2 {
  return {
    specVersion: 2,
    title: 'Cozy Focus Ritual',
    slug: 'cozy-focus-ritual',
    metaDescription: 'm'.repeat(150),
    tags: ['ritual', 'focus', 'tea', 'mindfulness'],
    excerpt: 'A short excerpt for readers.',
    outline: [
      { heading: 'Opening Reflection', id: 'opening-reflection' },
      { heading: 'Quick Variant', id: 'quick-variant' },
      { heading: 'Deep Variant', id: 'deep-variant' },
      { heading: 'Reflection Prompt', id: 'reflection-prompt' },
      { heading: 'Ritual Checklist', id: 'ritual-checklist' },
    ],
    sections: [
      { heading: 'Opening Reflection', markdown: 'Opening reflection with grounding language.' },
      { heading: 'Quick Variant', markdown: '1. Step one focus anchor.\n2. Step two low energy anchor.' },
      { heading: 'Deep Variant', markdown: '1. Deep anchor sequence for focus practice.' },
      { heading: 'Reflection Prompt', markdown: 'Reflection prompt question anchor for journaling.' },
      { heading: 'Ritual Checklist', markdown: '- Checklist items anchor for readers.' },
    ],
    entities: [],
    heroImagePrompt: null,
    altTexts: [],
    internalLinkHints: [
      { anchor: 'focus anchor', rationale: 'Link to focus guide.' },
      { anchor: 'low energy anchor', rationale: 'Link to low energy tips.' },
      { anchor: 'anchor sequence', rationale: 'Link to sequence guide.' },
      { anchor: 'prompt question anchor', rationale: 'Link to journaling prompts.' },
      { anchor: 'items anchor', rationale: 'Link to supplies list.' },
    ],
    affiliateHints: [],
    cta: { type: 'none' },
    adPlacements: [],
  };
}

describe('validatePostSpec', () => {
  it('flags mismatched outline and sections', () => {
    const spec = createSpec();
    spec.sections[1] = { heading: 'Different Heading', markdown: 'Content' };
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((msg) => msg.includes('does not match'))).toBe(true);
  });

  it('detects missing anchors in markdown', () => {
    const spec = createSpec();
    spec.internalLinkHints[0] = { anchor: 'missing phrase', rationale: 'Link to missing' };
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((msg) => msg.includes('does not appear'))).toBe(true);
  });

  it('rejects affiliate keys not in allow list', () => {
    const spec = createSpec();
    spec.affiliateHints = [{ key: 'unknown-product', anchor: 'affiliate anchor', rationale: 'Link rationale' }];
    const result = validatePostSpec(spec, { allowedAffiliateKeys: ['known'] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Affiliate key');
  });

  it('warns when internal link count outside range', () => {
    const spec = createSpec();
    spec.internalLinkHints = spec.internalLinkHints.slice(0, 2);
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('Expected 5–8 internalLinkHints'))).toBe(true);
  });

  it('warns when Quick/Deep headings missing', () => {
    const spec = createSpec();
    spec.sections[1].heading = 'Morning Routine';
    spec.sections[2].heading = 'Evening Routine';
    spec.outline[1].heading = 'Morning Routine';
    spec.outline[1].id = 'morning-routine';
    spec.outline[2].heading = 'Evening Routine';
    spec.outline[2].id = 'evening-routine';
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.filter((msg) => msg.includes('Quick') || msg.includes('Deep')).length).toBe(2);
  });

  it('warns when checklist heading missing', () => {
    const spec = createSpec();
    spec.sections[4].heading = 'Takeaways';
    spec.outline[4].heading = 'Takeaways';
    spec.outline[4].id = 'takeaways';
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('Checklist'))).toBe(true);
  });

  it('warns when word count outside tolerance', () => {
    const spec = createSpec();
    const condensed = 'focus anchor low energy anchor anchor sequence prompt question anchor items anchor';
    spec.sections = spec.sections.map((section: PostSpecV2["sections"][number]) => ({
      ...section,
      markdown: condensed,
    }));
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [], targetWordCount: 200 });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('Word count'))).toBe(true);
  });

  it('warns when internal link anchor word count invalid', () => {
    const spec = createSpec();
    spec.sections[0].markdown += ' solo';
    spec.internalLinkHints[0] = { anchor: 'solo', rationale: 'Too short anchor' };
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('should be 2–6 words'))).toBe(true);
  });

  it('warns when outline ids missing', () => {
    const spec = createSpec();
    spec.outline[2].id = '';
    const result = validatePostSpec(spec, { allowedAffiliateKeys: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('Outline[2] is missing an id'))).toBe(true);
  });

  it('returns combined warnings for affiliate anchor length', () => {
    const spec = createSpec();
    spec.sections[0].markdown += ' a very long affiliate anchor phrase indeed';
    spec.affiliateHints = [{ key: 'tea-kit', anchor: 'a very long affiliate anchor phrase indeed', rationale: 'Rationale' }];
    const result = validatePostSpec(spec, { allowedAffiliateKeys: ['tea-kit'] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((msg) => msg.includes('Affiliate anchor'))).toBe(true);
  });
});
