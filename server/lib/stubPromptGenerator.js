// server/lib/stubPromptGenerator.js
// Shared helpers to find stub entities and build prompts for filling them in.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  ANTI_GENERIC_OUTPUT_RULES,
  CLEAN_CURSING_SAFETY_BLOCK,
  GRIMOIRE_REFERENCE_BLOCK,
  POP_CULTURE_REVIEW_BLOCK,
  RITUAL_REFERENCE_GUIDE_BLOCK,
  SOURCE_CONTEXT_USAGE_RULES,
  TAROT_SAFETY_BLOCK,
  WITCHCLICK_IDENTITY_BLOCK,
  buildContentIntentBlock,
  renderEntityJsonSkeleton,
  renderPostSpecV2Skeleton,
} from './editorialPromptBlocks.js';

const TYPE_LABELS = {
  crystal: 'Crystal',
  herb: 'Herb',
  moonPhase: 'Moon Phase',
  planet: 'Planet',
  ritual: 'Ritual',
  tarot: 'Tarot',
  planetaryDay: 'Planetary Day',
};

const DEFAULT_GUIDANCE = {
  label: 'Lore Entry',
  summary:
    'Offer a 45–70 word overview that explains why this ally matters, how it feels, and how a low-spoons practitioner can use it for attention, meaning, or symbolic practice today.',
  properties: [
    'Include at least three properties (strings or arrays) that give tangible instructions, e.g., focus themes, tools, timings, prompts, or sensory anchors.',
    'Highlight at least one accessibility note, capacity-aware variation, or grounding option.',
  ],
  related:
    'List 2–4 allied entries (`type:slug`) that would naturally pair with this lore. If unsure, choose adjacent staples like `ritual:desk-altar` or `crystal:amethyst`.',
  extras: [
    'Tone stays secular, warm, grounded, neurodivergent-aware, and focused on reflective practice.',
    'Return JSON only—no Markdown, commentary, or extra keys.',
  ],
};

