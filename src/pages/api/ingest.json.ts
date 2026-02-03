// src/pages/api/ingest.json.ts

export type { PostSpecV2 } from '../../lib/postSpecSchema';
import fs from 'node:fs';
import path from 'node:path';

import { normalizePostSpec } from '../../../server/lib/ingestionAdapter.js';
import { validateStructure } from '../../../server/lib/structureValidation.js';
import { PostSpecV2Schema, type PostSpecV2 } from '../../lib/postSpecSchema';
import type { EntityType } from '../../lib/postSpecSchema';
import { validatePostSpec } from '../../lib/postSpecValidator';
import { slugify } from '../../../shared/slugify.js';

/* ---------- helpers ---------- */

function safeReadJSON<T=any>(p:string, fallback:T): T {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; }
}

function ensureDirSync(dir:string){ fs.mkdirSync(dir, { recursive: true }); }

function ensureUniqueSlug(base:string, postsDir:string){
  const safe = slugify(base) || 'post';
  let slug = safe, n = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) slug = `${safe}-${n++}`;
  return slug;
}

function _wordCount(md:string){
  const withoutCode = md.replace(/```[\s\S]*?```/g,' ').replace(/`[^`]*`/g,' ');
  const withoutMd = withoutCode.replace(/<[^>]+>/g,' ').replace(/[\\*_#>~\\-]+/g,' ');
  const m = withoutMd.match(/\b[\p{L}\p{N}'']+\b/gu);
  return m ? m.length : 0;
}

function readingMinutes(words:number){ return Math.max(1, Math.round(words / 200)); }

function toTitleCase(value: string) {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function buildPlaceholderOutline(title: string) {
  return [
    `Why ${title} matters right now`,
    "What you'll need and how long it takes",
    "Ritual flow (step by step)",
    "Low-spoons option or accessibility notes",
    "Reflection prompts and next steps",
  ];
}

function buildPlaceholderBody(title: string) {
  return [
    "<!-- AUTO-GENERATED PLACEHOLDER -->",
    "",
    "## This is a draft placeholder",
    `This post was auto-generated from an internal link pointing to \"${title}\".`,
    "Use the checklist and outline below as a starting point, then replace this content before publishing.",
    "",
    "## Quick checklist",
    "- Write a 1-2 sentence excerpt and update the meta description.",
    "- Expand the outline into 3-5 sections with practical steps.",
    "- Add related entities, tools, and internal links.",
    "- Remove placeholder tags and set draft: false when ready.",
    "",
    "## Suggested outline",
    `1. Why ${title} matters right now`,
    "2. What you'll need and how long it takes",
    "3. Step-by-step ritual flow",
    "4. Low-spoons option or accessibility notes",
    "5. Reflection prompts and next steps",
    "",
    "## Starter notes",
    "- Intention: ____",
    "- Sensory anchor: ____",
    "- Aftercare: ____",
  ].join("\n");
}

type PlaceholderPostEntry = {
  slug: string;
  title: string;
  path: string;
  source: string;
  sourceAnchor?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
};

type PlaceholderEntityEntry = {
  type: EntityType;
  slug: string;
  name: string;
  path: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  status: string;
};

type PlaceholderIndex = {
  updatedAt: string;
  posts: Record<string, PlaceholderPostEntry>;
  entities: Record<string, PlaceholderEntityEntry>;
};

function loadPlaceholderIndex(indexPath: string): PlaceholderIndex {
  const base: PlaceholderIndex = { updatedAt: "", posts: {}, entities: {} };
  const parsed = safeReadJSON<PlaceholderIndex>(indexPath, base);
  return {
    updatedAt: parsed?.updatedAt || "",
    posts: parsed?.posts && typeof parsed.posts === "object" ? parsed.posts : {},
    entities: parsed?.entities && typeof parsed.entities === "object" ? parsed.entities : {},
  };
}

function savePlaceholderIndex(indexPath: string, payload: PlaceholderIndex) {
  ensureDirSync(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(payload, null, 2), "utf8");
}

function updatePlaceholderIndex(
  indexPath: string,
  {
    postStubs = [],
    entityStubs = [],
  }: {
    postStubs?: PlaceholderPostEntry[];
    entityStubs?: PlaceholderEntityEntry[];
  },
) {
  if (!postStubs.length && !entityStubs.length) return null;
  const index = loadPlaceholderIndex(indexPath);
  const now = new Date().toISOString();
  index.updatedAt = now;

  for (const stub of postStubs) {
    const existing = index.posts[stub.slug];
    index.posts[stub.slug] = {
      ...stub,
      createdAt: existing?.createdAt || stub.createdAt,
      updatedAt: now,
    };
  }

  for (const stub of entityStubs) {
    const key = `${stub.type}:${stub.slug}`;
    const existing = index.entities[key];
    index.entities[key] = {
      ...stub,
      createdAt: existing?.createdAt || stub.createdAt,
      updatedAt: now,
    };
  }

  savePlaceholderIndex(indexPath, index);

  return {
    path: path.relative(process.cwd(), indexPath),
    updatedAt: index.updatedAt,
    totalPosts: Object.keys(index.posts).length,
    totalEntities: Object.keys(index.entities).length,
  };
}

