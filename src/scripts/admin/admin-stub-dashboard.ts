type StubReference = {
  title?: string;
  slug?: string;
  sourcePath?: string;
  excerpt?: string;
  reason?: string;
  matchedPhrase?: string;
  suggestedAngle?: string;
  adminHref?: string;
  publicHref?: string;
};

type StubEntry = {
  key: string;
  type: 'post';
  slug: string;
  name: string;
  title: string;
  filePath: string;
  references: StubReference[];
  status?: string;
  draft?: boolean;
  category?: string;
  postType?: string;
  contentType?: string;
  pillar?: string;
  stubTriageStatus?: string;
  stubSuggestedAction?: string;
  stubTriageNotes?: string;
  tags?: string[];
  entities?: unknown[];
  excerpt?: string;
  metaDescription?: string;
  existingFrontmatter?: string;
  stubReason?: string;
  stubRationale?: string;
  stubParentSlug?: string;
  stubParentTitle?: string;
  generatedFrom?: unknown;
  sourceContext?: StubReference[];
  relatedThemes?: string[];
  relatedEntities?: unknown[];
  matchedTerms?: string[];
};

type ParsedDraft = {
  markdown: string;
  frontmatter: Record<string, unknown>;
  body: string;
  slug: string;
  title: string;
  draft: boolean | null;
  postType: string;
  category: string;
};

type ValidationState = {
  passed: boolean;
  input: string;
  fingerprint: string;
  successes: string[];
  warnings: string[];
  errors: string[];
};

class StubDashboard {
  private root: HTMLElement;
  private devApi: string;
  private devKey: string;
  private baseHeaders: Record<string, string>;
  private jsonHeaders: Record<string, string>;
  private postStubs: StubEntry[] = [];
  private filtered: StubEntry[] = [];
  private selectedKey: string | null = null;
  private triageFilter = 'all';
  private parsedDraft: ParsedDraft | null = null;
  private validation: ValidationState = { passed: false, input: '', fingerprint: '', successes: [], warnings: [], errors: [] };
  private activeTab: 'edit' | 'preview' | 'validation' = 'edit';