const TYPE_GUIDANCE = {
  crystal: {
    label: 'Crystal Ally',
    summary:
      'Describe the stone’s sensory feel, symbolic uses, and how it supports overstimulated or low-energy practitioners as a reflective anchor (45–65 words).',
    properties: [
      'Include `keywords` (3 calming verbs or moods).',
      'Mention body focus (`chakra`, `bodyArea`, or `nervousSystemSupport`).',
      'Note `element` or planetary tie plus a simple `care`/recharge tip.',
      'Offer one sensory placement idea (`placement`, `carryIdeas`, or `lowSpoonsUse`).',
    ],
    related:
      'Pair with 2–3 allies such as herbs, rituals, or moon phases that deepen the crystal’s reflective use (format `type:slug`).',
    extras: ['Mention if it plays nicely with electronics or desks (helpful for remote workers).'],
  },
  herb: {
    label: 'Herbal Ally',
    summary:
      'Capture the herb’s flavor, sensory presence, and ideal preparations without making medical claims (45–65 words).',
    properties: [
      'Add `flavorProfile` or `aromaNotes`.',
      'Detail grounding or sensory actions with `idealPreparations` (tea, tincture, sachet, diffuser).',
      'State `cautions` or substitutions if someone is sensitive.',
      'Share `pairings` (crystals, rituals, moon phases) or `sensoryAnchors`.',
    ],
    related: 'Reference 2–4 rituals or entities where this herb already appears or would shine.',
    extras: ['Offer at least one low-effort tea or inhale option.'],
  },
  moonPhase: {
    label: 'Moon Phase',
    summary:
      'Explain the emotional weather of this phase, what intentions it amplifies, and when to rest (45–70 words).',
    properties: [
      'Provide `focusThemes` (array of 3).',
      'List `idealRituals` or `supportiveActions` (arrays).',
      'Include 2–3 `journalingPrompts`.',
      'Mention sensory cues (`lighting`, `soundtrack`, or `bodyFeel`).',
    ],
    related: 'Link to adjacent phases plus rituals or herbs that thrive during this phase.',
    extras: ['Note one boundary or pacing reminder for ADHD/ND brains without making neurodivergence the whole point.'],
  },
  planet: {
    label: 'Planetary Mirror',
    summary:
      'Describe the planet or point as a symbolic mirror of attention, naming what it reflects in a secular astrology practice (45–70 words).',
    properties: [
      'Include `rulingSign` and `energy`.',
      'Add 2–3 `focusThemes` or `keywords` that explain how it tends to show up.',
      'Offer one `reflectionPrompt` or `everydayCue` for noticing this pattern gently.',
    ],
    related: 'Link to allied planetary days, moon phases, rituals, or tarot cards/spreads.',
    extras: ['Keep the framing symbolic and practical, never predictive or fatalistic.'],
  },
  ritual: {
    label: 'Ritual Practice',
    summary:
      'Describe who this ritual serves, the vibe, and the reflective purpose in 55–80 words. Mention spoon levels and substitutions.',
    properties: [
      'Specify `duration` and `idealTimes` (array of day/phase contexts).',
      'List `tools` or `supplies` (array).',
      'Outline 3–5 micro `steps` as short imperatives.',
      'Offer `lowSpoonsVariant` or `sensoryAnchors`.',
    ],
    related: 'Connect to crystals, herbs, and tarot spreads that appear inside the ritual.',
    extras: ['Always include a grounding or aftercare hint. Avoid promising external outcomes.'],
  },
  tarot: {
    label: 'Tarot Lore',
    summary:
      'If this is a card, describe its archetype and reassurance for skeptics. If it is a spread, explain the perspective or situation it helps examine (55–80 words).',
    properties: [
      'Add `keywords` (upright mood words).',
      'Include `shadowWork` or `reversed` insight (even if brief).',
      'For spreads: provide `positions` (array of “Card N — focus”). For single cards: use `embodiments` or `selfCheck` prompts.',
      'Supply 2 `journalingPrompts` or integration cues.',
    ],
    related: 'Link to supporting rituals, herbs, or other cards/spreads.',
    extras: ['Acknowledge secular/trauma-aware framing, no fatalism.'],
  },
  planetaryDay: {
    label: 'Planetary Day Rhythm',
    summary:
      'Describe the weekday’s ruling planet, energetic arc, and how practitioners can plan tasks or rest accordingly (50–70 words).',
    properties: [
      'Include `rulingPlanet`, `themes`, and `bestTasks` arrays.',
      'Offer `microRituals` or `anchors` (candles, playlists, colors).',
      'Mention `offerings` or `gentleWarnings` for overdoing it.',
    ],
    related: 'Suggest rituals, herbs, or crystals that harmonize with the day.',
    extras: ['Provide one example schedule block (morning/afternoon/evening).'],
  },
};

const MAX_REFERENCES = 5;
const POST_STUB_BODY_PHRASE = 'automatically created as a stub';

export function generateStubPrompts(options = {}) {
  const cwd = options.cwd || process.cwd();
  const entitiesRoot = path.join(cwd, 'content', 'entities');
  const stubs = collectEntityStubs(entitiesRoot, cwd);
  const postRefs = collectPostReferences(cwd);

  const entries = stubs.map((record) => {
    const key = `${record.type}:${record.slug}`;
    const references = postRefs.get(key) ?? [];
    const prompt = buildPrompt(record, references);
    return { record, references, prompt };
  });

  const output = renderMarkdown(entries);
  return { total: entries.length, entries, output };
}

export function serializeStubEntries(entries) {
  return entries.map((entry) => ({
    type: entry.record.type,
    slug: entry.record.slug,
    name: entry.record.name,
    relativePath: entry.record.relativePath,
    prompt: entry.prompt,
    references: entry.references.map((ref) => ({
      title: ref.title,
      slug: ref.slug,
      sourcePath: ref.sourcePath,
    })),
  }));
}

