// server/lib/engagementSignals.js
// Utilities for loading engagement and analytics signals to guide prompt generation.

import fs from 'node:fs';
import path from 'node:path';

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim();
  return '';
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function gatherTagCandidates(input, out) {
  if (!input) return;
  if (Array.isArray(input)) {
    for (const item of input) gatherTagCandidates(item, out);
    return;
  }
  if (typeof input === 'string') {
    out.push(input);
    return;
  }
  if (!isPlainObject(input)) return;
  if ('tag' in input || 'name' in input || 'value' in input) {
    out.push(input);
  }
  if (Array.isArray(input.tags)) gatherTagCandidates(input.tags, out);
  if (Array.isArray(input.underservedTags)) gatherTagCandidates(input.underservedTags, out);
  if (isPlainObject(input.underserved)) gatherTagCandidates(input.underserved.tags, out);
  if (isPlainObject(input.focus)) gatherTagCandidates(input.focus.tags, out);
  if (Array.isArray(input.priorities)) gatherTagCandidates(input.priorities, out);
  if (Array.isArray(input.highlights)) gatherTagCandidates(input.highlights, out);
}

function gatherEntityCandidates(input, out) {
  if (!input) return;
  if (Array.isArray(input)) {
    for (const item of input) gatherEntityCandidates(item, out);
    return;
  }
  if (!isPlainObject(input)) return;
  if ('slug' in input || 'id' in input || 'entity' in input) {
    out.push(input);
  }
  if (Array.isArray(input.entities)) gatherEntityCandidates(input.entities, out);
  if (Array.isArray(input.underservedEntities)) gatherEntityCandidates(input.underservedEntities, out);
  if (isPlainObject(input.underserved)) gatherEntityCandidates(input.underserved.entities, out);
  if (isPlainObject(input.focus)) gatherEntityCandidates(input.focus.entities, out);
  if (Array.isArray(input.missing)) gatherEntityCandidates(input.missing, out);
}

function normalizeTagCandidate(raw) {
  if (typeof raw === 'string') {
    const tag = raw.trim();
    return tag ? { tag } : null;
  }
  if (!isPlainObject(raw)) return null;
  const tag = toTrimmedString(raw.tag ?? raw.name ?? raw.value ?? '');
  if (!tag) return null;
  const signal = { tag };
  const reason = toTrimmedString(raw.reason ?? raw.note ?? raw.notes ?? raw.explanation ?? '');
  if (reason) signal.reason = reason;
  const score = toNumber(raw.score ?? raw.weight ?? raw.priority ?? raw.interest ?? raw.demand ?? null);
  if (score !== null) signal.score = score;
  const recency = toNumber(
    raw.recencyDays ?? raw.daysSinceMention ?? raw.daysSinceFeature ?? raw.daysSince ?? raw.ageDays ?? null,
  );
  if (recency !== null) signal.recencyDays = recency;
  return signal;
}

function normalizeEntityCandidate(raw) {
  if (!isPlainObject(raw)) return null;
  const slug = toTrimmedString(raw.slug ?? raw.id ?? raw.entity ?? '');
  const name = toTrimmedString(raw.name ?? raw.label ?? raw.title ?? raw.display ?? '');
  if (!slug && !name) return null;
  const signal = { slug: slug || name };
  if (name && name !== signal.slug) signal.name = name;
  const type = toTrimmedString(raw.type ?? raw.kind ?? raw.category ?? '');
  if (type) signal.type = type;
  const reason = toTrimmedString(raw.reason ?? raw.note ?? raw.notes ?? raw.explanation ?? '');
  if (reason) signal.reason = reason;
  const score = toNumber(raw.score ?? raw.weight ?? raw.priority ?? raw.interest ?? raw.demand ?? null);
  if (score !== null) signal.score = score;
  const recency = toNumber(
    raw.recencyDays ?? raw.daysSinceMention ?? raw.daysSinceFeature ?? raw.daysSince ?? raw.ageDays ?? null,
  );
  if (recency !== null) signal.recencyDays = recency;
  return signal;
}

function mergeTagSignal(map, signal) {
  const key = signal.tag.toLowerCase();
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { ...signal });
    return;
  }
  if (!existing.reason && signal.reason) existing.reason = signal.reason;
  if (signal.score !== undefined) {
    if (existing.score === undefined || (typeof signal.score === 'number' && signal.score > existing.score)) {
      existing.score = signal.score;
    }
  }
  if (signal.recencyDays !== undefined) {
    if (
      existing.recencyDays === undefined ||
      (typeof signal.recencyDays === 'number' && signal.recencyDays > existing.recencyDays)
    ) {
      existing.recencyDays = signal.recencyDays;
    }
  }
}

