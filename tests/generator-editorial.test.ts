import { describe, expect, it } from 'vitest';
import { genprompt } from '../tools/src/genprompt';
import { adminPipelineHelpers } from '../dev-api';
import { POST } from '../src/pages/api/genprompt.json';
import { generatorPresetOptions, resolveGeneratorApproach } from '../server/lib/generatorPresets.js';
import { CONTENT_TYPES, POST_CATEGORIES, TOPIC_CLUSTERS, PostSpecV2Schema } from '../server/lib/postSpecSchema.js';
import { validateStructure } from '../server/lib/structureValidation.js';
import { createPostSpec } from './postSpecTestUtils';

const topics = [
  'How to tell ordinary relationship disagreements from fundamental incompatibility',
  'A simple secular ritual for releasing resentment',
  'The geological properties and symbolic uses of amethyst',
  'Why creative burnout can make hobbies feel like obligations',
];
const defaults = {ads:'off',kofi:'on'} as const;

describe('topic-first editorial generation', () => {
  it.each(topics)('delegates planning honestly for %s', topic => {
    const prompt = genprompt({topic,...defaults}).prompt;
    expect(prompt).toContain(`topic: ${JSON.stringify(topic)}`);
    expect(prompt).toContain('No approach has been inferred by this prompt builder');
    expect(prompt).toContain('wordCount: automatic');
    expect(prompt).toContain('contentType: automatic');
    expect(prompt).toContain('Do not default to ritual');
    expect(prompt).toContain('Do not force numbered steps, checklists, reflection questions or rituals into unrelated articles');
    expect(prompt).toContain('For an actual ritual topic, retain concrete numbered instructions');
    expect(prompt).toContain('separate scientific facts from traditional symbolism');
    expect(prompt).toContain('Do not invent personal experiences');
    expect(prompt).toContain('hypothetical examples as real events');
    expect(prompt).not.toContain('include a checklist box');
    expect(prompt).not.toContain('5–8 internalLinkHints');
    expect(prompt).not.toContain('Moon Bath');
    for (const field of [...CONTENT_TYPES,...POST_CATEGORIES,...TOPIC_CLUSTERS]) expect(prompt).toContain(field);
  });

  it.each(generatorPresetOptions)('maps $key and includes only its specialist contract', ({key,label}) => {
    const approach = resolveGeneratorApproach(key)!;
    const prompt = genprompt({topic:'A neutral topic',mode:key,...defaults}).prompt;
    expect(CONTENT_TYPES).toContain(approach.contentType);
    expect(prompt).toContain(`contentType: "${approach.contentType}"`);
    expect(prompt).toContain(`Explicit approach override: ${label}`);
    for (const other of generatorPresetOptions.filter(preset => preset.key !== key)) {
      expect(prompt).not.toContain(`Content Structure for ${other.label}:`);
    }
  });

  it.each(['ritual','reflection','story','tarot','tarotSpread','spread','crystals','spellwork'])('maps legacy alias %s', alias => {
    expect(CONTENT_TYPES).toContain(resolveGeneratorApproach(alias)!.contentType);
    expect(genprompt({topic:'Topic',mode:alias,...defaults}).prompt).not.toContain('contentType: automatic');
  });

  it('propagates explicit questions and instructions without breaking the input block', () => {
    const prompt = genprompt({topic:'Topic',mode:'curiousExplainer',words:800,...defaults, reflectionPrompts:['What feels "enough"?'],editorialInstructions:'Focus on boundaries.\nAvoid assumptions.'}).prompt;
    expect(prompt).toContain('reflectionPrompts: ["What feels \\"enough\\"?"]');
    expect(prompt).toContain('Focus on boundaries.\\nAvoid assumptions.');
    expect(prompt).toContain('incorporate them even if a preset normally omits questions');
    expect(prompt).toContain('wordCount: 800');
  });

  it.each([undefined,null,0,-1,NaN,60000])('uses automatic length for invalid or absent target %s', words => {
    expect(genprompt({topic:'Topic',words,...defaults}).prompt).toContain('wordCount: automatic');
  });

  it('keeps CLI, dev API helper and Astro API prompts identical for all neutral fixtures', async () => {
    for (const topic of topics) {
      const options = {topic,...defaults,reflectionPrompts:['What matters?'],editorialInstructions:'Use hypothetical examples.'};
      const expected = genprompt(options).prompt;
      expect(adminPipelineHelpers.buildGenprompt(options)).toBe(expected);
      const response = await POST({request:new Request('http://localhost/api/genprompt.json',{method:'POST',body:JSON.stringify(options)})});
      expect(response.status).toBe(200);
      expect((await response.json()).prompt).toBe(expected);
    }
  });

  it('allows a schema-compatible reflective essay without compulsory questions', () => {
    const spec = createPostSpec({category:'meandering',contentType:'reflection',cluster:'cozy-witchcraft',
      outline:[{heading:'Opening Reflection',id:'opening-reflection'},{heading:'Closing',id:'closing'}],
      sections:[{heading:'Opening Reflection',markdown:'An ordinary tension deserves a careful explanation.'},{heading:'Closing',markdown:'Readers can choose their own next step.'}],internalLinkHints:[],affiliateHints:[]});
    expect(PostSpecV2Schema.safeParse(spec).success).toBe(true);
    expect(validateStructure(spec,100).errors).toEqual([]);
  });
});
