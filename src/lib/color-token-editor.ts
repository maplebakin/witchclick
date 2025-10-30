import { COLOR_TOKEN_FIELDS, COLOR_TOKEN_DEFAULTS } from './color-token-schema';

type ThemeMode = 'midnight' | 'dawn';

type TokenState = {
  mode: ThemeMode;
  values: Record<ThemeMode, Record<string, string>>;
  updatedAt: string | null;
  dirty: boolean;
};

const MODE_KEYS: ThemeMode[] = ['midnight', 'dawn'];
const TOKEN_KEYS = COLOR_TOKEN_FIELDS.map((field) => field.key);

function cloneDefaults(): Record<ThemeMode, Record<string, string>> {
  return {
    midnight: { ...COLOR_TOKEN_DEFAULTS.midnight },
    dawn: { ...COLOR_TOKEN_DEFAULTS.dawn },
  } as Record<ThemeMode, Record<string, string>>;
}

function normalizeColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^#?[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.replace('#', '')}`.toLowerCase();
  }
  if (/^#?[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.replace('#', '')}`.toLowerCase();
  }
  return trimmed;
}

async function postJson<T>(endpoint: string, payload?: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    const message = data?.error || `Request to ${endpoint} failed`;
    throw new Error(message);
  }
  return data as T;
}

function updateStatus(statusEl: HTMLElement | null, message: string, variant: 'info' | 'success' | 'error' = 'info'): void {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.variant = variant;
  statusEl.className = 'text-sm';
  const color =
    variant === 'error'
      ? 'var(--error, #f87171)'
      : variant === 'success'
        ? 'var(--success, #4ade80)'
        : 'var(--text-muted, #6b7280)';
  statusEl.style.color = color;
}

function toggleModeButtons(buttons: HTMLElement[], mode: ThemeMode): void {
  buttons.forEach((btn) => {
    const btnMode = btn.getAttribute('data-token-mode') as ThemeMode | null;
    if (!btnMode) return;
    if (btnMode === mode) {
      btn.setAttribute('data-active', 'true');
      btn.classList.remove('hover:bg-surface-soft');
    } else {
      btn.removeAttribute('data-active');
      if (!btn.classList.contains('hover:bg-surface-soft')) {
        btn.classList.add('hover:bg-surface-soft');
      }
    }
  });
}

function toggleTabButtons(buttons: HTMLElement[], target: string): void {
  buttons.forEach((btn) => {
    const tab = btn.getAttribute('data-editor-tab');
    if (tab === target) {
      btn.setAttribute('data-active', 'true');
    } else {
      btn.removeAttribute('data-active');
    }
  });
}

function showPanel(panels: HTMLElement[], target: string): void {
  panels.forEach((panel) => {
    const panelKey = panel.getAttribute('data-theme-panel');
    if (panelKey === target) {
      panel.removeAttribute('hidden');
      panel.classList.remove('hidden');
    } else {
      panel.setAttribute('hidden', '');
      if (!panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
      }
    }
  });
}

(function initialize() {
  const root = document.getElementById('themeEditorRoot');
  if (!root) return;

  const devApi = root.getAttribute('data-dev-api') || 'http://localhost:8787';
  const tabsHost = root.querySelector('[data-editor-tabs]');
  const tabButtons = tabsHost ? Array.from(tabsHost.querySelectorAll<HTMLElement>('[data-editor-tab]')) : [];
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-theme-panel]'));

  if (tabButtons.length && panels.length) {
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-editor-tab');
        if (!target) return;
        toggleTabButtons(tabButtons, target);
        showPanel(panels, target);
      });
    });
  }

  const tokensPanel = root.querySelector<HTMLElement>('[data-theme-panel="tokens"]');
  if (!tokensPanel) return;

  const modeButtons = Array.from(tokensPanel.querySelectorAll<HTMLElement>('[data-token-mode]'));
  const statusEl = tokensPanel.querySelector<HTMLElement>('[data-token-status]');
  const saveBtn = tokensPanel.querySelector<HTMLButtonElement>('#saveColorTokensBtn');
  const resetBtn = tokensPanel.querySelector<HTMLButtonElement>('#resetColorTokensBtn');
  const previewHeading = tokensPanel.querySelector<HTMLElement>('[data-token-preview-heading]');
  const previewBody = tokensPanel.querySelector<HTMLElement>('[data-token-preview-body]');
  const previewMuted = tokensPanel.querySelector<HTMLElement>('[data-token-preview-muted]');
  const previewLink = tokensPanel.querySelector<HTMLAnchorElement>('[data-token-preview-link]');

  const pickers = new Map<string, HTMLInputElement>();
  const inputs = new Map<string, HTMLInputElement>();

  COLOR_TOKEN_FIELDS.forEach((field) => {
    const picker = tokensPanel.querySelector<HTMLInputElement>(`[data-token-picker="${field.key}"]`);
    const input = tokensPanel.querySelector<HTMLInputElement>(`[data-token-input="${field.key}"]`);
    if (picker) pickers.set(field.key, picker);
    if (input) inputs.set(field.key, input);
  });

  const state: TokenState = {
    mode: 'midnight',
    values: cloneDefaults(),
    updatedAt: null,
    dirty: false,
  };

  function applyValuesToInputs(): void {
    const values = state.values[state.mode];
    TOKEN_KEYS.forEach((key) => {
      const input = inputs.get(key);
      const picker = pickers.get(key);
      const value = values[key] ?? '';
      if (input) input.value = value;
      if (picker) {
        if (value.startsWith('#')) {
          picker.value = value;
        } else if (/^#?[0-9a-f]{6}$/i.test(value)) {
          picker.value = `#${value.replace('#', '')}`;
        }
      }
    });
  }