  private listEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private triageFilterSelect: HTMLSelectElement | null = null;
  private triageCountsEl: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private referenceListEl: HTMLElement | null = null;
  private referenceBadgeEl: HTMLElement | null = null;
  private promptTextArea: HTMLTextAreaElement | null = null;
  private copyPromptBtn: HTMLButtonElement | null = null;
  private draftInput: HTMLTextAreaElement | null = null;
  private draftHelperEl: HTMLElement | null = null;
  private validateBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private detailPanel: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private selectedNameEl: HTMLElement | null = null;
  private selectedTypeEl: HTMLElement | null = null;
  private filePathEl: HTMLElement | null = null;
  private overviewTitleEl: HTMLElement | null = null;
  private overviewSlugEl: HTMLElement | null = null;
  private overviewPostTypeEl: HTMLElement | null = null;
  private overviewCategoryEl: HTMLElement | null = null;
  private overviewStatusEl: HTMLElement | null = null;
  private overviewDraftEl: HTMLElement | null = null;
  private overviewTagsEl: HTMLElement | null = null;
  private overviewTriageStatusEl: HTMLElement | null = null;
  private overviewPathEl: HTMLElement | null = null;
  private overviewFrontmatterEl: HTMLElement | null = null;
  private draftPreviewEl: HTMLElement | null = null;
  private validationResultsEl: HTMLElement | null = null;
  private ingestHelperEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private confirmModal: HTMLElement | null = null;
  private confirmTitleEl: HTMLElement | null = null;
  private confirmSlugEl: HTMLElement | null = null;
  private confirmPathEl: HTMLElement | null = null;
  private confirmCancelBtn: HTMLButtonElement | null = null;
  private confirmReplaceBtn: HTMLButtonElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.devApi = root.getAttribute('data-dev-api') || 'http://localhost:8787';
    this.devKey = root.getAttribute('data-dev-key') || '';
    this.baseHeaders = this.devKey ? { 'X-WC-Dev-Key': this.devKey } : {};
    this.jsonHeaders = { 'Content-Type': 'application/json', ...this.baseHeaders };
    this.bootstrapData();
    this.cacheElements();
    this.attachEvents();
    this.applySearchFilter();
    this.updateCounts();
    this.renderValidationResults();
    this.updateActionState();
    this.fetchStubs(false);
  }

  private apiFetch(path: string, options: RequestInit = {}) {
    const headers = { ...this.baseHeaders, ...(options.headers || {}) };
    return fetch(`${this.devApi}${path}`, { ...options, headers });
  }

  private async readApiResponse(response: Response, fallback: string): Promise<{ data: any; errors: string[]; warnings: string[] }> {
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const errors = response.ok && data?.ok !== false
      ? []
      : collectMessages(data?.errors, formatApiError(response.status, data?.error || fallback));
    const warnings = collectMessages(data?.warnings || data?.normalizationReport || data?.normalizations);
    return { data, errors, warnings };
  }

  private bootstrapData() {
    try {
      const rawPosts = this.root.getAttribute('data-post-stubs') || '[]';
      const parsedPosts = JSON.parse(rawPosts);
      const postEntries = Array.isArray(parsedPosts) ? parsedPosts : [];
      this.postStubs = postEntries.map((item) => this.mapStub(item));
      this.filtered = [...this.postStubs];
    } catch {
      this.postStubs = [];
      this.filtered = [];
    }
  }

  private mapStub(item: any): StubEntry {
    return {
      key: `post:${item.slug}`,
      type: 'post',
      slug: String(item.slug || ''),
      name: String(item.name || item.title || item.slug || ''),
      title: String(item.title || item.name || item.slug || ''),
      filePath: String(item.filePath || item.relativePath || ''),
      references: Array.isArray(item.references) ? item.references : [],
      status: String(item.status || 'stub'),
      draft: item.draft === true,
      category: String(item.category || ''),
      postType: String(item.postType || item.contentType || ''),
      contentType: String(item.contentType || item.postType || ''),
      pillar: String(item.pillar || ''),
      stubTriageStatus: String(item.stubTriageStatus || ''),
      stubSuggestedAction: String(item.stubSuggestedAction || ''),
      stubTriageNotes: String(item.stubTriageNotes || ''),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      entities: Array.isArray(item.entities) ? item.entities : [],
      excerpt: String(item.excerpt || ''),
      metaDescription: String(item.metaDescription || ''),
      existingFrontmatter: String(item.existingFrontmatter || ''),
      stubReason: String(item.stubReason || item.stubRationale || ''),
      stubRationale: String(item.stubRationale || ''),
      stubParentSlug: String(item.stubParentSlug || ''),
      stubParentTitle: String(item.stubParentTitle || ''),
      generatedFrom: item.generatedFrom || null,
      sourceContext: Array.isArray(item.sourceContext) ? item.sourceContext : [],
      relatedThemes: Array.isArray(item.relatedThemes) ? item.relatedThemes.map(String) : [],
      relatedEntities: Array.isArray(item.relatedEntities) ? item.relatedEntities : [],
      matchedTerms: Array.isArray(item.matchedTerms) ? item.matchedTerms.map(String) : [],
    };
  }

  private cacheElements() {
    this.listEl = this.root.querySelector('[data-stub-list]');
    this.searchInput = this.root.querySelector('[data-stub-search]');
    this.triageFilterSelect = this.root.querySelector('[data-triage-filter]');
    this.triageCountsEl = this.root.querySelector('[data-triage-counts]');
    this.countEl = this.root.querySelector('[data-stub-count]');
    this.referenceListEl = this.root.querySelector('[data-reference-list]');
    this.referenceBadgeEl = this.root.querySelector('[data-reference-count]');
    this.promptTextArea = this.root.querySelector('[data-prompt-text]');
    this.copyPromptBtn = this.root.querySelector('[data-copy-prompt]');
    this.draftInput = this.root.querySelector('[data-draft-input]');
    this.draftHelperEl = this.root.querySelector('[data-draft-helper]');
    this.validateBtn = this.root.querySelector('[data-validate-post]');
    this.saveBtn = this.root.querySelector('[data-save-post]');
    this.refreshBtn = this.root.querySelector('[data-refresh]');
    this.detailPanel = this.root.querySelector('[data-detail-panel]');
    this.emptyState = this.root.querySelector('[data-empty-state]');
    this.selectedNameEl = this.root.querySelector('[data-selected-name]');
    this.selectedTypeEl = this.root.querySelector('[data-selected-type]');
    this.filePathEl = this.root.querySelector('[data-file-path]');
    this.overviewTitleEl = this.root.querySelector('[data-overview-title]');
    this.overviewSlugEl = this.root.querySelector('[data-overview-slug]');
    this.overviewPostTypeEl = this.root.querySelector('[data-overview-post-type]');
    this.overviewCategoryEl = this.root.querySelector('[data-overview-category]');
    this.overviewStatusEl = this.root.querySelector('[data-overview-status]');
    this.overviewDraftEl = this.root.querySelector('[data-overview-draft]');
    this.overviewTagsEl = this.root.querySelector('[data-overview-tags]');
    this.overviewTriageStatusEl = this.root.querySelector('[data-overview-triage-status]');
    this.overviewPathEl = this.root.querySelector('[data-overview-path]');
    this.overviewFrontmatterEl = this.root.querySelector('[data-overview-frontmatter]');
    this.draftPreviewEl = this.root.querySelector('[data-draft-preview]');
    this.validationResultsEl = this.root.querySelector('[data-validation-results]');
    this.ingestHelperEl = this.root.querySelector('[data-ingest-helper]');
    this.statusEl = this.root.querySelector('[data-status]');
    this.confirmModal = this.root.querySelector('[data-confirm-modal]');
    this.confirmTitleEl = this.root.querySelector('[data-confirm-title]');
    this.confirmSlugEl = this.root.querySelector('[data-confirm-slug]');
    this.confirmPathEl = this.root.querySelector('[data-confirm-path]');
    this.confirmCancelBtn = this.root.querySelector('[data-confirm-cancel]');
    this.confirmReplaceBtn = this.root.querySelector('[data-confirm-replace]');
  }

  private attachEvents() {
    this.listEl?.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stub-item]');
      const key = target?.getAttribute('data-stub-item');
      if (key) this.selectStub(key);
    });
    this.searchInput?.addEventListener('input', () => this.applySearchFilter());
    this.triageFilterSelect?.addEventListener('change', () => {
      this.triageFilter = this.triageFilterSelect?.value || 'all';
      this.applySearchFilter();
    });
    this.copyPromptBtn?.addEventListener('click', () => this.copyPrompt());
    this.draftInput?.addEventListener('input', () => this.handleDraftInput());
    this.validateBtn?.addEventListener('click', () => this.handleValidate());
    this.saveBtn?.addEventListener('click', () => this.openConfirmModal());
    this.refreshBtn?.addEventListener('click', () => this.fetchStubs());
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab-button');
        if (tab === 'edit' || tab === 'preview' || tab === 'validation') this.setTab(tab);
      });
    });
    this.confirmCancelBtn?.addEventListener('click', () => this.closeConfirmModal());
    this.confirmModal?.addEventListener('click', (event) => {
      if (event.target === this.confirmModal) this.closeConfirmModal();
    });
    this.confirmReplaceBtn?.addEventListener('click', () => this.handleReplaceAfterConfirm());
  }

  private applySearchFilter() {
    const term = this.searchInput?.value?.trim().toLowerCase() || '';
    const triageFilter = this.triageFilter;
    this.filtered = this.postStubs.filter((entry) => {
      const postType = entry.postType || entry.contentType || '';
      const matchesSearch = !term || (
        entry.name.toLowerCase().includes(term) ||
        entry.slug.toLowerCase().includes(term) ||
        postType.toLowerCase().includes(term) ||
        (entry.category || '').toLowerCase().includes(term)
      );
      const matchesTriage = triageFilter === 'all' || entry.stubTriageStatus === triageFilter;
      return matchesSearch && matchesTriage;
    });
    this.renderList();
    this.updateCounts();
  }

  private renderList() {
    if (!this.listEl) return;
    if (!this.filtered.length) {
      this.listEl.innerHTML = '<p class="px-2 py-3 text-sm text-body-muted">No stub posts match your search.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    this.filtered.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-stub-item', entry.key);
      button.className = [
        'w-full rounded-xl border px-3 py-3 text-left transition',
        this.selectedKey === entry.key
          ? 'border-primary bg-surface-base shadow-sm'
          : 'border-line-neutral bg-surface-base hover:border-line-bold',
      ].join(' ');
      button.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-body-strong">${escapeHtml(entry.title || entry.name)}</p>
            <p class="mt-1 text-xs text-body-muted">${escapeHtml(entry.slug)}</p>
          </div>
          <div class="flex flex-wrap justify-end gap-1">
            ${entry.stubTriageStatus ? `<span class="rounded-full border border-line-neutral bg-surface-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-body-muted">${escapeHtml(formatLabel(entry.stubTriageStatus))}</span>` : ''}
            <span class="rounded-full bg-surface-accent px-2 py-0.5 text-[11px] font-semibold text-accent">${entry.references.length} link${entry.references.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <p class="mt-2 text-[11px] uppercase tracking-wide text-body-muted">${escapeHtml(entry.postType || entry.contentType || 'post')}</p>
      `;
      fragment.appendChild(button);
    });
    this.listEl.innerHTML = '';
    this.listEl.appendChild(fragment);
  }

  private updateCounts() {
    if (this.countEl) this.countEl.textContent = String(this.postStubs.length);
    this.renderTriageCounts();
  }

  private selectStub(key: string) {
    const entry = this.postStubs.find((stub) => stub.key === key);
    this.selectedKey = entry ? entry.key : null;
    this.parsedDraft = null;
    this.validation = this.emptyValidation();
    if (this.draftInput) this.draftInput.value = '';
    this.setStatus('');

    if (!entry) {
      this.detailPanel?.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
      this.renderList();
      this.updateActionState();
      return;
    }

    this.detailPanel?.classList.remove('hidden');
    this.emptyState?.classList.add('hidden');
    this.setText(this.selectedNameEl, entry.title || entry.name);
    this.setText(this.selectedTypeEl, entry.postType || entry.contentType || 'Post');
    this.setText(this.filePathEl, entry.filePath || '-');
    this.setText(this.overviewTitleEl, entry.title || entry.name || '-');
    this.setText(this.overviewSlugEl, entry.slug || '-');
    this.setText(this.overviewPostTypeEl, entry.postType || entry.contentType || 'Not recorded');
    this.setText(this.overviewCategoryEl, entry.category || 'Not recorded');
    this.setText(this.overviewStatusEl, entry.status || 'stub');
    this.setText(this.overviewDraftEl, entry.draft ? 'draft: true' : 'Not marked draft');
    this.setText(this.overviewTagsEl, entry.tags?.length ? entry.tags.join(', ') : 'No tags recorded');
    this.setText(this.overviewTriageStatusEl, entry.stubTriageStatus ? formatLabel(entry.stubTriageStatus) : 'Not recorded');
    this.setText(this.overviewPathEl, entry.filePath || '-');
    this.setText(this.overviewFrontmatterEl, this.formatExistingFrontmatter(entry));
    if (this.promptTextArea) {
      this.promptTextArea.value = this.buildPrompt(entry);
      this.promptTextArea.scrollTop = 0;
    }
    if (this.referenceBadgeEl) this.referenceBadgeEl.textContent = String(this.getSourceContext(entry).length);
    this.renderReferences(this.getSourceContext(entry));
    this.renderDraftPreview();
    this.renderValidationResults();
    this.updateActionState();
    this.renderList();
  }

  private formatExistingFrontmatter(entry: StubEntry): string {
    if (entry.existingFrontmatter?.trim()) return entry.existingFrontmatter.trim();
    const rows: Array<[string, unknown]> = [
      ['title', entry.title],
      ['slug', entry.slug],
      ['draft', entry.draft === true],
      ['postType', entry.postType || entry.contentType || ''],
      ['category', entry.category || ''],
      ['metaDescription', entry.metaDescription || ''],
      ['excerpt', entry.excerpt || ''],
      ['tags', entry.tags || []],
      ['stubTriageStatus', entry.stubTriageStatus || ''],
      ['stubSuggestedAction', entry.stubSuggestedAction || ''],
      ['stubTriageNotes', entry.stubTriageNotes || ''],
    ];
    return rows
      .filter(([, value]) => value !== '' && value !== undefined && !(Array.isArray(value) && value.length === 0))
      .map(([key, value]) => `${key}: ${formatPromptValue(value)}`)
      .join('\n') || 'No frontmatter fields recorded.';
  }

  private buildPrompt(entry: StubEntry): string {
    const postType = normalizePromptContentType(entry.postType || entry.contentType) || inferPromptContentType(entry);
    const category = normalizePromptCategory(entry.category) || 'ritual';
    const sources = this.getSourceContext(entry);
    const typeRequirements = getPostTypeRequirements(postType, entry);
    const existingFrontmatter = this.formatExistingFrontmatter(entry);
    const approvedLinks = sources
      .filter((source) => source.slug)
      .slice(0, MAX_REFERENCES)
      .map((source) => `- /post/${source.slug} (${source.title || source.slug})`)
      .join('\n') || '- None provided. Do not add internal links.';
    const sourceLines = sources.length
      ? sources.slice(0, MAX_REFERENCES).map((source) => {
        const title = source.title || source.slug || 'Untitled source';
        const parts = [`- ${title}`];
        if (source.slug) parts.push(`  slug: ${source.slug}`);
        if (source.excerpt) parts.push(`  excerpt: ${source.excerpt}`);
        if (source.reason) parts.push(`  reason: ${source.reason}`);
        if (source.suggestedAngle) parts.push(`  suggested angle: ${source.suggestedAngle}`);
        return parts.join('\n');
      }).join('\n')
      : '- No saved source context. Use the selected stub metadata only.';

    return `Write one complete WitchClick draft for manual paste back into Stub Forge.

Output rules - follow exactly:
- Return only the completed markdown file.
- Do not include explanations before or after the markdown.
- Do not wrap the markdown in triple backticks.
- Use valid YAML frontmatter between the opening and closing --- lines.
- Use clean markdown headings: one # title, then logical ## and ### sections.
- Include a clear introduction after the # title.
- Include a strong closing section.
- Keep the article practical, grounded, secular, neurodivergent-friendly, and WitchClick-appropriate.

Exact stub values - preserve these:
- title: ${entry.title || entry.name}
- slug: ${entry.slug}
- postType: ${postType}
- category: ${category}
- file path: ${entry.filePath || 'Not recorded'}
- current status: ${entry.status || 'stub'}

Hard requirements:
- slug must exactly be "${entry.slug}".
- postType must exactly be "${postType}".
- category must exactly be "${category}".
- draft must be true.
- Do not include TODO, placeholder, stub, filler, "coming soon", or "insert text here" language anywhere.
- Do not invent internal links unless they appear in the Approved internal links list below.
- If you use an approved internal link, use the existing site convention: /post/slug.
- Do not output JSON. Output markdown with YAML frontmatter.

Required YAML frontmatter:
- title
- slug
- draft
- postType
- category
- metaDescription
- excerpt
- tags

Frontmatter field rules:
- title must match the selected title unless a tiny punctuation cleanup is needed.
- slug must exactly match the selected stub slug.
- draft must be true.
- postType must exactly match the selected stub postType.
- category must exactly match the selected stub category.
- metaDescription should be about 150-160 characters when possible.
- excerpt should be concise, human-readable, and not duplicate the metaDescription exactly.
- tags should be relevant and not excessive; use about 4-7 tags.
- Remove placeholder/stub tags from the final tags list.

WitchClick voice and content style:
- Secular, grounded, skeptical-friendly, and neurodivergent-friendly.
- Cozy but precise; avoid presenting supernatural claims as facts.
- Include practical, low-spoons options where relevant.
- Prefer consent, boundaries, accountability, and self-trust over fear or gatekeeping.
- Avoid vague mystical filler; give concrete steps, examples, or reflection prompts.
- Make the article useful as a standalone draft that can remain unpublished until reviewed.

Existing frontmatter fields to preserve where applicable:
${existingFrontmatter}

Source context:
${sourceLines}

Approved internal links:
${approvedLinks}

PostType-specific requirements:
${typeRequirements}

Validation awareness:
This result will be checked by an automated validator and may fail if:
- the slug changes
- required frontmatter is missing
- postType-specific sections are missing
- placeholder, stub, TODO, filler, "coming soon", or "insert text here" language appears
- markdown/frontmatter cannot be parsed
- the article is too short or wildly too long
- required headings are absent

Silent self-check before returning:
- Verify the slug exactly matches "${entry.slug}".
- Verify draft is true.
- Verify postType exactly matches "${postType}".
- Verify category exactly matches "${category}".
- Verify the YAML frontmatter is parseable.
- Verify all required sections for this postType are present.
- Verify there are no triple backticks.
- Verify there are no explanations outside the markdown file.
- Do not output this checklist.

Return this shape, completed with real content:
---
title: "${escapeYamlDoubleQuoted(entry.title || entry.name)}"
slug: "${entry.slug}"
draft: true
postType: "${escapeYamlDoubleQuoted(postType)}"
category: "${escapeYamlDoubleQuoted(category)}"
metaDescription: "Write a 150-160 character SEO description."
excerpt: "Write a concise human-readable excerpt."
tags:
  - relevant tag
  - another relevant tag
---

# ${entry.title || entry.name}

Write the full article here with the required sections.
`;
  }

  private getSourceContext(entry: StubEntry): StubReference[] {
    const merged: StubReference[] = [];
    const seen = new Set<string>();
    [...(entry.sourceContext || []), ...(entry.references || [])].forEach((source) => {
      if (!source) return;
      const key = source.slug || source.title || source.excerpt || JSON.stringify(source);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(source);
    });
    return merged;
  }

  private renderReferences(references: StubReference[]) {
    if (!this.referenceListEl) return;
    if (!references.length) {
      this.referenceListEl.innerHTML = '<p class="text-xs text-body-muted">No source context recorded for this stub yet.</p>';
      return;
    }
    this.referenceListEl.innerHTML = references.slice(0, MAX_REFERENCES).map((ref) => `
      <article class="rounded-lg border border-line-subtle bg-surface-base/80 px-3 py-2">
        <div class="text-sm font-medium text-body-strong">${escapeHtml(ref.title || ref.slug || 'Untitled source')}</div>
        ${ref.slug ? `<div class="text-[11px] text-body-muted">/post/${escapeHtml(ref.slug)}</div>` : ''}
        ${ref.excerpt ? `<p class="mt-1 text-xs text-body-muted">${escapeHtml(ref.excerpt)}</p>` : ''}
      </article>
    `).join('');
  }

  private copyPrompt() {
    const value = this.promptTextArea?.value || '';
    if (!value) {
      this.setStatus('Choose a stub to begin.', 'error');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => this.setStatus('Prompt copied. Paste it into your external LLM, then bring the completed markdown back here.', 'success'))
        .catch(() => this.fallbackCopy());
      return;
    }
    this.fallbackCopy();
  }

  private fallbackCopy() {
    if (!this.promptTextArea) return;
    this.promptTextArea.select();
    const execCommand = (document as unknown as { execCommand?: (commandId: string) => boolean }).execCommand;
    if (execCommand) execCommand('copy');
    this.setStatus('Prompt copied. Paste it into your external LLM, then bring the completed markdown back here.', 'success');
  }

  private handleDraftInput() {
    this.validation = this.emptyValidation();
    this.parsedDraft = null;
    const raw = this.draftInput?.value || '';
    if (raw.trim()) {
      const parsed = parseMarkdownFrontmatter(raw);
      if (parsed.ok) {
        this.parsedDraft = parsed.draft;
        const localError = this.getLocalDraftError(parsed.draft);
        if (localError) this.validation.errors = [localError];
      } else {
        this.validation.errors = [parsed.error];
      }
    }
    this.renderDraftPreview();
    this.renderValidationResults();
    this.updateActionState();
  }

  private async handleValidate() {
    const entry = this.getSelectedEntry();
    if (!entry) {
      this.setStatus('Choose a stub to begin.', 'error');
      return;
    }
    const raw = this.draftInput?.value || '';
    if (!raw.trim()) {
      this.setStatus('Paste the completed markdown draft here after using the copied prompt in your external LLM.', 'error');
      return;
    }
    const parsed = parseMarkdownFrontmatter(raw);
    if (!parsed.ok) {
      this.parsedDraft = null;
      this.validation = this.emptyValidation([parsed.error]);
      this.renderValidationResults();
      this.updateActionState();
      this.setStatus(parsed.error, 'error');
      return;
    }
    this.parsedDraft = parsed.draft;
    const localError = this.getLocalDraftError(parsed.draft, entry);
    if (localError) {
      this.validation = {
        passed: false,
        input: '',
        fingerprint: '',
        successes: [],
        warnings: [],
        errors: [localError],
      };
      this.renderValidationResults();
      this.updateActionState();
      this.setTab('validation');
      this.setStatus(localError, 'error');
      return;
    }
    const markdown = parsed.draft.markdown;
    const fingerprint = this.getValidationFingerprint(entry.slug, markdown);

    if (this.validateBtn) this.validateBtn.disabled = true;
    this.setStatus('Validating pasted draft with dryRun=true...', 'info');
    try {
      const response = await this.apiFetch('/posts/replace-stub?dryRun=true', {
        method: 'POST',
        headers: this.jsonHeaders,
        body: JSON.stringify({ stubSlug: entry.slug, markdown, dryRun: true }),
      });
      const { errors, warnings } = await this.readApiResponse(response, 'Validation found blocking issues. Fix the pasted draft before ingesting.');
      this.validation = {
        passed: errors.length === 0,
        input: markdown,
        fingerprint: errors.length === 0 ? fingerprint : '',
        successes: errors.length === 0 ? ['Draft validation passed. This draft is ready to ingest.'] : [],
        warnings,
        errors,
      };
      this.renderValidationResults();
      this.updateActionState();
      this.setTab('validation');
      this.setStatus(
        errors.length === 0
          ? 'Draft validation passed. This draft is ready to ingest.'
          : 'Validation found blocking issues. Fix the pasted draft before ingesting.',
        errors.length === 0 ? 'success' : 'error',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation found blocking issues. Fix the pasted draft before ingesting.';
      this.validation = this.emptyValidation([message]);
      this.renderValidationResults();
      this.updateActionState();
      this.setStatus(message, 'error');
    } finally {
      if (this.validateBtn) this.validateBtn.disabled = false;
    }
  }

  private openConfirmModal() {
    if (!this.canIngest()) {
      this.setStatus(this.getIngestBlocker(), 'error');
      this.updateActionState();
      return;
    }
    const entry = this.getSelectedEntry();
    if (!entry) return;
    this.setText(this.confirmTitleEl, entry.title || entry.name);
    this.setText(this.confirmSlugEl, entry.slug);
    this.setText(this.confirmPathEl, entry.filePath || '-');
    this.confirmModal?.classList.remove('hidden');
    this.confirmModal?.classList.add('flex');
  }

  private closeConfirmModal() {
    this.confirmModal?.classList.add('hidden');
    this.confirmModal?.classList.remove('flex');
  }

  private async handleReplaceAfterConfirm() {
    const guard = this.getReplaceGuard();
    if (!guard.ok) {
      this.closeConfirmModal();
      this.updateActionState();
      this.setStatus(guard.reason, 'error');
      return;
    }
    const { entry, markdown } = guard;
    if (this.confirmReplaceBtn) this.confirmReplaceBtn.disabled = true;
    this.setStatus('Replacing stub with pasted draft...', 'info');
    try {
      const response = await this.apiFetch('/posts/replace-stub', {
        method: 'POST',
        headers: this.jsonHeaders,
        body: JSON.stringify({ stubSlug: entry.slug, markdown }),
      });
      const { errors } = await this.readApiResponse(response, 'Failed to replace post stub');
      if (errors.length) throw new Error(errors[0]);
      this.closeConfirmModal();
      this.setStatus('Stub replaced successfully.', 'success');
      this.removeStub(entry.slug);
      await this.fetchStubs(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to replace post stub';
      this.setStatus(message, 'error');
    } finally {
      if (this.confirmReplaceBtn) this.confirmReplaceBtn.disabled = false;
    }
  }

  private renderDraftPreview() {
    if (!this.draftPreviewEl) return;
    if (!this.draftInput?.value.trim()) {
      this.draftPreviewEl.innerHTML = '<p class="text-sm text-body-muted">No pasted draft.</p>';
      return;
    }
    if (!this.parsedDraft) {
      this.draftPreviewEl.innerHTML = '<p class="text-sm text-danger">Could not parse the pasted markdown/frontmatter.</p>';
      return;
    }
    const heading = this.parsedDraft.title || 'Untitled draft';
    this.draftPreviewEl.innerHTML = `
      <div class="mb-4 rounded-lg border border-line-subtle bg-surface-base/70 p-3 text-sm">
        <p><strong>Title:</strong> ${escapeHtml(heading)}</p>
        <p><strong>Slug:</strong> ${escapeHtml(this.parsedDraft.slug || '(missing)')}</p>
        <p><strong>Draft:</strong> ${this.parsedDraft.draft === true ? 'true' : 'not true'}</p>
        <p><strong>PostType:</strong> ${escapeHtml(this.parsedDraft.postType || '(missing)')}</p>
        <p><strong>Category:</strong> ${escapeHtml(this.parsedDraft.category || '(missing)')}</p>
      </div>
      ${renderMarkdownPreview(this.parsedDraft.body)}
    `;
  }

  private renderValidationResults() {
    if (!this.validationResultsEl) return;
    const { successes, warnings, errors } = this.validation;
    if (!successes.length && !warnings.length && !errors.length) {
      this.validationResultsEl.innerHTML = '<p class="text-sm text-body-muted">Validate the pasted draft before ingestion.</p>';
      return;
    }
    this.validationResultsEl.innerHTML = [
      renderResultGroup('Successes', successes, 'text-success', 'No successes yet.'),
      renderResultGroup('Warnings', warnings, 'text-warning', 'No warnings.'),
      renderResultGroup('Errors', errors, 'text-danger', 'No errors.'),
    ].join('');
  }

  private updateActionState() {
    const helper = this.getIngestBlocker();
    if (this.saveBtn) this.saveBtn.disabled = helper !== '';
    if (this.confirmReplaceBtn) this.confirmReplaceBtn.disabled = helper !== '';
    if (helper) this.closeConfirmModal();
    if (this.ingestHelperEl) this.ingestHelperEl.textContent = helper || 'Draft validation passed. This draft is ready to ingest.';
    if (this.draftHelperEl) {
      this.draftHelperEl.classList.remove('text-danger', 'text-success', 'text-body-muted');
      const entry = this.getSelectedEntry();
      if (!entry) {
        this.draftHelperEl.textContent = 'Choose a stub to begin.';
        this.draftHelperEl.classList.add('text-body-muted');
      } else if (!this.draftInput?.value.trim()) {
        this.draftHelperEl.textContent = 'Paste the completed markdown draft here after using the copied prompt in your external LLM.';
        this.draftHelperEl.classList.add('text-body-muted');
      } else if (this.parsedDraft?.slug && this.parsedDraft.slug !== entry.slug) {
        this.draftHelperEl.textContent = 'The pasted draft slug does not match the selected stub. Ingestion is blocked.';
        this.draftHelperEl.classList.add('text-danger');
      } else if (this.parsedDraft && !isDraftTrue(this.parsedDraft.draft)) {
        this.draftHelperEl.textContent = 'Pasted draft must keep draft: true.';
        this.draftHelperEl.classList.add('text-danger');
      } else if (this.getReplaceGuard().ok) {
        this.draftHelperEl.textContent = 'Draft validation passed. This draft is ready to ingest.';
        this.draftHelperEl.classList.add('text-success');
      } else {
        this.draftHelperEl.textContent = 'Validate the pasted draft before ingestion.';
        this.draftHelperEl.classList.add('text-body-muted');
      }
    }
  }

  private getIngestBlocker(): string {
    const entry = this.getSelectedEntry();
    const raw = this.draftInput?.value || '';
    const markdown = this.parsedDraft?.markdown || normalizePastedMarkdown(raw);
    if (!entry) return 'Choose a stub to begin.';
    if (!raw.trim()) return 'Paste the completed markdown draft here after using the copied prompt in your external LLM.';
    if (!this.parsedDraft) return this.validation.errors[0] || 'Could not parse the pasted markdown/frontmatter.';
    const localError = this.getLocalDraftError(this.parsedDraft, entry);
    if (localError) return localError === 'The pasted draft slug must exactly match the selected stub slug.'
      ? 'The pasted draft slug does not match the selected stub. Ingestion is blocked.'
      : localError;
    const fingerprint = this.getValidationFingerprint(entry.slug, markdown);
    if (!this.validation.passed || this.validation.input !== markdown || this.validation.fingerprint !== fingerprint) {
      return 'Validate the current pasted draft before ingestion.';
    }
    return '';
  }

  private getLocalDraftError(draft: ParsedDraft, entry = this.getSelectedEntry()): string {
    if (!draft.slug) return 'Pasted draft slug is required.';
    if (entry && draft.slug !== entry.slug) return 'The pasted draft slug must exactly match the selected stub slug.';
    if (!isDraftTrue(draft.draft)) return 'Pasted draft must keep draft: true.';
    return '';
  }

  private canIngest(): boolean {
    return this.getIngestBlocker() === '';
  }

  private getReplaceGuard(): { ok: true; entry: StubEntry; markdown: string } | { ok: false; reason: string } {
    const entry = this.getSelectedEntry();
    if (!entry) return { ok: false, reason: 'Choose a stub to begin.' };
    const raw = this.draftInput?.value || '';
    if (!raw.trim()) return { ok: false, reason: 'Paste the completed markdown draft here after using the copied prompt in your external LLM.' };
    const parsed = parseMarkdownFrontmatter(raw);
    if (!parsed.ok) return { ok: false, reason: parsed.error };
    this.parsedDraft = parsed.draft;
    const localError = this.getLocalDraftError(parsed.draft, entry);
    if (localError) return {
      ok: false,
      reason: localError === 'The pasted draft slug must exactly match the selected stub slug.'
        ? 'The pasted draft slug does not match the selected stub. Ingestion is blocked.'
        : localError,
    };
    const markdown = parsed.draft.markdown;
    const fingerprint = this.getValidationFingerprint(entry.slug, markdown);
    if (!this.validation.passed || this.validation.input !== markdown || this.validation.fingerprint !== fingerprint) {
      return { ok: false, reason: 'Validate the current pasted draft before ingestion.' };
    }
    return { ok: true, entry, markdown };
  }

  private getValidationFingerprint(slug: string, markdown: string): string {
    return `${slug}\n${markdown}`;
  }

  private emptyValidation(errors: string[] = []): ValidationState {
    return { passed: false, input: '', fingerprint: '', successes: [], warnings: [], errors };
  }

  private getSelectedEntry(): StubEntry | null {
    return this.postStubs.find((stub) => stub.key === this.selectedKey) || null;
  }

  private setTab(tab: 'edit' | 'preview' | 'validation') {
    this.activeTab = tab;
    this.root.querySelectorAll<HTMLElement>('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.getAttribute('data-tab-panel') !== tab);
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab-button]').forEach((button) => {
      const active = button.getAttribute('data-tab-button') === tab;
      button.classList.toggle('border-primary', active);
      button.classList.toggle('text-body-strong', active);
    });
    if (this.activeTab === 'preview') this.renderDraftPreview();
  }

  private removeStub(slug: string) {
    const key = `post:${slug}`;
    this.postStubs = this.postStubs.filter((entry) => entry.key !== key);
    this.filtered = this.filtered.filter((entry) => entry.key !== key);
    this.selectedKey = null;
    this.detailPanel?.classList.add('hidden');
    this.emptyState?.classList.remove('hidden');
    this.applySearchFilter();
    this.updateActionState();
  }

  private async fetchStubs(setStatus = true) {
    if (this.refreshBtn) this.refreshBtn.disabled = true;
    if (setStatus) this.setStatus('Refreshing stub list...', 'info');
    try {
      const response = await this.apiFetch('/posts/stubs', {
        method: 'POST',
        headers: this.jsonHeaders,
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || 'Failed to load stub prompts');
      }
      const entries = Array.isArray(data.stubs) ? data.stubs : [];
      this.postStubs = entries.map((item: any) => this.mapStub(item));
      this.applySearchFilter();
      if (this.postStubs.length === 0) {
        this.detailPanel?.classList.add('hidden');
        this.emptyState?.classList.remove('hidden');
      }
      if (setStatus) this.setStatus('Stub list refreshed.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh stubs';
      this.setStatus(message === 'Failed to fetch' ? 'Admin access is required for this action.' : message, 'error');
    } finally {
      if (this.refreshBtn) this.refreshBtn.disabled = false;
    }
  }

  private renderTriageCounts() {
    if (!this.triageCountsEl) return;
    const counts = new Map<string, number>();
    this.postStubs.forEach((entry) => {
      const status = entry.stubTriageStatus || 'untriaged';
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    const ordered = [
      'strong-article-candidate',
      'support-reference-candidate',
      'editorial-seed',
      'pop-culture-review',
      'template-section-artifact',
      'needs-human-decision',
      'possible-delete-merge-candidate',
      'untriaged',
    ];
    this.triageCountsEl.innerHTML = ordered
      .filter((status) => counts.has(status))
      .map((status) => `<span class="rounded-full border border-line-neutral px-2 py-0.5">${escapeHtml(formatLabel(status))}: ${counts.get(status)}</span>`)
      .join('');
  }

  private setText(element: HTMLElement | null, value: string) {
    if (element) element.textContent = value;
  }

  private setStatus(message: string, variant: 'success' | 'error' | 'info' | 'warning' | '' = '') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.classList.remove('text-success', 'text-danger', 'text-body-muted', 'text-warning');
    if (!message) {
      this.statusEl.classList.add('text-body-muted');
      return;
    }
    switch (variant) {
      case 'success':
        this.statusEl.classList.add('text-success');
        break;
      case 'error':
        this.statusEl.classList.add('text-danger');
        break;
      case 'warning':
        this.statusEl.classList.add('text-warning');
        break;
      default:
        this.statusEl.classList.add('text-body-muted');
    }
  }
}

function parseMarkdownFrontmatter(raw: string): { ok: true; draft: ParsedDraft } | { ok: false; error: string } {
  const normalized = normalizePastedMarkdown(raw);
  const match = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?([\s\S]*)$/);
  if (!match) return { ok: false, error: 'Could not parse the pasted markdown/frontmatter.' };
  const frontmatter = parseSimpleYaml(match[1] || '');
  const body = match[2] || '';
  const slug = stringField(frontmatter.slug);
  const title = stringField(frontmatter.title);
  const postType = stringField(frontmatter.postType || frontmatter.contentType);
  const category = stringField(frontmatter.category);
  const draftValue = frontmatter.draft;
  const draft = typeof draftValue === 'boolean'
    ? draftValue
    : typeof draftValue === 'string'
      ? draftValue.trim().toLowerCase() === 'true'
      : null;
  if (!slug) return { ok: false, error: 'Pasted draft slug is required.' };
  if (!title) return { ok: false, error: 'Pasted draft title is required.' };
  return { ok: true, draft: { markdown: normalized, frontmatter, body, slug, title, draft, postType, category } };
}

function normalizePastedMarkdown(raw: string): string {
  let normalized = String(raw || '').replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').trim();
  const fenced = normalized.match(/^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\n```[ \t]*$/i);
  if (fenced) {
    normalized = (fenced[1] || '').replace(/^\uFEFF/, '').trim();
  }
  const frontmatterStart = normalized.search(/^---[ \t]*$/m);
  if (frontmatterStart > 0) {
    normalized = normalized.slice(frontmatterStart).trim();
  }
  return normalized;
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || '';
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1] || '';
    if (!key) continue;
    const rawValue = match[2] || '';
    if (rawValue.trim() === '') {
      const values: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^\s+-\s+/.test(lines[cursor] || '')) {
        values.push(unquote((lines[cursor] || '').replace(/^\s+-\s+/, '').trim()));
        cursor += 1;
      }
      if (values.length) {
        result[key] = values;
        index = cursor - 1;
      } else {
        result[key] = '';
      }
      continue;
    }
    result[key] = parseScalar(rawValue.trim());
  }
  return result;
}

