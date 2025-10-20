import { describe, expect, it } from 'vitest';

import { genprompt } from '../tools/src/genprompt';
import generatorPresets, { resolveGeneratorPresetKey } from '../server/lib/generatorPresets.js';
import generatorStyles from '../server/lib/generatorStyles.js';
import { adminPipelineHelpers } from '../dev-api';

describe('prompt consistency', () => {
  it('matches CLI and dev API master prompts', () => {
    const options = { topic: 'tea ritual for focus', words: 1200, ads: 'on', kofi: 'off' } as const;
    const cliPrompt = genprompt(options).prompt;
    const devPrompt = adminPipelineHelpers.buildGenprompt(options);
    expect(devPrompt).toBe(cliPrompt);
  });

  it('matches CLI and dev API preset prompts', () => {
    const mode = 'tarotSpread';
    const style = 'tarot';
    const strict = true;
    const topic = 'calming tarot spread for anxious mornings';
    const options = { topic, words: 1200, ads: 'off', kofi: 'on', mode, style, strict } as const;

    const cliPrompt = genprompt(options).prompt;

    const resolvedKey = resolveGeneratorPresetKey(mode);
    const preset = resolvedKey ? (generatorPresets as Record<string, any>)[resolvedKey] : undefined;
    expect(preset).toBeTruthy();
    if (!preset) throw new Error('Preset not found for mode');
    const styleDirective = (generatorStyles as Record<string, string | undefined>)[style.toLowerCase()] ??
      (generatorStyles as Record<string, string>)['cozy'];
    const devPrompt = adminPipelineHelpers.buildPresetPrompt({
      preset,
      topic,
      strict,
      styleDirective,
      contentType: resolvedKey,
    });

    expect(devPrompt).toBe(cliPrompt);
  });
});
