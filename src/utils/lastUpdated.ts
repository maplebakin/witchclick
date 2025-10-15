import fs from "node:fs";
import { fileURLToPath } from "node:url";

export interface LastUpdatedMeta {
  iso: string;
  formatted: string;
  isStale: boolean;
  daysSince: number;
}

interface LastUpdatedOptions {
  fallbackDate?: string | Date | null;
  staleAfterDays?: number;
}

const DEFAULT_STALE_DAYS = 90;

export function getLastUpdatedMeta(
  moduleUrl: string,
  options: LastUpdatedOptions = {},
): LastUpdatedMeta | null {
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_DAYS;

  let timestamp: Date | null = normalizeDate(options.fallbackDate);

  if (!timestamp) {
    try {
      const filePath = fileURLToPath(moduleUrl);
      const stats = fs.statSync(filePath);
      timestamp = stats.mtime;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[lastUpdated] unable to resolve timestamp", error);
      }
      return null;
    }
  }

  if (!timestamp || Number.isNaN(timestamp.getTime())) return null;

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - timestamp.getTime());
  const daysSince = diffMs / (1000 * 60 * 60 * 24);
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

  return {
    iso: timestamp.toISOString(),
    formatted: formatter.format(timestamp),
    isStale: daysSince > staleAfterDays,
    daysSince,
  };
}

function normalizeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
