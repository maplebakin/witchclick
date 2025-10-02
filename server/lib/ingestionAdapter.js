// server/lib/ingestionAdapter.js — conflict-free, deterministic normalizer
// @ts-check

import { CONTENT_TYPES } from './postSpecSchema.js';

/**
 * @typedef {import('./postSpecSchema.js').PostSpecV2} PostSpecV2
 */

/**
 * @typedef {{ spec: PostSpecV2; report: string[] }} NormalizePostSpecResult
 */

const OPENING_HEADING = 'Opening Reflection';
const OPENING_ID = 'opening-reflection';
const VALID_AD_PLACEMENTS = new Set(['lead', 'mid', 'end']);

const AFFILIATE_SYNONYMS = {
  notebooks: 'micro-notebook',
  journal: 'ritual-journal',
  crystals: 'grounding-stone',
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  return '';
}

function normalizeAffiliateKey(key) {
  const trimmed = typeof key === 'string' ? key.trim() : toTrimmedString(key);
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(AFFILIATE_SYNONYMS, lowered)) {
    return AFFILIATE_SYNONYMS[lowered];
  }
  return trimmed;
}

function slugify(value) {
  const base = toTrimmedString(value);
  if (!base) return '';
  return base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toTrimmedString(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return null;
}

function sanitizeInternalLinkHints(value) {
  if (!Array.isArray(value)) return null;
  const hints = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const anchor = toTrimmedString(item.anchor);
    if (!anchor) continue;
    const rationale = toTrimmedString(item.rationale);
    hints.push({ anchor, rationale });
  }
  return hints;
}

function sanitizeAffiliateHints(value, warnings) {
  if (!Array.isArray(value)) return null;
  const hints = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const originalKey = toTrimmedString(item.key);
    const key = normalizeAffiliateKey(originalKey);
    const anchor = toTrimmedString(item.anchor);
    if (!key) {
      if (warnings) warnings.push('Affiliate hint dropped: empty key after normalization.');
      continue;
    }
    if (!anchor) continue;
    if (warnings && originalKey && key !== originalKey) {
      warnings.push(`Affiliate key "${originalKey}" normalized to "${key}".`);
    }
    const rationale = toTrimmedString(item.rationale);
    hints.push({ key, anchor, rationale });
  }
  return hints;
}

function sanitizeEntities(value) {
  if (!Array.isArray(value)) return null;
  const entities = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const type = toTrimmedString(item.type);
    const slug = slugify(item.slug || item.name || '');
    if (!type || !slug) continue;
    entities.push({ type, slug });
  }
  return entities;
}

function sanitizeAdPlacements(value) {
  if (!Array.isArray(value)) return null;
  const placements = [];
  for (const item of value) {
    const slot = toTrimmedString(item).toLowerCase();
    if (!VALID_AD_PLACEMENTS.has(slot)) continue;
    if (!placements.includes(slot)) placements.push(slot);
  }
  return placements;
}

function isOpeningHeading(value) {
  return toTrimmedString(value).toLowerCase() === OPENING_HEADING.toLowerCase();
}

function ensureOpening(outline, sections, report) {
  let movedReported = false;

  let normalizedOutline = outline.map((item) => ({ ...item }));
  if (normalizedOutline.length === 0) {
    normalizedOutline = [{ heading: OPENING_HEADING, id: OPENING_ID }];
    report.push('inserted Opening Reflection outline');
  } else {
    const idx = normalizedOutline.findIndex((item) => isOpeningHeading(item.heading));
    if (idx === -1) {
      normalizedOutline = [{ heading: OPENING_HEADING, id: OPENING_ID }, ...normalizedOutline];
      report.push('inserted Opening Reflection outline');
    } else {
      const entry = normalizedOutline[idx];
      const rest = normalizedOutline.filter((_, i) => i !== idx);
      if (idx > 0) {
        normalizedOutline = [
          { heading: OPENING_HEADING, id: entry.id ? slugify(entry.id) || OPENING_ID : OPENING_ID },
          ...rest,
        ];
        if (!movedReported) {
          report.push('moved Opening Reflection to first position');
          movedReported = true;
        }
      } else {
        normalizedOutline = [
          { heading: OPENING_HEADING, id: entry.id ? slugify(entry.id) || OPENING_ID : OPENING_ID },
          ...rest,
        ];
      }
    }
  }
  if (normalizedOutline.length) {
    normalizedOutline[0] = { heading: OPENING_HEADING, id: OPENING_ID };
  }

  let normalizedSections = sections.map((item) => ({ ...item }));
  if (normalizedSections.length === 0) {
    normalizedSections = [{ heading: OPENING_HEADING, markdown: '' }];
    report.push('inserted Opening Reflection section');
  } else {
    const idx = normalizedSections.findIndex((item) => isOpeningHeading(item.heading));
    if (idx === -1) {
      normalizedSections = [{ heading: OPENING_HEADING, markdown: '' }, ...normalizedSections];
      report.push('inserted Opening Reflection section');
    } else {
      const entry = normalizedSections[idx];
      const rest = normalizedSections.filter((_, i) => i !== idx);
      if (idx > 0) {
        normalizedSections = [
          { heading: OPENING_HEADING, markdown: typeof entry.markdown === 'string' ? entry.markdown : '' },
          ...rest,
        ];
        if (!movedReported) {
          report.push('moved Opening Reflection to first position');
          movedReported = true;
        }
      } else {
        normalizedSections = [
          { heading: OPENING_HEADING, markdown: typeof entry.markdown === 'string' ? entry.markdown : '' },
          ...rest,
        ];
      }
    }
  }
  if (normalizedSections.length) {
    const firstMarkdown = typeof normalizedSections[0].markdown === 'string' ? normalizedSections[0].markdown : '';
    normalizedSections[0] = { heading: OPENING_HEADING, markdown: firstMarkdown };
  }

  return { outline: normalizedOutline, sections: normalizedSections };
}

