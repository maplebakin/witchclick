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

  it('uses distinctive mechanics for different ritual intentions', () => {
    const common = { target: 'person', tone: 'restrained' } as const;
    const sever = buildCursePrompt({ ...common, type: 'sever' });
    const echo = buildCursePrompt({ ...common, type: 'echo' });
    expect(sever).toContain('separate from a draining obligation');
    expect(echo).toContain('give a silenced truth words');
    expect(sever).not.toContain('Echo: give a silenced truth words');
  });

  it('requires non-visual alternatives and avoids guaranteed resolution', () => {
    const prompt = buildCursePrompt({ type: 'knife', target: 'dynamic', tone: 'gentle' });
    expect(prompt).toContain('equally valid non-visual alternative');
    expect(prompt).toContain('Do not promise emotional resolution');
    expect(prompt).toContain('no actual blade is necessary');
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
