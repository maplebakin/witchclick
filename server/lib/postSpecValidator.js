// server/lib/postSpecValidator.js
// Enforces master prompt guarantees on PostSpec v2 payloads.

import { stripMarkdownToPlainText } from './postSpecSchema.js';

function countWordsInSections(sections) {
  let total = 0;
  for (const section of sections) {
    total += countWords(section.markdown);
  }
  return total;
}

function countWords(markdown) {
  const plain = stripMarkdownToPlainText(markdown);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function normalizeAnchor(anchor) {
  return String(anchor || '').trim();
}

function anchorWordCount(anchor) {
  const plain = normalizeAnchor(anchor);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function mapHeadings(sections) {
  return sections.map((section) => String(section.heading || '').trim());
}

function markdownContainsAnchor(markdownText, anchor) {
  if (!anchor) return false;
  const needle = anchor.toLowerCase();
  return markdownText.toLowerCase().includes(needle);
}

export function validatePostSpec(spec, options = {}) {
  const targetWordCount = typeof options.targetWordCount === 'number' && options.targetWordCount > 0
    ? options.targetWordCount
    : 1200;
  const allowedAffiliateKeys = Array.isArray(options.allowedAffiliateKeys)
    ? options.allowedAffiliateKeys.map((key) => String(key || '').trim()).filter(Boolean)
    : [];

  const errors = [];
  const warnings = [];

  const totalWords = countWordsInSections(spec.sections);
  const tolerance = 0.15;
  const minWords = Math.round(targetWordCount * (1 - tolerance));
  const maxWords = Math.round(targetWordCount * (1 + tolerance));
  if (totalWords < minWords || totalWords > maxWords) {
    warnings.push(
      `Word count ${totalWords} is outside ±15% of target ${targetWordCount}.`
    );
  }

  if (spec.outline.length !== spec.sections.length) {
    errors.push(
      `Outline has ${spec.outline.length} item(s) but sections has ${spec.sections.length}.`
    );
  }

  const sectionHeadings = mapHeadings(spec.sections);
  const outlineHeadings = spec.outline.map((item) => String(item.heading || '').trim());
  const outlineIds = spec.outline.map((item) => String(item.id || '').trim());

  for (let i = 0; i < Math.min(outlineHeadings.length, sectionHeadings.length); i++) {
    if (outlineHeadings[i] !== sectionHeadings[i]) {
      errors.push(
        `Outline[${i}] heading "${outlineHeadings[i]}" does not match sections[${i}] heading "${sectionHeadings[i]}".`
      );
    }
    if (!outlineIds[i]) {
      warnings.push(`Outline[${i}] is missing an id.`);
    }
  }

  if (outlineHeadings[0] !== 'Opening Reflection' || outlineIds[0] !== 'opening-reflection') {
    errors.push('First outline item must be "Opening Reflection" with id "opening-reflection".');
  }

  if (sectionHeadings[0] !== 'Opening Reflection') {
    errors.push('First section must be "Opening Reflection".');
  }

  if (!spec.sections[0] || typeof spec.sections[0].markdown !== 'string' || !spec.sections[0].markdown.trim()) {
    warnings.push('Opening Reflection section should contain descriptive markdown.');
  }

  if (!Array.isArray(spec.internalLinkHints)) {
    errors.push('internalLinkHints must be an array.');
  } else {
    if (spec.internalLinkHints.length < 5 || spec.internalLinkHints.length > 8) {
      warnings.push(`Expected 5–8 internalLinkHints, received ${spec.internalLinkHints.length}.`);
    }
    const combinedMarkdown = spec.sections.map((section) => String(section.markdown || '')).join('\n');
    for (let i = 0; i < spec.internalLinkHints.length; i++) {
      const hint = spec.internalLinkHints[i];
      const anchor = normalizeAnchor(hint?.anchor);
      if (!anchor) {
        errors.push(`internalLinkHints[${i}] is missing an anchor.`);
        continue;
      }
      if (!markdownContainsAnchor(combinedMarkdown, anchor)) {
        errors.push(`Internal link anchor "${anchor}" does not appear verbatim in sections markdown.`);
      }
      const words = anchorWordCount(anchor);
      if (words < 2 || words > 6) {
        warnings.push(`Internal link anchor "${anchor}" should be 2–6 words (currently ${words}).`);
      }
      if (!normalizeAnchor(hint?.rationale)) {
        warnings.push(`internalLinkHints[${i}] should include a rationale.`);
      }
    }
  }

  if (!Array.isArray(spec.affiliateHints)) {
    errors.push('affiliateHints must be an array.');
  } else {
    for (let i = 0; i < spec.affiliateHints.length; i++) {
      const hint = spec.affiliateHints[i];
      const key = normalizeAnchor(hint?.key);
      const anchor = normalizeAnchor(hint?.anchor);
      if (!key || !anchor) {
        errors.push(`affiliateHints[${i}] must include both key and anchor.`);
        continue;
      }
      if (allowedAffiliateKeys.length && !allowedAffiliateKeys.includes(key)) {
        errors.push(
          `Affiliate key "${key}" is not in allowed list: ${allowedAffiliateKeys.join(', ')}.`
        );
      }
      const words = anchorWordCount(anchor);
      if (words < 2 || words > 6) {
        warnings.push(`Affiliate anchor "${anchor}" should be 2–6 words (currently ${words}).`);
      }
    }
  }

  const lowerHeadings = sectionHeadings.map((heading) => heading.toLowerCase());
  if (!lowerHeadings.some((heading) => heading.includes('quick') || heading.includes('low-energy'))) {
    warnings.push('No section heading includes "Quick" or "Low-Energy".');
  }
  if (!lowerHeadings.some((heading) => heading.includes('deep'))) {
    warnings.push('No section heading includes "Deep".');
  }
  if (!lowerHeadings.some((heading) => heading.includes('reflection prompt'))) {
    warnings.push('No section heading includes "Reflection Prompt".');
  }
  if (!lowerHeadings.some((heading) => heading.includes('checklist') || heading.includes('summary'))) {
    warnings.push('No section heading includes "Checklist" or "Summary".');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    wordCount: totalWords,
  };
}

export default validatePostSpec;
