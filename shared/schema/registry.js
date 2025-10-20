import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

// --- Shared enumerations ---------------------------------------------------

export const ENTITY_TYPES = [
  'crystal',
  'herb',
  'moonPhase',
  'tarot',
  'planetaryDay',
  'ritual',
];

export const CONTENT_TYPES = [
  'ritual',
  'guide',
  'spread',
  'reflection',
  'story',
  'tarotSpread',
  'spellwork',
  'crystals',
];

export const CURSE_TYPES = ['reveal', 'return', 'mirror', 'sever', 'echo'];
export const CURSE_TARGETS = ['space', 'person', 'dynamic', 'memory', 'habit'];
export const CURSE_TONES = ['gentle', 'poetic', 'scathing', 'restrained'];
export const CURSE_TAGS = [
  'white-magic',
  'ethical-curse',
  'returning-energy',
  'truthwork',
  'mirrorcasting',
  'clean-cursing',
];

export const EntityTypeSchema = z.enum(ENTITY_TYPES);
export const PostContentTypeSchema = z.enum(CONTENT_TYPES);

// --- Helper validators -----------------------------------------------------

function isAbsoluteUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}

function isRootedPath(value) {
  return typeof value === 'string' && /^\//.test(value);
}

function wordCount(value) {
  const str = String(value ?? '').trim();
  if (!str) return 0;
  return str
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean).length;
}

function enforceWordRange(label, min, max) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => {
      const count = wordCount(value);
      return count >= min && count <= max;
    }, `${label} must be between ${min} and ${max} words`);
}

function enforceCharacterRange(label, min, max) {
  return z.string().trim().min(min, `${label} must be at least ${min} characters`).max(
    max,
    `${label} must be at most ${max} characters`,
  );
}

function enforceSingleLine(label) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !/\r|\n/.test(value), `${label} must be a single line`);
}

// --- Post Spec -------------------------------------------------------------

