/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DraftSpec, LoadedDraft, PromptBlueprint, Section } from '../types/draft';
import { slugify as sharedSlugify } from '../../../shared/slugify.js';
import { renderSafeMarkdown } from '../lib/safeMarkdown';

const LOCAL_STORAGE_KEY = 'cauldron.promptEngine.drafts.v1';

const DEFAULT_BLUEPRINT: PromptBlueprint = {
  topic: '',
  audience: 'Secular witches and seekers of gentle magic',
  tone: 'Empathetic, authentic, and subtly magical',
  primaryGoal: 'Craft a WitchClick essay or ritual, deeply engaging and aligned with PostSpec v2 standards for publication',
  affiliateFocus: 'Integrate resource recommendations that genuinely benefit the reader',
  ritualFocus: 'Weave in mindful rituals or gentle routines to ground the content',
  extraNotes: '',
};

const EMPTY_SECTIONS: Section[] = [
  { heading: 'Opening', markdown: '' },
  { heading: 'Main Ritual', markdown: '' },
  { heading: 'Aftercare', markdown: '' },
];

const EMPTY_SPEC: DraftSpec = {
  specVersion: 2,
  version: 2,
  title: '',
  slug: '',
  status: 'idea',
  excerpt: '',
  metaDescription: '',
  tags: [],
  outline: [],
  sections: EMPTY_SECTIONS,
  heroImagePrompt: '',
  cta: { type: 'kofi', headline: '', body: '', buttonLabel: '' },
  adPlacements: [],
};

const WITCHCLICK_IDENTITY = [
  'WitchClick is a secular mystical publishing hub and living grimoire for symbolic self-work.',
  'Voice: cozy, strange, grounded, emotionally precise, practical, and welcoming to skeptics.',
  'Frame ritual, tarot, and symbolic language as reflective tools for attention, meaning, boundaries, and self-understanding, not supernatural guarantees.',
];

const POSTSPEC_V2_SKELETON = `{
  "specVersion": 2,
  "title": "",
  "slug": "",
  "category": "ritual",
  "contentType": "ritual",
  "cluster": "rituals-practices",
  "metaDescription": "",
  "tags": [],
  "excerpt": "",
  "outline": [{ "heading": "", "id": "" }],
  "sections": [{ "heading": "", "markdown": "" }],
  "entities": [],
  "heroImagePrompt": "",
  "altTexts": [],
  "internalLinkHints": [],
  "affiliateHints": [],
  "cta": { "type": "none" },
  "adPlacements": []
}`;

interface PromptEngineProps {
  drafts: LoadedDraft[];
}

function cloneSpec(spec?: DraftSpec): DraftSpec {
  if (!spec) return JSON.parse(JSON.stringify(EMPTY_SPEC));
  return JSON.parse(JSON.stringify({ ...EMPTY_SPEC, ...spec }));
}

function tagsToString(tags?: string[]): string {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatOutline(outline: DraftSpec['outline']): string {
  if (!outline || outline.length === 0) return '';
  return outline
    .map((item) => {
      const heading = item.heading ?? '';
      const id = item.id ?? sharedSlugify(heading);
      return id ? `${heading}|${id}` : heading;
    })
    .join('\n');
}

function parseOutline(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawHeading, rawId] = line.split('|');
      const heading = rawHeading?.trim() ?? '';
      const id = rawId?.trim() || (heading ? sharedSlugify(heading) : '');
      return { heading, id };
    });
}

