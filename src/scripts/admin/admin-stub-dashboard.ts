type StubReference = {
  title: string;
  slug: string;
  sourcePath?: string;
};

type StubEntry = {
  key: string;
  type: string;
  slug: string;
  name: string;
  prompt: string;
  filePath: string;
  references: StubReference[];
  stubRationale?: string;
  stubParentSlug?: string;
  stubParentTitle?: string;
};

type SavePayload = {
  type: string;
  slug: string;
  name: string;
  summary: string;
  properties: Record<string, unknown>;
  related: string[];
};

class StubDashboard {
  private root: HTMLElement;
  private devApi: string;
  private devKey: string;
  private baseHeaders: Record<string, string>;
  private jsonHeaders: Record<string, string>;
  private mode: 'entity' | 'post' = 'entity';
  private entityStubs: StubEntry[] = [];
  private entityFiltered: StubEntry[] = [];
  private postStubs: StubEntry[] = [];
  private postFiltered: StubEntry[] = [];
  private stubs: StubEntry[] = [];
  private filtered: StubEntry[] = [];
  private selectedKey: string | null = null;
  private validatedPayload: SavePayload | Record<string, unknown> | null = null;

  private listEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private countEl: HTMLElement | null = null;
  private referenceListEl: HTMLElement | null = null;
  private referenceBadgeEl: HTMLElement | null = null;
  private promptTextArea: HTMLTextAreaElement | null = null;
  private copyPromptBtn: HTMLButtonElement | null = null;
  private entityJsonInput: HTMLTextAreaElement | null = null;
  private postJsonInput: HTMLTextAreaElement | null = null;
  private entityValidateBtn: HTMLButtonElement | null = null;
  private postValidateBtn: HTMLButtonElement | null = null;
  private entitySaveBtn: HTMLButtonElement | null = null;
  private postSaveBtn: HTMLButtonElement | null = null;
  private modeEntityBtn: HTMLButtonElement | null = null;
  private modePostBtn: HTMLButtonElement | null = null;
  private stepEntityPanel: HTMLElement | null = null;
  private stepPostPanel: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private detailPanel: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private selectedNameEl: HTMLElement | null = null;
  private selectedTypeEl: HTMLElement | null = null;
  private filePathEl: HTMLElement | null = null;
  private previewHeading1El: HTMLElement | null = null;
  private previewHeading2El: HTMLElement | null = null;
  private previewHeading3El: HTMLElement | null = null;
  private previewSummaryEl: HTMLElement | null = null;
  private previewPropsEl: HTMLElement | null = null;
  private previewRelatedEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.devApi = root.getAttribute('data-dev-api') || 'http://localhost:8787';
    this.devKey = root.getAttribute('data-dev-key') || '';
    this.baseHeaders = this.devKey ? { 'X-WC-Dev-Key': this.devKey } : {};
    this.jsonHeaders = { 'Content-Type': 'application/json', ...this.baseHeaders };
    this.bootstrapData();
    this.cacheElements();
    this.attachEvents();
    this.setMode('entity');
    this.renderList();
    this.updateCounts();
    this.fetchStubs(false);
  }

  private apiFetch(path: string, options: RequestInit = {}) {
    const headers = { ...this.baseHeaders, ...(options.headers || {}) };
    return fetch(`${this.devApi}${path}`, { ...options, headers });
  }

  private bootstrapData() {
    try {
      const rawEntities = this.root.getAttribute('data-stubs') || '[]';
      const parsedEntities = JSON.parse(rawEntities);
      const entityEntries = Array.isArray(parsedEntities) ? parsedEntities : [];
      this.entityStubs = entityEntries.map((item) => ({
        key: `${item.type}:${item.slug}`,
        type: item.type,
        slug: item.slug,
        name: item.name || item.slug,
        prompt: item.prompt || '',
        filePath: item.filePath || '',
        references: Array.isArray(item.references) ? item.references : [],
        stubRationale: '',
        stubParentSlug: '',
        stubParentTitle: '',
      }));

      const rawPosts = this.root.getAttribute('data-post-stubs') || '[]';
      const parsedPosts = JSON.parse(rawPosts);
      const postEntries = Array.isArray(parsedPosts) ? parsedPosts : [];
      this.postStubs = postEntries.map((item) => ({
        key: `post:${item.slug}`,
        type: 'post',
        slug: item.slug,
        name: item.name || item.slug,
        prompt: item.prompt || '',
        filePath: item.filePath || '',
        references: Array.isArray(item.references) ? item.references : [],
        stubRationale: item.stubRationale || '',
        stubParentSlug: item.stubParentSlug || '',
        stubParentTitle: item.stubParentTitle || '',
      }));

      this.entityFiltered = [...this.entityStubs];
      this.postFiltered = [...this.postStubs];
      this.stubs = [...this.entityStubs];
      this.filtered = [...this.entityFiltered];
    } catch {
      this.entityStubs = [];
      this.entityFiltered = [];
      this.postStubs = [];
      this.postFiltered = [];
      this.stubs = [];
      this.filtered = [];
    }
  }

  private cacheElements() {
    this.listEl = this.root.querySelector('[data-stub-list]');
    this.searchInput = this.root.querySelector('[data-stub-search]');
    this.countEl = this.root.querySelector('[data-stub-count]');
    this.referenceListEl = this.root.querySelector('[data-reference-list]');
    this.referenceBadgeEl = this.root.querySelector('[data-reference-count]');
    this.promptTextArea = this.root.querySelector('[data-prompt-text]');
    this.copyPromptBtn = this.root.querySelector<HTMLButtonElement>('[data-copy-prompt]');
    this.entityJsonInput = this.root.querySelector<HTMLTextAreaElement>('[data-json-input-entity]');
    this.postJsonInput = this.root.querySelector<HTMLTextAreaElement>('[data-json-input-post]');
    this.entityValidateBtn = this.root.querySelector<HTMLButtonElement>('[data-validate-entity]');
    this.postValidateBtn = this.root.querySelector<HTMLButtonElement>('[data-validate-post]');
    this.entitySaveBtn = this.root.querySelector<HTMLButtonElement>('[data-save-entity]');
    this.postSaveBtn = this.root.querySelector<HTMLButtonElement>('[data-save-post]');
    this.modeEntityBtn = this.root.querySelector<HTMLButtonElement>('[data-mode-entity]');
    this.modePostBtn = this.root.querySelector<HTMLButtonElement>('[data-mode-post]');
    this.stepEntityPanel = this.root.querySelector('[data-step2-entity]');
    this.stepPostPanel = this.root.querySelector('[data-step2-post]');
    this.statusEl = this.root.querySelector('[data-status]');
    this.refreshBtn = this.root.querySelector<HTMLButtonElement>('[data-refresh]');
    this.detailPanel = this.root.querySelector('[data-detail-panel]');
    this.emptyState = this.root.querySelector('[data-empty-state]');
    this.selectedNameEl = this.root.querySelector('[data-selected-name]');
    this.selectedTypeEl = this.root.querySelector('[data-selected-type]');
    this.filePathEl = this.root.querySelector('[data-file-path]');
    this.previewHeading1El = this.root.querySelector('[data-preview-heading-1]');
    this.previewHeading2El = this.root.querySelector('[data-preview-heading-2]');
    this.previewHeading3El = this.root.querySelector('[data-preview-heading-3]');
    this.previewSummaryEl = this.root.querySelector('[data-preview-summary]');
    this.previewPropsEl = this.root.querySelector('[data-preview-props]');
    this.previewRelatedEl = this.root.querySelector('[data-preview-related]');
  }

  private attachEvents() {
    this.listEl?.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stub-item]');
      if (target) {
        const key = target.getAttribute('data-stub-item');
        if (key) {
          this.selectStub(key);
        }
      }
    });

    this.searchInput?.addEventListener('input', () => {
      this.applySearchFilter();
    });

    this.copyPromptBtn?.addEventListener('click', () => this.copyPrompt());
    this.entityValidateBtn?.addEventListener('click', () => this.handleValidate());
    this.postValidateBtn?.addEventListener('click', () => this.handleValidate());
    this.entitySaveBtn?.addEventListener('click', () => this.handleSave());
    this.postSaveBtn?.addEventListener('click', () => this.handleSave());
    this.modeEntityBtn?.addEventListener('click', () => this.setMode('entity'));
    this.modePostBtn?.addEventListener('click', () => this.setMode('post'));
    this.refreshBtn?.addEventListener('click', () => this.fetchStubs());
    document.addEventListener('keydown', (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      const activeSaveBtn = this.mode === 'post' ? this.postSaveBtn : this.entitySaveBtn;
      if (!this.selectedKey || !activeSaveBtn || activeSaveBtn.disabled) return;
      event.preventDefault();
      activeSaveBtn.click();
    });
  }

  private setMode(mode: 'entity' | 'post') {
    this.mode = mode;
    if (this.mode === 'entity') {
      this.stubs = [...this.entityStubs];
      this.filtered = [...this.entityFiltered];
    } else {
      this.stubs = [...this.postStubs];
      this.filtered = [...this.postFiltered];
    }

    this.selectedKey = null;
    this.validatedPayload = null;
    if (this.entityJsonInput) this.entityJsonInput.value = '';
    if (this.postJsonInput) this.postJsonInput.value = '';
    if (this.previewSummaryEl) this.previewSummaryEl.textContent = 'Waiting for validation…';
    if (this.previewPropsEl) this.previewPropsEl.textContent = '—';
    if (this.previewRelatedEl) this.previewRelatedEl.textContent = '—';
    this.detailPanel?.classList.add('hidden');
    this.emptyState?.classList.remove('hidden');

    this.applySearchFilter();
    this.updateModeUI();
    this.renderList();
    this.updateCounts();
    this.setStatus('');
  }

  private updateModeUI() {
    const entityActive = this.mode === 'entity';
    if (this.modeEntityBtn) {
      this.modeEntityBtn.classList.toggle('bg-surface-base', entityActive);
      this.modeEntityBtn.classList.toggle('shadow-sm', entityActive);
      this.modeEntityBtn.classList.toggle('text-body', entityActive);
      this.modeEntityBtn.classList.toggle('text-body-muted', !entityActive);
      this.modeEntityBtn.setAttribute('aria-pressed', entityActive ? 'true' : 'false');
    }
    if (this.modePostBtn) {
      this.modePostBtn.classList.toggle('bg-surface-base', !entityActive);
      this.modePostBtn.classList.toggle('shadow-sm', !entityActive);
      this.modePostBtn.classList.toggle('text-body', !entityActive);
      this.modePostBtn.classList.toggle('text-body-muted', entityActive);
      this.modePostBtn.setAttribute('aria-pressed', !entityActive ? 'true' : 'false');
    }
    if (this.stepEntityPanel) this.stepEntityPanel.classList.toggle('hidden', !entityActive);
    if (this.stepPostPanel) this.stepPostPanel.classList.toggle('hidden', entityActive);

    if (this.previewHeading1El) {
      this.previewHeading1El.textContent = entityActive ? 'Summary Preview' : 'Title';
    }
    if (this.previewHeading2El) {
      this.previewHeading2El.textContent = entityActive ? 'Properties' : 'Content Type';
    }
    if (this.previewHeading3El) {
      this.previewHeading3El.textContent = entityActive ? 'Related Entities' : 'Word Count';
    }
  }

  private applySearchFilter() {
    const term = this.searchInput?.value?.trim().toLowerCase() || '';
    const source = this.stubs;
    if (!term) {
      this.filtered = [...source];
    } else {
      this.filtered = source.filter((entry) => {
        return (
          entry.name.toLowerCase().includes(term) ||
          entry.slug.toLowerCase().includes(term) ||
          entry.type.toLowerCase().includes(term)
        );
      });
    }
    if (this.mode === 'entity') {
      this.entityFiltered = [...this.filtered];
    } else {
      this.postFiltered = [...this.filtered];
    }
    this.renderList();
  }

  private renderList() {
    if (!this.listEl) return;
    if (!this.filtered.length) {
      this.listEl.innerHTML =
        this.mode === 'entity'
          ? '<p class="text-sm text-body-muted px-2 py-3">No stub entities match your search.</p>'
          : '<p class="text-sm text-body-muted px-2 py-3">No stub posts match your search.</p>';
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
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">${escapeHtml(entry.name)}</p>
            <p class="text-[11px] uppercase tracking-wide text-body-muted">${entry.type}</p>
          </div>
          <span class="rounded-full bg-surface-accent px-2 py-0.5 text-[11px] font-semibold text-accent">${entry.references.length} link${entry.references.length === 1 ? '' : 's'}</span>
        </div>
        <p class="mt-1 text-xs text-body-muted">${escapeHtml(entry.slug)}</p>
      `;
      fragment.appendChild(button);
    });

    this.listEl.innerHTML = '';
    this.listEl.appendChild(fragment);
  }

  private updateCounts() {
    if (this.countEl) {
      this.countEl.textContent = String(this.mode === 'entity' ? this.entityStubs.length : this.postStubs.length);
    }
  }

  private selectStub(key: string) {
    const entry = this.stubs.find((stub) => stub.key === key);
    this.selectedKey = entry ? entry.key : null;
    this.validatedPayload = null;
    this.entityJsonInput && (this.entityJsonInput.value = '');
    this.postJsonInput && (this.postJsonInput.value = '');
    this.previewSummaryEl && (this.previewSummaryEl.textContent = 'Waiting for validation…');
    this.previewPropsEl && (this.previewPropsEl.textContent = '—');
    this.previewRelatedEl && (this.previewRelatedEl.textContent = '—');
    this.setStatus('');

    if (!entry) {
      this.detailPanel?.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
      this.renderList();
      return;
    }

    this.detailPanel?.classList.remove('hidden');
    this.emptyState?.classList.add('hidden');
    this.selectedNameEl && (this.selectedNameEl.textContent = entry.name);
    this.selectedTypeEl && (this.selectedTypeEl.textContent = startCase(entry.type));
    this.filePathEl && (this.filePathEl.textContent = entry.filePath || '—');
    if (this.promptTextArea) {
      this.promptTextArea.value = entry.prompt;
      this.promptTextArea.scrollTop = 0;
    }
    if (this.referenceBadgeEl) {
      this.referenceBadgeEl.textContent = String(entry.references.length);
    }
    this.renderReferences(entry.references);
    this.renderList();
  }

  private renderReferences(references: StubReference[]) {
    if (!this.referenceListEl) return;
    if (!references.length) {
      this.referenceListEl.innerHTML =
        this.mode === 'entity'
          ? '<p class="text-xs text-body-muted">No posts reference this entity yet.</p>'
          : '<p class="text-xs text-body-muted">No reference posts recorded for this stub yet.</p>';
      return;
    }
    const list = document.createElement('ul');
    list.className = 'space-y-2';
    references.slice(0, MAX_REFERENCES).forEach((ref) => {
      const li = document.createElement('li');
      li.className = 'rounded-lg border border-line-subtle bg-surface-base/80 px-3 py-2';
      li.innerHTML = `
        <div class="text-sm font-medium text-body-strong">${escapeHtml(ref.title)}</div>
        <div class="text-[11px] text-body-muted">/post/${escapeHtml(ref.slug)}</div>
      `;
      list.appendChild(li);
    });
    this.referenceListEl.innerHTML = '';
    this.referenceListEl.appendChild(list);
  }

  private copyPrompt() {
    if (!this.promptTextArea) return;
    const value = this.promptTextArea.value;
    if (!value) {
      this.setStatus('No prompt available for this stub yet.', 'error');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => this.setStatus('Prompt copied to clipboard.', 'success'))
        .catch(() => this.fallbackCopy(value));
    } else {
      this.fallbackCopy(value);
    }
  }

  private fallbackCopy(_value: string) {
    if (!this.promptTextArea) return;
    this.promptTextArea.select();
    const execCommand = (document as unknown as {
      execCommand?: (commandId: string) => boolean;
    }).execCommand;
    if (execCommand) execCommand('copy');
    this.setStatus('Prompt copied to clipboard.', 'success');
  }

  private handleValidate() {
    if (!this.selectedKey) {
      this.setStatus('Select a stub to validate.', 'error');
      return;
    }
    const parsed = this.parseJsonInput();
    if (!parsed) return;
    this.validatedPayload = parsed;
    this.updatePreview(parsed);
    this.setStatus(this.mode === 'entity' ? 'JSON looks good—ready to save.' : 'PostSpec JSON looks good—ready to ingest.', 'success');
  }

  private parseJsonInput(): SavePayload | Record<string, unknown> | null {
    const input = this.mode === 'entity' ? this.entityJsonInput : this.postJsonInput;
    if (!input) return null;
    const raw = input.value.trim();
    if (!raw) {
      this.setStatus(
        this.mode === 'entity'
          ? 'Paste the completed entity JSON first.'
          : 'Paste the PostSpec JSON first.',
        'error',
      );
      return null;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.setStatus('Invalid JSON. Make sure the payload is valid JSON.', 'error');
      return null;
    }
    if (!parsed || typeof parsed !== 'object') {
      this.setStatus(this.mode === 'entity' ? 'Entity must be a JSON object.' : 'PostSpec must be a JSON object.', 'error');
      return null;
    }

    if (this.mode === 'post') {
      const specVersion = Number(parsed.specVersion);
      const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
      const slug = typeof parsed.slug === 'string' ? parsed.slug.trim() : '';
      if (specVersion !== 2 || !title || !slug) {
        this.setStatus('PostSpec must include specVersion: 2, title, and slug.', 'error');
        return null;
      }
      return parsed;
    }

    const entry = this.stubs.find((stub) => stub.key === this.selectedKey);
    if (!entry) {
      this.setStatus('Selected stub no longer exists. Refresh and try again.', 'error');
      return null;
    }

    const type = typeof parsed.type === 'string' ? parsed.type.trim() : '';
    const slug = typeof parsed.slug === 'string' ? parsed.slug.trim() : '';
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const properties =
      parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : {};
    const related = Array.isArray(parsed.related) ? parsed.related.map((item: any) => String(item)) : [];

    if (!type || !slug || !name || !summary) {
      this.setStatus('type, slug, name, and summary are required fields.', 'error');
      return null;
    }
    if (type !== entry.type || slug !== entry.slug) {
      this.setStatus('Type or slug do not match the selected stub.', 'error');
      return null;
    }
    if (summary.length < 40) {
      this.setStatus('Summary looks short—aim for at least a few sentences.', 'warning');
    }

    return { type, slug, name, summary, properties, related };
  }

  private updatePreview(payload: SavePayload | Record<string, unknown>) {
    if (this.mode === 'post') {
      const post = payload as Record<string, unknown>;
      if (this.previewSummaryEl) {
        this.previewSummaryEl.textContent =
          typeof post.title === 'string' && post.title.trim() ? post.title.trim() : '—';
      }
      if (this.previewPropsEl) {
        this.previewPropsEl.textContent =
          typeof post.contentType === 'string' && post.contentType.trim()
            ? post.contentType.trim()
            : '(not set)';
      }
      if (this.previewRelatedEl) {
        const wordCount = post.wordCount;
        this.previewRelatedEl.textContent =
          typeof wordCount === 'number' || (typeof wordCount === 'string' && wordCount.trim())
            ? String(wordCount)
            : '(not set)';
      }
      return;
    }

    const entity = payload as SavePayload;
    if (this.previewSummaryEl) this.previewSummaryEl.textContent = entity.summary || '—';
    if (this.previewPropsEl) {
      const propCount = Object.keys(entity.properties || {}).length;
      this.previewPropsEl.textContent = `${propCount} field${propCount === 1 ? '' : 's'}`;
    }
    if (this.previewRelatedEl) {
      this.previewRelatedEl.textContent = entity.related && entity.related.length
        ? entity.related.join(', ')
        : 'No related entities provided';
    }
  }

  private async handleSave() {
    if (!this.selectedKey) {
      this.setStatus('Select a stub before saving.', 'error');
      return;
    }
    const payload = this.validatedPayload || this.parseJsonInput();
    if (!payload) return;

    const activeSaveBtn = this.mode === 'entity' ? this.entitySaveBtn : this.postSaveBtn;
    if (activeSaveBtn) activeSaveBtn.disabled = true;

    try {
      if (this.mode === 'entity') {
        const entity = payload as SavePayload;
        this.setStatus('Saving entity…', 'info');
        const response = await this.apiFetch('/entities/save', {
          method: 'POST',
          headers: this.jsonHeaders,
          body: JSON.stringify(entity),
        });
        const data = await response.json();
        if (!response.ok || data?.ok === false) {
          throw new Error(data?.error || 'Failed to save entity');
        }
        this.setStatus('Entity saved. Refreshing stubs…', 'success');
        this.removeStub(entity.type, entity.slug);
        this.fetchStubs(false);
      } else {
        this.setStatus('Ingesting post…', 'info');
        const raw = this.postJsonInput?.value?.trim() || JSON.stringify(payload);
        const response = await this.apiFetch('/ingest', {
          method: 'POST',
          headers: this.jsonHeaders,
          body: raw,
        });
        const data = await response.json();
        if (!response.ok || data?.ok === false) {
          throw new Error(data?.error || 'Failed to ingest post');
        }
        const slug = typeof (payload as any).slug === 'string' ? (payload as any).slug.trim() : '';
        this.setStatus('Post ingested.', 'success');
        if (slug) this.removeStub('post', slug);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : this.mode === 'entity'
          ? 'Failed to save entity'
          : 'Failed to ingest post';
      this.setStatus(message, 'error');
    } finally {
      if (activeSaveBtn) activeSaveBtn.disabled = false;
    }
  }

  private removeStub(type: string, slug: string) {
    const key = `${type}:${slug}`;
    if (this.mode === 'entity') {
      this.entityStubs = this.entityStubs.filter((entry) => entry.key !== key);
      this.entityFiltered = this.entityFiltered.filter((entry) => entry.key !== key);
      this.stubs = [...this.entityStubs];
      this.filtered = [...this.entityFiltered];
    } else {
      this.postStubs = this.postStubs.filter((entry) => entry.key !== key);
      this.postFiltered = this.postFiltered.filter((entry) => entry.key !== key);
      this.stubs = [...this.postStubs];
      this.filtered = [...this.postFiltered];
    }
    if (this.selectedKey === key) {
      this.selectedKey = null;
      this.detailPanel?.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
    }
    this.applySearchFilter();
    this.renderList();
    this.updateCounts();
  }

  private async fetchStubs(setStatus = true) {
    if (this.refreshBtn) this.refreshBtn.disabled = true;
    if (setStatus) {
      this.setStatus('Refreshing stub list…', 'info');
    }
    try {
      const endpoint = this.mode === 'entity' ? '/entities/stubs' : '/posts/stubs';
      // TODO: wire /posts/stubs in dev-api.js
      const response = await this.apiFetch(endpoint, {
        method: 'POST',
        headers: this.jsonHeaders,
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || 'Failed to load stub prompts');
      }
      const entries = Array.isArray(data.stubs) ? data.stubs : [];
      const mapped = entries.map((item: any) => ({
        key: `${item.type}:${item.slug}`,
        type: item.type,
        slug: item.slug,
        name: item.name || item.slug,
        prompt: item.prompt || '',
        filePath: item.filePath || item.relativePath || '',
        references: Array.isArray(item.references) ? item.references : [],
        stubRationale: item.stubRationale || '',
        stubParentSlug: item.stubParentSlug || '',
        stubParentTitle: item.stubParentTitle || '',
      }));
      if (this.mode === 'entity') {
        this.entityStubs = mapped;
        this.entityFiltered = [...this.entityStubs];
        this.stubs = [...this.entityStubs];
        this.filtered = [...this.entityFiltered];
      } else {
        this.postStubs = mapped;
        this.postFiltered = [...this.postStubs];
        this.stubs = [...this.postStubs];
        this.filtered = [...this.postFiltered];
      }
      this.applySearchFilter();
      this.renderList();
      this.updateCounts();
      if (this.stubs.length === 0) {
        this.detailPanel?.classList.add('hidden');
        this.emptyState?.classList.remove('hidden');
      }
      if (setStatus) {
        this.setStatus('Stub list refreshed.', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh stubs';
      this.setStatus(message, 'error');
    } finally {
      if (this.refreshBtn) this.refreshBtn.disabled = false;
    }
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

function startCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value: string) {
  return value
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
