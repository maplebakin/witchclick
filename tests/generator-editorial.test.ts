import { describe, expect, it } from 'vitest';
import { buildMasterPrompt } from '../server/lib/promptBuilder.js';
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
    expect(prompt).toContain('Only if the chosen type is ritual/spellwork: retain concrete numbered');
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


// These tests inspect the prompt and its tiny examples; they do not simulate LLM compliance.
describe('first-pass PostSpec prompt contract', () => {
  const topic = topics[0]!;
  const build = (options: Record<string, unknown> = {}) => buildMasterPrompt({
    topic, ...defaults, brandName:'WitchClick', siteUrl:'https://witchclick.space', ...options,
  });

  it('puts the reader question before voice, drafting and JSON population', () => {
    const prompt = build();
    const steps = [
      '1. Identify what the reader is asking', '2. Choose the editorial approach',
      '3. Select a compatible PostSpec', '4. Apply WitchClick voice',
      '5. Draft substantive, non-repetitive prose', '6. Populate the JSON contract',
    ];
    const positions = steps.map(step => prompt.indexOf(step));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a,b) => a-b));
    expect(prompt.indexOf('DECISION ORDER')).toBeLessThan(prompt.indexOf('VOICE & EDITORIAL STANDARDS'));
    expect(prompt).toContain('distinguish, compare, understand or evaluate something default to contentType "guide"');
    expect(prompt).toContain('Reserve ritual for a topic explicitly requesting a ritual');
    expect(prompt).not.toContain('Headings MUST explicitly include "Quick"');
    expect(prompt).not.toContain('Journaling Prompts: 3–5');
  });

  it('includes exactly two parseable minimal examples, with literal Markdown/URLs and encoded paragraphs', () => {
    const prompt = build();
    const examples = prompt.split('\n').filter(line => line.startsWith('Correct '))
      .map(line => line.slice(line.indexOf(': ') + 2));
    expect(examples).toHaveLength(2);
    const parsed = examples.map(example => JSON.parse(example));
    expect(parsed).toEqual([
      {markdown:'This is **important**. Read [this source](https://example.com).'},
      {markdown:'A "quoted" word.\n\nA second paragraph.'},
    ]);
    expect(examples[1]).toContain(String.raw`\"quoted\"`);
    expect(examples[1]).toContain(String.raw`\n\n`);
    expect(prompt).toContain('Never escape Markdown asterisks, brackets, periods, colons or URL slashes');
    expect(prompt).toContain('never insert literal unescaped newlines inside JSON strings');
    expect(prompt).toContain(String.raw`\*\*important\*\* and https\://example\.com`);
    for (const bad of [String.raw`\*`,String.raw`\:`,String.raw`\.`]) {
      expect(() => JSON.parse(`{"markdown":"${bad}"}`)).toThrow();
    }
  });

  it.each([
    ['off','off'],['off','on'],['on','off'],['on','on'],
  ] as const)('emits binding request-specific controls for ads=%s kofi=%s', (ads,kofi) => {
    const prompt = build({ads,kofi});
    expect(prompt).toContain(`includeAds: "${ads}"`);
    expect(prompt).toContain(`includeKofi: "${kofi}"`);
    const controls = prompt.split('OUTPUT CONTROLS — binding for this request\n')[1]!.split('\n\n')[0]!;
    expect(controls).toContain(ads === 'off'
      ? 'output "adPlacements": [] unconditionally'
      : 'choose adPlacements using actual body length');
    expect(controls).not.toContain(ads === 'off' ? 'includeAds is on' : 'includeAds is off');
    expect(controls).toContain(kofi === 'off'
      ? 'never output a Ko-fi CTA. Use "cta": {"type":"none"}'
      : 'use "cta": {"type":"kofi"}');
    expect(controls).toContain('Never invent a download or its id');
    expect(controls).not.toContain(kofi === 'off' ? 'includeKofi is on' : 'includeKofi is off');
  });

  it('separates generator-only inputs from the one canonical output contract', () => {
    const prompt = build();
    const allowed = prompt.match(/^Allowed top-level fields ONLY: (.+)\.$/m)![1]!.split(', ');
    expect(allowed).toEqual(Object.keys(PostSpecV2Schema.shape));
    const required = prompt.match(/^Required fields: (.+)\.$/m)![1]!.split(', ');
    const expected = ['specVersion','title','slug','metaDescription','tags','excerpt','outline','sections',
      'entities','heroImagePrompt','altTexts','internalLinkHints','affiliateHints','cta','adPlacements'];
    expect(required).toEqual(expected);
    for (const input of ['includeAds','includeKofi','wordCount','topic','styleDirective','reflectionPrompts','editorialInstructions']) {
      expect(allowed).not.toContain(input);
      expect(required).not.toContain(input);
    }
    expect(required).not.toContain('externalLink');
    expect(required).toEqual(expect.arrayContaining(['specVersion','entities','altTexts','internalLinkHints','affiliateHints','heroImagePrompt']));
    expect(prompt).toContain('are NOT output properties');
    expect(prompt).toContain('not example JSON to copy');
    expect(prompt).not.toContain('markdown|content');
    expect(prompt).not.toContain('title (name, headline)');
    expect(prompt).not.toContain('can be normalized');
    expect(prompt.match(/^POSTSPEC OUTPUT CONTRACT$/gm)).toHaveLength(1);
  });

  it('preserves all supplied collision/link context without encouraging catalog filler', () => {
    const titles = ['Ordinary conflicts','A reference entry','A draft title'];
    const slugs = ['ordinary-conflicts','reference-entry','draft-title','historical-slug'];
    const prompt = build({existingPostTitles:titles,existingPostSlugs:slugs,allowedAffiliateKeys:['journal'],
      engagementSignals:{entities:[{type:'herb',slug:'unrelated-herb',reason:'Under-served'}]}});
    const readArray = (name: string) => JSON.parse(prompt.match(new RegExp(`^${name}: (.+)$`,'m'))![1]!);
    expect(readArray('existingPostTitles')).toEqual(titles);
    expect(readArray('existingPostSlugs')).toEqual(slugs);
    expect(readArray('allowedAffiliateKeys')).toEqual(['journal']);
    expect(prompt).toContain('every anchor must appear verbatim in article Markdown');
    expect(prompt).toContain('Zero hints are acceptable: []; no quota or padding');
    expect(prompt).toContain('Include the corresponding Markdown link in the article, using the same URL and anchor');
    expect(prompt).toContain('omit this optional field entirely when no reliable source is available');
    expect(prompt).toContain('include only entities actually referenced in the article');
    expect(prompt).toContain('never add a subject/entity merely because it is suggested here');
    expect(prompt).not.toContain('Entities worth weaving');
    expect(prompt).not.toContain('may and should use the provided topic, post titles, and slugs');
  });

  it('ends with one eight-point self-check without claiming parser execution', () => {
    const prompt = build();
    expect(prompt.match(/^FINAL SELF-CHECK/gm)).toHaveLength(1);
    const checks = prompt.split('FINAL SELF-CHECK')[1]!;
    expect(checks.match(/^[1-8]\. /gm)).toHaveLength(8);
    for (const phrase of ['actual topic','category, contentType and cluster','required PostSpec fields',
      'valid JSON strings','anchor present verbatim','obey OUTPUT CONTROLS','unsupported output fields','complete JSON object']) {
      expect(checks).toContain(phrase);
    }
    expect(checks).toContain('do not claim you executed JSON.parse or a validator unless you actually did');
    expect(prompt.endsWith('Return the object only, not this checklist.')).toBe(true);
    expect(prompt).toContain('prefer a concise complete article to an unfinished JSON object');
    expect(prompt).not.toContain('Infer primary intent + 2 secondary intents');
    expect(prompt).not.toContain('GOLDEN JSON EXAMPLE');
    expect(prompt).not.toContain('match the selected template/content type unless');
    expect(prompt).not.toContain('imagine running JSON.parse');
  });

  it('keeps specialist tarot links optional and requests only its own structure', () => {
    const prompt = build({mode:'grimoireTarot'});
    expect(prompt).toContain('an internal link only if relevant');
    expect(prompt).not.toContain('and one internal link');
    expect(prompt).toContain('A single-card reference may use guide');
    expect(prompt).not.toContain('Quick / Low-Energy Variant: 3–5');
  });
});