function sanitizeSpec(spec: DraftSpec, tagsInput: string, outlineInput: string): DraftSpec {
  const trimmedTitle = spec.title?.trim() ?? '';
  const slug = sharedSlugify(spec.slug ?? trimmedTitle);
  const tags = parseTags(tagsInput);
  const outline = parseOutline(outlineInput);
  const sections: Section[] = (spec.sections ?? []).map((section) => ({
    heading: section.heading?.trim() ?? '',
    markdown: section.markdown?.trim() ?? '',
  }));

  const cleanedSections = sections.filter((section) => section.heading || section.markdown);

  return {
    ...spec,
    specVersion: spec.specVersion ?? spec.version ?? 2,
    version: spec.version ?? spec.specVersion ?? 2,
    title: trimmedTitle,
    slug,
    status: spec.status?.trim() || 'idea',
    excerpt: spec.excerpt?.trim() ?? '',
    metaDescription: spec.metaDescription?.trim() ?? '',
    tags,
    outline,
    sections: cleanedSections.length > 0 ? cleanedSections : EMPTY_SECTIONS,
    heroImagePrompt: spec.heroImagePrompt?.trim() ?? '',
    adPlacements: (spec.adPlacements ?? []).map((placement) => placement.trim()).filter(Boolean),
    cta: {
      type: spec.cta?.type?.trim() || 'kofi',
      headline: spec.cta?.headline?.trim() ?? '',
      body: spec.cta?.body?.trim() ?? '',
      buttonLabel: spec.cta?.buttonLabel?.trim() ?? '',
    },
  };
}

function buildPrompt(blueprint: PromptBlueprint, spec: DraftSpec, outlineInput: string): string {
  const lines: string[] = [];
  const title = blueprint.topic || spec.title || 'Un-named Incantation';

  lines.push('You are preparing a WitchClick PostSpec v2 draft.');
  lines.push(...WITCHCLICK_IDENTITY);
  lines.push(`Topic: ${title}`);
  lines.push(`Audience: ${blueprint.audience || 'Seekers of gentle magic'}`);
  lines.push(`Tone: ${blueprint.tone || 'Mystical, empathetic, and practical'}`);
  lines.push(`Primary goal: ${blueprint.primaryGoal}`);
  lines.push('Editorial intent: make the piece useful for a real reader state, not just schema-valid. Explain what the reader can do, understand, reflect on, or feel by the end.');
  lines.push('Avoid generic wellness-blog language, vague mystical fluff, overpromising, clinical therapy voice, SEO sludge, placeholder/TODO text, and markdown fences.');
  if (blueprint.ritualFocus) lines.push(`Ritual focus: ${blueprint.ritualFocus}`);
  if (blueprint.affiliateFocus) lines.push(`Affiliate focus: ${blueprint.affiliateFocus}`);
  if (spec.tags && spec.tags.length > 0) lines.push(`Tags: ${spec.tags.join(', ')}`);
  if (outlineInput.trim()) {
    lines.push('Outline anchors to honor:');
    outlineInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => lines.push(`  ${index + 1}. ${line}`));
  }
  if (blueprint.extraNotes) lines.push(`Extra notes: ${blueprint.extraNotes}`);
  lines.push('Return valid JSON only using this PostSpec v2 shape:');
  lines.push(POSTSPEC_V2_SKELETON);
  lines.push('Return the completed JSON object only. Do not wrap it in Markdown fences.');

  return lines.join('\n');
}

function renderMarkdown(markdown: string): string {
  return renderSafeMarkdown(markdown);
}

interface DraftSelection {
  source: 'seed' | 'local' | 'new';
  slug: string;
}