const OutlineItemSchema = z.object({
  heading: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

const SectionSchema = z.object({
  heading: z.string().trim().min(1),
  markdown: z.string().trim().min(1),
});

const EntitySchema = z.object({
  type: EntityTypeSchema,
  slug: z.string().trim().min(1),
});

const InternalLinkHintSchema = z.object({
  anchor: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
});

const AffiliateHintSchema = z.object({
  key: z.string().trim().min(1),
  anchor: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
});

const CtaSchema = z.object({
  type: z.enum(['kofi', 'download', 'none']),
  id: z.string().trim().min(1).optional(),
});

const AdPlacementSchema = z.enum(['lead', 'mid', 'end']);

export const PostSpecV2Schema = z.object({
  specVersion: z.literal(2),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  contentType: PostContentTypeSchema.optional(),
  metaDescription: z.string().trim().min(1),
  tags: z.array(z.string().trim()).min(4).max(7),
  excerpt: z.string().trim().min(1),
  outline: z.array(OutlineItemSchema).min(1),
  sections: z.array(SectionSchema).min(1),
  entities: z.array(EntitySchema),
  heroImagePrompt: z.string().trim().nullable(),
  altTexts: z.array(z.string().trim()),
  internalLinkHints: z.array(InternalLinkHintSchema),
  affiliateHints: z.array(AffiliateHintSchema),
  cta: CtaSchema,
  adPlacements: z.array(AdPlacementSchema),
});

// --- Curse Spec ------------------------------------------------------------

export const CurseGeneratorInputSchema = z.object({
  type: z.enum(CURSE_TYPES),
  target: z.enum(CURSE_TARGETS),
  tone: z.enum(CURSE_TONES),
  sigilName: z.string().trim().min(1).max(80).optional(),
  altarItem: z.string().trim().min(1).max(80).optional(),
  journalingFollowUp: z.string().trim().min(1).max(160).optional(),
});

const CurseTagsSchema = z
  .array(z.enum(CURSE_TAGS))
  .length(CURSE_TAGS.length, 'Tags must include the canonical curse tags')
  .refine((value) => {
    const seen = new Set(value);
    return CURSE_TAGS.every((tag) => seen.has(tag));
  }, 'Tags must include all canonical curse tags exactly once');

export const CurseSpecSchema = z.object({
  specVersion: z.literal(1),
  title: enforceCharacterRange('Title', 50, 60),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case (lowercase, numbers, hyphen)'),
  openingReflection: enforceWordRange('Opening reflection', 75, 100),
  invocation: enforceSingleLine('Invocation'),
  method: enforceWordRange('Method', 150, 200),
  closure: enforceWordRange('Closure / aftercare', 50, 75),
  safetyNotes: z.string().trim().min(20).max(200).optional(),
  generator: CurseGeneratorInputSchema,
  tags: CurseTagsSchema,
});

// --- Evergreen Blocks ------------------------------------------------------

const CtaFormSchema = z.object({
  action: z.string().trim().min(1, 'Form action required'),
  method: z.string().trim().min(1).default('post'),
  emailFieldName: z
    .string()
    .trim()
    .min(1, 'Email field name required')
    .default('email'),
  emailPlaceholder: z.string().trim().default('you@example.com'),
  submitLabel: z.string().trim().default('Sign up'),
  disclaimer: z.string().trim().optional(),
});

const EvergreenCtaSchema = z.object({
  eyebrow: z.string().trim().optional(),
  title: z.string().trim(),
  description: z.string().trim(),
  form: CtaFormSchema,
});

const TestimonialSchema = z.object({
  quote: z.string().trim(),
  author: z.string().trim(),
  role: z.string().trim().optional(),
});

export const EvergreenBlocksSchema = z.object({
  cta: EvergreenCtaSchema.optional(),
  testimonials: z.array(TestimonialSchema).default([]),
});

// --- Settings --------------------------------------------------------------

const AnalyticsProviderSchema = z.enum(['plausible', 'fathom']);

const AnalyticsSettingsSchema = z
  .object({
    enabled: z.boolean(),
    provider: AnalyticsProviderSchema.optional(),
    domain: z.string().trim().min(1).optional(),
    siteId: z.string().trim().min(1).optional(),
    scriptUrl: z.string().trim().min(1).optional(),
    apiHost: z.string().trim().min(1).optional(),
    endpoint: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    const provider = value.provider ?? 'plausible';
    if (provider === 'plausible' && !value.domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domain'],
        message: "analytics.domain is required when provider is 'plausible'",
      });
    }
    if (provider === 'fathom' && !value.siteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['siteId'],
        message: "analytics.siteId is required when provider is 'fathom'",
      });
    }
    if (value.scriptUrl && !isAbsoluteUrl(value.scriptUrl) && !isRootedPath(value.scriptUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scriptUrl'],
        message: 'analytics.scriptUrl must be an absolute URL or rooted path',
      });
    }
    if (value.apiHost && !isAbsoluteUrl(value.apiHost)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['apiHost'],
        message: 'analytics.apiHost must be an absolute URL',
      });
    }
  });

const AdsSettingsSchema = z.object({
  provider: z.string().trim().min(1).optional(),
  adsenseClientId: z.string().trim().min(1).optional(),
  slots: z.record(z.string().trim().min(1)).optional(),
  sidebarSlotId: z.string().trim().optional(),
  endSlotId: z.string().trim().optional(),
  leadSlotId: z.string().trim().optional(),
});

const ObservabilitySettingsSchema = z.object({
  enabled: z.boolean(),
  dsn: z.string().trim().min(1).nullable().optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
});

export const SiteSettingsInputSchema = z
  .object({
    siteUrl: z.string().trim().url().optional(),
    brandName: z.string().trim().min(1).optional(),
    disclosure: z.string().trim().optional(),
    kofiUsername: z.string().trim().optional(),
    showAccountLink: z.boolean().optional(),
    analytics: AnalyticsSettingsSchema.optional(),
    ads: AdsSettingsSchema.optional(),
    observability: ObservabilitySettingsSchema.optional(),
    clientErrorEndpoint: z.union([z.string().trim(), z.null()]).optional(),
    autoSummaries: z.boolean().optional(),
    autoSpoons: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.clientErrorEndpoint &&
      !isRootedPath(value.clientErrorEndpoint) &&
      !isAbsoluteUrl(value.clientErrorEndpoint)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clientErrorEndpoint'],
        message: 'clientErrorEndpoint must be a rooted path or absolute URL',
      });
    }
  });