/**
 * @param {unknown} raw
 * @returns {NormalizePostSpecResult}
 */
export function normalizePostSpec(raw) {
  const input = isPlainObject(raw) ? raw : {};
  const report = [];
  const warnings = [];

  // title & aliases
  let title = toTrimmedString(input.title);
  if (!title) {
    const fromName = toTrimmedString(input.name);
    if (fromName) {
      title = fromName;
      report.push('name→title');
    }
  }
  if (!title) {
    const fromHeadline = toTrimmedString(input.headline);
    if (fromHeadline) {
      title = fromHeadline;
      report.push('headline→title');
    }
  }
  if (!title) throw new Error('Title required');

  // slug
  let slug = slugify(input.slug);
  if (!slug) {
    slug = slugify(title);
    report.push('generated slug from title');
  }

  // metaDescription & aliases
  let metaDescription = toTrimmedString(input.metaDescription);
  if (!metaDescription) {
    const fromDescription = toTrimmedString(input.description);
    if (fromDescription) {
      metaDescription = fromDescription;
      report.push('description→metaDescription');
    }
  }
  if (!metaDescription) {
    const fromMeta = toTrimmedString(input.meta);
    if (fromMeta) {
      metaDescription = fromMeta;
      report.push('meta→metaDescription');
    }
  }
  if (!metaDescription) {
    const fromSummary = toTrimmedString(input.summary);
    if (fromSummary) {
      metaDescription = fromSummary;
      report.push('summary→metaDescription');
    }
  }
  metaDescription = metaDescription || '';

  // content type
  const rawContentType = toTrimmedString(input.contentType).toLowerCase();
  const contentType = CONTENT_TYPES.includes(rawContentType) ? rawContentType : undefined;
  if (contentType && rawContentType !== input.contentType) {
    report.push('normalized contentType');
  }

  // tags & aliases
  const tagsFromCanonical = sanitizeStringArray(input.tags);
  let tags = Array.isArray(tagsFromCanonical) ? tagsFromCanonical : [];
  let tagsProvided = tagsFromCanonical !== null;
  if (!tagsProvided) {
    const fromKeywords = sanitizeStringArray(input.keywords);
    if (Array.isArray(fromKeywords) && fromKeywords.length > 0) {
      tags = fromKeywords;
      tagsProvided = true;
      report.push('keywords→tags');
    }
    if (!tagsProvided) {
      const fromLabels = sanitizeStringArray(input.labels);
      if (Array.isArray(fromLabels) && fromLabels.length > 0) {
        tags = fromLabels;
        tagsProvided = true;
        report.push('labels→tags');
      }
    }
  }
  if (!tagsProvided) {
    tags = [];
    report.push('defaulted tags=[]');
  }

  // excerpt
  const excerpt = toTrimmedString(input.excerpt);

  // outline & alias mapping
  const outlineSource = Array.isArray(input.outline) ? input.outline : [];
  let outline = [];
  let outlineAliasReported = false;
  for (const entry of outlineSource) {
    if (!isPlainObject(entry)) continue;
    let heading = toTrimmedString(entry.heading);
    if (!heading) {
      const aliasHeading = toTrimmedString(entry.title);
      if (aliasHeading) {
        heading = aliasHeading;
        if (!outlineAliasReported) {
          report.push('outline.title→outline.heading');
          outlineAliasReported = true;
        }
      }
    }
    if (!heading) continue;
    const id = slugify(entry.id || heading);
    outline.push({ heading, id: id || OPENING_ID });
  }

  // sections & alias mapping
  const sectionsSource = Array.isArray(input.sections) ? input.sections : [];
  let sections = [];
  let sectionContentAliased = false;
  let sectionBodyAliased = false;
  for (const entry of sectionsSource) {
    if (!isPlainObject(entry)) continue;
    const heading = toTrimmedString(entry.heading);
    let markdown = typeof entry.markdown === 'string' ? entry.markdown : '';
    if (!markdown) {
      const fromContent = typeof entry.content === 'string' ? entry.content : '';
      if (fromContent) {
        markdown = fromContent;
        if (!sectionContentAliased) {
          report.push('sections.content→sections.markdown');
          sectionContentAliased = true;
        }
      }
    }
    if (!markdown) {
      const fromBody = typeof entry.body === 'string' ? entry.body : '';
      if (fromBody) {
        markdown = fromBody;
        if (!sectionBodyAliased) {
          report.push('sections.body→sections.markdown');
          sectionBodyAliased = true;
        }
      }
    }
    if (!heading && !markdown) continue;
    sections.push({ heading, markdown });
  }

  // hero
  const heroImagePrompt = toTrimmedString(input.heroImagePrompt) || null;

  // arrays with defaults & reports
  const altTextsFromCanonical = sanitizeStringArray(input.altTexts);
  const altTexts = altTextsFromCanonical !== null ? altTextsFromCanonical : [];
  if (altTextsFromCanonical === null) report.push('defaulted altTexts=[]');

  const internalLinkHintsFromCanonical = sanitizeInternalLinkHints(input.internalLinkHints);
  let internalLinkHints = internalLinkHintsFromCanonical !== null ? internalLinkHintsFromCanonical : [];
  if (internalLinkHintsFromCanonical === null) report.push('defaulted internalLinkHints=[]');

  const affiliateHintsFromCanonical = sanitizeAffiliateHints(input.affiliateHints, warnings);
  const affiliateHints = affiliateHintsFromCanonical !== null ? affiliateHintsFromCanonical : [];
  if (affiliateHintsFromCanonical === null) report.push('defaulted affiliateHints=[]');

  const adPlacementsFromCanonical = sanitizeAdPlacements(input.adPlacements);
  const adPlacements = adPlacementsFromCanonical !== null ? adPlacementsFromCanonical : [];
  if (adPlacementsFromCanonical === null) report.push('defaulted adPlacements=[]');

  const entitiesFromCanonical = sanitizeEntities(input.entities);
  const entities = entitiesFromCanonical !== null ? entitiesFromCanonical : [];
  if (entitiesFromCanonical === null) report.push('defaulted entities=[]');

  // CTA
  let cta = { type: 'none' };
  let ctaDefaulted = true;
  if (isPlainObject(input.cta)) {
    const type = toTrimmedString(input.cta.type).toLowerCase();
    if (type === 'kofi') {
      const id = toTrimmedString(input.cta.id);
      cta = id ? { type: 'kofi', id } : { type: 'kofi' };
      ctaDefaulted = false;
    } else if (type === 'download') {
      const id = toTrimmedString(input.cta.id);
      cta = id ? { type: 'download', id } : { type: 'download' };
      ctaDefaulted = false;
    } else if (type === 'none') {
      cta = { type: 'none' };
      ctaDefaulted = false;
    }
  }
  if (ctaDefaulted) report.push('cta defaulted to none');

  // Opening Reflection enforcement
  const ensured = ensureOpening(outline, sections, report);

  const combinedMarkdown = ensured.sections
    .map((section) => {
      const heading = typeof section.heading === 'string' ? section.heading : '';
      const markdown = typeof section.markdown === 'string' ? section.markdown : '';
      return `${heading}\n${markdown}`.trim();
    })
    .filter(Boolean)
    .join('\n');

  if (internalLinkHints.length > 0) {
    const lowerCombined = combinedMarkdown.toLowerCase();
    const filteredHints = [];
    for (const hint of internalLinkHints) {
      const anchor = hint.anchor || '';
      if (anchor && lowerCombined.includes(anchor.toLowerCase())) {
        filteredHints.push(hint);
      } else {
        const message = `internalLinkHint dropped: anchor "${anchor}" not found in content.`;
        report.push(message);
        warnings.push(message);
      }
    }
    internalLinkHints = filteredHints;
  }

  /** @type {PostSpecV2} */
  const spec = {
    specVersion: 2,
    title,
    slug,
    ...(contentType ? { contentType } : {}),
    metaDescription,
    tags,
    excerpt,
    outline: ensured.outline,
    sections: ensured.sections,
    entities,
    heroImagePrompt,
    altTexts,
    internalLinkHints,
    affiliateHints,
    cta,
    adPlacements,
  };

  return { spec, report, warnings };
}

export default normalizePostSpec;
