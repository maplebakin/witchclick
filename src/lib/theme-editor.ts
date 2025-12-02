/**
 * Theme Editor - Client-side logic for the admin theme page
 * Handles all interactions, live preview, and persistence
 */

import { ThemeManager, type ThemeMode, type ThemePreset, type ThemeVariables, slugify } from './theme-manager';
import { UndoRedo } from './undo-redo';
import { checkContrast, formatRatio, hexToRgb } from './contrast-checker';
import {
  initializeAllColorElements,
  setupAllColorListeners,
  populateAllFormInputs,
  collectAllFormValues,
  updateAllPreviewVariables,
  colorToHex,
} from './theme-editor-comprehensive';
import { THEME_SCOPES } from './theme-scopes';

export interface ThemeEditorOptions {
  /**
   * Optional API base URL override. Falls back to the root element's
   * `data-dev-api` attribute and finally to the localhost default.
   */
  devApi?: string;
  /**
   * Optional explicit root element. Defaults to `#themeEditorRoot`.
   */
  root?: HTMLElement | null;
}

interface EditorState {
  mode: ThemeMode;
  currentPreset: ThemePreset | null;
  editingScope: string; // scope ID like 'global', 'grimoire', 'header', etc.
  categoryFilter: string;
}

type ElementValue =
  | HTMLElement
  | HTMLInputElement
  | HTMLSelectElement
  | Array<HTMLElement | HTMLInputElement | HTMLSelectElement>
  | null;

export class ThemeEditor {
  private root: HTMLElement | null;
  private manager: ThemeManager;
  private undoRedo: UndoRedo<EditorState>;
  private state: EditorState;
  private elements: Record<string, ElementValue> = {};
  private skipNextSync = false; // Flag to skip sync after explicit preset load

  constructor(options: ThemeEditorOptions = {}) {
    const root = options.root ?? document.getElementById('themeEditorRoot');
    const devApi = options.devApi ?? root?.getAttribute('data-dev-api') ?? 'http://localhost:8787';

    this.root = root;
    this.manager = new ThemeManager({ baseUrl: devApi });

    // Initialize with default state
    this.state = {
      mode: 'midnight',
      currentPreset: null,
      editingScope: 'global',
      categoryFilter: '',
    };

    this.undoRedo = new UndoRedo<EditorState>(
      this.state,
      50,
      (newState) => this.applyState(newState)
    );

    this.initializeElements();
    this.updateWatcherStatus();
    this.setupEventListeners();
    void this.loadInitialState();
    this.render();
  }

  private initializeElements(): void {
    // Mode and basic controls
    this.elements.modeSelect = document.getElementById('themeMode');
    this.elements.nameInput = document.getElementById('themeName') as HTMLInputElement | null;
    this.elements.slugInput = document.getElementById('themeSlug') as HTMLInputElement | null;
    this.elements.categorySelect = document.getElementById('themeCategory');
    this.elements.categoryFilter = document.getElementById('categoryFilter');

    // Scope selector
    this.elements.scopeSelector = document.getElementById('scopeSelector');
    this.elements.scopeCards = Array.from(document.querySelectorAll<HTMLElement>('[data-scope-card]'));
    this.elements.scopeInfo = document.querySelector<HTMLElement>('[data-scope-info]');
    this.elements.scopeLabel = document.querySelector<HTMLElement>('[data-scope-label]');
    this.elements.scopeDescription = document.querySelector<HTMLElement>('[data-scope-description]');
    this.elements.scopeHasOverride = document.querySelector<HTMLElement>('[data-scope-has-override]');
    this.elements.scopeNoOverride = document.querySelector<HTMLElement>('[data-scope-no-override]');
    this.elements.scopeOverview = document.querySelector<HTMLElement>('[data-scope-overview]');
    this.elements.clearScopeBtn = document.querySelector<HTMLElement>('[data-clear-scope]');

    // All color and font inputs (comprehensive)
    initializeAllColorElements(this.elements);

    // Legacy color inputs for backwards compatibility
    ['primary', 'accent', 'background', 'textPrimary', 'textHeading', 'textMuted'].forEach((key) => {
      this.elements[`${key}Picker`] = document.querySelector<HTMLInputElement>(`[data-color-picker="${key}"]`);
      this.elements[`${key}Input`] = document.querySelector<HTMLInputElement>(`[data-color-input="${key}"]`);
    });

    // Legacy font selects
    this.elements.fontSerifSelect = document.getElementById('themeFontSerif');
    this.elements.fontScriptSelect = document.getElementById('themeFontScript');

    // Action buttons
    this.elements.saveBtn = document.getElementById('saveThemeBtn');
    this.elements.setActiveBtn = document.getElementById('setActiveThemeBtn');
    this.elements.deleteBtn = document.getElementById('deleteThemeBtn');
    this.elements.duplicateBtn = document.getElementById('duplicateThemeBtn');
    this.elements.newThemeBtn = document.getElementById('newThemeBtn');
    this.elements.newMidnightBtn = document.querySelector<HTMLElement>('[data-new-theme="midnight"]');
    this.elements.newDawnBtn = document.querySelector<HTMLElement>('[data-new-theme="dawn"]');

    // New theme modal
    this.elements.newThemeModal = document.getElementById('newThemeModal');
    this.elements.cancelNewTheme = document.getElementById('cancelNewTheme');
    this.elements.createMidnightBtn = document.querySelector<HTMLElement>('[data-create-theme="midnight"]');
    this.elements.createDawnBtn = document.querySelector<HTMLElement>('[data-create-theme="dawn"]');

    // Undo/Redo
    this.elements.undoBtn = document.getElementById('undoBtn');
    this.elements.redoBtn = document.getElementById('redoBtn');

    // Import/Export
    this.elements.exportBtn = document.getElementById('exportBtn');
    this.elements.exportAllBtn = document.getElementById('exportAllBtn');
    this.elements.importBtn = document.getElementById('importBtn');
    this.elements.importInput = document.getElementById('importInput');

    // Lists and status
    this.elements.midnightList = document.querySelector<HTMLElement>('[data-theme-list="midnight"]');
    this.elements.dawnList = document.querySelector<HTMLElement>('[data-theme-list="dawn"]');
    this.elements.statusEl = document.querySelector<HTMLElement>('[data-status]');
    this.elements.breadcrumbs = document.querySelector<HTMLElement>('[data-breadcrumbs]');
    this.elements.watcherStatus = document.querySelector<HTMLElement>('[data-watcher-status]');

    // Preview
    this.elements.previewRoot = document.querySelector<HTMLElement>('[data-theme-preview]');
    this.elements.previewRoots = Array.from(document.querySelectorAll<HTMLElement>('[data-theme-preview]'));
    this.elements.contrastDisplay = document.querySelector<HTMLElement>('[data-contrast-display]');

    // Active labels
    this.elements.activeMidnight = document.querySelector<HTMLElement>('[data-active="midnight"]');
    this.elements.activeDawn = document.querySelector<HTMLElement>('[data-active="dawn"]');
  }