export const DEFAULT_SITE_SETTINGS = Object.freeze({
  siteUrl: 'https://example.com',
  brandName: 'WitchClick',
  disclosure:
    'As an affiliate, we may earn a small commission if you purchase through our links.',
  kofiUsername: undefined,
  analytics: { enabled: false, provider: 'plausible' },
  ads: undefined,
  showAccountLink: false,
  observability: { enabled: false, dsn: null, environment: 'production' },
  clientErrorEndpoint: null,
  autoSummaries: true,
  autoSpoons: true,
});

function mergeAnalytics(base, next) {
  if (!next) return base;
  const result = { ...(base ?? { enabled: false }) };
  if (typeof next.enabled === 'boolean') result.enabled = next.enabled;
  if (next.provider !== undefined) result.provider = next.provider;
  if (next.domain !== undefined) result.domain = next.domain;
  if (next.siteId !== undefined) result.siteId = next.siteId;
  if (next.scriptUrl !== undefined) result.scriptUrl = next.scriptUrl;
  if (next.apiHost !== undefined) result.apiHost = next.apiHost;
  if (next.endpoint !== undefined) result.endpoint = next.endpoint;
  return result;
}

function mergeAds(base, next) {
  if (!next) return base;
  const result = { ...(base ?? {}) };
  if (next.provider !== undefined) result.provider = next.provider;
  if (next.adsenseClientId !== undefined) result.adsenseClientId = next.adsenseClientId;
  if (next.sidebarSlotId !== undefined) result.sidebarSlotId = next.sidebarSlotId;
  if (next.endSlotId !== undefined) result.endSlotId = next.endSlotId;
  if (next.leadSlotId !== undefined) result.leadSlotId = next.leadSlotId;
  if (next.slots !== undefined) result.slots = { ...(base?.slots ?? {}), ...next.slots };
  return result;
}

function mergeObservability(base, next) {
  if (!next) return base;
  const result = { ...(base ?? { enabled: false, dsn: null, environment: 'production' }) };
  if (typeof next.enabled === 'boolean') result.enabled = next.enabled;
  if (next.dsn !== undefined) result.dsn = next.dsn;
  if (next.environment !== undefined) result.environment = next.environment;
  return result;
}

export function applySiteSettingsDefaults(partial = {}) {
  const parsed = SiteSettingsInputSchema.parse(partial);
  const base = {
    siteUrl: parsed.siteUrl ?? DEFAULT_SITE_SETTINGS.siteUrl,
    brandName: parsed.brandName ?? DEFAULT_SITE_SETTINGS.brandName,
    disclosure: parsed.disclosure ?? DEFAULT_SITE_SETTINGS.disclosure,
    kofiUsername: parsed.kofiUsername ?? DEFAULT_SITE_SETTINGS.kofiUsername,
    showAccountLink: parsed.showAccountLink ?? DEFAULT_SITE_SETTINGS.showAccountLink,
    analytics: mergeAnalytics(DEFAULT_SITE_SETTINGS.analytics, parsed.analytics),
    ads: mergeAds(DEFAULT_SITE_SETTINGS.ads, parsed.ads),
    observability: mergeObservability(DEFAULT_SITE_SETTINGS.observability, parsed.observability),
    clientErrorEndpoint:
      parsed.clientErrorEndpoint === undefined
        ? DEFAULT_SITE_SETTINGS.clientErrorEndpoint
        : parsed.clientErrorEndpoint,
    autoSummaries: parsed.autoSummaries ?? DEFAULT_SITE_SETTINGS.autoSummaries,
    autoSpoons: parsed.autoSpoons ?? DEFAULT_SITE_SETTINGS.autoSpoons,
  };

  if (!base.analytics?.provider) {
    base.analytics = { ...(base.analytics ?? {}), provider: 'plausible' };
  }

  return base;
}

// --- Registry --------------------------------------------------------------

