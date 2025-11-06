// server/lib/structureValidation.js
// Shared structural validation helpers for PostSpec ingestion.

import { CONTENT_TYPES } from './postSpecSchema.js';

const SAFETY_TRIGGER_REGEX = /candle|open flame|fire|smoke|incense|knife|scissors|burn|trauma|panic|anxiety|depression/i;

export function needsSafetyNote(sections) {
  const text = Array.isArray(sections)
    ? sections
        .map((section) => `${section?.heading || ''}\n${section?.markdown || ''}`)
        .join('\n')
        .toLowerCase()
    : '';
  if (!text) return false;
  return SAFETY_TRIGGER_REGEX.test(text);
}

export function hasSafetySection(sections) {
  if (!Array.isArray(sections)) return false;
  return sections.some((section) => /safety|note|disclaimer/i.test(String(section?.heading || '')));
}

export function isPostContentType(value) {
  return typeof value === 'string' && CONTENT_TYPES.includes(value);
}

export function resolveContentType(spec, warnings) {
  const raw = spec?.contentType;
  if (isPostContentType(raw)) {
    spec.contentType = raw;
    return raw;
  }
  if (raw !== undefined && raw !== null) {
    warnings.push(`Unknown contentType "${raw}", defaulting to "ritual".`);
  }
  spec.contentType = 'ritual';
  return 'ritual';
}

