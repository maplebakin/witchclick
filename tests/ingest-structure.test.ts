import { describe, expect, it } from 'vitest';
import { validateStructure } from '../server/lib/structureValidation.js';
import { prepareSpecForPersistence } from '../server/lib/specPreparation.js';
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

    expect(result.errors).toContain('Ritual posts require a Quick/Low-Energy variant section.');
    expect(result.errors).toContain('Ritual posts require a Deep variant section.');
  });

  it('allows non-ritual posts without ritual variants', () => {
    const spec = createBaseSpec();
    spec.contentType = 'story';
    spec.sections = spec.sections.filter(
      (section: PostSpecV2["sections"][number]) => !/Quick|Deep/.test(section.heading),
    );

    const result = validateStructure(spec, 0);

    expect(result.errors).toHaveLength(0);
  });
});

describe('frontmatter persistence', () => {
  it('persists category and contentType to frontmatter for ritual posts', () => {
    const spec = createBaseSpec();
    spec.category = 'meandering';
    spec.contentType = 'ritual';
    spec.outline = [
      { heading: 'Opening Reflection', id: 'opening-reflection' },
      { heading: 'Quick Ritual', id: 'quick-ritual' },
      { heading: 'Deep Ritual', id: 'deep-ritual' },
      { heading: 'Checklist', id: 'checklist' },
      { heading: 'Reflection Prompt', id: 'reflection-prompt' },
    ];

    const prepared = prepareSpecForPersistence(spec, {
      cwd: process.cwd(),
      postsDirectories: ['/tmp/test-posts'],
    });

    expect(prepared.frontmatter.category).toBe('meandering');
    expect(prepared.frontmatter.contentType).toBe('ritual');
    expect(prepared.post.contents).toContain('category: "meandering"');
    expect(prepared.post.contents).toContain('contentType: "ritual"');
  });

  it('persists default category when not specified', () => {
    const spec = createBaseSpec();
    delete spec.category;
    spec.contentType = 'ritual';
    spec.outline = [
      { heading: 'Opening Reflection', id: 'opening-reflection' },
      { heading: 'Quick Ritual', id: 'quick-ritual' },
      { heading: 'Deep Ritual', id: 'deep-ritual' },
      { heading: 'Checklist', id: 'checklist' },
      { heading: 'Reflection Prompt', id: 'reflection-prompt' },
    ];

    const prepared = prepareSpecForPersistence(spec, {
      cwd: process.cwd(),
      postsDirectories: ['/tmp/test-posts'],
    });

    expect(prepared.frontmatter.contentType).toBe('ritual');
  });

  it('persists story contentType without ritual requirements', () => {
    const spec = createBaseSpec();
    spec.contentType = 'story';
    spec.sections = [
      { heading: 'Opening Reflection', markdown: 'Story introduction sets the scene.' },
      { heading: 'The Journey', markdown: 'The narrative unfolds with sensory details.' },
      { heading: 'Gentle Takeaway', markdown: 'A brief closing reflection.' },
    ];
    spec.outline = [
      { heading: 'Opening Reflection', id: 'opening-reflection' },
      { heading: 'The Journey', id: 'the-journey' },
      { heading: 'Gentle Takeaway', id: 'gentle-takeaway' },
    ];

    const prepared = prepareSpecForPersistence(spec, {
      cwd: process.cwd(),
      postsDirectories: ['/tmp/test-posts'],
    });

    expect(prepared.frontmatter.contentType).toBe('story');
    expect(prepared.post.contents).toContain('contentType: "story"');
  });
});
