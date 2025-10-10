import { describe, expect, it } from 'vitest';
import { CURSE_TAGS } from '../server/lib/curseSpecSchema.js';
import { buildCursePrompt } from '../server/lib/cursePromptBuilder.js';

const TAG_LINE = JSON.stringify(CURSE_TAGS);

describe('buildCursePrompt', () => {
  it('includes tone guidance and schema doc', () => {
    const prompt = buildCursePrompt({
      type: 'mirror',
      target: 'person',
      tone: 'poetic',
      sigilName: 'Mirror Bell',
      altarItem: 'Silver candle',
      journalingFollowUp: 'Where do I soften while staying firm?'
    });

    expect(prompt).toContain('Truth-forward');
    expect(prompt).toContain('CurseSpec v1');
  });

  it('lists canonical tags', () => {
    const prompt = buildCursePrompt({
      type: 'return',
      target: 'dynamic',
      tone: 'restrained',
    });

    expect(prompt).toContain(TAG_LINE);
  });
});