function updatePreview(): void {
    const values = state.values[state.mode];
    const defaults = COLOR_TOKEN_DEFAULTS[state.mode] ?? {};
    if (previewHeading) {
      previewHeading.style.color = values.textStrong || defaults.textStrong || values.textPrimary || defaults.textPrimary || '#fff';
    }
    if (previewBody) {
      previewBody.style.color = values.textBody || defaults.textBody || values.textPrimary || defaults.textPrimary || '#fff';
    }
    if (previewMuted) {
      previewMuted.style.color =
        values.textMuted ||
        defaults.textMuted ||
        values.textSubtle ||
        defaults.textSubtle ||
        values.textSecondary ||
        defaults.textSecondary ||
        '#cbd5f5';
    }
    if (previewLink) {
      previewLink.style.color = values.linkColor || defaults.linkColor || values.textAccent || defaults.textAccent || '#e0c07d';
    }
  }

  function setDirty(isDirty: boolean): void {
    state.dirty = isDirty;
    if (saveBtn) {
      saveBtn.disabled = !state.dirty;
    }
  }

  function setMode(mode: ThemeMode): void {
    state.mode = mode;
    toggleModeButtons(modeButtons, mode);
    applyValuesToInputs();
    updatePreview();
  }

  function commitValue(key: string, raw: string): void {
    const normalized = normalizeColor(raw);
    const previous = state.values[state.mode][key] ?? '';
    if (previous === normalized) return;
    state.values[state.mode][key] = normalized;
    setDirty(true);
    updatePreview();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-token-mode') as ThemeMode | null;
      if (!mode || mode === state.mode) return;
      setMode(mode);
    });
  });

  pickers.forEach((picker, key) => {
    picker.addEventListener('input', () => {
      const input = inputs.get(key);
      if (input) input.value = picker.value;
      commitValue(key, picker.value);
    });
  });

  inputs.forEach((input, key) => {
    input.addEventListener('input', () => {
      commitValue(key, input.value);
    });
    input.addEventListener('blur', () => {
      const normalized = normalizeColor(input.value);
      if (normalized) {
        input.value = normalized;
        const picker = pickers.get(key);
        if (picker && normalized.startsWith('#')) {
          picker.value = normalized;
        }
      }
      commitValue(key, normalized);
    });
  });

  async function loadTokens(): Promise<void> {
    try {
      updateStatus(statusEl, 'Loading color tokens…', 'info');
      const data = await postJson<{ ok: boolean; tokens: Record<string, Record<string, string>>; updatedAt?: string }>(
        `${devApi}/color-tokens/get`
      );
      const defaults = cloneDefaults();
      MODE_KEYS.forEach((mode) => {
        const fromServer = data.tokens?.[mode] || {};
        state.values[mode] = { ...defaults[mode], ...fromServer };
      });
      state.updatedAt = data.updatedAt ?? null;
      setDirty(false);
      applyValuesToInputs();
      updatePreview();
      updateStatus(statusEl, state.updatedAt ? `Last saved ${new Date(state.updatedAt).toLocaleString()}` : 'Loaded defaults', 'info');
    } catch (error) {
      console.error(error);
      updateStatus(statusEl, error instanceof Error ? error.message : 'Failed to load color tokens', 'error');
    }
  }

  async function saveTokens(): Promise<void> {
    try {
      updateStatus(statusEl, 'Saving color tokens…', 'info');
      const payload = {
        tokens: state.values,
      };
      const data = await postJson<{ ok: boolean; tokens: Record<string, Record<string, string>>; updatedAt: string }>(
        `${devApi}/color-tokens/save`,
        payload
      );
      const defaults = cloneDefaults();
      MODE_KEYS.forEach((mode) => {
        state.values[mode] = { ...defaults[mode], ...(data.tokens?.[mode] || {}) };
      });
      state.updatedAt = data.updatedAt;
      setDirty(false);
      applyValuesToInputs();
      updatePreview();
      updateStatus(statusEl, 'Color tokens saved and CSS regenerated.', 'success');
    } catch (error) {
      console.error(error);
      updateStatus(statusEl, error instanceof Error ? error.message : 'Failed to save color tokens', 'error');
    }
  }

  saveBtn?.addEventListener('click', () => {
    void saveTokens();
  });

  resetBtn?.addEventListener('click', () => {
    void loadTokens();
  });

  setMode('midnight');
  void loadTokens();
})();