export function generatePostStubPrompts(options = {}) {
  const cwd = options.cwd || process.cwd();
  const postsRoot = path.join(cwd, 'src', 'content', 'posts');
  if (!fs.existsSync(postsRoot)) {
    return { total: 0, entries: [], output: '' };
  }

  const entries = [];
  for (const filePath of walkMarkdown(postsRoot)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const body = typeof parsed.content === 'string' ? parsed.content : '';
      const tags = Array.isArray(fm.tags)
        ? fm.tags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)
        : typeof fm.tags === 'string'
          ? fm.tags.split(',').map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean)
          : [];
      const hasStubTag = tags.includes('stub') || tags.includes('placeholder');
      const hasStubBody = body.includes(POST_STUB_BODY_PHRASE);
      if (!hasStubTag && !hasStubBody) continue;

      const derivedFromFilename = toSlug(path.basename(filePath, '.md'));
      const slugSource = typeof fm.slug === 'string' && fm.slug.trim() ? fm.slug.trim() : derivedFromFilename;
      const slug = toSlug(slugSource);
      if (!slug) continue;

      const title = typeof fm.title === 'string' && fm.title.trim() ? fm.title.trim() : startCase(slug);
      const relativePath = path.relative(cwd, filePath);
      const stubRationale = typeof fm.stubRationale === 'string' ? fm.stubRationale.trim() : '';
      const stubParentSlug = typeof fm.stubParentSlug === 'string' ? fm.stubParentSlug.trim() : '';
      const stubParentTitle = typeof fm.stubParentTitle === 'string' ? fm.stubParentTitle.trim() : '';
      const category = typeof fm.category === 'string' ? fm.category.trim() : '';
      const contentType = typeof fm.contentType === 'string' ? fm.contentType.trim() : '';
      const pillar = typeof fm.pillar === 'string' ? fm.pillar.trim() : '';
      const excerpt = typeof fm.excerpt === 'string' ? fm.excerpt.trim() : '';
      const stubTriageStatus = typeof fm.stubTriageStatus === 'string' ? fm.stubTriageStatus.trim() : '';
      const stubSuggestedAction = typeof fm.stubSuggestedAction === 'string' ? fm.stubSuggestedAction.trim() : '';
      const stubTriageNotes = typeof fm.stubTriageNotes === 'string' ? fm.stubTriageNotes.trim() : '';
      const entities = Array.isArray(fm.entities) ? fm.entities : [];
      const relatedThemes = normalizeStringArray(fm.relatedThemes || fm.themes || fm.tags);
      const matchedTerms = normalizeStringArray(fm.matchedTerms || fm.matchedPhrases);
      const generatedFrom = normalizeGeneratedFrom(fm.generatedFrom);
      const savedSourceContext = normalizeSourceContext(fm.sourceContext);
      const parentContext = findSourcePostContext(cwd, {
        slug: stubParentSlug,
        title: stubParentTitle,
        reason: stubRationale,
        matchedPhrase: matchedTerms[0] || title,
      });
      const sourceContext = mergeSourceContext(savedSourceContext, parentContext ? [parentContext] : []);
      const stubArticle = {
        type: 'post',
        slug,
        title,
        name: title,
        status: 'stub',
        draft: fm.draft === true,
        filePath: relativePath,
        existingFrontmatter: parsed.matter || '',
        category,
        contentType,
        pillar,
        stubTriageStatus,
        stubSuggestedAction,
        stubTriageNotes,
        tags: normalizeStringArray(fm.tags),
        entities,
        excerpt,
        stubReason: stubRationale,
        stubRationale,
        generatedFrom,
        sourceContext,
        relatedThemes,
        relatedEntities: normalizeRelatedEntities(fm.relatedEntities || entities),
        matchedTerms,
        stubParentSlug,
        stubParentTitle,
      };

      entries.push({
        ...stubArticle,
        slug,
        name: title,
        filePath: relativePath,
        prompt: generateStubArticlePrompt(stubArticle),
        references: sourceContext.map((ref) => ({
          title: ref.title,
          slug: ref.slug,
          sourcePath: ref.sourcePath,
          excerpt: ref.excerpt,
          reason: ref.reason,
          matchedPhrase: ref.matchedPhrase,
          suggestedAngle: ref.suggestedAngle,
          adminHref: ref.adminHref,
          publicHref: ref.publicHref,
        })),
      });
    } catch {
      /* ignore unreadable post */
    }
  }

  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  const output = entries.map((entry) => entry.prompt).join('\n\n');
  return { total: entries.length, entries, output };
}

