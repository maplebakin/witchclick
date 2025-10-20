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

  // Content-type specific validations
  const hasQuick =
    headings.some((heading) => /quick|low[- ]?energy|5[- ]?minute/.test(heading)) ||
    /quick|low[- ]?energy/.test(body);
  const hasDeep =
    headings.some((heading) => /deep( dive)?|long(er)?/.test(heading)) || /deep( dive)?/.test(body);

  // Ritual and spellwork require Quick/Deep variants
  if ((contentType === 'ritual' || contentType === 'spellwork') && !(hasQuick && hasDeep)) {
    errors.push(`${contentType === 'ritual' ? 'Ritual' : 'Spellwork'} posts require both Quick/Low-Energy and Deep variants.`);
  }

  const hasChecklist = headings.some((heading) => /checklist|summary|at a glance/.test(heading));
  // Only ritual, guide, and spellwork require checklists
  if ((contentType === 'ritual' || contentType === 'guide' || contentType === 'spellwork') && !hasChecklist) {
    errors.push('Missing section: Checklist/Summary');
  }

  const hasReflection =
    headings.some((heading) => /reflection prompt|journal|reflection/.test(heading)) ||
    /prompt|question/.test(body);
  // Reflection essays and rituals benefit from reflection prompts, but stories/crystals don't need them
  if ((contentType === 'ritual' || contentType === 'reflection' || contentType === 'guide') && !hasReflection) {
    warnings.push('Consider adding a Reflection Prompt section for deeper engagement.');
  }

  // Tarot spreads should have position descriptions
  if ((contentType === 'tarotSpread' || contentType === 'spread') && !headings.some((heading) => /position|layout|spread/.test(heading))) {
    warnings.push('Tarot spreads should include a section describing card positions or spread layout.');
  }

  // Crystal profiles should have geological/care info
  if (contentType === 'crystals' && !headings.some((heading) => /geolog|properties|care|cleansing/.test(heading))) {
    warnings.push('Crystal profiles should include geological properties and care instructions.');
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
