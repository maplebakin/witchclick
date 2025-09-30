import { describe, expect, it } from 'vitest';

import { genprompt } from '../tools/src/genprompt';
import { adminPipelineHelpers } from '../dev-api';

describe('prompt consistency', () => {
  it('matches CLI and dev API master prompts', () => {
    const options = { topic: 'tea ritual for focus', words: 1200, ads: 'on', kofi: 'off' } as const;
    const cliPrompt = genprompt(options).prompt;
    const devPrompt = adminPipelineHelpers.buildGenprompt(options);
    expect(devPrompt).toBe(cliPrompt);
  });
});