export function serializePostStubEntries(entries) {
  return entries.map((entry) => ({
    type: entry.type,
    slug: entry.slug,
    name: entry.name,
    title: entry.title || entry.name,
    status: entry.status || 'stub',
    draft: entry.draft === true,
    category: entry.category || '',
    contentType: entry.contentType || '',
    pillar: entry.pillar || '',
    stubTriageStatus: entry.stubTriageStatus || '',
    stubSuggestedAction: entry.stubSuggestedAction || '',
    stubTriageNotes: entry.stubTriageNotes || '',
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    entities: Array.isArray(entry.entities) ? entry.entities : [],
    excerpt: entry.excerpt || '',
    existingFrontmatter: entry.existingFrontmatter || '',
    relativePath: entry.filePath,
    filePath: entry.filePath,
    prompt: entry.prompt,
    references: Array.isArray(entry.references)
      ? entry.references.map((ref) => ({
          title: ref.title,
          slug: ref.slug,
          sourcePath: ref.sourcePath,
          excerpt: ref.excerpt,
          reason: ref.reason,
          matchedPhrase: ref.matchedPhrase,
          suggestedAngle: ref.suggestedAngle,
          adminHref: ref.adminHref,
          publicHref: ref.publicHref,
        }))
      : [],
    stubReason: entry.stubReason || entry.stubRationale || '',
    stubRationale: entry.stubRationale || '',
    stubParentSlug: entry.stubParentSlug || '',
    stubParentTitle: entry.stubParentTitle || '',
    generatedFrom: entry.generatedFrom || null,
    sourceContext: Array.isArray(entry.sourceContext) ? entry.sourceContext : [],
    relatedThemes: Array.isArray(entry.relatedThemes) ? entry.relatedThemes : [],
    relatedEntities: Array.isArray(entry.relatedEntities) ? entry.relatedEntities : [],
    matchedTerms: Array.isArray(entry.matchedTerms) ? entry.matchedTerms : [],
  }));
}