function mergeEntitySignal(map, signal) {
  const key = `${(signal.type || 'entity').toLowerCase()}:${signal.slug.toLowerCase()}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { ...signal });
    return;
  }
  if (!existing.name && signal.name) existing.name = signal.name;
  if (!existing.reason && signal.reason) existing.reason = signal.reason;
  if (signal.score !== undefined) {
    if (existing.score === undefined || (typeof signal.score === 'number' && signal.score > existing.score)) {
      existing.score = signal.score;
    }
  }
  if (signal.recencyDays !== undefined) {
    if (
      existing.recencyDays === undefined ||
      (typeof signal.recencyDays === 'number' && signal.recencyDays > existing.recencyDays)
    ) {
      existing.recencyDays = signal.recencyDays;
    }
  }
}

function sortTagSignals(a, b) {
  if (typeof a.score === 'number' || typeof b.score === 'number') {
    const aScore = typeof a.score === 'number' ? a.score : -Infinity;
    const bScore = typeof b.score === 'number' ? b.score : -Infinity;
    if (aScore !== bScore) return bScore - aScore;
  }
  if (typeof a.recencyDays === 'number' || typeof b.recencyDays === 'number') {
    const aRecency = typeof a.recencyDays === 'number' ? a.recencyDays : -Infinity;
    const bRecency = typeof b.recencyDays === 'number' ? b.recencyDays : -Infinity;
    if (aRecency !== bRecency) return bRecency - aRecency;
  }
  return a.tag.localeCompare(b.tag);
}

function sortEntitySignals(a, b) {
  if (typeof a.score === 'number' || typeof b.score === 'number') {
    const aScore = typeof a.score === 'number' ? a.score : -Infinity;
    const bScore = typeof b.score === 'number' ? b.score : -Infinity;
    if (aScore !== bScore) return bScore - aScore;
  }
  if (typeof a.recencyDays === 'number' || typeof b.recencyDays === 'number') {
    const aRecency = typeof a.recencyDays === 'number' ? a.recencyDays : -Infinity;
    const bRecency = typeof b.recencyDays === 'number' ? b.recencyDays : -Infinity;
    if (aRecency !== bRecency) return bRecency - aRecency;
  }
  const aLabel = (a.type ? `${a.type}:${a.slug}` : a.slug).toLowerCase();
  const bLabel = (b.type ? `${b.type}:${b.slug}` : b.slug).toLowerCase();
  return aLabel.localeCompare(bLabel);
}

function loadMetricsPayload(root) {
  const candidates = [
    path.join(root, 'data', 'engagement-signals.json'),
    path.join(root, 'data', 'engagement-metrics.json'),
    path.join(root, 'data', 'analytics', 'engagement.json'),
    path.join(root, 'content', 'analytics', 'engagement.json'),
  ];
  for (const candidate of candidates) {
    const payload = readJSON(candidate);
    if (payload) {
      return payload;
    }
  }
  return null;
}

export function loadEngagementSignals(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const limitTags = Number.isFinite(options.limitTags) ? Number(options.limitTags) : 3;
  const limitEntities = Number.isFinite(options.limitEntities) ? Number(options.limitEntities) : 3;

  const settings = options.settings && isPlainObject(options.settings)
    ? options.settings
    : readJSON(path.join(cwd, 'content', 'settings.json')) || {};

  const tagMap = new Map();
  const entityMap = new Map();

  const tagSources = [];
  const entitySources = [];

  gatherTagCandidates(settings.engagementFocus, tagSources);
  gatherTagCandidates(settings.contentFocus, tagSources);
  if (isPlainObject(settings.analytics)) {
    gatherTagCandidates(settings.analytics.focus, tagSources);
    gatherTagCandidates(settings.analytics.underserved, tagSources);
  }
  if (isPlainObject(settings.underserved)) {
    gatherTagCandidates(settings.underserved.tags, tagSources);
    gatherEntityCandidates(settings.underserved.entities, entitySources);
  }
  gatherEntityCandidates(settings.engagementFocus, entitySources);
  gatherEntityCandidates(settings.contentFocus, entitySources);

  const metricsPayload = loadMetricsPayload(cwd);
  if (metricsPayload) {
    gatherTagCandidates(metricsPayload, tagSources);
    gatherEntityCandidates(metricsPayload, entitySources);
  }

  for (const candidate of tagSources) {
    const normalized = normalizeTagCandidate(candidate);
    if (!normalized) continue;
    mergeTagSignal(tagMap, normalized);
  }

  for (const candidate of entitySources) {
    const normalized = normalizeEntityCandidate(candidate);
    if (!normalized) continue;
    mergeEntitySignal(entityMap, normalized);
  }

  const tags = Array.from(tagMap.values()).sort(sortTagSignals).slice(0, limitTags);
  const entities = Array.from(entityMap.values()).sort(sortEntitySignals).slice(0, limitEntities);

  return { tags, entities };
}

export default { loadEngagementSignals };
