const OPENING_HEADING = 'Opening Reflection';
const OPENING_ID = 'opening-reflection';
const VALID_AD_PLACEMENTS = new Set(['lead', 'mid', 'end']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  return '';
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
    return value
      .map((item) => toTrimmedString(item))
      .filter(Boolean);
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

function sanitizeAffiliateHints(value) {
  if (!Array.isArray(value)) return null;
  const hints = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const key = toTrimmedString(item.key);
    const anchor = toTrimmedString(item.anchor);
    if (!key || !anchor) continue;
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
          ...rest
        ];
        if (!movedReported) {
          report.push('moved Opening Reflection to first position');
          movedReported = true;
        }
      } else {
        normalizedOutline = [
          { heading: OPENING_HEADING, id: entry.id ? slugify(entry.id) || OPENING_ID : OPENING_ID },
          ...rest
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
          {
            heading: OPENING_HEADING,
            markdown: typeof entry.markdown === 'string' ? entry.markdown : ''
          },
          ...rest
        ];
        if (!movedReported) {
          report.push('moved Opening Reflection to first position');
          movedReported = true;
        }
      } else {
        normalizedSections = [
          {
            heading: OPENING_HEADING,
            markdown: typeof entry.markdown === 'string' ? entry.markdown : ''
          },
          ...rest
        ];
      }
    }
  }
  if (normalizedSections.length) {
    const firstMarkdown = typeof normalizedSections[0].markdown === 'string'
      ? normalizedSections[0].markdown
      : '';
    normalizedSections[0] = { heading: OPENING_HEADING, markdown: firstMarkdown };
  }

  return { outline: normalizedOutline, sections: normalizedSections };
}

export function normalizePostSpec(raw) {
  const input = isPlainObject(raw) ? raw : {};
  const report = [];

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

  let slug = slugify(input.slug);
  if (!slug) {
    slug = slugify(title);
    report.push('generated slug from title');
  }

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

  const excerpt = toTrimmedString(input.excerpt);

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

  const heroImagePrompt = toTrimmedString(input.heroImagePrompt) || null;

  const altTextsFromCanonical = sanitizeStringArray(input.altTexts);
  const altTexts = altTextsFromCanonical !== null ? altTextsFromCanonical : [];
  if (altTextsFromCanonical === null) {
    report.push('defaulted altTexts=[]');
  }

  const internalLinkHintsFromCanonical = sanitizeInternalLinkHints(input.internalLinkHints);
  const internalLinkHints = internalLinkHintsFromCanonical !== null ? internalLinkHintsFromCanonical : [];
  if (internalLinkHintsFromCanonical === null) {
    report.push('defaulted internalLinkHints=[]');
  }

  const affiliateHintsFromCanonical = sanitizeAffiliateHints(input.affiliateHints);
  const affiliateHints = affiliateHintsFromCanonical !== null ? affiliateHintsFromCanonical : [];
  if (affiliateHintsFromCanonical === null) {
    report.push('defaulted affiliateHints=[]');
  }

  const adPlacementsFromCanonical = sanitizeAdPlacements(input.adPlacements);
  const adPlacements = adPlacementsFromCanonical !== null ? adPlacementsFromCanonical : [];
  if (adPlacementsFromCanonical === null) {
    report.push('defaulted adPlacements=[]');
  }

  const entitiesFromCanonical = sanitizeEntities(input.entities);
  const entities = entitiesFromCanonical !== null ? entitiesFromCanonical : [];
  if (entitiesFromCanonical === null) {
    report.push('defaulted entities=[]');
  }

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
    } else {
      cta = { type: 'none' };
      ctaDefaulted = true;
    }
  }
  if (ctaDefaulted) {
    report.push('cta defaulted to none');
  }

  const ensured = ensureOpening(outline, sections, report);

  const spec = {
    specVersion: 2,
    title,
    slug,
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
    adPlacements
  };

  return { spec, report };
}

export default normalizePostSpec;