function ensureEntityStubs(entities: {type:EntityType; slug:string}[]){
  const created: PlaceholderEntityEntry[] = [];
  const root = path.join(process.cwd(), 'content', 'entities');
  for (const e of entities||[]) {
    const dir = path.join(root, e.type);
    ensureDirSync(dir);
    const p = path.join(dir, `${e.slug}.json`);
    if (!fs.existsSync(p)) {
      const now = new Date().toISOString();
      const name = toTitleCase(e.slug);
      fs.writeFileSync(p, JSON.stringify({
        type: e.type,
        name,
        slug: e.slug,
        summary: `${name} — stub entity awaiting completion.`,
        properties: {},
        related: [],
        stub: true,
        autoGenerated: true,
        generatedAt: now
      }, null, 2), 'utf8');

      created.push({
        type: e.type,
        slug: e.slug,
        name,
        path: `content/entities/${e.type}/${e.slug}.json`,
        source: "post-spec",
        createdAt: now,
        updatedAt: now,
        status: "stub",
      });
    }
  }
  return created;
}

function ensurePostStubs(internalLinkHints: string[], postsDir: string, siteUrl: string): PlaceholderPostEntry[] {
  const createdStubs: PlaceholderPostEntry[] = [];

  for (const anchor of internalLinkHints || []) {
    if (!anchor) continue;

    const candidateSlug = slugify(anchor);
    if (!candidateSlug) continue;

    const postPath = path.join(postsDir, `${candidateSlug}.md`);
    if (fs.existsSync(postPath)) continue; // Post already exists

    const title = toTitleCase(anchor);
    const now = new Date().toISOString();
    const placeholderOutline = buildPlaceholderOutline(title);
    const placeholderBody = buildPlaceholderBody(title);
    const placeholderWords = _wordCount(placeholderBody);
    const frontmatter = {
      title,
      slug: candidateSlug,
      description: `Draft placeholder for "${title}". This ritual is queued for writing.`,
      excerpt: `Draft placeholder for "${title}". Full ritual content will arrive soon.`,
      metaTitle: title,
      metaDescription: `Draft placeholder for "${title}" generated from an internal link. Update this once the ritual is written.`,
      tags: ['placeholder', 'stub', 'needs-writing'],
      outline: placeholderOutline,
      wordCount: placeholderWords,
      readingMinutes: readingMinutes(placeholderWords),
      entities: [],
      includeAds: false,
      includeKofi: false,
      affiliateAnchors: [],
      internalLinkHints: [],
      internalLinks: [],
      publishedAt: now,
      canonicalUrl: `${siteUrl}/post/${candidateSlug}`,
      specVersion: 2 as const,
      draft: true,
      placeholder: true,
      autoGenerated: true,
      generationSource: "internal-link",
      placeholderCreatedAt: now,
      placeholderChecklist: [
        "Write a clear excerpt and meta description.",
        "Expand the outline into full sections with ritual steps.",
        "Add related entities, tools, and links.",
        "Remove placeholder tags and set draft: false when ready.",
      ],
    };

    const contents = `---\n${toFrontmatterYAML(frontmatter)}\n---\n\n${placeholderBody}\n`;

    fs.writeFileSync(postPath, contents, 'utf8');
    createdStubs.push({
      slug: candidateSlug,
      title,
      path: `src/content/posts/${candidateSlug}.md`,
      source: "internal-link",
      sourceAnchor: anchor,
      createdAt: now,
      updatedAt: now,
      status: "stub",
    });
  }

  return createdStubs;
}

function toFrontmatterYAML(obj: Record<string, any>) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) { lines.push(`${k}: null`); continue; }
    if (typeof v === 'string') { lines.push(`${k}: ${JSON.stringify(v)}`); continue; }
    if (typeof v === 'number' || typeof v === 'boolean') { lines.push(`${k}: ${v}`); continue; }
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

function normalizeCta(cta:any): { type:'kofi'|'download'|'none'; id?:string }{
  if (!cta || typeof cta !== 'object') return { type:'none' };
  const t = String(cta.type||'').toLowerCase();
  if (t==='kofi') return { type:'kofi', id: cta.id || undefined };
  if (t==='download') return { type:'download', id: cta.id || undefined };
  return { type:'none' };
}

/* ---------- handler ---------- */