  private getEl<T extends HTMLElement = HTMLElement>(key: string): T | null {
    const value = this.elements[key];
    if (!value) return null;
    if (Array.isArray(value)) {
      const first = value.find((v) => v instanceof HTMLElement);
      return (first as T) ?? null;
    }
    return value as T;
  }

  private getEls<T extends HTMLElement = HTMLElement>(key: string): T[] {
    const value = this.elements[key];
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((v): v is T => v instanceof HTMLElement) as T[];
    }
    return value instanceof HTMLElement ? [value as T] : [];
  }

  private setupEventListeners(): void {
    // Mode change
    this.getEl<HTMLSelectElement>('modeSelect')?.addEventListener('change', () => {
      const newMode = (this.getEl<HTMLSelectElement>('modeSelect')?.value || this.state.mode) as ThemeMode;
      this.pushState({ ...this.state, mode: newMode });
      this.updatePreview();
    });

    // Category filter
    this.getEl<HTMLSelectElement>('categoryFilter')?.addEventListener('change', () => {
      const filter = this.getEl<HTMLSelectElement>('categoryFilter')?.value || '';
      this.state.categoryFilter = filter;
      this.renderLists();
    });

    // Scope selector
    this.getEl<HTMLSelectElement>('scopeSelector')?.addEventListener('change', () => {
      const newScope = this.getEl<HTMLSelectElement>('scopeSelector')?.value || this.state.editingScope;
      this.setEditingScope(newScope);
    });

    // Scope cards (single-page scopes)
    this.getEls<HTMLElement>('scopeCards').forEach((card) => {
      const scopeId = card.dataset.scopeCard;
      if (!scopeId) return;
      card.addEventListener('click', () => this.setEditingScope(scopeId, { scroll: true }));
    });

    // Clear scope overrides
    this.getEl('clearScopeBtn')?.addEventListener('click', () => {
      if (!this.state.currentPreset) return;
      if (!confirm(`Clear all overrides for this scope? This cannot be undone.`)) return;

      this.clearScopeOverride(this.state.editingScope);
      this.render();
      this.setStatus(`Cleared overrides for ${this.state.editingScope}`, 'success');
    });

    // Name input - auto-generate slug
    this.getEl<HTMLInputElement>('nameInput')?.addEventListener('input', () => {
      const name = this.getEl<HTMLInputElement>('nameInput')?.value || '';
      if (!this.state.currentPreset && name) {
        const slugInput = this.getEl<HTMLInputElement>('slugInput');
        if (slugInput) slugInput.value = slugify(name);
      }
      this.updatePreview();
    });

    // All comprehensive color and font inputs
    setupAllColorListeners(
      this.elements,
      () => {
        this.updatePreview();
        this.updateContrastCheck();
      },
      (value) => this.normalizeHex(value)
    );

    // Legacy color inputs - sync picker and text input, update preview
    ['primary', 'accent', 'background', 'textPrimary', 'textHeading', 'textMuted'].forEach((key) => {
      const picker = this.getEl<HTMLInputElement>(`${key}Picker`);
      const input = this.getEl<HTMLInputElement>(`${key}Input`);

      picker?.addEventListener('input', () => {
        if (input) input.value = picker.value;
        this.updatePreview();
        this.updateContrastCheck();
      });

      input?.addEventListener('input', () => {
        this.updatePreview();
      });

      input?.addEventListener('blur', () => {
        const normalized = this.normalizeHex(input.value);
        if (normalized && picker) {
          picker.value = normalized;
          input.value = normalized;
        }
        this.updatePreview();
        this.updateContrastCheck();
      });
    });

    // Legacy font selects
    this.getEl<HTMLSelectElement>('fontSerifSelect')?.addEventListener('change', () => this.updatePreview());
    this.getEl<HTMLSelectElement>('fontScriptSelect')?.addEventListener('change', () => this.updatePreview());

    // Action buttons
    this.getEl('saveBtn')?.addEventListener('click', () => {
      void this.save();
    });
    this.getEl('setActiveBtn')?.addEventListener('click', () => {
      void this.setActive();
    });
    this.getEl('deleteBtn')?.addEventListener('click', () => {
      void this.delete();
    });
    this.getEl('duplicateBtn')?.addEventListener('click', () => {
      void this.duplicate();
    });

    // New theme button (opens modal)
    this.getEl('newThemeBtn')?.addEventListener('click', () => {
      this.openNewThemeModal();
    });

    // New theme modal buttons
    this.getEl('cancelNewTheme')?.addEventListener('click', () => {
      this.closeNewThemeModal();
    });

    this.getEl('createMidnightBtn')?.addEventListener('click', () => {
      this.closeNewThemeModal();
      this.newTheme('midnight');
    });

    this.getEl('createDawnBtn')?.addEventListener('click', () => {
      this.closeNewThemeModal();
      this.newTheme('dawn');
    });

    // Close modal when clicking backdrop
    this.getEl('newThemeModal')?.addEventListener('click', (e) => {
      if (e.target === this.getEl('newThemeModal')) {
        this.closeNewThemeModal();
      }
    });

    // New theme buttons in library (legacy)
    this.getEl('newMidnightBtn')?.addEventListener('click', () => this.newTheme('midnight'));
    this.getEl('newDawnBtn')?.addEventListener('click', () => this.newTheme('dawn'));

    // Undo/Redo
    this.getEl('undoBtn')?.addEventListener('click', () => this.undo());
    this.getEl('redoBtn')?.addEventListener('click', () => this.redo());

    // Export/Import
    this.getEl('exportBtn')?.addEventListener('click', () => this.exportCurrent());
    this.getEl('exportAllBtn')?.addEventListener('click', () => this.exportAll());
    this.getEl('importBtn')?.addEventListener('click', () => this.getEl<HTMLInputElement>('importInput')?.click());
    this.getEl<HTMLInputElement>('importInput')?.addEventListener('change', (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void this.importFromFile(file);
    });

    // Subscribe to theme manager changes
    this.manager.subscribe(() => this.render());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modal if open
        const modal = this.getEl('newThemeModal');
        if (modal && !modal.classList.contains('hidden')) {
          this.closeNewThemeModal();
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void this.save();
      }
    });
  }

  private async loadInitialState(): Promise<void> {
    try {
      this.setStatus('Loading themes…', 'info');
      await this.manager.initialize();

      const activeMidnight = this.manager.getActivePreset('midnight');
      const activeDawn = this.manager.getActivePreset('dawn');
      const fallbackMidnight = this.manager.getPresets('midnight')[0] || null;
      const fallbackDawn = this.manager.getPresets('dawn')[0] || null;

      const preset = activeMidnight || activeDawn || fallbackMidnight || fallbackDawn;

      if (preset) {
        this.loadPreset(preset, true);
        this.setStatus(`Loaded "${preset.name}"`, 'success');
      } else {
        this.newTheme('midnight');
        this.setStatus('Ready to create a new theme', 'info');
      }
    } catch (error) {
      console.error('Failed to load themes', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to load themes', 'error');
    }
  }

  private pushState(newState: EditorState): void {
    this.state = newState;
    this.undoRedo.push(newState);
    this.render();
  }

  private applyState(newState: EditorState): void {
    this.state = newState;
    this.render();
  }

  private render(): void {
    this.syncCurrentPreset();
    this.updateBreadcrumbs();
    this.updateUndoRedoButtons();
    this.renderForm();
    this.renderLists();
    this.updateActiveLabels();
    this.updateScopeUI();
    this.updateScopeCards();
    this.updateScopeOverview();
    this.updateScopeSections();
    this.updatePreview();
    this.updateContrastCheck();
  }

  private syncCurrentPreset(): void {
    if (!this.state.currentPreset) return;

    // Skip sync if we just explicitly loaded a preset to prevent overwriting
    if (this.skipNextSync) {
      console.log('[ThemeEditor.syncCurrentPreset] Skipping sync (just loaded preset):', this.state.currentPreset.slug);
      this.skipNextSync = false;
      return;
    }

    console.log('[ThemeEditor.syncCurrentPreset] Fetching latest version of:', this.state.currentPreset.slug, 'from manager');
    const latest = this.manager.getPreset(this.state.currentPreset.mode, this.state.currentPreset.slug);
    console.log('[ThemeEditor.syncCurrentPreset] Manager returned:', latest?.slug, latest?.name);
    console.log('[ThemeEditor.syncCurrentPreset] Manager returned background:', latest?.variables.background);

    if (latest && latest.updatedAt !== this.state.currentPreset.updatedAt) {
      console.log('[ThemeEditor.syncCurrentPreset] Syncing to latest version of:', latest.slug);
      console.log('[ThemeEditor.syncCurrentPreset] Old background:', this.state.currentPreset.variables.background);
      console.log('[ThemeEditor.syncCurrentPreset] New background:', latest.variables.background);

      this.state = {
        ...this.state,
        currentPreset: latest,
      };
    }
  }

  private renderForm(): void {
    const preset = this.state.currentPreset;
    const mode = this.state.mode;
    const defaults = this.getBaseVariables();

    // Mode select
    const modeSelect = this.getEl<HTMLSelectElement>('modeSelect');
    if (modeSelect) {
      modeSelect.value = mode;
    }
    const scopeSelect = this.getEl<HTMLSelectElement>('scopeSelector');
    if (scopeSelect) {
      scopeSelect.value = this.state.editingScope;
    }

    // Name and slug
    const nameInput = this.getEl<HTMLInputElement>('nameInput');
    if (nameInput) {
      nameInput.value = preset?.name || '';
    }
    const slugInput = this.getEl<HTMLInputElement>('slugInput');
    if (slugInput) {
      slugInput.value = preset?.slug || '';
    }
    const categorySelect = this.getEl<HTMLSelectElement>('categorySelect');
    if (categorySelect) {
      categorySelect.value = preset?.category || 'custom';
    }

    // Get scope-specific variables (will return global variables if scope is 'global')
    const scopeVariables = this.getScopeVariables();

    // Populate all comprehensive color and font inputs with scope-specific variables
    populateAllFormInputs(
      this.elements,
      scopeVariables,
      defaults
    );

    // Legacy colors (primary/accent/background + quick text fields)
    const isGlobalScope = this.state.editingScope === 'global';
    const legacyKeys: Array<keyof ThemeVariables> = [
      'primary',
      'accent',
      'background',
      'textPrimary',
      'textHeading',
      'textMuted',
    ];
    legacyKeys.forEach((key) => {
      const scopeValue = scopeVariables[key];
      const fallbackValue = preset?.variables[key] || defaults[key] || '';
      const pickerValue = colorToHex(scopeValue || fallbackValue || '');

      const picker = this.elements[`${key}Picker`] as HTMLInputElement;
      const input = this.elements[`${key}Input`] as HTMLInputElement;

      if (picker && pickerValue) {
        picker.value = pickerValue;
      }

      if (input) {
        input.value = isGlobalScope ? fallbackValue : scopeValue || '';
        if (!isGlobalScope) {
          input.placeholder = fallbackValue || input.placeholder;
        }
      }
    });

    // Legacy fonts
    const fontSerifSelect = this.getEl<HTMLSelectElement>('fontSerifSelect');
    if (fontSerifSelect) {
      fontSerifSelect.value = preset?.variables.fontSerif || defaults.fontSerif || 'Literata';
    }
    const fontScriptSelect = this.getEl<HTMLSelectElement>('fontScriptSelect');
    if (fontScriptSelect) {
      fontScriptSelect.value = preset?.variables.fontScript || defaults.fontScript || 'Parisienne';
    }

    // Update button states
    const deleteBtn = this.getEl<HTMLButtonElement>('deleteBtn');
    if (deleteBtn) {
      deleteBtn.disabled = !preset;
    }
    const duplicateBtn = this.getEl<HTMLButtonElement>('duplicateBtn');
    if (duplicateBtn) {
      duplicateBtn.disabled = !preset;
    }
    const setActiveBtn = this.getEl<HTMLButtonElement>('setActiveBtn');
    if (setActiveBtn) {
      setActiveBtn.textContent = mode === 'dawn' ? 'Set as active dawn theme' : 'Set as active midnight theme';
      setActiveBtn.disabled = !preset;
    }
  }

  private renderLists(): void {
    ['midnight', 'dawn'].forEach((mode) => {
      const listEl = this.elements[`${mode}List`] as HTMLElement;
      if (!listEl) return;

      const allPresets = this.manager.getPresets(mode as ThemeMode);
      const presets = this.state.categoryFilter
        ? allPresets.filter((p) => p.category === this.state.categoryFilter)
        : allPresets;

      listEl.innerHTML = '';

      if (presets.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-xs text-body-muted px-3 py-2';
        empty.textContent = this.state.categoryFilter
          ? 'No themes in this category.'
          : 'No saved themes yet. Create your first theme!';
        listEl.appendChild(empty);
        return;
      }

      presets.forEach((preset) => {
        const card = this.createPresetCard(preset);
        listEl.appendChild(card);
      });
    });
  }

  private createPresetCard(preset: ThemePreset): HTMLElement {
    const activeSlug = this.manager.getState().active[preset.mode];
    const isActive = activeSlug === preset.slug;
    const isCurrent = this.state.currentPreset?.slug === preset.slug;

    const card = document.createElement('div');
    card.className = `
      group rounded-xl border border-line-neutral bg-surface-base px-3 py-3 text-sm
      transition cursor-pointer hover:border-line-bold hover:bg-surface-soft
      ${isActive ? 'ring-2 ring-success' : ''}
      ${isCurrent ? 'border-primary' : ''}
    `;

    card.addEventListener('click', () => this.loadPreset(preset));

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-3 mb-2';

    const name = document.createElement('span');
    name.className = 'font-medium text-primary';
    name.textContent = preset.name;

    const badges = document.createElement('div');
    badges.className = 'flex items-center gap-2';

    if (isActive) {
      const activeBadge = document.createElement('span');
      activeBadge.className = 'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success text-white';
      activeBadge.textContent = 'Active';
      badges.appendChild(activeBadge);
    }

    header.appendChild(name);
    header.appendChild(badges);

    const slug = document.createElement('p');
    slug.className = 'text-[11px] text-body-muted mb-2';
    slug.textContent = preset.slug;

    // Color swatches
    const swatches = document.createElement('div');
    swatches.className = 'flex gap-2 mt-2';
    ['primary', 'accent', 'background'].forEach((key) => {
      const color = preset.variables[key];
      if (color) {
        const swatch = document.createElement('div');
        swatch.className = 'h-6 w-6 rounded-full border-2 border-white/60 shadow-sm';
        swatch.style.backgroundColor = color;
        swatch.title = `${key}: ${color}`;
        swatches.appendChild(swatch);
      }
    });

    card.appendChild(header);
    card.appendChild(slug);
    card.appendChild(swatches);

    return card;
  }

  private updateActiveLabels(): void {
    const state = this.manager.getState();

    const midnightEl = this.getEl('activeMidnight');
    if (midnightEl) {
      const slug = state.active.midnight;
      const preset = slug ? this.manager.getPreset('midnight', slug) : null;
      midnightEl.textContent = preset?.name || '—';
    }

    const dawnEl = this.getEl('activeDawn');
    if (dawnEl) {
      const slug = state.active.dawn;
      const preset = slug ? this.manager.getPreset('dawn', slug) : null;
      dawnEl.textContent = preset?.name || '—';
    }
  }

  private updateBreadcrumbs(): void {
    const breadcrumbs = this.getEl('breadcrumbs');
    if (!breadcrumbs) return;

    const parts = ['Theme'];
    if (this.state.currentPreset) {
      parts.push(this.state.currentPreset.name);
    }
    if (this.state.editingScope !== 'global') {
      parts.push(this.state.editingScope);
    }

    breadcrumbs.textContent = parts.join(' > ');
  }

  private updateUndoRedoButtons(): void {
    const undoBtn = this.getEl<HTMLButtonElement>('undoBtn');
    const redoBtn = this.getEl<HTMLButtonElement>('redoBtn');
    if (undoBtn) undoBtn.disabled = !this.undoRedo.canUndo();
    if (redoBtn) redoBtn.disabled = !this.undoRedo.canRedo();
  }

  private updateWatcherStatus(): void {
    const badge = this.getEl('watcherStatus');
    if (!badge) return;
    const mode = this.root?.getAttribute('data-theme-watch');
    if (mode === 'auto') {
      badge.textContent = 'Watcher: auto (dev)';
      badge.classList.add('text-success');
      badge.classList.remove('text-body-muted');
    } else {
      badge.textContent = 'Watcher: manual run';
      badge.classList.add('text-body-muted');
      badge.classList.remove('text-success');
    }
  }

  private updatePreview(): void {
    const previewRoots = this.getEls<HTMLElement>('previewRoots');
    if (!previewRoots.length) {
      const single = this.getEl<HTMLElement>('previewRoot');
      if (single) {
        previewRoots.push(single);
      }
    }

    // Also bind preview variables to the document element so the page chrome
    // (nav, buttons, backgrounds) reflects the active palette while editing.
    const docEl = typeof document !== 'undefined' ? document.documentElement : null;
    if (docEl) {
      docEl.dataset.themePreview = 'active';
      if (!previewRoots.includes(docEl)) {
        previewRoots.push(docEl);
      }
    }

    if (!previewRoots.length) return;

    const mode = this.state.mode;
    const defaults = this.getBaseVariables();

    // Collect all current values
    const variables = collectAllFormValues(this.elements);

    // Update comprehensive preview variables on all preview roots
    previewRoots.forEach((root) => {
      updateAllPreviewVariables(root, variables, defaults);
    });

    // Legacy variables for backwards compatibility
    const legacyVariables = {
      primary: this.getInputValue('primaryInput') || defaults.primary || '#6b21a8',
      accent: this.getInputValue('accentInput') || defaults.accent || '#d9b2c4',
      background: this.getInputValue('backgroundInput') || defaults.background || '#0f0820',
      textPrimary: this.getInputValue('textPrimaryInput') || defaults.textPrimary || '#fdfcfe',
      textHeading: this.getInputValue('textHeadingInput') || defaults.textHeading || '#ffffff',
      textMuted: this.getInputValue('textMutedInput') || defaults.textMuted || '#d9b2c4',
    };

    // Apply legacy CSS variables to preview
    previewRoots.forEach((preview) => {
      preview.style.setProperty('--preview-primary', legacyVariables.primary);
      preview.style.setProperty('--preview-accent', legacyVariables.accent);
      preview.style.setProperty('--preview-background', legacyVariables.background);
      preview.style.setProperty('--preview-text', legacyVariables.textPrimary);
      preview.style.setProperty('--preview-text-heading', legacyVariables.textHeading);
      preview.style.setProperty('--preview-muted', legacyVariables.textMuted);
    });

    // Calculate derived colors
    const bg = variables.background || defaults.background || '#0f0820';
    const bgRgb = hexToRgb(bg);
    if (bgRgb) {
      const luminance = this.getLuminance(bgRgb);
      const surface = this.adjustHex(bg, luminance > 0.5 ? -0.08 : 0.22);
      const border = this.adjustHex(bg, luminance > 0.5 ? -0.3 : 0.28);
      previewRoots.forEach((preview) => {
        preview.style.setProperty('--preview-surface', surface);
        preview.style.setProperty('--preview-border', border);
      });
    }

    previewRoots.forEach((preview) => preview.setAttribute('data-mode', mode));
  }

  private updateContrastCheck(): void {
    const display = this.getEl('contrastDisplay');
    if (!display) return;

    const background = this.getInputValue('backgroundInput') || '#0f0820';
    const textPrimary = this.getInputValue('textPrimaryInput') || '#fdfcfe';
    const textHeading = this.getInputValue('textHeadingInput') || '#ffffff';

    const result1 = checkContrast(textPrimary, background);
    const result2 = checkContrast(textHeading, background);

    display.innerHTML = `
      <div class="space-y-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-body-muted mb-3">Contrast Check</div>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-base border border-line-subtle">
            <span class="text-xs text-body-muted">Body Text</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-semibold">${formatRatio(result1.ratio)}</span>
              <span class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                result1.score === 'AAA' ? 'bg-success text-white' :
                result1.score === 'AA' ? 'bg-warning text-white' :
                'bg-danger text-white'
              }">${result1.score}</span>
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-base border border-line-subtle">
            <span class="text-xs text-body-muted">Headings</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-semibold">${formatRatio(result2.ratio)}</span>
              <span class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                result2.score === 'AAA' ? 'bg-success text-white' :
                result2.score === 'AA' ? 'bg-warning text-white' :
                'bg-danger text-white'
              }">${result2.score}</span>
            </div>
          </div>
        </div>
        <p class="text-[10px] text-body-muted">WCAG AA requires 4.5:1 for normal text, 3:1 for large text</p>
      </div>
    `;
  }

  private getInputValue(elementKey: string): string {
    const el = this.getEl<HTMLInputElement>(elementKey);
    return el?.value.trim() || '';
  }

  private collectFormData(): Partial<ThemePreset> {
    const mode = this.state.mode;
    const defaults = this.getBaseVariables();
    const preset = this.state.currentPreset;
    const scope = this.state.editingScope;
    const baseVariables = this.getBaseVariables();

    // Collect all comprehensive variables (for scope-specific editing)
    const comprehensiveVariables = collectAllFormValues(this.elements);

    const quickKeys = ['primary', 'accent', 'background', 'textPrimary', 'textHeading', 'textMuted'] as const;
    type QuickKey = typeof quickKeys[number];
    const quickInputValues: Partial<Record<QuickKey, string>> = {};
    quickKeys.forEach((key) => {
      const raw = this.getInputValue(`${key}Input`);
      if (raw) {
        quickInputValues[key] = raw;
      }
    });

    const quickWithDefaults: ThemeVariables = {};
    quickKeys.forEach((key) => {
      const value = quickInputValues[key] || defaults[key];
      if (value) {
        quickWithDefaults[key] = value;
      }
    });

    const scopedQuickValues: ThemeVariables = {};
    quickKeys.forEach((key) => {
      const value = quickInputValues[key];
      if (value) {
        scopedQuickValues[key] = value;
      }
    });

    const fontValues: ThemeVariables = {};
    const fontSerifValue =
      this.getEl<HTMLSelectElement>('fontSerifSelect')?.value || defaults.fontSerif || 'Literata';
    const fontScriptValue =
      this.getEl<HTMLSelectElement>('fontScriptSelect')?.value || defaults.fontScript || 'Parisienne';
    if (fontSerifValue) {
      fontValues.fontSerif = fontSerifValue;
    }
    if (fontScriptValue) {
      fontValues.fontScript = fontScriptValue;
    }

    let variables: ThemeVariables;
    const overrides = preset?.overrides ? [...preset.overrides] : [];

    if (scope === 'global') {
      // When editing global scope, save comprehensive variables to global
      variables = {
        ...comprehensiveVariables,
        ...quickWithDefaults,
        ...fontValues,
      };
    } else {
      // When editing a specific scope, keep global variables unchanged
      // and update/create the scope override with comprehensive variables
      variables = {
        ...(preset?.variables || {}), // Keep existing global variables
        ...fontValues, // Fonts remain global
      };

      // Build override only for values that differ from the base global values
      const filteredOverrides: ThemeVariables = {};
      Object.entries(comprehensiveVariables).forEach(([key, value]) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        const base = baseVariables[key];
        if (base && base === trimmed) return;
        filteredOverrides[key] = trimmed;
      });

      // Preserve quick overrides when they are different from base
      Object.entries(scopedQuickValues).forEach(([key, value]) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        const base = baseVariables[key];
        if (base && base === trimmed) return;
        filteredOverrides[key] = trimmed;
      });

      // Update or create scope override
      const existingIndex = overrides.findIndex((o) => o.scope === scope);
      if (existingIndex >= 0 && overrides[existingIndex]) {
        overrides[existingIndex] = {
          scope,
          variables: {
            ...filteredOverrides,
          },
        };
      } else if (Object.keys(filteredOverrides).length > 0) {
        overrides.push({
          scope,
          variables: {
            ...filteredOverrides,
          },
        });
      }
    }

    return {
      name: this.getInputValue('nameInput'),
      slug: this.getInputValue('slugInput'),
      mode,
      category: this.getEl<HTMLSelectElement>('categorySelect')?.value || 'custom',
      variables,
      overrides: overrides.length > 0 ? overrides : undefined,
    };
  }

  private loadPreset(preset: ThemePreset, silent = false): void {
    console.log('[ThemeEditor.loadPreset] Loading preset:', preset.slug, preset.name);
    console.log('[ThemeEditor.loadPreset] preset.variables.background:', preset.variables.background);

    // Set flag to skip sync on next render (we're explicitly loading this preset)
    this.skipNextSync = true;

    this.pushState({
      ...this.state,
      mode: preset.mode,
      currentPreset: preset,
    });

    console.log('[ThemeEditor.loadPreset] After pushState, currentPreset:', this.state.currentPreset?.slug);

    if (!silent) {
      this.setStatus(`Loaded "${preset.name}"`, 'success');
    }
  }

  private newTheme(mode: ThemeMode): void {
    this.pushState({
      ...this.state,
      mode,
      currentPreset: null,
    });
    this.setStatus(`Ready to create a new ${mode} theme`, 'info');
  }

  private openNewThemeModal(): void {
    const modal = this.getEl('newThemeModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  private closeNewThemeModal(): void {
    const modal = this.getEl('newThemeModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private async persistCurrentForm(options: { silent?: boolean } = {}): Promise<ThemePreset | null> {
    const { silent = false } = options;
    const data = this.collectFormData();

    if (!data.name || !data.slug) {
      if (!silent) {
        this.setStatus('Please provide a theme name', 'error');
      }
      return null;
    }

    const isUpdate = !!this.state.currentPreset;

    try {
      if (!silent) {
        this.setStatus(isUpdate ? 'Updating theme…' : 'Creating theme…', 'info');
      }

      const mode = (data.mode as ThemeMode) || this.state.mode;

      let result: ThemePreset;
      if (isUpdate && this.state.currentPreset) {
        result = await this.manager.updatePreset(this.state.mode, this.state.currentPreset.slug, {
          name: data.name,
          category: data.category,
          variables: data.variables || {},
          overrides: data.overrides,
        });
      } else {
        result = await this.manager.createPreset({
          name: data.name,
          slug: data.slug,
          mode,
          category: data.category || 'custom',
          variables: data.variables || {},
          overrides: data.overrides,
        });
      }

      this.pushState({ ...this.state, mode: result.mode, currentPreset: result });
      if (!silent) {
        this.setStatus(
          `✓ ${isUpdate ? 'Updated' : 'Created'} "${result.name}"`,
          'success',
          { theme: result.slug, mode: result.mode }
        );
      }
      return result;
    } catch (error) {
      console.error('Failed to save theme', error);
      if (!silent) {
        this.setStatus(error instanceof Error ? error.message : 'Failed to save', 'error');
      }
      return null;
    }
  }

  private async save(): Promise<void> {
    await this.persistCurrentForm();
  }

  private async setActive(): Promise<void> {
    let preset = this.state.currentPreset;
    console.log('[ThemeEditor.setActive] currentPreset:', preset?.slug, preset?.name);
    console.log('[ThemeEditor.setActive] currentPreset.variables.background:', preset?.variables.background);

    if (!preset) {
      this.setStatus('Please save the theme first', 'error');
      return;
    }

    try {
      // Persist any unsaved form edits before activating
      this.setStatus('Saving changes…', 'info');
      const saved = await this.persistCurrentForm({ silent: true });
      if (saved) {
        preset = saved;
      }
      if (!preset) {
        this.setStatus('Please save the theme first', 'error');
        return;
      }

      this.setStatus('Setting active theme…', 'info');
      console.log('[ThemeEditor.setActive] Calling manager.setActive with:', preset.mode, preset.slug);
      await this.manager.setActive(preset.mode, preset.slug);
      this.setStatus(
        `✓ Set "${preset.name}" as active ${preset.mode} theme`,
        'success',
        { theme: preset.slug, mode: preset.mode }
      );
      this.render();
    } catch (error) {
      console.error('Failed to set active theme', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to set active', 'error');
    }
  }

  private async delete(): Promise<void> {
    const preset = this.state.currentPreset;
    if (!preset) return;

    if (!confirm(`Delete "${preset.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      this.setStatus('Deleting theme…', 'info');
      await this.manager.deletePreset(preset.mode, preset.slug);
      this.newTheme(preset.mode);
      this.setStatus(`Deleted "${preset.name}"`, 'success');
    } catch (error) {
      console.error('Failed to delete theme', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to delete', 'error');
    }
  }

  private async duplicate(): Promise<void> {
    const preset = this.state.currentPreset;
    if (!preset) return;

    try {
      this.setStatus('Duplicating theme…', 'info');
      const duplicated = await this.manager.duplicatePreset(preset.mode, preset.slug);
      this.loadPreset(duplicated, true);
      this.setStatus(`Duplicated as "${duplicated.name}"`, 'success');
    } catch (error) {
      console.error('Failed to duplicate theme', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to duplicate', 'error');
    }
  }

  private undo(): void {
    if (this.undoRedo.undo()) {
      this.setStatus('Undid last change', 'info');
    }
  }

  private redo(): void {
    if (this.undoRedo.redo()) {
      this.setStatus('Redid change', 'info');
    }
  }

  private exportCurrent(): void {
    try {
      const preset = this.state.currentPreset;
      if (!preset) {
        this.setStatus('No theme to export', 'error');
        return;
      }

      const json = this.manager.exportPreset(preset.mode, preset.slug);
      this.downloadJson(json, `${preset.slug}.json`);
      this.setStatus(`Exported "${preset.name}"`, 'success');
    } catch (error) {
      console.error('Failed to export current theme', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to export', 'error');
    }
  }

  private exportAll(): void {
    try {
      const json = this.manager.exportAll();
      this.downloadJson(json, 'witchclick-themes.json');
      this.setStatus('Exported all themes', 'success');
    } catch (error) {
      console.error('Failed to export all themes', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to export', 'error');
    }
  }

  private async importFromFile(file: File): Promise<void> {
    try {
      const text = await file.text();

      const parsed = JSON.parse(text);
      if (parsed.presets) {
        const merge = confirm('Merge with existing themes? (Cancel to replace all themes)');
        await this.manager.importAll(text, merge);
        this.render();
        this.setStatus('Imported themes', 'success');
      } else {
        const overwrite = confirm('Overwrite if theme already exists?');
        const imported = await this.manager.importPreset(text, overwrite);
        this.loadPreset(imported, true);
        this.setStatus(`Imported "${imported.name}"`, 'success');
      }
    } catch (error) {
      console.error('Failed to import theme data', error);
      this.setStatus(error instanceof Error ? error.message : 'Failed to import', 'error');
    }
  }

  private downloadJson(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info', actions?: { theme?: string; mode?: string }): void {
    const el = this.getEl('statusEl');
    if (!el) return;
    el.innerHTML = '';

    // Create message text
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    el.appendChild(messageSpan);

    // Add action buttons for success states
    if (type === 'success' && actions?.theme && actions?.mode) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'mt-3 flex flex-wrap gap-2';

      // Preview Theme button
      const previewBtn = document.createElement('a');
      previewBtn.href = `/?theme=${encodeURIComponent(actions.theme)}&mode=${encodeURIComponent(actions.mode)}`;
      previewBtn.target = '_blank';
      previewBtn.rel = 'noopener';
      previewBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft transition';
      previewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Preview Theme`;

      // Set as Active button (if not already active)
      const activePreset = this.manager.getActivePreset(actions.mode as ThemeMode);
    const isActive = this.state.currentPreset?.slug === activePreset?.slug;
    if (!isActive) {
      const activateBtn = document.createElement('button');
      activateBtn.type = 'button';
      activateBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm';
      activateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Set as Active`;
        activateBtn.addEventListener('click', () => {
          void this.setActive();
        });
        actionsDiv.appendChild(activateBtn);
      }

      // View Site button
      const siteBtn = document.createElement('a');
      siteBtn.href = '/';
      siteBtn.target = '_blank';
      siteBtn.rel = 'noopener';
      siteBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft transition';
      siteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>View Site`;

      actionsDiv.appendChild(previewBtn);
      actionsDiv.appendChild(siteBtn);
      el.appendChild(actionsDiv);

      // Don't auto-clear success messages with actions
      return;
    }

    el.className = 'text-sm mt-2 ';
    if (type === 'success') el.className += 'text-success font-medium';
    else if (type === 'error') el.className += 'text-danger';
    else el.className += 'text-body-muted';

    // Clear after 5 seconds (except for success with actions)
    if (type !== 'success' || !actions) {
      setTimeout(() => {
        if (el.textContent?.includes(message)) {
          el.innerHTML = '';
        }
      }, 5000);
    }
  }

  private setEditingScope(scopeId: string, options: { scroll?: boolean } = {}): void {
    const scope = scopeId || 'global';
    if (scope === this.state.editingScope) {
      if (options.scroll) this.scrollToPalette();
      return;
    }

    this.pushState({ ...this.state, editingScope: scope });

    const selector = this.getEl<HTMLSelectElement>('scopeSelector');
    if (selector && selector.value !== scope) {
      selector.value = scope;
    }

    if (options.scroll) {
      this.scrollToPalette();
    }
  }

  private scrollToPalette(): void {
    const target = document.querySelector<HTMLElement>('[data-scroll-target="palette"]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private normalizeHex(value: string): string {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(value?.trim() || '');
    return match && match[1] ? `#${match[1].toLowerCase()}` : '';
  }

  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    const channel = (value: number) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  private adjustHex(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (val: number) => {
      const target = amount >= 0 ? 255 : 0;
      return Math.round(val + (target - val) * Math.abs(amount));
    };

    const r = adjust(rgb.r).toString(16).padStart(2, '0');
    const g = adjust(rgb.g).toString(16).padStart(2, '0');
    const b = adjust(rgb.b).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  }

  /**
   * Update scope UI elements based on current scope
   */
  private updateScopeOverview(): void {
    const overview = this.getEl('scopeOverview');
    if (!overview) return;
    const overrides = this.state.currentPreset?.overrides || [];
    if (!overrides.length) {
      overview.textContent = 'Overrides: Global only';
      return;
    }
    const names = overrides
      .map((override) => this.getScopeName(override.scope))
      .filter((value) => typeof value === 'string' && value.trim().length);
    const unique = Array.from(new Set(names));
    overview.textContent = `Overrides: ${unique.join(', ')}`;
  }

  private updateScopeCards(): void {
    const currentScope = this.state.editingScope;
    const overrides = this.state.currentPreset?.overrides || [];

    this.getEls<HTMLElement>('scopeCards').forEach((card) => {
      const scopeId = card.dataset.scopeCard;
      if (!scopeId) return;
      const hasOverride = scopeId === 'global' ? true : overrides.some((o) => o.scope === scopeId);

      const statusEl = card.querySelector<HTMLElement>('[data-scope-status]');
      if (statusEl) {
        statusEl.textContent = scopeId === 'global'
          ? 'Sitewide defaults'
          : hasOverride
            ? 'Overrides saved'
            : 'Inherits global';
        statusEl.className = `mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
          hasOverride || scopeId === 'global'
            ? 'bg-surface-accent-bolder text-inverse'
            : 'bg-surface-base text-body-muted border border-line-subtle'
        }`;
      }

      const activeBadge = card.querySelector<HTMLElement>('[data-scope-active]');
      if (activeBadge) {
        activeBadge.classList.toggle('hidden', scopeId !== currentScope);
      }

      const isActive = scopeId === currentScope;
      card.classList.toggle('border-primary', isActive);
      card.classList.toggle('ring-2', isActive);
      card.classList.toggle('ring-primary', isActive);
      card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  private updateScopeUI(): void {
    const scope = this.state.editingScope;
    const preset = this.state.currentPreset;

    // Update scope info label
    const scopeLabel = this.getEl('scopeLabel');
    if (scopeLabel) scopeLabel.textContent = `Editing: ${this.getScopeName(scope)}`;

    // Check if this scope has overrides
    const hasOverride = preset?.overrides?.some((o) => o.scope === scope) || false;

    // Toggle override status indicators
    const hasOverrideEl = this.getEl('scopeHasOverride');
    const noOverrideEl = this.getEl('scopeNoOverride');
    hasOverrideEl?.classList.toggle('hidden', !hasOverride || scope === 'global');
    noOverrideEl?.classList.toggle('hidden', hasOverride || scope === 'global');
  }

  /**
   * Show/hide scope-specific sections
   */
  private updateScopeSections(): void {
    const scope = this.state.editingScope;

    // Show/hide entity grimoire section
    const grimoireSection = document.querySelector('[data-scope-section="grimoire"]') as HTMLElement;
    if (grimoireSection) {
      grimoireSection.style.display = scope === 'grimoire' ? 'block' : 'none';
      if (scope === 'grimoire') {
        grimoireSection.setAttribute('open', '');
      }
    }

    // Future: Add more scope-specific sections as needed
  }

  /**
   * Get display name for a scope
   */
  private getScopeName(scopeId: string): string {
    const scope = THEME_SCOPES.find((item) => item.id === scopeId);
    if (scope) return scope.label;
    if (scopeId === 'global') return 'Global Theme';
    return scopeId;
  }

  /**
   * Clear overrides for a specific scope
   */
  private clearScopeOverride(scopeId: string): void {
    if (!this.state.currentPreset) return;

    const preset = this.state.currentPreset;
    if (!preset.overrides) return;

    preset.overrides = preset.overrides.filter((o) => o.scope !== scopeId);

    // Save the updated preset
    this.manager.updatePreset(preset.mode, preset.slug, preset);
    this.pushState({ ...this.state, currentPreset: preset });
  }

  /**
   * Get variables for the current scope
   * Returns override variables if they exist, otherwise returns global variables
   */
  private getScopeVariables(): ThemeVariables {
    const preset = this.state.currentPreset;
    const scope = this.state.editingScope;

    if (!preset) return this.getBaseVariables();
    if (scope === 'global') {
      return { ...this.getBaseVariables() };
    }

    const override = this.getScopeOverride(scope);
    return {
      ...this.getBaseVariables(),
      ...override,
    };
  }

  /**
   * Update variables for the current scope
   */
  private updateScopeVariables(variables: ThemeVariables): void {
    if (!this.state.currentPreset) return;

    const preset = this.state.currentPreset;
    const scope = this.state.editingScope;

    if (scope === 'global') {
      // Update global variables
      preset.variables = { ...preset.variables, ...variables };
    } else {
      // Update or create scope override
      if (!preset.overrides) {
        preset.overrides = [];
      }

      const existingIndex = preset.overrides.findIndex((o) => o.scope === scope);

      if (existingIndex >= 0 && preset.overrides[existingIndex]) {
        // Update existing override
        preset.overrides[existingIndex].variables = {
          ...preset.overrides[existingIndex].variables,
          ...variables,
        };
      } else {
        // Create new override
        preset.overrides.push({
          scope,
          variables,
        });
      }
    }

    this.pushState({ ...this.state, currentPreset: preset });
  }

  /**
   * Get the current preset's global variables merged with defaults for the active mode.
   */
  private getBaseVariables(): ThemeVariables {
    const defaults = this.manager.getDefaultVariables(this.state.mode);
    const presetVars = this.state.currentPreset?.variables || {};
    return { ...defaults, ...presetVars };
  }

  /**
   * Get only the override variables for a specific scope.
   */
  private getScopeOverride(scopeId: string): ThemeVariables {
    const preset = this.state.currentPreset;
    if (!preset || !preset.overrides) return {};
    const override = preset.overrides.find((o) => o.scope === scopeId);
    return override?.variables || {};
  }
}
