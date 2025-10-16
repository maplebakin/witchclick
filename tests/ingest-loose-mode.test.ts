import { describe, expect, it } from 'vitest';

import { normalizePostSpec } from '../server/lib/ingestionAdapter.js';
import { validatePostSpec } from '../server/lib/postSpecValidator.js';

import { prepareSpecForPersistence } from '../server/lib/specPreparation.js';
import { createPostSpec } from './postSpecTestUtils';

type LooseInput = {
  name?: string;
  title?: string;
  summary?: string;
  metaDescription?: string;
  tags: string[];
  sections: Array<{
    heading: string;
    body?: string;
    markdown?: string;
    content?: string;
  }>;
  outline: Array<{ title: string }>;
  internalLinkHints?: Array<{ anchor: string; rationale: string }>;
};

function createBase(): LooseInput {
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

describe('normalizePostSpec internal link hints', () => {
  it('drops missing anchors and reports the change', () => {
    const input = createBase();
    input.sections[0] = {
      heading: 'Opening Reflection',
      markdown: 'Opening paragraph describing mindful breathing exercises and calming tea.',
    };
    input.sections[1] = {
      heading: 'Quick Variant',
      markdown: 'Quick steps revisit the mindful breathing exercises for busy mornings.',
    };
    input.internalLinkHints = [
      { anchor: 'Mindful breathing exercises', rationale: 'Link to breathing ritual.' },
      { anchor: 'Missing anchor phrase', rationale: 'Should be removed.' },
    ];

    const result = normalizePostSpec(input);

    expect(result.spec.internalLinkHints).toEqual([
      { anchor: 'Mindful breathing exercises', rationale: 'Link to breathing ritual.' },
    ]);
    const message = 'internalLinkHint dropped: anchor "Missing anchor phrase" not found in content.';
    expect(result.report).toContain(message);
    expect(result.warnings).toContain(message);

    const validation = validatePostSpec(result.spec, { allowedAffiliateKeys: [] });
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

const AFFILIATE_OPTIONS = { allowedAffiliateKeys: ['micro-notebook', 'ritual-journal', 'grounding-stone'], postsDirectories: ['virtual-posts'] };

describe('prepareSpecForPersistence affiliate hints', () => {
  it('normalizes synonyms, drops empties, and enforces the allow list', () => {
    const synonyms = prepareSpecForPersistence(
      createPostSpec({
        slug: 'affiliate-synonyms',
        affiliateHints: [
          { key: 'notebooks', anchor: 'Travel notebook', rationale: 'Recommend compact notebook.' },
          { key: 'journal', anchor: 'Daily journal', rationale: 'Suggest ritual journal.' },
          { key: 'crystals', anchor: 'Grounding stone', rationale: 'Offer grounding stone.' },
        ],
      }),
      AFFILIATE_OPTIONS,
    );

    expect(synonyms.spec.affiliateHints.map((hint: any) => hint.key)).toEqual(['micro-notebook', 'ritual-journal', 'grounding-stone']);
    expect(synonyms.warnings).toEqual(expect.arrayContaining([
      'Affiliate key "notebooks" normalized to "micro-notebook".',
      'Affiliate key "journal" normalized to "ritual-journal".',
      'Affiliate key "crystals" normalized to "grounding-stone".',
    ]));

    const dropped = prepareSpecForPersistence(
      createPostSpec({
        slug: 'affiliate-empty',
        affiliateHints: [{ key: '   ', anchor: 'Notebook', rationale: 'Notebook mention.' }],
      }),
      AFFILIATE_OPTIONS,
    );
    expect(dropped.spec.affiliateHints).toHaveLength(0);
    expect(dropped.warnings).toContain('Affiliate hint dropped: empty key after normalization.');

    const invalid = prepareSpecForPersistence(
      createPostSpec({
        slug: 'affiliate-invalid',
        affiliateHints: [
          { key: 'cozy-games', anchor: 'Cozy game set', rationale: 'Highlight cozy game bundle.' },
        ],
      }),
      AFFILIATE_OPTIONS,
    );
    expect(invalid.spec.affiliateHints).toHaveLength(0);
    expect(invalid.warnings).toContain('Affiliate hint dropped: key "cozy-games" not in allowed list.');
    expect(invalid.normalizationReport).toContain('affiliateHints dropped key="cozy-games" (not allowed)');
  });
});
