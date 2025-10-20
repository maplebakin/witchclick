import type { PromptEvent } from '../telemetry/index.js';

export interface AnalyticsTagRecord {
  tag: string;
  conversions?: number;
  views?: number;
  lastContentAt?: string;
  lastTouchedAt?: string;
  lastGeneratedAt?: string;
  trend?: string;
}

export interface AnalyticsEntityRecord {
  type: string;
  slug: string;
  conversions?: number;
  views?: number;
  lastMentioned?: string;
  lastContentAt?: string;
  lastGeneratedAt?: string;
  tags?: string[];
}

export interface PerformanceAnalyticsPayload {
  updatedAt: string | null;
  tags: AnalyticsTagRecord[];
  entities: AnalyticsEntityRecord[];
}

export interface PriorityResolution {
  analytics: PerformanceAnalyticsPayload;
  promptHistory: PromptEvent[];
  tags: TagPriority[];
  entities: EntityPriority[];
  notes: string[];
  focus: {
    tags: string[];
    entities: string[];
  };
}

export interface TagPriority extends AnalyticsTagRecord {
  staleness: number;
  conversions: number;
  views: number;
  score: number;
  trend: string | null;
}

export interface EntityPriority extends AnalyticsEntityRecord {
  staleness: number;
  conversions: number;
  views: number;
  score: number;
  tags: string[];
}

export interface PriorityOptions {
  cwd?: string;
  limitTags?: number;
  limitEntities?: number;
  promptHistoryWindow?: number;
}

export function loadPerformanceAnalytics(cwd?: string): PerformanceAnalyticsPayload;
export function resolvePriorityFocus(options?: PriorityOptions): PriorityResolution;

declare const _default: {
  loadPerformanceAnalytics: typeof loadPerformanceAnalytics;
  resolvePriorityFocus: typeof resolvePriorityFocus;
};

export default _default;
