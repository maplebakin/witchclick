import { describe, expect, it } from 'vitest';

import { generateSchemaDocumentation } from '../src/lib/postSpecSchema';
import { buildMasterPrompt } from '../server/lib/promptBuilder.js';

describe('schema documentation consistency', () => {
  it('embeds canonical schema documentation in master prompt', () => {
    const schemaDoc = generateSchemaDocumentation();
    const prompt = buildMasterPrompt({
      topic: 'focus ritual',
      words: 1200,
      ads: 'off',
      kofi: 'on',
      brandName: 'WitchClick',
      siteUrl: 'https://example.com',
      existingPostTitles: [],
      allowedAffiliateKeys: [],
    });
    expect(prompt).toContain(schemaDoc);
  });
});