export function generateStubArticlePrompt(stubArticle) {
  const tags = normalizeStringArray(stubArticle?.tags);
  const entities = normalizeRelatedEntities(stubArticle?.entities || stubArticle?.relatedEntities);
  const sourceContext = normalizeSourceContext(stubArticle?.sourceContext || stubArticle?.references);
  const relatedThemes = normalizeStringArray(stubArticle?.relatedThemes);
  const matchedTerms = normalizeStringArray(stubArticle?.matchedTerms);
  const contentType = String(stubArticle?.contentType || '').trim() || 'choose the best valid PostSpec contentType';
  const category = String(stubArticle?.category || '').trim() || 'choose the best valid category';
  const pillar = String(stubArticle?.pillar || '').trim();
  const triageStatus = String(stubArticle?.stubTriageStatus || '').trim();
  const title = String(stubArticle?.title || stubArticle?.name || '').trim();
  const slug = toSlug(String(stubArticle?.slug || '').trim());
  const isCleanCursing = [title, slug, category, contentType, pillar, ...tags]
    .join(' ')
    .toLowerCase()
    .includes('curs');
  const isRitual = /ritual|spell|working|curse|cursing/i.test([title, contentType, category, ...tags].join(' '));
  const isTarot = /tarot|spread/i.test([title, contentType, category, ...tags].join(' '));
  const isReference = /reference|guide|grimoire|glossary|support/i.test([title, contentType, category, pillar, ...tags].join(' '));
  const isPopCultureReview = triageStatus === 'pop-culture-review';

  const lines = [
    ...WITCHCLICK_IDENTITY_BLOCK,
    '',
    'Write the missing full article that belongs in this exact stub location. Use the source context to connect this article to WitchClick’s existing internal world. Do not mention that the final article was generated from a stub.',
    ...buildContentIntentBlock({
      purpose: 'Turn a useful post stub into a complete article that solves the reader problem implied by its title, metadata, and source context.',
      readerNeed: 'A practical, emotionally precise guide or reflection that can be used immediately without belief requirements.',
      role: 'A durable WitchClick article that can be linked from existing posts and future grimoire work.',
    }),
    '',
    ...ANTI_GENERIC_OUTPUT_RULES,
    '',
    ...SOURCE_CONTEXT_USAGE_RULES,
    '',
    'Stub metadata:',
    `- Title: ${title || '(missing title)'}`,
    `- Slug: ${slug || '(missing slug)'}`,
    `- contentType: ${contentType}`,
    `- category: ${category}`,
    `- pillar: ${pillar || '(not recorded)'}`,
    `- tags: ${tags.length ? tags.join(', ') : '(none recorded)'}`,
    `- entities: ${entities.length ? entities.map(formatEntityForPrompt).join(', ') : '(none recorded)'}`,
    `- why this stub exists: ${String(stubArticle?.stubReason || stubArticle?.stubRationale || '').trim() || 'No explicit reason was saved; infer from the title, slug, source context, and WitchClick pillars.'}`,
  ];

  if (relatedThemes.length || matchedTerms.length) {
    lines.push(
      '',
      'Related signals:',
      `- related themes: ${relatedThemes.length ? relatedThemes.join(', ') : '(none recorded)'}`,
      `- matched terms or phrases: ${matchedTerms.length ? matchedTerms.join(', ') : '(none recorded)'}`,
    );
  }

  if (sourceContext.length) {
    lines.push('', 'Source context from existing WitchClick posts:');
    sourceContext.slice(0, MAX_REFERENCES).forEach((source, index) => {
      const excerpt = cleanSourceExcerpt(source.excerpt, source);
      lines.push(
        `${index + 1}. ${source.title || source.slug || 'Untitled source'}`,
        `   - slug: ${source.slug || '(missing)'}`,
        `   - relevant excerpt: ${excerpt || '(no excerpt saved)'}`,
        `   - reason: ${source.reason || '(not recorded)'}`,
        `   - matched phrase: ${source.matchedPhrase || '(not recorded)'}`,
        `   - suggested angle: ${source.suggestedAngle || '(not recorded)'}`,
      );
    });
  } else {
    lines.push('', 'Source context: No source context was saved for this stub yet. Use available metadata only.');
  }

  if (isCleanCursing) {
    lines.push(
      '',
      ...CLEAN_CURSING_SAFETY_BLOCK,
    );
  }

  if (isRitual || isCleanCursing) {
    lines.push(
      '',
      ...RITUAL_REFERENCE_GUIDE_BLOCK,
      '',
      'Required article sections when relevant to this topic:',
      '- Introduction',
      '- What this working is for',
      '- What this working is not for',
      '- Quick / Low-Energy version',
      '- Deep version',
      '- Reflection prompts',
      '- Checklist / Summary',
      '- Closing note',
    );
  }

  if (isTarot) {
    lines.push('', ...TAROT_SAFETY_BLOCK);
  }

  if (isReference) {
    lines.push('', ...GRIMOIRE_REFERENCE_BLOCK);
  }

  if (isPopCultureReview) {
    lines.push('', ...POP_CULTURE_REVIEW_BLOCK);
  }

  lines.push(
    '',
    'Required output format:',
    '- Return valid PostSpec v2 JSON only. No Markdown fences, no commentary, no preface.',
    '- Keep the slug exactly the same as the stub slug above.',
    '- Use this exact PostSpec v2 shape and field names:',
    renderPostSpecV2Skeleton({ title, slug, contentType, category }),
    '- Return the completed JSON object only. Do not wrap it in Markdown fences.',
    '- The first outline item and first section should be a real article section, not "Placeholder" or "Stub".',
    '- The body must be complete draft article content, not notes, TODOs, or instructions for a future writer.',
  );

  return lines.join('\n');
}

