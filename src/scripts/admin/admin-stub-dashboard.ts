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
  private stubs: StubEntry[] = [];
  private filtered: StubEntry[] = [];
  private selectedKey: string | null = null;
  private validatedEntity: SavePayload | null = null;

  private listEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private countEl: HTMLElement | null = null;
  private referenceListEl: HTMLElement | null = null;
  private referenceBadgeEl: HTMLElement | null = null;
  private promptTextArea: HTMLTextAreaElement | null = null;
  private copyPromptBtn: HTMLButtonElement | null = null;
  private jsonInput: HTMLTextAreaElement | null = null;
  private validateBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private detailPanel: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private selectedNameEl: HTMLElement | null = null;
  private selectedTypeEl: HTMLElement | null = null;
  private filePathEl: HTMLElement | null = null;
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
      const raw = this.root.getAttribute('data-stubs') || '[]';
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [];
      this.stubs = entries.map((item) => ({
        key: `${item.type}:${item.slug}`,
        type: item.type,
        slug: item.slug,
        name: item.name || item.slug,
        prompt: item.prompt || '',
        filePath: item.filePath || '',
        references: Array.isArray(item.references) ? item.references : [],
      }));
      this.filtered = [...this.stubs];
    } catch {
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
    this.jsonInput = this.root.querySelector<HTMLTextAreaElement>('[data-json-input]');
    this.validateBtn = this.root.querySelector<HTMLButtonElement>('[data-validate]');
    this.saveBtn = this.root.querySelector<HTMLButtonElement>('[data-save]');
    this.statusEl = this.root.querySelector('[data-status]');
    this.refreshBtn = this.root.querySelector<HTMLButtonElement>('[data-refresh]');
    this.detailPanel = this.root.querySelector('[data-detail-panel]');
    this.emptyState = this.root.querySelector('[data-empty-state]');
    this.selectedNameEl = this.root.querySelector('[data-selected-name]');
    this.selectedTypeEl = this.root.querySelector('[data-selected-type]');
    this.filePathEl = this.root.querySelector('[data-file-path]');
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
      const term = this.searchInput?.value?.trim().toLowerCase() || '';
      if (!term) {
        this.filtered = [...this.stubs];
      } else {
        this.filtered = this.stubs.filter((entry) => {
          return (
            entry.name.toLowerCase().includes(term) ||
            entry.slug.toLowerCase().includes(term) ||
            entry.type.toLowerCase().includes(term)
          );
        });
      }
      this.renderList();
    });

    this.copyPromptBtn?.addEventListener('click', () => this.copyPrompt());
    this.validateBtn?.addEventListener('click', () => this.handleValidate());
    this.saveBtn?.addEventListener('click', () => this.handleSave());
    this.refreshBtn?.addEventListener('click', () => this.fetchStubs());
    document.addEventListener('keydown', (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      if (!this.selectedKey || !this.saveBtn || this.saveBtn.disabled) return;
      event.preventDefault();
      this.saveBtn.click();
    });
  }

  private renderList() {
    if (!this.listEl) return;
    if (!this.filtered.length) {
      this.listEl.innerHTML =
        '<p class="text-sm text-body-muted px-2 py-3">No stub entities match your search.</p>';
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
      this.countEl.textContent = String(this.stubs.length);
    }
  }

  private selectStub(key: string) {
    const entry = this.stubs.find((stub) => stub.key === key);
    this.selectedKey = entry ? entry.key : null;
    this.validatedEntity = null;
    this.jsonInput && (this.jsonInput.value = '');
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
        '<p class="text-xs text-body-muted">No posts reference this entity yet.</p>';
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
      this.setStatus('No prompt available for this entity yet.', 'error');
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
    this.validatedEntity = parsed;
    this.updatePreview(parsed);
    this.setStatus('JSON looks good—ready to save.', 'success');
  }

  private parseJsonInput(): SavePayload | null {
    if (!this.jsonInput) return null;
    const raw = this.jsonInput.value.trim();
    if (!raw) {
      this.setStatus('Paste the completed entity JSON first.', 'error');
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
      this.setStatus('Entity must be a JSON object.', 'error');
      return null;
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

  private updatePreview(entity: SavePayload) {
    if (this.previewSummaryEl) {
      this.previewSummaryEl.textContent = entity.summary || '—';
    }
    if (this.previewPropsEl) {
      const propCount = Object.keys(entity.properties || {}).length;
      this.previewPropsEl.textContent = `${propCount} field${propCount === 1 ? '' : 's'}`;
    }
    if (this.previewRelatedEl) {
      this.previewRelatedEl.textContent =
        entity.related && entity.related.length
          ? entity.related.join(', ')
          : 'No related entities provided';
    }
  }

  private async handleSave() {
    if (!this.selectedKey) {
      this.setStatus('Select a stub before saving.', 'error');
      return;
    }
    const entity = this.validatedEntity || this.parseJsonInput();
    if (!entity) return;

    if (this.saveBtn) this.saveBtn.disabled = true;
    this.setStatus('Saving entity…', 'info');

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save entity';
      this.setStatus(message, 'error');
    } finally {
      if (this.saveBtn) this.saveBtn.disabled = false;
    }
  }

  private removeStub(type: string, slug: string) {
    const key = `${type}:${slug}`;
    this.stubs = this.stubs.filter((entry) => entry.key !== key);
    this.filtered = this.filtered.filter((entry) => entry.key !== key);
    if (this.selectedKey === key) {
      this.selectedKey = null;
      this.detailPanel?.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
    }
    this.renderList();
    this.updateCounts();
  }

  private async fetchStubs(setStatus = true) {
    if (this.refreshBtn) this.refreshBtn.disabled = true;
    if (setStatus) {
      this.setStatus('Refreshing stub list…', 'info');
    }
    try {
      const response = await this.apiFetch('/entities/stubs', {
        method: 'POST',
        headers: this.jsonHeaders,
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || 'Failed to load stub prompts');
      }
      const entries = Array.isArray(data.stubs) ? data.stubs : [];
      this.stubs = entries.map((item: any) => ({
        key: `${item.type}:${item.slug}`,
        type: item.type,
        slug: item.slug,
        name: item.name || item.slug,
        prompt: item.prompt || '',
        filePath: item.filePath || '',
        references: Array.isArray(item.references) ? item.references : [],
      }));
      this.filtered = [...this.stubs];
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
