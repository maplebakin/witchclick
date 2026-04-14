// server/lib/stubPromptGenerator.js
// Shared helpers to find stub entities and build prompts for filling them in.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

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
    'Offer a 45–70 word overview that explains why this ally matters, how it feels, and how a low-spoons practitioner can work with it today.',
  properties: [
    'Include at least three properties (strings or arrays) that give tangible instructions, e.g., focus themes, tools, timings, prompts, or sensory anchors.',
    'Highlight at least one accessibility note or gentle variation.',
  ],
  related:
    'List 2–4 allied entries (`type:slug`) that would naturally pair with this lore. If unsure, choose adjacent staples like `ritual:desk-altar` or `crystal:amethyst`.',
  extras: [
    'Tone stays secular, cozy, and neurodivergent-friendly.',
    'Return JSON only—no Markdown, commentary, or extra keys.',
  ],
};

const TYPE_GUIDANCE = {
  crystal: {
    label: 'Crystal Ally',
    summary:
      'Describe the stone’s energetic feel, everyday uses, and how it supports overstimulated or low-energy practitioners (45–65 words).',
    properties: [
      'Include `keywords` (3 calming verbs or moods).',
      'Mention body focus (`chakra`, `bodyArea`, or `nervousSystemSupport`).',
      'Note `element` or planetary tie plus a simple `care`/recharge tip.',
      'Offer one sensory placement idea (`placement`, `carryIdeas`, or `lowSpoonsUse`).',
    ],
    related:
      'Pair with 2–3 allies such as herbs, rituals, or moon phases that amplify the crystal’s effect (format `type:slug`).',
    extras: ['Mention if it plays nicely with electronics or desks (helpful for remote workers).'],
  },
  herb: {
    label: 'Herbal Ally',
    summary:
      'Capture the herb’s flavor, nervous-system impact, and ideal preparations without making medical claims (45–65 words).',
    properties: [
      'Add `flavorProfile` or `aromaNotes`.',
      'Detail calming actions with `idealPreparations` (tea, tincture, sachet, diffuser).',
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
    extras: ['Note one boundary or pacing reminder for ADHD/ND brains.'],
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
      'Describe who this ritual serves, the vibe, and the outcome in 55–80 words. Mention spoon levels and substitutions.',
    properties: [
      'Specify `duration` and `idealTimes` (array of day/phase contexts).',
      'List `tools` or `supplies` (array).',
      'Outline 3–5 micro `steps` as short imperatives.',
      'Offer `lowSpoonsVariant` or `sensoryAnchors`.',
    ],
    related: 'Connect to crystals, herbs, and tarot spreads that appear inside the ritual.',
    extras: ['Always include a grounding or aftercare hint.'],
  },
  tarot: {
    label: 'Tarot Lore',
    summary:
      'If this is a card, describe its archetype and reassurance for skeptics. If it is a spread, explain the situation it answers (55–80 words).',
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
      const hasStubTag = tags.includes('stub');
      const hasStubBody = body.includes('automatically created as a stub');
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

      entries.push({
        type: 'post',
        slug,
        name: title,
        filePath: relativePath,
        stubRationale,
        stubParentSlug,
        stubParentTitle,
        prompt: buildPostStubPrompt({ title, slug, stubRationale, stubParentSlug, stubParentTitle }),
        references: [],
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
    relativePath: entry.filePath,
    filePath: entry.filePath,
    prompt: entry.prompt,
    references: Array.isArray(entry.references)
      ? entry.references.map((ref) => ({
          title: ref.title,
          slug: ref.slug,
          sourcePath: ref.sourcePath,
        }))
      : [],
    stubRationale: entry.stubRationale || '',
    stubParentSlug: entry.stubParentSlug || '',
    stubParentTitle: entry.stubParentTitle || '',
  }));
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

function buildPrompt(record, references) {
  const guide = TYPE_GUIDANCE[record.type] || DEFAULT_GUIDANCE;
  const typeLabel = TYPE_LABELS[record.type] || guide.label || 'Entity';
  const referenceLines = buildReferenceLines(references);
  const lines = [];

  lines.push(
    `You are the Aurora Scribe for WitchClick, completing a ${typeLabel.toLowerCase()} entry for the cozy grimoire.`,
  );
  lines.push('Return JSON with exactly these keys: "type", "name", "slug", "summary", "properties", "related".');
  lines.push(
    `Fixed values — "type": "${record.type}", "slug": "${record.slug}", "name": "${startCase(record.name)}".`,
    '',
  );
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
      'No published posts reference this entry yet—keep it grounded in secular, evidence-friendly wisdom.',
    );
  }
  lines.push('', 'Return compact JSON only. No commentary, apologies, or Markdown.');
  return lines.join('\n');
}

function buildPostStubPrompt({ title, slug, stubRationale, stubParentSlug, stubParentTitle }) {
  const linkedFrom = stubParentTitle ? `${stubParentTitle} (${stubParentSlug})` : 'unknown';
  return [
    'You are the Head of Content for WitchClick, a cozy secular metaphysical blog.',
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
    '- Tone: warm, grounded, secular, neurodivergent-friendly',
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
