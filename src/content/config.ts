// src/content/config.ts
import { defineCollection, z } from "astro:content";

/**
 * POSTS: Markdown in src/content/posts/*
 * You can keep legacy content/ for now — RSS and pages will still work — but
 * new posts should go in src/content/posts to get schema validation + typing.
 */
const posts = defineCollection({
  type: "content",
  schema: z.object({
    // Core
    title: z.string(),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    description: z.string().max(200).optional(),
    metaDescription: z.string().optional(),
    pubDate: z.coerce.date().optional(),       // prefer this
    publishedAt: z.coerce.date().optional(),   // accepted alias
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    outline: z.array(z.string()).optional(),
    wordCount: z.number().int().nonnegative().optional(),
    entities: z.array(z.object({ type: z.string(), slug: z.string() })).default([]),
    category: z.enum(["ritual", "meandering"]).default("ritual"),
    contentType: z.enum(["ritual", "guide", "spread", "reflection", "story", "tarotSpread", "spellwork", "crystals"]).optional(),
    draft: z.boolean().default(false),

    // SEO & social
    canonical: z.string().url().optional(),
    canonicalUrl: z.string().url().optional(),
    ogImage: z.string().optional(),
    readingMinutes: z.number().int().positive().optional(),
    tldr: z
      .string()
      .max(320, "Keep TL;DR summaries concise")
      .optional(),
    spoons: z.enum(["low", "medium", "high"]).optional(),

    // New: Reflection prompts for printable samplers
    reflectionPrompts: z.array(z.string()).optional(), // Array of reflection prompts

    // Monetization helpers
    affiliateAnchors: z
      .array(z.object({ key: z.string(), text: z.string() }))
      .default([]),
    // Accept both legacy format (text, href) and new format (slug, anchor)
    internalLinks: z
      .array(
        z.union([
          z.object({ slug: z.string(), anchor: z.string() }), // New format
          z.object({ text: z.string(), href: z.string() }),    // Legacy format
        ])
      )
      .default([]),
    internalLinkHints: z.array(z.string()).default([]),
    specVersion: z.number().int().optional(),
    promptMetadata: z
      .object({
        topic: z.string().optional(),
        requestedWords: z.number().optional(),
        deliveredWords: z.number().optional(),
        toggles: z
          .object({
            ads: z.string().optional(),
            kofi: z.string().optional(),
            mode: z.string().optional(),
            style: z.string().optional(),
            strict: z.boolean().optional(),
          })
          .optional(),
        generatedAt: z.string().optional(),
        engagementFocus: z
          .object({
            tags: z
              .array(
                z.object({
                  tag: z.string(),
                  reason: z.string().optional(),
                  score: z.number().optional(),
                  recencyDays: z.number().optional(),
                })
              )
              .optional(),
            entities: z
              .array(
                z.object({
                  slug: z.string(),
                  type: z.string().optional(),
                  name: z.string().optional(),
                  reason: z.string().optional(),
                  score: z.number().optional(),
                  recencyDays: z.number().optional(),
                })
              )
              .optional(),
          })
          .optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional(),

    // CTA toggles
    includeAds: z.boolean().default(false).optional(),
    includeKofi: z.boolean().default(false).optional(),
    downloadId: z.string().optional(),
  }),
});

/**
 * PRODUCTS: Data JSON in src/content/products.* (json/ts)
 * Used by the auto-linker to map keys → URLs (plus optional UTM params).
 */
const products = defineCollection({
  type: "data",
  schema: z.array(
    z.object({
      key: z.string(),
      url: z.string().url(),
      utm: z.string().optional(),
      rel: z.string().optional(),
      target: z.string().optional(),
      name: z.string().optional(),
      brand: z.string().optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      image: z.string().optional(),
      tags: z.array(z.string()).default([]),
    })
  ),
});

/**
 * SETTINGS: Data JSON in src/content/settings.* (json/ts)
 * Mirrors your content/settings.json but validated for future migration.
 */
const settings = defineCollection({
  type: "data",
  schema: z.object({
    siteUrl: z.string(),
    brandName: z.string().optional(),
    twitter: z.string().optional(),
    disclosure: z.string().optional(),
    analytics: z
      .object({
        enabled: z.boolean().default(false),
        provider: z.enum(["plausible", "fathom"]).optional(),
        domain: z.string().optional(),
        siteId: z.string().optional(),
        scriptUrl: z.string().optional(),
        apiHost: z.string().optional(),
        endpoint: z.string().url().optional(),
      })
      .optional(),
    autoSummaries: z.boolean().default(true),
    autoSpoons: z.boolean().default(true),
    ads: z
      .object({
        provider: z.string().optional(), // e.g., "adsense"
        adsenseClientId: z.string().optional(),
        slots: z.record(z.string()).optional(),
        sidebarSlotId: z.string().optional(),
        endSlotId: z.string().optional(),
        leadSlotId: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { posts, products, settings };