export const schemaRegistry = Object.freeze({
  postSpec: {
    id: 'postSpec',
    schema: PostSpecV2Schema,
    description: 'Canonical WitchClick PostSpec v2 contract',
  },
  curseSpec: {
    id: 'curseSpec',
    schema: CurseSpecSchema,
    description: 'White magic curse specification contract',
  },
  evergreenBlocks: {
    id: 'evergreenBlocks',
    schema: EvergreenBlocksSchema,
    description: 'Evergreen marketing blocks structure',
  },
  siteSettings: {
    id: 'siteSettings',
    schema: SiteSettingsInputSchema,
    description: 'Site settings input contract',
  },
});

export function listSchemas() {
  return Object.values(schemaRegistry).map((entry) => ({
    id: entry.id,
    description: entry.description,
  }));
}

let zodToJsonSchema;

export async function getJsonSchema(id, options = {}) {
  if (!zodToJsonSchema) {
    try {
      const mod = await import('zod-to-json-schema');
      zodToJsonSchema = mod.zodToJsonSchema ?? mod.default;
    } catch (primaryError) {
      try {
        const fallbackPath = path.join(
          process.cwd(),
          'node_modules',
          'astro',
          'node_modules',
          'zod-to-json-schema',
          'dist',
          'index.js',
        );
        if (fs.existsSync(fallbackPath)) {
          const mod = await import(pathToFileURL(fallbackPath).href);
          zodToJsonSchema = mod.zodToJsonSchema ?? mod.default;
        } else {
          throw primaryError;
        }
      } catch (fallbackError) {
        throw primaryError;
      }
    }
  }
  const entry = schemaRegistry[id];
  if (!entry) {
    throw new Error(`Unknown schema id: ${id}`);
  }
  return zodToJsonSchema(entry.schema, id, options);
}

export function stripMarkdownToPlainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\\*_#>~\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generatePostSpecDocumentation() {
  const lines = [
    '{',
    '  "specVersion": 2,',
    '  "title": string (50-60 chars),',
    '  "slug": string (kebab-case),',
    '  "contentType": "ritual"|"guide"|"spread"|"reflection"|"story"|"tarotSpread"|"spellwork"|"crystals" (optional, defaults to "ritual"),',
    '  "metaDescription": string (150-160 chars),',
    '  "tags": string[4-7],',
    '  "excerpt": string (1-2 sentences),',
    '  "outline": { "heading": string, "id": string }[],',
    '  "sections": { "heading": string, "markdown": string }[],',
    '  "entities": { "type": "crystal"|"herb"|"moonPhase"|"tarot"|"planetaryDay"|"ritual", "slug": string }[],',
    '  "heroImagePrompt": string | null,',
    '  "altTexts": string[],',
    '  "internalLinkHints": { "anchor": string, "rationale": string }[],',
    '  "affiliateHints": { "key": string, "anchor": string, "rationale": string }[],',
    '  "cta": { "type": "kofi"|"download"|"none", "id"?: string },',
    '  "adPlacements": ("lead"|"mid"|"end")[]',
    '}',
  ];
  return lines.join('\n');
}

export function generateCurseSchemaDocumentation() {
  const lines = [
    '{',
    '  "specVersion": 1,',
    '  "title": string (50-60 chars),',
    '  "slug": string (kebab-case),',
    '  "openingReflection": string (75-100 words),',
    '  "invocation": string (single line),',
    '  "method": string (150-200 words),',
    '  "closure": string (50-75 words),',
    '  "safetyNotes"?: string (20-200 chars),',
    '  "generator": {',
    '    "type": "reveal"|"return"|"mirror"|"sever"|"echo",',
    '    "target": "space"|"person"|"dynamic"|"memory"|"habit",',
    '    "tone": "gentle"|"poetic"|"scathing"|"restrained",',
    '    "sigilName"?: string,',
    '    "altarItem"?: string,',
    '    "journalingFollowUp"?: string',
    '  },',
    '  "tags": ["white-magic", "ethical-curse", "returning-energy", "truthwork", "mirrorcasting", "clean-cursing"]',
    '}',
  ];
  return lines.join('\n');
}

export function countCurseWords(value) {
  return wordCount(value);
}

export default schemaRegistry;
