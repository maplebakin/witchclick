import type { DraftSpec, LoadedDraft } from '../types/draft';

function coerceSpec(raw: unknown): DraftSpec {
  if (!raw || typeof raw !== 'object') return {};
  const spec = raw as Record<string, unknown>;
  const normalized: DraftSpec = {
    ...spec,
    version: typeof spec.version === 'number' ? spec.version : undefined,
    specVersion: typeof spec.specVersion === 'number' ? spec.specVersion : undefined,
    title: typeof spec.title === 'string' ? spec.title : undefined,
    slug: typeof spec.slug === 'string' ? spec.slug : undefined,
    status: typeof spec.status === 'string' ? spec.status : undefined,
    excerpt: typeof spec.excerpt === 'string' ? spec.excerpt : undefined,
    metaDescription: typeof spec.metaDescription === 'string' ? spec.metaDescription : undefined,
    tags: Array.isArray(spec.tags) ? (spec.tags as unknown[]).filter((item): item is string => typeof item === 'string') : undefined,
    outline: Array.isArray(spec.outline) ? (spec.outline as DraftSpec['outline']) : undefined,
    sections: Array.isArray(spec.sections) ? (spec.sections as DraftSpec['sections']) : undefined,
    entities: Array.isArray(spec.entities) ? (spec.entities as DraftSpec['entities']) : undefined,
    internalLinkHints: Array.isArray(spec.internalLinkHints)
      ? (spec.internalLinkHints as DraftSpec['internalLinkHints'])
      : undefined,
    affiliateHints: Array.isArray(spec.affiliateHints)
      ? (spec.affiliateHints as DraftSpec['affiliateHints'])
      : undefined,
    heroImagePrompt: typeof spec.heroImagePrompt === 'string' ? spec.heroImagePrompt : undefined,
    altTexts: Array.isArray(spec.altTexts) ? (spec.altTexts as unknown[]).filter((item): item is string => typeof item === 'string') : undefined,
    heroImageUrl: typeof spec.heroImageUrl === 'string' ? spec.heroImageUrl : undefined,
    adPlacements: Array.isArray(spec.adPlacements)
      ? (spec.adPlacements as unknown[]).filter((item): item is string => typeof item === 'string')
      : undefined,
    includeAds: typeof spec.includeAds === 'boolean' ? spec.includeAds : undefined,
    includeKofi: typeof spec.includeKofi === 'boolean' ? spec.includeKofi : undefined,
    cta: spec.cta && typeof spec.cta === 'object' ? (spec.cta as DraftSpec['cta']) : undefined,
    draftNotes: typeof spec.draftNotes === 'string' ? spec.draftNotes : undefined,
  };

  if (!normalized.version && normalized.specVersion) {
    normalized.version = normalized.specVersion;
  }

  if (!normalized.specVersion && normalized.version) {
    normalized.specVersion = normalized.version;
  }

  return normalized;
}

export async function loadDraftLibrary(): Promise<LoadedDraft[]> {
  const modules = import.meta.glob('./drafts/*.json', { eager: true });
  const entries: LoadedDraft[] = [];

  for (const [path, module] of Object.entries(modules)) {
    const slug = path.replace(/^\.\/drafts\//, '').replace(/\.json$/, '');
    const payload = (module as { default?: unknown }).default ?? module;
    const spec = coerceSpec(payload);
    entries.push({
      slug,
      title: spec.title ?? slug,
      status: spec.status,
      source: 'seed',
      spec,
    });
  }

  entries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return entries;
}
