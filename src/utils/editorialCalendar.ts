import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const CalendarAnchorSchema = z
  .object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
  })
  .strict();

const CalendarSeasonSchema = z
  .object({
    slug: z.string(),
    season: z.string(),
    theme: z.string(),
    focus: z.string(),
    window: z.string(),
    rituals: z.array(z.string()).default([]),
    anchorPosts: z.array(CalendarAnchorSchema).default([]),
    notes: z.string().optional(),
    published: z.boolean().default(false),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .catchall(z.unknown());

const EditorialCalendarSchema = z
  .object({
    updatedAt: z.string().optional(),
    seasons: z.array(CalendarSeasonSchema).default([]),
  })
  .strict();

export type EditorialCalendar = z.infer<typeof EditorialCalendarSchema>;
export type EditorialSeason = z.infer<typeof CalendarSeasonSchema>;

let cachedCalendar: EditorialCalendar | null = null;
let cachedMtime = 0;

function calendarFilePath(): string {
  return path.join(process.cwd(), "content", "blocks", "editorial-calendar.json");
}

export interface ReadEditorialCalendarOptions {
  includeUnpublished?: boolean;
  now?: Date | number | string;
}

function parseBoundary(value: string | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function publicEditorialCalendar(
  calendar: EditorialCalendar,
  now: Date | number | string = new Date(),
): EditorialCalendar {
  const nowTimestamp = new Date(now).getTime();
  const safeNow = Number.isNaN(nowTimestamp) ? Date.now() : nowTimestamp;

  return {
    ...calendar,
    seasons: calendar.seasons.filter((season) => {
      if (!season.published) return false;
      const startsAt = parseBoundary(season.startsAt);
      const endsAt = parseBoundary(season.endsAt);
      if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
      if (startsAt !== null && safeNow < startsAt) return false;
      if (endsAt !== null && safeNow > endsAt) return false;
      return true;
    }),
  };
}

export function readEditorialCalendar(
  options: ReadEditorialCalendarOptions = {},
): EditorialCalendar {
  const filePath = calendarFilePath();
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedCalendar && stat && stat.mtimeMs === cachedMtime) {
      return options.includeUnpublished
        ? cachedCalendar
        : publicEditorialCalendar(cachedCalendar, options.now);
    }

    if (!stat) {
      cachedCalendar = { seasons: [] };
      cachedMtime = 0;
      return options.includeUnpublished
        ? cachedCalendar
        : publicEditorialCalendar(cachedCalendar, options.now);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = EditorialCalendarSchema.parse(parsed);
    cachedCalendar = data;
    cachedMtime = stat.mtimeMs;
    return options.includeUnpublished ? data : publicEditorialCalendar(data, options.now);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[calendar] Unable to read editorial calendar", error);
    }
    cachedCalendar = { seasons: [] };
    cachedMtime = 0;
    return cachedCalendar;
  }
}

export function resetEditorialCalendarCache() {
  cachedCalendar = null;
  cachedMtime = 0;
}