function parseScalar(value: string): unknown {
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;
  if (/^\[.*\]$/.test(value)) {
    return value.slice(1, -1).split(',').map((part) => unquote(part.trim())).filter(Boolean);
  }
  return unquote(value);
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function stringField(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

function isDraftTrue(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

const VALID_PROMPT_CATEGORIES = ['ritual', 'meandering'];
const VALID_PROMPT_CONTENT_TYPES = ['ritual', 'guide', 'spread', 'reflection', 'story', 'tarotSpread', 'spellwork', 'crystals'];

function normalizePromptCategory(value: unknown): string {
  const candidate = String(value || '').trim();
  return VALID_PROMPT_CATEGORIES.includes(candidate) ? candidate : '';
}

function normalizePromptContentType(value: unknown): string {
  const candidate = String(value || '').trim();
  return VALID_PROMPT_CONTENT_TYPES.includes(candidate) ? candidate : '';
}

function inferPromptContentType(entry: StubEntry): string {
  const haystack = [
    entry.title,
    entry.slug,
    entry.category,
    entry.pillar,
    ...(entry.tags || []),
    ...(entry.matchedTerms || []),
  ].join(' ').toLowerCase();
  if (/\b(tarot|spread|card pull|card)\b/.test(haystack)) return 'tarotSpread';
  if (/\b(curse|cursing|spell|working)\b/.test(haystack)) return 'spellwork';
  if (/\b(ritual|practice|altar|grounding|meditation)\b/.test(haystack)) return 'ritual';
  if (/\b(guide|how-to|how to|reference|technique|basics|primer)\b/.test(haystack)) return 'guide';
  if (/\b(story|vignette|fiction)\b/.test(haystack)) return 'story';
  return 'reflection';
}

function formatApiError(status: number, message: string): string {
  return status ? `HTTP ${status}: ${message}` : message;
}

function getPostTypeRequirements(postType: string, entry: StubEntry): string {
  const haystack = `${postType} ${entry.category || ''} ${entry.title || ''} ${entry.tags?.join(' ') || ''}`.toLowerCase();
  if (/\b(ritual|working|spell)\b/.test(haystack)) {
    return [
      '- This is a ritual post.',
      '- Include a clear introduction that explains the purpose without promising supernatural outcomes.',
      '- Include practical materials or setup notes if helpful.',
      '- Include a ## Quick or Low-Energy Variant section.',
      '- Include a ## Deep Variant section.',
      '- Include a ## Checklist or Summary section.',
      '- Include a ## Reflection Prompt or ## Journaling Prompts section.',
      '- Include grounded safety/consent language where relevant.',
      '- Use practical steps, not vague mystical filler.',
      '- Include a strong grounded closing section.',
    ].join('\n');
  }
  if (/\b(tarot|spread|card)\b/.test(haystack)) {
    return [
      '- This is a tarot or spread post.',
      '- Include a clear spread purpose.',
      '- Include card positions with position names and what each position explores.',
      '- Include interpretation guidance that stays grounded and reflective.',
      '- Include optional journaling prompts.',
      '- Include a grounded closing section.',
      '- Do not promise guaranteed predictions or outcomes.',
    ].join('\n');
  }
  if (/\b(guide|how-to|how to|reference|technique|practice|primer|basics)\b/.test(haystack)) {
    return [
      '- This is a guide or how-to post.',
      '- Include a clear introduction.',
      '- Include step-by-step body sections.',
      '- Include practical examples.',
      '- Include a low-energy option if relevant.',
      '- Include a summary/checklist section.',
      '- Include a strong practical closing section.',
    ].join('\n');
  }
  return [
    '- This is a general essay or reflection post.',
    '- Include a clear thesis or central idea.',
    '- Use well-structured sections with clean headings.',
    '- Include at least one practical takeaway.',
    '- Keep the closing reflective but not vague.',
    '- Do not drift into filler or purely atmospheric writing.',
  ].join('\n');
}

function renderMarkdownPreview(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    if (trimmed.startsWith('# ')) {
      closeList();
      html.push(`<h1 class="mt-0 text-2xl font-semibold text-body-strong">${escapeHtml(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h2 class="mt-5 text-xl font-semibold text-body-strong">${escapeHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      closeList();
      html.push(`<h3 class="mt-4 text-lg font-semibold text-body-strong">${escapeHtml(trimmed.slice(4))}</h3>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!listOpen) {
        html.push('<ul class="my-3 list-disc space-y-1 pl-5">');
        listOpen = true;
      }
      html.push(`<li>${escapeHtml(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      closeList();
      html.push(`<p class="my-3 text-sm leading-6 text-body">${escapeHtml(trimmed)}</p>`);
    }
  }
  closeList();
  return html.join('');
}

function renderResultGroup(title: string, items: string[], colorClass: string, empty: string): string {
  const list = items.length
    ? `<ul class="mt-2 list-disc space-y-1 pl-5">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : `<p class="mt-2 text-body-muted">${escapeHtml(empty)}</p>`;
  return `
    <section class="rounded-lg border border-line-subtle bg-surface-base/80 p-3 text-sm">
      <h4 class="font-semibold ${colorClass}">${escapeHtml(title)}</h4>
      ${list}
    </section>
  `;
}

function collectMessages(value: unknown, fallback?: string): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return fallback ? [fallback] : [];
}

function formatPromptValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function formatLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MAX_REFERENCES = 5;

function initStubDashboard() {
  const root = document.querySelector<HTMLElement>('[data-stub-dashboard]');
  if (!root) return;
  new StubDashboard(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStubDashboard, { once: true });
  } else {
    initStubDashboard();
  }
}
