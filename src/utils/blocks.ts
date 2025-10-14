import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const CtaFormSchema = z.object({
  action: z.string().min(1, "Form action required"),
  method: z.string().default("post"),
  emailFieldName: z.string().min(1, "Email field name required").default("email"),
  emailPlaceholder: z.string().default("you@example.com"),
  submitLabel: z.string().default("Sign up"),
  disclaimer: z.string().optional(),
});

const EvergreenCtaSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  description: z.string(),
  form: CtaFormSchema,
});

const TestimonialSchema = z.object({
  quote: z.string(),
  author: z.string(),
  role: z.string().optional(),
});

const HomeBlocksSchema = z.object({
  cta: EvergreenCtaSchema.optional(),
  testimonials: z.array(TestimonialSchema).default([]),
});

export type EvergreenBlocks = z.infer<typeof HomeBlocksSchema>;

let cachedBlocks: EvergreenBlocks | null = null;
let cachedMtimeMs = 0;

export function readEvergreenBlocks(filePath = path.join(process.cwd(), "content", "blocks", "home.json")): EvergreenBlocks {
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedBlocks && stat && stat.mtimeMs === cachedMtimeMs) {
      return cachedBlocks;
    }

    if (!stat) {
      cachedBlocks = { testimonials: [] };
      cachedMtimeMs = 0;
      return cachedBlocks;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = HomeBlocksSchema.parse(parsed);
    cachedBlocks = data;
    cachedMtimeMs = stat.mtimeMs;
    return data;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[blocks] Failed to load evergreen blocks from ${filePath}:`,
        error
      );
    }
    cachedBlocks = null;
    cachedMtimeMs = 0;
    return { testimonials: [] };
  }
}

export function resetBlocksCache() {
  cachedBlocks = null;
  cachedMtimeMs = 0;
}
