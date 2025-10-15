/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { marked } from 'marked';
import type { DraftSpec, LoadedDraft, PromptBlueprint, Section } from '../types/draft';

const LOCAL_STORAGE_KEY = 'cauldron.promptEngine.drafts.v1';

const DEFAULT_BLUEPRINT: PromptBlueprint = {
  topic: '',
  audience: 'Cozy witches and slow-life seekers',
  tone: 'Warm, encouraging, and lightly mystical while staying practical',
  primaryGoal: 'Produce a WitchClick PostSpec v2 with clear sections and ready-to-publish metadata',
  affiliateFocus: 'Suggest affiliate ideas that feel sincere and useful',
  ritualFocus: 'Highlight mindful rituals or gentle routines to anchor the piece',
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

interface PromptEngineProps {
  drafts: LoadedDraft[];
}

marked.setOptions({ breaks: true, gfm: true });

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
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
      const id = item.id ?? slugify(heading);
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
      const id = rawId?.trim() || (heading ? slugify(heading) : '');
      return { heading, id };
    });
}

function sanitizeSpec(spec: DraftSpec, tagsInput: string, outlineInput: string): DraftSpec {
  const trimmedTitle = spec.title?.trim() ?? '';
  const slug = slugify(spec.slug ?? trimmedTitle);
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
  const title = blueprint.topic || spec.title || 'Untitled concept';

  lines.push('You are preparing a WitchClick PostSpec v2 draft.');
  lines.push(`Topic: ${title}`);
  lines.push(`Audience: ${blueprint.audience || 'WitchClick readers'}`);
  lines.push(`Tone: ${blueprint.tone || 'Warm and grounded with subtle magic'}`);
  lines.push(`Primary goal: ${blueprint.primaryGoal}`);
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
  lines.push('Return valid JSON that matches PostSpec v2.');

  return lines.join('\n');
}

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown ?? '');
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
      setStatusMessage('Copied JSON');
      resetStatus();
    } catch (error) {
      console.error('Copy failed', error);
      setStatusMessage('Copy failed');
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
    setStatusMessage(`Saved ${sanitizedSpec.slug}`);
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
    setStatusMessage('Draft downloaded');
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
    <main class="flex min-h-screen bg-surface-inverse/40 text-inverse-soft">
      <aside class="hidden w-72 min-h-full flex-col border-r border-line-night/70 bg-surface-inverse px-5 py-6 shadow-[inset_0_1px_0_rgba(148,163,184,0.03)] lg:flex">
        <header>
          <p class="text-[0.7rem] uppercase tracking-[0.35em] text-muted-subtle">Draft Library</p>
          <h2 class="mt-2 text-sm font-semibold text-inverse-soft">Work-in-progress files</h2>
        </header>
        <div class="mt-6 space-y-6 text-sm">
          <section>
            <header class="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.4em] text-muted-subtle">
              <span>Local drafts</span>
              <button
                type="button"
                class="rounded border border-line-inverse/80 px-2 py-1 text-[0.6rem] tracking-[0.3em] text-inverse-faint hover:text-inverse"
                onClick={() => setSelection({ source: 'new', slug: 'fresh-draft' })}
              >
                New
              </button>
            </header>
            <ul class="mt-3 space-y-1 border-l border-line-inverse-strong/80 pl-4 text-xs">
              {localDraftList.length === 0 ? (
                <li class="pl-3 text-[0.7rem] italic text-muted">No local drafts yet</li>
              ) : (
                localDraftList.map((draft) => (
                  <li class="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-surface-inverse-soft/70">
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
                      <span class="text-[0.6rem] uppercase tracking-[0.4em] text-muted-subtle">{draft.status}</span>
                    </button>
                    <button
                      type="button"
                      class="text-[0.65rem] text-muted-subtle hover:text-rose-soft"
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
            <header class="text-[0.65rem] uppercase tracking-[0.4em] text-muted-subtle">Seed drafts</header>
            <ul class="mt-3 space-y-1 border-l border-line-inverse-strong/80 pl-4 text-xs">
              {drafts.length === 0 ? (
                <li class="pl-3 text-[0.7rem] italic text-muted">No seed files yet</li>
              ) : (
                drafts.map((draft) => (
                  <li>
                    <button
                      type="button"
                      class={`flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors duration-150 ease-out hover:bg-surface-inverse-soft/70 ${
                        selection.source === 'seed' && selection.slug === draft.slug
                          ? 'font-semibold text-inverse'
                          : 'text-inverse-subtle'
                      }`}
                      onClick={() => setSelection({ source: 'seed', slug: draft.slug })}
                    >
                      <span class="truncate">{draft.title}</span>
                      {draft.status && (
                        <span class="text-[0.6rem] uppercase tracking-[0.4em] text-muted-subtle">{draft.status}</span>
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
        <header class="flex flex-wrap items-center gap-3 border-b border-line-night/60 bg-surface-inverse/70 px-6 py-4 shadow-[0_1px_0_rgba(15,23,42,0.6)]">
          <button
            type="button"
            class="rounded border border-line-inverse/60 bg-surface-inverse-soft/40 px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleSave}
          >
            Save Draft
          </button>
          <button
            type="button"
            class="rounded border border-line-inverse/60 bg-surface-inverse-soft/40 px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleCopyJson}
          >
            Copy JSON
          </button>
          <button
            type="button"
            class="rounded border border-line-inverse/60 bg-surface-inverse-soft/40 px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-inverse-muted hover:bg-surface-inverse-soft"
            onClick={handleDownload}
          >
            Download Draft
          </button>
          {statusMessage && <span class="text-xs uppercase tracking-[0.3em] text-info-soft">{statusMessage}</span>}
        </header>
        <div class="flex flex-1 flex-col bg-surface-inverse/20 lg:flex-row">
          <div class="flex-1 overflow-y-auto border-r border-line-night/60 bg-surface-inverse/30 px-6 py-6">
            <div class="space-y-10">
              <section class="space-y-4">
                <header>
                  <p class="text-[0.65rem] uppercase tracking-[0.35em] text-muted-subtle">Prompt Blueprint</p>
                  <h2 class="text-lg font-semibold text-inverse-soft">Shape the generation request</h2>
                  <p class="text-sm text-inverse-faint">
                    Capture the intent before you ask an AI for help. The prompt is tailored as you tweak metadata and outline
                    details.
                  </p>
                </header>
                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Topic or headline</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.topic}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, topic: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Audience</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.audience}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, audience: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Tone</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.tone}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, tone: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Primary goal</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.primaryGoal}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, primaryGoal: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Ritual focus</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.ritualFocus}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, ritualFocus: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Affiliate focus</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.affiliateFocus}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, affiliateFocus: event.currentTarget.value }))}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Extra notes</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={blueprint.extraNotes}
                      onInput={(event) => setBlueprint((prev) => ({ ...prev, extraNotes: event.currentTarget.value }))}
                    />
                  </label>
                </div>
                <label class="flex flex-col gap-2 text-sm">
                  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Generated prompt</span>
                  <textarea
                    readOnly
                    rows={8}
                    class="rounded border border-line-info-strong/40 bg-surface-inverse/80 px-3 py-3 text-xs leading-relaxed text-info-haze"
                    value={promptText}
                  />
                </label>
              </section>

              <section class="space-y-6">
                <header>
                  <p class="text-[0.65rem] uppercase tracking-[0.35em] text-muted-subtle">Draft metadata</p>
                  <h2 class="text-lg font-semibold text-inverse-soft">Shape the PostSpec details</h2>
                </header>
                <div class="grid gap-4 lg:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Title</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.title ?? ''}
                      onInput={(event) => handleTitleChange(event.currentTarget.value)}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Slug</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.slug ?? ''}
                      onInput={(event) => handleSlugChange(event.currentTarget.value)}
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Status</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.status ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, status: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Tags</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={tagsInput}
                      onInput={(event) => setTagsInput(event.currentTarget.value)}
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Excerpt</span>
                    <textarea
                      rows={3}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.excerpt ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, excerpt: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Meta description</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.metaDescription ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, metaDescription: event.currentTarget.value }))
                      }
                    />
                  </label>
                </div>

                <label class="flex flex-col gap-2 text-sm">
                  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Outline (one per line, optional `Heading|anchor`)</span>
                  <textarea
                    rows={4}
                    class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                    value={outlineInput}
                    onInput={(event) => setOutlineInput(event.currentTarget.value)}
                  />
                </label>

                <div class="space-y-4">
                  <header class="flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-semibold uppercase tracking-[0.3em] text-inverse-faint">Sections</h3>
                      <p class="text-xs text-muted-subtle">Markdown will appear in the live preview.</p>
                    </div>
                    <button
                      type="button"
                      class="rounded border border-line-inverse/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-inverse-subtle hover:bg-surface-inverse-soft"
                      onClick={addSection}
                    >
                      Add section
                    </button>
                  </header>
                  <div class="space-y-4">
                    {(currentSpec.sections ?? []).map((section, index) => (
                      <div class="rounded-lg border border-line-inverse bg-surface-inverse/70 p-4">
                        <div class="flex items-start gap-3">
                          <span class="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted-subtle">{index + 1}</span>
                          <div class="flex-1 space-y-3 text-sm">
                            <label class="flex flex-col gap-1">
                              <span class="text-[0.6rem] uppercase tracking-[0.35em] text-muted-subtle">Heading</span>
                              <input
                                type="text"
                                class="rounded border border-line-inverse bg-surface-inverse-soft/60 px-3 py-2 text-inverse-soft"
                                value={section.heading ?? ''}
                                onInput={(event) => updateSection(index, 'heading', event.currentTarget.value)}
                              />
                            </label>
                            <label class="flex flex-col gap-1">
                              <span class="text-[0.6rem] uppercase tracking-[0.35em] text-muted-subtle">Markdown</span>
                              <textarea
                                rows={4}
                                class="rounded border border-line-inverse bg-surface-inverse-soft/60 px-3 py-2 text-inverse-soft"
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
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Hero image prompt</span>
                    <textarea
                      rows={2}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.heroImagePrompt ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, heroImagePrompt: event.currentTarget.value }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">Ad placements</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={(currentSpec.adPlacements ?? []).join(', ')}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, adPlacements: parseTags(event.currentTarget.value) }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">CTA type</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.type ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, type: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">CTA headline</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.headline ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, headline: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="lg:col-span-2 flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">CTA body</span>
                    <textarea
                      rows={3}
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
                      value={currentSpec.cta?.body ?? ''}
                      onInput={(event) =>
                        setCurrentSpec((prev) => ({ ...prev, cta: { ...prev.cta, body: event.currentTarget.value } }))
                      }
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm">
                    <span class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-subtle">CTA button</span>
                    <input
                      type="text"
                      class="rounded border border-line-inverse bg-surface-inverse/80 px-3 py-2 text-inverse-soft"
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
          <aside class="w-full min-w-[320px] border-t border-line-night/60 bg-surface-inverse/35 px-6 py-6 text-inverse-muted lg:w-[360px] lg:border-t-0 lg:border-l">
            <header class="space-y-1">
              <p class="text-[0.7rem] uppercase tracking-[0.35em] text-muted-subtle">Preview</p>
              <h2 class="text-lg font-semibold text-inverse-soft">Live PostSpec rendering</h2>
              <p class="text-sm text-inverse-faint">Update fields on the left to see this preview refresh instantly.</p>
            </header>
            <article class="mt-6 space-y-5 rounded-xl border border-line-inverse-strong/60 bg-surface-inverse/40 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.45)]">
              <div class="space-y-2">
                <h1 class="text-2xl font-semibold text-inverse-soft">{sanitizedSpec.title || 'Untitled draft'}</h1>
                <p class="text-sm text-inverse-faint">{sanitizedSpec.excerpt || 'Add an excerpt to set the hook.'}</p>
                <p class="text-xs uppercase tracking-[0.35em] text-muted-subtle">Slug: {sanitizedSpec.slug || 'pending'}</p>
              </div>
              <div class="space-y-4 text-sm leading-relaxed">
                {(sanitizedSpec.sections ?? []).map((section) => (
                  <section class="rounded-lg border border-line-inverse-strong/60 bg-surface-inverse/50 px-4 py-3">
                    <h3 class="text-base font-semibold text-inverse-soft">{section.heading || 'Untitled section'}</h3>
                    <div
                      class="prose prose-invert prose-sm mt-2 max-w-none text-inverse-subtle"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.markdown ?? '') }}
                    />
                  </section>
                ))}
              </div>
              <section class="space-y-2 text-xs text-inverse-faint">
                <p><span class="font-semibold text-inverse-subtle">Tags:</span> {sanitizedSpec.tags?.join(', ') || '—'}</p>
                <p><span class="font-semibold text-inverse-subtle">Ad placements:</span> {sanitizedSpec.adPlacements?.join(', ') || '—'}</p>
                <p><span class="font-semibold text-inverse-subtle">CTA:</span> {sanitizedSpec.cta?.type || '—'}</p>
              </section>
              <details class="rounded border border-line-inverse-strong/60 bg-surface-inverse/40 px-4 py-3 text-xs text-inverse-faint">
                <summary class="cursor-pointer text-inverse-muted">Raw JSON</summary>
                <pre class="mt-3 max-h-72 overflow-auto text-[11px] leading-relaxed text-inverse-subtle">{JSON.stringify(sanitizedSpec, null, 2)}</pre>
              </details>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}
