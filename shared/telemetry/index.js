import fs from 'node:fs';
import path from 'node:path';

const TELEMETRY_DIR = 'data/telemetry';
const PROMPT_FILE = 'prompt-events.jsonl';
const INGEST_FILE = 'ingest-events.jsonl';
const PERFORMANCE_FILE = 'performance-metrics.jsonl';

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    if (error && typeof error === 'object' && error.code !== 'EEXIST') {
      throw error;
    }
  }
}

function resolveTelemetryPath(fileName, cwd = process.cwd()) {
  const dir = path.join(cwd, TELEMETRY_DIR);
  ensureDir(dir);
  return path.join(dir, fileName);
}

function serializeEvent(payload) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

function appendEvent(fileName, payload) {
  try {
    const filePath = resolveTelemetryPath(fileName);
    fs.appendFileSync(filePath, `${serializeEvent(payload)}\n`, 'utf8');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[telemetry] failed to persist ${fileName}:`, error);
    }
  }
}

function readEvents(fileName, { limit, cwd } = {}) {
  try {
    const filePath = resolveTelemetryPath(fileName, cwd);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const events = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((value) => value && typeof value === 'object');
    if (typeof limit === 'number' && limit > 0) {
      return events.slice(-limit).reverse();
    }
    return events.reverse();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[telemetry] failed to read ${fileName}:`, error);
    }
    return [];
  }
}

export function recordPromptEvent(event) {
  const { topic, mode, style, strict, words, ads, kofi, metadata } = event;
  appendEvent(PROMPT_FILE, {
    topic,
    mode: mode ?? null,
    style: style ?? null,
    strict: Boolean(strict),
    words: Number.isFinite(words) ? Number(words) : undefined,
    ads,
    kofi,
    metadata: metadata ?? null,
  });
}

export function recordIngestEvent(event) {
  const { slug, ok, warnings, normalizations, durationMs, path: filePath } = event;
  appendEvent(INGEST_FILE, {
    slug: slug ?? null,
    ok: ok !== false,
    warnings: Array.isArray(warnings) ? warnings : [],
    normalizations: Array.isArray(normalizations) ? normalizations : [],
    durationMs: Number.isFinite(durationMs) ? Number(durationMs) : undefined,
    path: filePath ?? null,
  });
}

export function recordPerformanceMetric(event) {
  const { name, durationMs, success, meta } = event;
  appendEvent(PERFORMANCE_FILE, {
    name,
    durationMs: Number.isFinite(durationMs) ? Number(durationMs) : undefined,
    success: success !== false,
    meta: meta ?? null,
  });
}

export function getPromptHistory(options = {}) {
  return readEvents(PROMPT_FILE, options);
}

export function getIngestEvents(options = {}) {
  return readEvents(INGEST_FILE, options);
}

export function getPerformanceMetrics(options = {}) {
  const events = readEvents(PERFORMANCE_FILE, options);
  if (options && options.name) {
    const name = options.name;
    return events.filter((event) => event?.name === name);
  }
  return events;
}

export function summarizePerformance(name, options = {}) {
  const metrics = getPerformanceMetrics({ ...options, name });
  if (!metrics.length) {
    return { name, runs: 0, p95: null, average: null };
  }
  const durations = metrics
    .map((metric) => Number(metric?.durationMs))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const runs = durations.length;
  if (!runs) {
    return { name, runs: metrics.length, p95: null, average: null };
  }
  const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
  const total = durations.reduce((sum, value) => sum + value, 0);
  return {
    name,
    runs: metrics.length,
    p95: durations[p95Index],
    average: total / durations.length,
  };
}

export default {
  recordPromptEvent,
  recordIngestEvent,
  recordPerformanceMetric,
  getPromptHistory,
  getIngestEvents,
  getPerformanceMetrics,
  summarizePerformance,
};
