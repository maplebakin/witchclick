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
  })
  .passthrough();

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

export function readEditorialCalendar(): EditorialCalendar {
  const filePath = calendarFilePath();
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedCalendar && stat && stat.mtimeMs === cachedMtime) {
      return cachedCalendar;
    }

    if (!stat) {
      cachedCalendar = { seasons: [] };
      cachedMtime = 0;
      return cachedCalendar;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = EditorialCalendarSchema.parse(parsed);
    cachedCalendar = data;
    cachedMtime = stat.mtimeMs;
    return data;
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