function cleanSourceExcerpt(value, source = {}) {
  try {
    let text = String(value || '');
    if (!text.trim()) return '';

    const title = String(source.title || '').trim();
    const slug = String(source.slug || '').trim();
    const slugWords = slug ? slug.replace(/-/g, ' ') : '';

    text = text
      .replace(/\s+/g, ' ')
      .replace(/\[\s*\]\s*\[(?:"[^"]*"\s*,?\s*)+\]/g, ' ')
      .replace(/\[(?:"[^"]*"\s*,?\s*)+\]/g, ' ')
      .replace(/(?:"[^"]*"\s*,\s*)+"[^"]*"\s*\]/g, ' ')
      .replace(/\[\s*\]/g, ' ')
      .replace(/#{1,6}\s*/g, ' ')
      .trim();

    const headingMatch = text.match(/\b(?:Opening Reflection|What This (?:Ritual|Working|Practice) Is For|How To Use This|Why This Matters)\b/i);
    if (headingMatch?.index !== undefined && headingMatch.index >= 0) {
      text = text.slice(headingMatch.index + headingMatch[0].length).trim();
    }

    for (const duplicate of [title, slug, slugWords]) {
      if (!duplicate) continue;
      const pattern = new RegExp(`^(?:\\.\\.\\.\\s*)?${escapeRegex(duplicate)}\\s*`, 'i');
      text = text.replace(pattern, '').trim();
    }

    text = text
      .replace(/^(?:[.,;:!?—-]|\.\.\.)+\s*/, '')
      .replace(/^[a-z]{1,24}\s+(?=[A-Z])/g, '')
      .replace(/\s*(?:[.,;:!?—-]|\.\.\.)+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    const maxLength = 220;
    if (text.length <= maxLength) return text;

    const sentenceEnd = text.slice(0, maxLength).search(/[.!?](?=\s+[A-Z0-9]|$)(?!.*[.!?](?=\s+[A-Z0-9]|$))/);
    if (sentenceEnd >= 80) return `${text.slice(0, sentenceEnd + 1).trim()}...`;

    const trimmed = text.slice(0, maxLength);
    const wordEnd = trimmed.lastIndexOf(' ');
    return `${trimmed.slice(0, wordEnd > 120 ? wordEnd : maxLength).trim()}...`;
  } catch {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectEntityStubs(root, cwd) {
  if (!fs.existsSync(root)) return [];
  const items = [];
  const types = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dirent of types) {
    const type = dirent.name;
    const dirPath = path.join(root, type);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const slug = toSlug(String(data.slug || '').trim() || file.replace(/\.json$/, ''));
        const rawSummary = typeof data.summary === 'string' ? data.summary.trim() : '';
        const isStub = !rawSummary || /stub/i.test(rawSummary);
        if (!isStub) continue;
        const rawName = typeof data.name === 'string' ? data.name.trim() : '';
        const name = rawName || startCase(slug);
        items.push({
          type,
          slug,
          name,
          summary: rawSummary,
          filePath,
          relativePath: path.relative(cwd, filePath),
        });
      } catch {
        /* ignore malformed entity */
      }
    }
  }
  items.sort((a, b) => {
    if (a.type === b.type) return a.slug.localeCompare(b.slug);
    return a.type.localeCompare(b.type);
  });
  return items;
}

function collectPostReferences(cwd) {
  const map = new Map();
  const roots = [path.join(cwd, 'src', 'content', 'posts'), path.join(cwd, 'content', 'posts')];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const filePath of walkMarkdown(root)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const data = parsed.data || {};
        const slug =
          typeof data.slug === 'string' && data.slug.trim()
            ? data.slug.trim()
            : path.basename(filePath, '.md');
        const title =
          typeof data.title === 'string' && data.title.trim() ? data.title.trim() : startCase(slug);
        const entities = Array.isArray(data.entities) ? data.entities : [];
        for (const entry of entities) {
          const normalized = normalizeEntity(entry);
          if (!normalized) continue;
          const key = `${normalized.type}:${normalized.slug}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          const refs = map.get(key);
          if (!refs.some((ref) => ref.slug === slug)) {
            refs.push({
              title,
              slug,
              sourcePath: path.relative(cwd, filePath),
            });
          }
        }
      } catch {
        /* ignore unreadable post */
      }
    }
  }

  for (const refs of map.values()) {
    refs.sort((a, b) => a.title.localeCompare(b.title));
  }

  return map;
}

function walkMarkdown(root) {
  const files = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdown(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}

function normalizeEntity(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const [rawType, rawSlug] = entry.split(':');
    if (!rawType || !rawSlug) return null;
    return { type: rawType.trim(), slug: toSlug(rawSlug.trim()) };
  }
  if (typeof entry === 'object') {
    const type = typeof entry.type === 'string' ? entry.type.trim() : '';
    const slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';
    if (!type || !slug) return null;
    return { type, slug: toSlug(slug) };
  }
  return null;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeGeneratedFrom(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') return value;
  return null;
}

function normalizeRelatedEntities(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return entry.trim();
    if (entry && typeof entry === 'object') {
      const type = typeof entry.type === 'string' ? entry.type.trim() : '';
      const slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';
      if (type && slug) return `${type}:${toSlug(slug)}`;
      if (slug) return toSlug(slug);
    }
    return '';
  }).filter(Boolean);
}

function normalizeSourceContext(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const slug = typeof item.slug === 'string' ? toSlug(item.slug) : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const sourcePath = typeof item.sourcePath === 'string' ? item.sourcePath.trim() : '';
    const excerpt = typeof item.excerpt === 'string' ? item.excerpt.trim() : '';
    const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
    const matchedPhrase = typeof item.matchedPhrase === 'string' ? item.matchedPhrase.trim() : '';
    const suggestedAngle = typeof item.suggestedAngle === 'string' ? item.suggestedAngle.trim() : '';
    const adminHref = typeof item.adminHref === 'string' ? item.adminHref.trim() : '';
    const publicHref = typeof item.publicHref === 'string' ? item.publicHref.trim() : '';
    if (!slug && !title && !excerpt) return null;
    return {
      title: title || startCase(slug),
      slug,
      sourcePath,
      excerpt,
      reason,
      matchedPhrase,
      suggestedAngle,
      adminHref: adminHref || (slug ? `/admin/posts?slug=${encodeURIComponent(slug)}` : ''),
      publicHref: publicHref || (slug ? `/post/${slug}` : ''),
    };
  }).filter(Boolean);
}

function mergeSourceContext(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const source of normalizeSourceContext(group)) {
      const key = source.slug || source.title || source.excerpt;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(source);
    }
  }
  return merged;
}

function findSourcePostContext(cwd, details) {
  const slug = toSlug(String(details?.slug || ''));
  const roots = [path.join(cwd, 'src', 'content', 'posts'), path.join(cwd, 'content', 'posts')];
  let found = null;
  if (slug) {
    for (const root of roots) {
      const direct = path.join(root, `${slug}.md`);
      if (fs.existsSync(direct)) {
        found = direct;
        break;
      }
    }
  }
  if (!found) return null;
  try {
    const raw = fs.readFileSync(found, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const title = typeof fm.title === 'string' && fm.title.trim()
      ? fm.title.trim()
      : String(details?.title || '').trim() || startCase(slug);
    const excerpt = typeof fm.excerpt === 'string' && fm.excerpt.trim()
      ? fm.excerpt.trim()
      : firstTextExcerpt(parsed.content);
    return {
      title,
      slug,
      sourcePath: path.relative(cwd, found),
      excerpt,
      reason: String(details?.reason || '').trim(),
      matchedPhrase: String(details?.matchedPhrase || '').trim(),
      suggestedAngle: String(details?.suggestedAngle || details?.reason || '').trim(),
      adminHref: `/admin/posts?slug=${encodeURIComponent(slug)}`,
      publicHref: `/post/${slug}`,
    };
  } catch {
    return null;
  }
}

function firstTextExcerpt(markdown) {
  const text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/^\[|\]\([^)]+\)$/g, ''))
    .replace(/[*_>`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 280 ? `${text.slice(0, 277).trim()}...` : text;
}

function formatEntityForPrompt(entity) {
  return String(entity || '').trim();
}

function buildPrompt(record, references) {
  const guide = TYPE_GUIDANCE[record.type] || DEFAULT_GUIDANCE;
  const typeLabel = TYPE_LABELS[record.type] || guide.label || 'Entity';
  const referenceLines = buildReferenceLines(references);
  const lines = [];

  lines.push(
    ...WITCHCLICK_IDENTITY_BLOCK,
    '',
    `You are the Aurora Scribe for WitchClick, completing a ${typeLabel.toLowerCase()} entry for a secular grimoire of symbolic practice and reflective tools.`,
  );
  lines.push(...buildContentIntentBlock({
    purpose: `Create a concise ${typeLabel.toLowerCase()} reference entry that can support internal links, grimoire browsing, and article context.`,
    readerNeed: 'A quick, useful explanation of what this entity means and how to work with it gently.',
    role: 'A short grimoire/reference record, not a padded article.',
  }));
  lines.push('', ...GRIMOIRE_REFERENCE_BLOCK);
  if (record.type === 'tarot') lines.push('', ...TAROT_SAFETY_BLOCK);
  lines.push('', ...ANTI_GENERIC_OUTPUT_RULES);
  lines.push('', 'Return JSON with exactly these keys: "type", "name", "slug", "summary", "properties", "related".');
  lines.push(
    `Fixed values — "type": "${record.type}", "slug": "${record.slug}", "name": "${startCase(record.name)}".`,
    '',
  );
  lines.push('Required entity JSON shape:', renderEntityJsonSkeleton({
    type: record.type,
    slug: record.slug,
    name: startCase(record.name),
  }), 'Return the completed entity JSON object only. Do not wrap it in Markdown fences.', '');
  lines.push(`Summary: ${guide.summary}`, '', 'Properties:');
  const propertyInstructions = guide.properties && guide.properties.length ? guide.properties : DEFAULT_GUIDANCE.properties;
  for (const note of propertyInstructions) {
    lines.push(`- ${note}`);
  }
  lines.push('', `Related allies: ${guide.related || DEFAULT_GUIDANCE.related}`);
  const extraNotes =
    guide.extras && guide.extras.length ? guide.extras : DEFAULT_GUIDANCE.extras || [];
  if (extraNotes.length) {
    lines.push('', ...extraNotes.map((extra) => `- ${extra}`));
  }
  if (referenceLines.length) {
    lines.push('', 'Reference posts for tone or anchors:', ...referenceLines);
  } else {
    lines.push(
      '',
      'No published posts reference this entry yet—keep it grounded in secular, reflective, evidence-friendly wisdom.',
    );
  }
  lines.push('', 'Return compact JSON only. No commentary, apologies, or Markdown.');
  return lines.join('\n');
}

function buildPostStubPrompt({ title, slug, stubRationale, stubParentSlug, stubParentTitle }) {
  const linkedFrom = stubParentTitle ? `${stubParentTitle} (${stubParentSlug})` : 'unknown';
  return [
    'You are the Head of Content for WitchClick, a secular metaphysical space for making meaning outside productivity metrics.',
    'Generate a PostSpec v2 JSON article for the following stub post.',
    '',
    'Post details:',
    `- Title: ${title}`,
    `- Slug: ${slug}`,
    `- Why this post was linked: ${stubRationale || 'not recorded — infer from title'}`,
    `- Linked from post: ${linkedFrom}`,
    '',
    'Content guidelines:',
    '- contentType: choose the most appropriate from: ritual, reflection, story, tarotSpread, spellwork, crystals',
    '- wordCount: 900',
    '- Tone: warm, grounded, secular, neurodivergent-aware, slightly strange, and practical',
    '- Frame ritual, tarot, and symbolic tools as reflective practices for attention, meaning, and perspective; do not promise supernatural results',
    '- First outline item and section must be "Opening Reflection" with id "opening-reflection"',
    '- heroImagePrompt: painterly and illustrative scene, not photorealistic, varies in setting/palette/mood to match the topic',
    '- Return valid PostSpec v2 JSON only. No markdown fences, no commentary.',
  ].join('\n');
}

function buildReferenceLines(references) {
  if (!references.length) return [];
  const selected = references.slice(0, MAX_REFERENCES);
  return selected.map((ref) => `- ${ref.title} (/post/${ref.slug})`);
}

function renderMarkdown(entries) {
  const lines = [];
  lines.push(`# Entity Stub Prompts (${entries.length})`);
  lines.push(`Generated: ${new Date().toISOString()}`, '');

  if (entries.length === 0) {
    lines.push('No stub entities detected. All records already contain summaries.');
    return lines.join('\n');
  }

  for (const entry of entries) {
    const typeLabel = TYPE_LABELS[entry.record.type] || startCase(entry.record.type);
    const references = entry.references.slice(0, MAX_REFERENCES);
    const referenceSummary = references.length
      ? references.map((ref) => `${ref.title} (/post/${ref.slug})`).join('; ')
      : '—';
    lines.push(`### ${typeLabel} — ${startCase(entry.record.name)}`);
    lines.push(`- File: ${entry.record.relativePath}`);
    lines.push(`- Referenced by: ${referenceSummary}`, '');
    lines.push('Prompt:');
    lines.push('```text', entry.prompt, '```', '');
  }

  return lines.join('\n').trimEnd();
}

function startCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