export async function POST({ request }: { request: Request }) {
  try {
    let input: unknown = null;

    // 1) Try JSON first
    try { input = await request.json(); } catch {}

    // 2) Fallback to text() → JSON.parse
    if (!input) {
      try {
        const txt = await request.text();
        if (txt && txt.trim()) input = JSON.parse(txt);
      } catch {}
    }

    // 3) Fallback to multipart/form-data
    if (!input) {
      try {
        const form = await request.formData();
        const raw = (form.get('json') || form.get('body') || '') as string;
        if (typeof raw === 'string' && raw.trim()) input = JSON.parse(raw);
      } catch {}
    }

    if (!input) {
      return json({ ok:false, error:'No JSON body provided. Paste a PostSpec v2 object.' }, 400);
    }

    // Check for dry run and draft modes
    const requestUrl = new URL(request.url);
    const isDryRun = requestUrl.searchParams.get('dryRun') === 'true';

    const CWD = process.cwd();
    const PRODUCTS_PATH = path.join(CWD, 'content', 'products.json');
    const products = safeReadJSON<{ products: { key: string }[] }>(PRODUCTS_PATH, { products: [] });
    const allowedAffiliateKeys = Array.isArray(products.products)
      ? products.products.map((product) => String(product?.key || '').trim()).filter(Boolean)
      : [];

    let normalizationReport: string[] = [];
    let normalizationWarnings: string[] = [];
    let normalizedSpec: PostSpecV2;
    try {
      const { spec, report, warnings } = normalizePostSpec(input, { allowedAffiliateKeys });
      normalizedSpec = spec;
      normalizationReport = report;
      normalizationWarnings = Array.isArray(warnings) ? [...warnings] : [];
    } catch (error: any) {
      return json({ ok:false, error: error?.message || String(error) }, 400);
    }

    const parsed = PostSpecV2Schema.safeParse(normalizedSpec);
    if (!parsed.success) {
      type ParsedIssue = (typeof parsed.error.issues)[number];
      const schemaErrors = parsed.error.issues.map((issue: ParsedIssue) => {
        const path = (issue.path ?? []).join('.') || 'root';
        return `${path}: ${issue.message}`;
      });
      return json({ ok:false, error: schemaErrors[0], errors: schemaErrors, warnings: normalizationWarnings, normalizations: normalizationReport }, 400);
    }

    const spec = parsed.data;

    const enforcement = validatePostSpec(spec, {
      targetWordCount: 1200,
      allowedAffiliateKeys,
    });
    if (!enforcement.valid) {
      const warnings = [...new Set([...normalizationWarnings, ...enforcement.warnings])];
      return json({ ok: false, error: enforcement.errors[0], errors: enforcement.errors, warnings, normalizations: normalizationReport }, 400);
    }

    const contentWords = enforcement.wordCount;

    // Structural + soft validation
    const structureResult = validateStructure(spec, contentWords);
    if (structureResult.errors.length) {
      const warnings = [...new Set([...normalizationWarnings, ...enforcement.warnings, ...structureResult.warnings])];
      return json({ ok:false, error: structureResult.errors[0], errors: structureResult.errors, warnings, normalizations: normalizationReport }, 400);
    }

    // Paths & settings
    const POSTS_DIR = path.join(CWD, 'content', 'posts');
    const SETTINGS_PATH = path.join(CWD, 'content', 'settings.json');
    ensureDirSync(POSTS_DIR);

    const settings = safeReadJSON(SETTINGS_PATH, { siteUrl: 'https://example.com' });

    // Slug + counts
    const baseSlug = slugify(spec.slug || spec.title);
    const slug = ensureUniqueSlug(baseSlug, POSTS_DIR);

    // Frontmatter
    const downloadId = spec.cta?.type === 'download' ? spec.cta.id ?? '' : undefined;

    const outlineHeadings = spec.outline.map(
      (outlineItem: PostSpecV2["outline"][number]) => outlineItem.heading,
    );
    const affiliateAnchors = (spec.affiliateHints || []).map(
      (hint: PostSpecV2["affiliateHints"][number]) => ({
        key: hint.key,
        text: hint.anchor,
        insertedCount: 0,
      }),
    );
    const internalLinkHints = (spec.internalLinkHints || [])
      .map((hint: PostSpecV2["internalLinkHints"][number]) =>
        String(hint?.anchor || "").trim(),
      )
      .filter((anchor: string) => anchor.length > 0);
    // Check if draft mode is requested (via query param or body)
    const draftParam = requestUrl.searchParams.get('draft');
    const isDraftMode = draftParam === 'true' || (input as any)._draft === true;

    const fm = {
      title: spec.title,
      slug,
      excerpt: spec.excerpt,
      metaTitle: spec.title,
      metaDescription: spec.metaDescription,
      tags: spec.tags,
      outline: outlineHeadings,
      wordCount: contentWords,
      readingMinutes: readingMinutes(contentWords),
      entities: spec.entities || [],
      includeAds: !!(spec.adPlacements && spec.adPlacements.length),
      includeKofi: normalizeCta(spec.cta).type === 'kofi',
      downloadId,
      affiliateAnchors,
      internalLinkHints,
      internalLinks: [],
      publishedAt: new Date().toISOString(),
      canonicalUrl: `${String(settings.siteUrl||'').replace(/\/$/,'')}/post/${slug}`,
      specVersion: 2 as const,
      draft: isDraftMode,
    };

    const siteUrl = String(settings.siteUrl||'').replace(/\/$/,'');
    const PLACEHOLDER_INDEX_PATH = path.join(CWD, "content", "placeholder-index.json");

    const body = (spec.sections || [])
      .map((section: PostSpecV2["sections"][number]) =>
        `## ${section.heading}\n\n${String(section.markdown || '').trim()}\n`,
      )
      .join('\n');

    const file = `---\n${toFrontmatterYAML(fm)}\n---\n\n${body}\n`;

    const outPath = path.join(POSTS_DIR, `${slug}.md`);
    const combinedWarnings = [...new Set([...normalizationWarnings, ...enforcement.warnings, ...structureResult.warnings])];

    // In dry run mode, skip writing but return validation results
    if (isDryRun) {
      const now = new Date().toISOString();

      // Calculate potential post stubs without creating them
      const potentialPostStubs = (internalLinkHints || [])
        .filter((anchor: string) => {
          if (!anchor) return false;
          const candidateSlug = slugify(anchor);
          if (!candidateSlug) return false;
          return !fs.existsSync(path.join(POSTS_DIR, `${candidateSlug}.md`));
        })
        .map((anchor: string) => {
          const candidateSlug = slugify(anchor);
          const title = toTitleCase(anchor);
          const outline = buildPlaceholderOutline(title);
          const body = buildPlaceholderBody(title);
          const words = _wordCount(body);
          return {
            slug: candidateSlug,
            title,
            path: `src/content/posts/${candidateSlug}.md`,
            source: "internal-link",
            status: "stub",
            createdAt: now,
            preview: {
              outline,
              wordCount: words,
              readingMinutes: readingMinutes(words),
            },
          };
        });

      const potentialEntityStubs = (fm.entities || [])
        .filter((entity: { type: EntityType; slug: string }) => {
          if (!entity?.type || !entity?.slug) return false;
          const filePath = path.join(CWD, "content", "entities", entity.type, `${entity.slug}.json`);
          return !fs.existsSync(filePath);
        })
        .map((entity: { type: EntityType; slug: string }) => ({
          type: entity.type,
          slug: entity.slug,
          name: toTitleCase(entity.slug),
          path: `content/entities/${entity.type}/${entity.slug}.json`,
          source: "post-spec",
          status: "stub",
          createdAt: now,
        }));

      return json({
        ok: true,
        slug,
        spec,
        path: `src/content/posts/${slug}.md`,
        words: contentWords,
        warnings: combinedWarnings,
        normalizations: normalizationReport,
        postStubs: potentialPostStubs,
        entityStubs: potentialEntityStubs,
        saved: false,
      });
    }

    // Actually write files
    const createdEntityStubs = ensureEntityStubs(fm.entities);
    const createdPostStubs = ensurePostStubs(internalLinkHints, POSTS_DIR, siteUrl);
    const createdPostPaths = createdPostStubs.map((stub) => stub.path);
    const placeholderSummary = updatePlaceholderIndex(PLACEHOLDER_INDEX_PATH, {
      postStubs: createdPostStubs,
      entityStubs: createdEntityStubs,
    });
    fs.writeFileSync(outPath, file, 'utf8');
    const placeholderNotes: string[] = [];
    if (createdPostStubs.length) {
      placeholderNotes.push(`Created ${createdPostStubs.length} placeholder post stub(s).`);
    }
    if (createdEntityStubs.length) {
      placeholderNotes.push(`Created ${createdEntityStubs.length} placeholder entity stub(s).`);
    }

    return json({
      ok:true,
      slug,
      path:`src/content/posts/${slug}.md`,
      words: contentWords,
      warnings: [...combinedWarnings, ...placeholderNotes],
      normalizations: normalizationReport,
      createdPostStubs: createdPostPaths,
      createdPosts: createdPostPaths,
      createdEntityStubs: createdEntityStubs.map((stub) => stub.path),
      placeholderSummary,
      saved: true,
    });
  } catch (e: any) {
    return json({ ok:false, error: e?.message || String(e) }, 500);
  }
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