export default function PromptEngineIsland({ drafts }: PromptEngineProps) {
  const [selection, setSelection] = useState<DraftSelection>(() =>
    drafts.length > 0 ? { source: 'seed', slug: drafts[0].slug } : { source: 'new', slug: 'fresh-draft' }
  );
  const [currentSpec, setCurrentSpec] = useState<DraftSpec>(() => cloneSpec(drafts[0]?.spec));
  const [tagsInput, setTagsInput] = useState(() => tagsToString(currentSpec.tags));
  const [outlineInput, setOutlineInput] = useState(() => formatOutline(currentSpec.outline));
  const [blueprint, setBlueprint] = useState<PromptBlueprint>(DEFAULT_BLUEPRINT);
  const [localDrafts, setLocalDrafts] = useState<Record<string, DraftSpec>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, DraftSpec>;
      setLocalDrafts(parsed);
    } catch (error) {
      console.warn('Failed to load local drafts', error);
    }
  }, []);

  useEffect(() => {
    if (selection.source === 'seed') {
      const seed = drafts.find((draft) => draft.slug === selection.slug);
      if (seed) {
        const cloned = cloneSpec(seed.spec);
        setCurrentSpec(cloned);
        setTagsInput(tagsToString(cloned.tags));
        setOutlineInput(formatOutline(cloned.outline));
        setSlugTouched(false);
      }
    } else if (selection.source === 'local') {
      const localSpec = localDrafts[selection.slug];
      if (localSpec) {
        const cloned = cloneSpec(localSpec);
        setCurrentSpec(cloned);
        setTagsInput(tagsToString(cloned.tags));
        setOutlineInput(formatOutline(cloned.outline));
        setSlugTouched(true);
      }
    } else {
      const fresh = cloneSpec();
      setCurrentSpec(fresh);
      setTagsInput(tagsToString(fresh.tags));
      setOutlineInput(formatOutline(fresh.outline));
      setSlugTouched(false);
    }
  }, [selection, drafts, localDrafts]);

  const sanitizedSpec = useMemo(() => sanitizeSpec(currentSpec, tagsInput, outlineInput), [currentSpec, tagsInput, outlineInput]);
  const promptText = useMemo(() => buildPrompt(blueprint, sanitizedSpec, outlineInput), [blueprint, sanitizedSpec, outlineInput]);

  const localDraftList = useMemo(
    () =>
      Object.entries(localDrafts)
        .map(([slug, spec]) => ({ slug, title: spec.title ?? slug, status: spec.status ?? 'draft' }))
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [localDrafts]
  );

  function resetStatus() {
    setTimeout(() => setStatusMessage(''), 2200);
  }

  function handleTitleChange(value: string) {
    setCurrentSpec((previous) => {
      const next = { ...previous, title: value };
      if (!slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setCurrentSpec((previous) => ({ ...previous, slug: slugify(value) }));
  }

  function updateSection(index: number, key: keyof Section, value: string) {
    setCurrentSpec((previous) => {
      const sections = [...(previous.sections ?? [])];
      sections[index] = { ...sections[index], [key]: value };
      return { ...previous, sections };
    });
  }

  function addSection() {
    setCurrentSpec((previous) => ({
      ...previous,
      sections: [...(previous.sections ?? []), { heading: 'New section', markdown: '' }],
    }));
  }

  function removeSection(index: number) {
    setCurrentSpec((previous) => {
      const sections = [...(previous.sections ?? [])];
      sections.splice(index, 1);
      return { ...previous, sections };
    });
  }

  async function handleCopyJson() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(sanitizedSpec, null, 2));
      setStatusMessage('Incantation copied to clipboard!');
      resetStatus();
    } catch (error) {
      console.error('Copy failed', error);
      'Incantation fizzled... copy failed.'
      resetStatus();
    }
  }

  function persistLocal(spec: DraftSpec) {
    if (typeof window === 'undefined') return;
    setLocalDrafts((previous) => {
      const next = { ...previous, [spec.slug ?? 'untitled-draft']: spec };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleSave() {
    if (!sanitizedSpec.slug) {
      setStatusMessage('Add a slug before saving');
      resetStatus();
      return;
    }
    persistLocal(sanitizedSpec);
    setSelection({ source: 'local', slug: sanitizedSpec.slug });
    setStatusMessage(`Spellbound: ${sanitizedSpec.slug} secured!`);
    resetStatus();
  }

  function handleDownload() {
    const slug = sanitizedSpec.slug || 'witchclick-draft';
    const blob = new Blob([JSON.stringify(sanitizedSpec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage('Scroll manifested!');
    resetStatus();
  }

  function deleteLocal(slug: string) {
    if (typeof window === 'undefined') return;
    setLocalDrafts((previous) => {
      const { [slug]: _removed, ...rest } = previous;
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rest));
      return rest;
    });
    if (selection.source === 'local' && selection.slug === slug) {
      setSelection({ source: 'new', slug: 'fresh-draft' });
    }
  }

  return (
    <main class="flex min-h-screen bg-surface-inverse text-inverse-soft">
      <aside class="hidden w-72 min-h-full flex-col border-r border-line-inverse bg-surface-inverse px-5 py-6 shadow-[inset_0_1px_0_rgba(148,163,184,0.03)] lg:flex">
        <header>
          <p class="text-[0.7rem] uppercase tracking-[0.35em] text-inverse-muted">Draft Library</p>
          <h2 class="mt-2 text-sm font-semibold text-inverse-soft">Work-in-progress files</h2>
        </header>
        <div class="mt-6 space-y-6 text-sm">
          <section>
            <header class="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.4em] text-inverse-muted">
              <span>Local drafts</span>
              <button
                type="button"
                class="rounded border border-line-inverse px-2 py-1 text-[0.6rem] tracking-[0.3em] text-inverse-subtle hover:text-inverse"
                onClick={() => setSelection({ source: 'new', slug: 'fresh-draft' })}
              >
                New
              </button>
            </header>
            <ul class="mt-3 space-y-1 border-l border-line-inverse-muted pl-4 text-xs">
              {localDraftList.length === 0 ? (
                <li class="pl-3 text-[0.7rem] italic text-muted">No local drafts yet</li>
              ) : (
                localDraftList.map((draft) => (
                  <li class="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-surface-inverse-soft">
                    <button
                      type="button"
                      class={`flex-1 text-left ${
                        selection.source === 'local' && selection.slug === draft.slug
                          ? 'font-semibold text-inverse'
                          : 'text-inverse-subtle'
                      }`}
                      onClick={() => setSelection({ source: 'local', slug: draft.slug })}
                    >
                      <span class="block truncate">{draft.title}</span>
                      <span class="text-[0.6rem] uppercase tracking-[0.4em] text-inverse-muted">{draft.status}</span>
                    </button>
                    <button
                      type="button"
                      class="text-[0.65rem] text-inverse-muted hover:text-rose-soft"
                      onClick={() => deleteLocal(draft.slug)}
                    >
                      ✕
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section>
            <header class="text-[0.65rem] uppercase tracking-[0.4em] text-inverse-muted">Seed drafts</header>
            <ul class="mt-3 space-y-1 border-l border-line-inverse-muted pl-4 text-xs">
              {drafts.length === 0 ? (
                <li class="pl-3 text-[0.7rem] italic text-muted">No seed files yet</li>
              ) : (
                drafts.map((draft) => (
                  <li>
                    <button
                      type="button"
                      class={`flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors duration-150 ease-out hover:bg-surface-inverse-soft ${
                        selection.source === 'seed' && selection.slug === draft.slug
                          ? 'font-semibold text-inverse'
                          : 'text-inverse-subtle'
                      }`}
                      onClick={() => setSelection({ source: 'seed', slug: draft.slug })}
                    >
                      <span class="truncate">{draft.title}</span>
                      {draft.status && (
                        <span class="text-[0.6rem] uppercase tracking-[0.4em] text-inverse-muted">{draft.status}</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </aside>
      <section class="flex min-h-full flex-1 flex-col">
        <header class="flex flex-wrap items-center gap-3 border-b border-line-inverse bg-surface-inverse px-6 py-4 shadow-[0_1px_0_rgba(15,23,42,0.6)]">
          <button
            type="button"
            class="rounded border border-line-inverse bg-surface-inverse-soft px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleSave}
          >
            Save Draft
          </button>
          <button
            type="button"
            class="rounded border border-line-inverse bg-surface-inverse-soft px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleCopyJson}
          >
            Copy JSON
          </button>
          <button
            type="button"
            class="rounded border border-line-inverse bg-surface-inverse-soft px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleDownload}
          >
            Download Draft
          </button>
          {statusMessage && <span class="text-xs uppercase tracking-[0.3em] text-info-soft">{statusMessage}</span>}
        </header>
        <div class="flex flex-1 flex-col bg-surface-inverse lg:flex-row">
          <div class="flex-1 overflow-y-auto border-r border-line-inverse bg-surface-inverse px-6 py-6">
            <div class="space-y-10">
              <section class="space-y-4">
                <header>
                  <p class="text-[0.65rem] uppercase tracking-[0.35em] text-inverse-muted">Prompt Blueprint</p>
                  <h2 class="text-lg font-semibold text-inverse-soft">Shape the generation request</h2>
                  <p class="text-sm text-inverse-subtle">
                    Capture the intent before you ask an AI for help. The prompt is tailored as you tweak metadata and outline
                    details.
                  </p>
                </header>
                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Topic or headline</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.topic}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, topic: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Audience</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.audience}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, audience: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Tone</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.tone}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, tone: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Primary goal</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.primaryGoal}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, primaryGoal: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Ritual focus</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.ritualFocus}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, ritualFocus: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Affiliate focus</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.affiliateFocus}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, affiliateFocus: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Extra notes</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={blueprint.extraNotes}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, extraNotes: event.currentTarget.value }))}
                    />
                  </label>
                </div>
                <label class="flex flex-col gap-2 text-sm">
                  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Generated prompt</span>
                  <textarea
                    readOnly
                    rows={8}
                    class="rounded border border-info-strong bg-surface-inverse px-3 py-3 text-xs leading-relaxed text-info-haze"
                    value={promptText}
                  />
                </label>
              </section>

              <section class="space-y-6">
                <header>
                  <p class="text-[0.65rem] uppercase tracking-[0.35em] text-inverse-muted">Draft metadata</p>
                  <h2 class="text-lg font-semibold text-inverse-soft">Shape the PostSpec details</h2>
                </header>
                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Title</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.title ?? ''}
                      onInput={(event) => handleTitleChange(event.currentTarget.value)}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Slug</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.slug ?? ''}
                      onInput={(event) => handleSlugChange(event.currentTarget.value)}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Status</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.status ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, status: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Tags</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={tagsInput}
                      onInput={(event) => setTagsInput(event.currentTarget.value)}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Excerpt</span>
                    <textarea
                      rows={3}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.excerpt ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, excerpt: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Meta description</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.metaDescription ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, metaDescription: event.currentTarget.value }))
                      }
                    />
                  </label>
                </div>

                <label class="flex flex-col gap-2 text-sm">
                  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Outline (one per line, optional `Heading|anchor`)</span>
                  <textarea
                    rows={4}
                    class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                    value={outlineInput}
                    onInput={(event) => setOutlineInput(event.currentTarget.value)}
                  />
                </label>

                <div class="space-y-4">
                  <header class="flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-semibold uppercase tracking-[0.3em] text-inverse-subtle">Sections</h3>
                      <p class="text-xs text-inverse-muted">Markdown will appear in the live preview.</p>
                    </div>
                    <button
                      type="button"
                      class="rounded border border-line-inverse px-3 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-inverse-subtle hover:bg-surface-inverse-soft"
                      onClick={addSection}
                    >
                      Add section
                    </button>
                  </header>
                  <div class="space-y-4">
                    {(currentSpec.sections ?? []).map((section, index) => (
                      <div class="rounded-lg border border-line-inverse bg-surface-inverse p-4">
                        <div class="flex items-start gap-3">
                          <span class="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-inverse-muted">{index + 1}</span>
                          <div class="flex-1 space-y-3 text-sm">
                            <label class="flex flex-col gap-1">
                              <span class="text-[0.6rem] uppercase tracking-[0.35em] text-inverse-muted">Heading</span>
                              <input
                                type="text"
                                class="rounded border border-line-inverse bg-surface-inverse-soft px-3 py-2 text-inverse-soft"
                                value={section.heading ?? ''}
                                onInput={(event) => updateSection(index, 'heading', event.currentTarget.value)}
                              />
                            </label>
                            <label class="flex flex-col gap-1">
                              <span class="text-[0.6rem] uppercase tracking-[0.35em] text-inverse-muted">Markdown</span>
                              <textarea
                                rows={4}
                                class="rounded border border-line-inverse bg-surface-inverse-soft px-3 py-2 text-inverse-soft"
                                value={section.markdown ?? ''}
                                onInput={(event) => updateSection(index, 'markdown', event.currentTarget.value)}
                              />
                            </label>
                            <button
                              type="button"
                              class="text-[0.65rem] uppercase tracking-[0.35em] text-rose-soft"
                              onClick={() => removeSection(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Hero image prompt</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.heroImagePrompt ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, heroImagePrompt: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">Ad placements</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={(currentSpec.adPlacements ?? []).join(', ')}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, adPlacements: parseTags(event.currentTarget.value) }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">CTA type</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.type ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, type: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">CTA headline</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.headline ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, headline: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">CTA body</span>
                    <textarea
                      rows={3}
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.body ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, body: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-inverse-muted">CTA button</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.buttonLabel ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, buttonLabel: event.currentTarget.value } }))
                      }
                    />
                  </label>
                </div>
              </section>
            </div>
          </div>
          <aside class="w-full min-w-[320px] border-t border-line-inverse bg-surface-inverse px-6 py-6 text-inverse-muted lg:w-96 lg:border-t-0 lg:border-l">
            <header class="space-y-1">
              <p class="text-[0.7rem] uppercase tracking-[0.35em] text-inverse-muted">Preview</p>
              <h2 class="text-lg font-semibold text-inverse-soft">Live PostSpec rendering</h2>
              <p class="text-sm text-inverse-subtle">Update fields on the left to see this preview refresh instantly.</p>
            </header>
            <article class="mt-6 space-y-5 rounded-xl border border-line-inverse-muted bg-surface-inverse px-5 py-5 shadow-[var(--wc-shadow-soft)]">
              <div class="space-y-2">
                <h1 class="text-2xl font-semibold text-inverse-soft">{sanitizedSpec.title || 'Un-named Incantation'}</h1>
                <p class="text-sm text-inverse-subtle">{sanitizedSpec.excerpt || 'Add an excerpt to set the hook.'}</p>
                <p class="text-xs uppercase tracking-[0.35em] text-inverse-muted">Slug: {sanitizedSpec.slug || 'pending'}</p>
              </div>
              <div class="space-y-4 text-sm leading-relaxed">
                {(sanitizedSpec.sections ?? []).map((section) => (
                  <section class="rounded-lg border border-line-inverse-muted bg-surface-inverse px-4 py-3">
                    <h3 class="text-base font-semibold text-inverse-soft">{section.heading || 'Un-named Verse'}</h3>
                    <div
                      class="prose prose-invert prose-sm mt-2 max-w-none text-inverse-subtle"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.markdown ?? '') }}
                    />
                  </section>
                ))}
              </div>
              <section class="space-y-2 text-xs text-inverse-subtle">
                <p><span class="font-semibold text-inverse-subtle">Tags:</span> {sanitizedSpec.tags?.join(', ') || '—'}</p>
                <p><span class="font-semibold text-inverse-subtle">Ad placements:</span> {sanitizedSpec.adPlacements?.join(', ') || '—'}</p>
                <p><span class="font-semibold text-inverse-subtle">CTA:</span> {sanitizedSpec.cta?.type || '—'}</p>
              </section>
              <details class="rounded border border-line-inverse-muted bg-surface-inverse px-4 py-3 text-xs text-inverse-subtle">
                <summary class="cursor-pointer text-inverse-muted">Raw JSON</summary>
                <pre class="mt-3 max-h-[50vh] overflow-auto text-[11px] leading-relaxed text-inverse-subtle">{JSON.stringify(sanitizedSpec, null, 2)}</pre>
              </details>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}
