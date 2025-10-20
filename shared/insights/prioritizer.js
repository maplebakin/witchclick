import fs from 'node:fs';
import path from 'node:path';

import { getPromptHistory } from '../telemetry/index.js';

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[prioritizer] Unable to read ${filePath}:`, error?.message || error);
    }
    return null;
  }
}

function daysSince(dateString) {
  if (!dateString) return Infinity;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return Infinity;
  const diff = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildRecentFocusSets(history) {
  const tags = new Set();
  const entities = new Set();
  for (const event of history) {
    const focus = event?.metadata?.focus;
    if (!focus) continue;
    if (Array.isArray(focus.tags)) {
      for (const tag of focus.tags) {
        if (typeof tag === 'string' && tag.trim()) tags.add(tag.trim().toLowerCase());
      }
    }
    if (Array.isArray(focus.entities)) {
      for (const entity of focus.entities) {
        if (typeof entity === 'string' && entity.trim()) entities.add(entity.trim().toLowerCase());
      }
    }
  }
  return { tags, entities };
}

function scoreTag(record, recentTags) {
  const tag = String(record?.tag || '').trim();
  if (!tag) return null;
  const staleness = daysSince(record.lastContentAt || record.lastTouchedAt || record.lastGeneratedAt);
  const conversions = coerceNumber(record.conversions, 0);
  const views = coerceNumber(record.views, 0);
  const score = staleness * 2 + conversions * 5 + Math.sqrt(Math.max(views, 0));
  const penalty = recentTags.has(tag.toLowerCase()) ? 25 : 0;
  return {
    tag,
    staleness,
    conversions,
    views,
    score: score - penalty,
    trend: record.trend || null,
  };
}

function scoreEntity(record, recentEntities) {
  const type = String(record?.type || '').trim();
  const slug = String(record?.slug || '').trim();
  if (!type || !slug) return null;
  const key = `${type}:${slug}`.toLowerCase();
  const staleness = daysSince(record.lastMentioned || record.lastContentAt || record.lastGeneratedAt);
  const conversions = coerceNumber(record.conversions, 0);
  const views = coerceNumber(record.views, 0);
  const score = staleness * 2.5 + conversions * 4 + Math.sqrt(Math.max(views, 0));
  const penalty = recentEntities.has(key) ? 40 : 0;
  return {
    type,
    slug,
    staleness,
    conversions,
    views,
    score: score - penalty,
    tags: Array.isArray(record.tags) ? record.tags.map((t) => String(t)) : [],
  };
}

function formatTagNote(entry) {
  const pieces = [`Tag "${entry.tag}" is ${entry.staleness} days stale`];
  if (entry.conversions) {
    pieces.push(`${entry.conversions} conversions last period`);
  }
  if (entry.trend) {
    pieces.push(`trend: ${entry.trend}`);
  }
  return pieces.join(' – ');
}

function formatEntityNote(entry) {
  const pieces = [
    `${entry.type}:${entry.slug} hasn't appeared in ${entry.staleness} days`,
  ];
  if (entry.conversions) {
    pieces.push(`${entry.conversions} assisted conversions`);
  }
  if (entry.tags?.length) {
    pieces.push(`related tags: ${entry.tags.join(', ')}`);
  }
  return pieces.join(' – ');
}

export function loadPerformanceAnalytics(cwd = process.cwd()) {
  const filePath = path.join(cwd, 'data', 'analytics', 'performance.json');
  const data = readJson(filePath);
  if (!data) {
    return { updatedAt: null, tags: [], entities: [] };
  }
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const entities = Array.isArray(data.entities) ? data.entities : [];
  return {
    updatedAt: data.updatedAt || null,
    tags,
    entities,
  };
}

export function resolvePriorityFocus(options = {}) {
  const {
    cwd = process.cwd(),
    limitTags = 3,
    limitEntities = 3,
    promptHistoryWindow = 25,
  } = options;

  const analytics = loadPerformanceAnalytics(cwd);
  const promptHistory = getPromptHistory({ limit: promptHistoryWindow, cwd });
  const recent = buildRecentFocusSets(promptHistory);

  const scoredTags = analytics.tags
    .map((record) => scoreTag(record, recent.tags))
    .filter((entry) => entry && entry.score > 0)
    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));

  const scoredEntities = analytics.entities
    .map((record) => scoreEntity(record, recent.entities))
    .filter((entry) => entry && entry.score > 0)
    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));

  const topTags = scoredTags.slice(0, limitTags);
  const topEntities = scoredEntities.slice(0, limitEntities);

  const notes = [
    ...topTags.map((entry) => formatTagNote(entry)),
    ...topEntities.map((entry) => formatEntityNote(entry)),
  ];

  return {
    analytics,
    promptHistory,
    tags: topTags,
    entities: topEntities,
    notes,
    focus: {
      tags: topTags.map((entry) => entry.tag),
      entities: topEntities.map((entry) => `${entry.type}:${entry.slug}`),
    },
  };
}

export default {
  loadPerformanceAnalytics,
  resolvePriorityFocus,
};
