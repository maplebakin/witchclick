// Shared prompt builder for production + local tooling.
import { generateSchemaDocumentation } from './postSpecSchema.js';
import {
  buildHeaderFragment,
  buildProcessFragment,
  buildTypeStructureFragment,
  AUDIENCE_AND_VOICE_FRAGMENT,
  buildInputsFragment,
  buildControlFragment,
  LINKS_AND_ENTITIES_FRAGMENT,
  buildOutputContractFragment,
  JSON_OUTPUT_FRAGMENT,
  buildContextFragment,
  buildEngagementFragment,
  FINAL_SELF_CHECK_FRAGMENT,
} from './promptFragments.js';

function sanitizeArray(input) {
  return Array.isArray(input) ? input : [];
}

export function buildMasterPrompt(options = {}) {
  const {
    topic,
    words,
    contentType,
    mode,
    reflectionPrompts = [],
    editorialInstructions = '',
    styleDirective,
    ads = 'off',
    kofi = 'on',
    brandName,
    siteUrl,
    existingPostTitles = [],
    existingPostSlugs = [],
    allowedAffiliateKeys = [],
    strictJsonRules = [],
    engagementSignals = null,
  } = options;

  return [
    ...buildHeaderFragment({ brandName }),
    ...buildProcessFragment(),
    ...buildInputsFragment({
      brandName, siteUrl, topic,
      words: Number.isFinite(Number(words)) && Number(words) > 0 && Number(words) <= 50000 ? Math.round(Number(words)) : null,
      contentType: mode || contentType,
      reflectionPrompts: sanitizeArray(reflectionPrompts).filter(value => typeof value === 'string' && value.trim()),
      editorialInstructions, styleDirective, ads, kofi,
    }),
    ...buildTypeStructureFragment(mode || contentType),
    ...AUDIENCE_AND_VOICE_FRAGMENT,
    ...buildControlFragment({ ads, kofi }),
    ...LINKS_AND_ENTITIES_FRAGMENT,
    ...buildOutputContractFragment(),
    generateSchemaDocumentation(),
    '',
    ...JSON_OUTPUT_FRAGMENT,
    ...sanitizeArray(strictJsonRules),
    ...buildContextFragment({
      existingPostTitles: sanitizeArray(existingPostTitles),
      existingPostSlugs: sanitizeArray(existingPostSlugs),
      allowedAffiliateKeys: sanitizeArray(allowedAffiliateKeys),
    }),
    ...buildEngagementFragment(engagementSignals || {}),
    ...FINAL_SELF_CHECK_FRAGMENT,
  ].join('\n');
}

export default buildMasterPrompt;
