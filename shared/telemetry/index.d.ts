export interface PromptEvent {
  timestamp: string;
  topic: string;
  mode: string | null;
  style: string | null;
  strict: boolean;
  words?: number;
  ads?: string;
  kofi?: string;
  metadata: unknown;
}

export interface IngestEvent {
  timestamp: string;
  slug: string | null;
  ok: boolean;
  warnings: unknown[];
  normalizations: unknown[];
  durationMs?: number;
  path: string | null;
}

export interface PerformanceMetric {
  timestamp: string;
  name: string;
  durationMs?: number;
  success: boolean;
  meta: unknown;
}

export interface PromptEventInput {
  topic: string;
  mode?: string | null;
  style?: string | null;
  strict?: boolean;
  words?: number;
  ads?: string;
  kofi?: string;
  metadata?: unknown;
}

export interface IngestEventInput {
  slug?: string | null;
  ok?: boolean;
  warnings?: unknown[];
  normalizations?: unknown[];
  durationMs?: number;
  path?: string | null;
}

export interface PerformanceMetricInput {
  name: string;
  durationMs?: number;
  success?: boolean;
  meta?: unknown;
}

export interface TelemetryReadOptions {
  limit?: number;
  cwd?: string;
  name?: string;
}

export interface PerformanceSummary {
  name: string;
  runs: number;
  p95: number | null;
  average: number | null;
}

export function recordPromptEvent(event: PromptEventInput): void;
export function recordIngestEvent(event: IngestEventInput): void;
export function recordPerformanceMetric(event: PerformanceMetricInput): void;
export function getPromptHistory(options?: TelemetryReadOptions): PromptEvent[];
export function getIngestEvents(options?: TelemetryReadOptions): IngestEvent[];
export function getPerformanceMetrics(options?: TelemetryReadOptions): PerformanceMetric[];
export function summarizePerformance(name: string, options?: TelemetryReadOptions): PerformanceSummary;

declare const _default: {
  recordPromptEvent: typeof recordPromptEvent;
  recordIngestEvent: typeof recordIngestEvent;
  recordPerformanceMetric: typeof recordPerformanceMetric;
  getPromptHistory: typeof getPromptHistory;
  getIngestEvents: typeof getIngestEvents;
  getPerformanceMetrics: typeof getPerformanceMetrics;
  summarizePerformance: typeof summarizePerformance;
};

export default _default;