export function validateStructure(spec, contentWords) {
  const errors = [];
  const warnings = [];

  const contentType = resolveContentType(spec, warnings);

  const requiredFields = [
    'specVersion',
    'title',
    'slug',
    'contentType',
    'metaDescription',
    'tags',
    'excerpt',
    'outline',
    'sections',
    'affiliateHints',
    'internalLinkHints',
    'cta',
    'adPlacements',
  ];
  const missing = requiredFields.filter((key) => spec[key] === undefined);
  if (missing.length) {
    errors.push(`Missing fields: ${missing.join(', ')}`);
  }

  if (spec.specVersion !== 2) errors.push('specVersion must be 2');
  if (!Array.isArray(spec.tags) || spec.tags.length < 4 || spec.tags.length > 7) {
    errors.push('tags must be 4–7');
  }

  const metaDescriptionLength = String(spec.metaDescription || '').length;
  if (metaDescriptionLength < 150 || metaDescriptionLength > 160) {
    warnings.push(`metaDescription length ≈${metaDescriptionLength} (target 150–160)`);
  }

  const sections = Array.isArray(spec.sections) ? spec.sections : [];
  const headings = sections.map((section) => String(section?.heading || '').toLowerCase());
  const body = sections.map((section) => String(section?.markdown || '')).join('\n').toLowerCase();

  const hasOpening =
    headings.includes('opening reflection') ||
    headings.some((heading) => /^opening/.test(heading) && /(reflection|scene|note)/.test(heading));
  if (!hasOpening) errors.push('Missing section: Opening Reflection');

  const headingMatches = (patterns) =>
    headings.some((heading) => patterns.some((pattern) => pattern.test ? pattern.test(heading) : heading.includes(pattern)));
  const bodyMatches = (patterns) =>
    patterns.some((pattern) => (pattern.test ? pattern.test(body) : body.includes(pattern)));

  const normalizedType = (() => {
    if (contentType === 'guide') return 'ritual';
    if (contentType === 'spread') return 'tarotSpread';
    return contentType;
  })();

  switch (normalizedType) {
    case 'ritual': {
      const hasQuick = headingMatches([/quick/, /low[- ]?energy/, /5[- ]?minute/]) || bodyMatches([/quick/, /low[- ]?energy/]);
      const hasDeep = headingMatches([/deep( dive)?/, /long(er)?/, /extended/]) || bodyMatches([/deep( dive)?/]);
      if (!hasQuick) errors.push('Ritual posts require a Quick/Low-Energy variant section.');
      if (!hasDeep) errors.push('Ritual posts require a Deep variant section.');
      if (!headingMatches([/reflection prompt/, /journal/, /reflection/])) {
        errors.push('Ritual posts require a Reflection Prompt section.');
      }
      if (!headingMatches([/checklist/, /summary/, /at a glance/])) {
        errors.push('Ritual posts require a Checklist/Summary section.');
      }
      break;
    }
    case 'reflection': {
      if (!headingMatches([/journal/, /prompt/])) {
        errors.push('Reflection essays require a Journaling Prompts section.');
      }
      if (!headingMatches([/gentle closing/, /closing/, /integration/, /takeaway/, /aftercare/])) {
        errors.push('Reflection essays require a Gentle Closing section.');
      }
      break;
    }
    case 'story': {
      if (!headingMatches([/takeaway/, /closing/, /reflection/, /gentle closing/, /soft landing/])) {
        warnings.push('Story posts benefit from a gentle closing reflection section.');
      }
      if (headingMatches([/checklist/, /prompt/, /step-by-step/, /instructions/])) {
        warnings.push('Story posts should avoid checklists or instructional sections.');
      }
      break;
    }
    case 'tarotSpread': {
      if (!headingMatches([/layout/, /spread/])) {
        errors.push('Tarot spreads require a Spread Layout section.');
      }
      if (!headingMatches([/position/, /meaning/])) {
        errors.push('Tarot spreads require a Position Meanings section.');
      }
      if (!headingMatches([/reading tips/, /reading guidance/, /interpreting/])) {
        errors.push('Tarot spreads require a Reading Tips section.');
      }
      if (!headingMatches([/reflection/, /question/])) {
        errors.push('Tarot spreads require a Reflection Questions section.');
      }
      break;
    }
    case 'spellwork': {
      if (!headingMatches([/ingredient/, /correspondence/])) {
        errors.push('Spellwork posts require an Ingredients & Correspondences section.');
      }
      if (!headingMatches([/step/, /instruction/, /working/])) {
        errors.push('Spellwork posts require a Step-by-Step Instructions section.');
      }
      if (!headingMatches([/variation/, /substitution/, /options/])) {
        errors.push('Spellwork posts require a Variations & Substitutions section.');
      }
      if (!headingMatches([/closing/, /grounding/, /aftercare/])) {
        errors.push('Spellwork posts require a Closing & Grounding section.');
      }
      if (!headingMatches([/safety/, /disclaimer/, /note/])) {
        warnings.push('Spellwork posts should include a safety note that highlights consent and physical safety.');
      }
      if (!headingMatches([/checklist/, /summary/])) {
        errors.push('Spellwork posts require a Checklist/Summary section.');
      }
      break;
    }
    case 'crystals': {
      if (!headingMatches([/geolog/, /formation/, /properties/])) {
        errors.push('Crystal profiles require a Geological Properties section.');
      }
      if (!headingMatches([/mindful/, /use/, /application/])) {
        errors.push('Crystal profiles require a Mindful Uses section.');
      }
      if (!headingMatches([/care/, /cleansing/, /maintenance/])) {
        errors.push('Crystal profiles require a Care & Cleansing section.');
      }
      if (!headingMatches([/pairing/, /combine/, /companions/])) {
        errors.push('Crystal profiles require a Pairing Ideas section.');
      }
      break;
    }
    default: {
      if (contentType === 'guide') {
        if (!headingMatches([/checklist/, /summary/, /at a glance/])) {
          errors.push('Guide posts require a Checklist/Summary section.');
        }
      }
      break;
    }
  }

  if (!(typeof spec.heroImagePrompt === 'string' || spec.heroImagePrompt === null)) {
    errors.push('heroImagePrompt must be string or null');
  }

  if (!Array.isArray(spec.internalLinkHints) || spec.internalLinkHints.length < 3) {
    warnings.push('internalLinkHints are sparse (aim 5–8).');
  }

  const prose = body.toLowerCase();
  const missingAnchors = (Array.isArray(spec.internalLinkHints) ? spec.internalLinkHints : [])
    .map((hint) => String(hint?.anchor || '').toLowerCase())
    .filter((anchor) => anchor && !prose.includes(anchor));
  if (missingAnchors.length) {
    const list = missingAnchors.slice(0, 5).join(', ');
    warnings.push(
      `Some internalLinkHints anchors not found verbatim in prose: ${list}${
        missingAnchors.length > 5 ? '…' : ''
      }`
    );
  }

  const maxAffiliateAnchors = Math.floor(Number(contentWords || 0) / 250) + 1;
  const affiliateCount = Array.isArray(spec.affiliateHints) ? spec.affiliateHints.length : 0;
  if (affiliateCount > maxAffiliateAnchors) {
    warnings.push(`Affiliate density high (${affiliateCount} > ${maxAffiliateAnchors}); aim ≤ ~1 per 250 words.`);
  }

  if (needsSafetyNote(spec.sections) && !hasSafetySection(spec.sections)) {
    warnings.push('Content looks like it needs a safety note, but none was found.');
  }

  const imagesMentioned = sections.some((section) => /!\[[^\]]*\]\([^)]+\)/.test(String(section?.markdown || '')));
  if (imagesMentioned && (!Array.isArray(spec.altTexts) || spec.altTexts.length === 0)) {
    warnings.push('Images appear in markdown but altTexts is empty.');
  }

  return { errors, warnings };
}

export default validateStructure;
