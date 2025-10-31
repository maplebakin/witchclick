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

interface EditorState {
  mode: ThemeMode;
  currentPreset: ThemePreset | null;
  editingScope: string; // scope ID like 'global', 'grimoire', 'header', etc.
  categoryFilter: string;
}

export class ThemeEditor {
  private manager: ThemeManager;
  private undoRedo: UndoRedo<EditorState>;
  private state: EditorState;
  private elements: Record<string, HTMLElement | null> = {};

  constructor() {
    const root = document.getElementById('themeEditorRoot');
    const devApi = root?.getAttribute('data-dev-api') || 'http://localhost:8787';

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
    this.setupEventListeners();
    void this.loadInitialState();
    this.render();
  }

  private initializeElements(): void {
    // Mode and basic controls
    this.elements.modeSelect = document.getElementById('themeMode');
    this.elements.nameInput = document.getElementById('themeName') as HTMLInputElement;
    this.elements.slugInput = document.getElementById('themeSlug') as HTMLInputElement;
    this.elements.categorySelect = document.getElementById('themeCategory');
    this.elements.categoryFilter = document.getElementById('categoryFilter');

    // Scope selector
    this.elements.scopeSelector = document.getElementById('scopeSelector');
    this.elements.scopeInfo = document.querySelector('[data-scope-info]');
    this.elements.scopeLabel = document.querySelector('[data-scope-label]');
    this.elements.scopeDescription = document.querySelector('[data-scope-description]');
    this.elements.scopeHasOverride = document.querySelector('[data-scope-has-override]');
    this.elements.scopeNoOverride = document.querySelector('[data-scope-no-override]');
    this.elements.clearScopeBtn = document.querySelector('[data-clear-scope]');

    // All color and font inputs (comprehensive)
    initializeAllColorElements(this.elements);

    // Legacy color inputs for backwards compatibility
    ['primary', 'accent', 'background', 'textPrimary', 'textHeading', 'textMuted'].forEach((key) => {
      this.elements[`${key}Picker`] = document.querySelector(`[data-color-picker="${key}"]`);
      this.elements[`${key}Input`] = document.querySelector(`[data-color-input="${key}"]`);
    });

    // Legacy font selects
    this.elements.fontSerifSelect = document.getElementById('themeFontSerif');
    this.elements.fontScriptSelect = document.getElementById('themeFontScript');

    // Action buttons
    this.elements.saveBtn = document.getElementById('saveThemeBtn');
    this.elements.setActiveBtn = document.getElementById('setActiveThemeBtn');
    this.elements.deleteBtn = document.getElementById('deleteThemeBtn');
    this.elements.duplicateBtn = document.getElementById('duplicateThemeBtn');
    this.elements.newMidnightBtn = document.querySelector('[data-new-theme="midnight"]');
    this.elements.newDawnBtn = document.querySelector('[data-new-theme="dawn"]');

    // Undo/Redo
    this.elements.undoBtn = document.getElementById('undoBtn');
    this.elements.redoBtn = document.getElementById('redoBtn');

    // Import/Export
    this.elements.exportBtn = document.getElementById('exportBtn');
    this.elements.exportAllBtn = document.getElementById('exportAllBtn');
    this.elements.importBtn = document.getElementById('importBtn');
    this.elements.importInput = document.getElementById('importInput');

    // Lists and status
    this.elements.midnightList = document.querySelector('[data-theme-list="midnight"]');
    this.elements.dawnList = document.querySelector('[data-theme-list="dawn"]');
    this.elements.statusEl = document.querySelector('[data-status]');
    this.elements.breadcrumbs = document.querySelector('[data-breadcrumbs]');

    // Preview
    this.elements.previewRoot = document.querySelector('[data-theme-preview]');
    this.elements.contrastDisplay = document.querySelector('[data-contrast-display]');

    // Active labels
    this.elements.activeMidnight = document.querySelector('[data-active="midnight"]');
    this.elements.activeDawn = document.querySelector('[data-active="dawn"]');
  }

  private setupEventListeners(): void {
    // Mode change
    this.elements.modeSelect?.addEventListener('change', () => {
      const newMode = (this.elements.modeSelect as HTMLSelectElement).value as ThemeMode;
      this.pushState({ ...this.state, mode: newMode });
      this.updatePreview();
    });

    // Category filter
    this.elements.categoryFilter?.addEventListener('change', () => {
      const filter = (this.elements.categoryFilter as HTMLSelectElement).value;
      this.state.categoryFilter = filter;
      this.renderLists();
    });

    // Scope selector
    this.elements.scopeSelector?.addEventListener('change', () => {
      const newScope = (this.elements.scopeSelector as HTMLSelectElement).value;
      this.pushState({ ...this.state, editingScope: newScope });
      this.updateScopeUI();
      this.updateScopeSections();
    });

    // Clear scope overrides
    this.elements.clearScopeBtn?.addEventListener('click', () => {
      if (!this.state.currentPreset) return;
      if (!confirm(`Clear all overrides for this scope? This cannot be undone.`)) return;

      this.clearScopeOverride(this.state.editingScope);
      this.render();
      this.setStatus(`Cleared overrides for ${this.state.editingScope}`, 'success');
    });

    // Name input - auto-generate slug
    this.elements.nameInput?.addEventListener('input', () => {
      const name = (this.elements.nameInput as HTMLInputElement).value;
      if (!this.state.currentPreset && name) {
        (this.elements.slugInput as HTMLInputElement).value = slugify(name);
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
      const picker = this.elements[`${key}Picker`] as HTMLInputElement;
      const input = this.elements[`${key}Input`] as HTMLInputElement;

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
    this.elements.fontSerifSelect?.addEventListener('change', () => this.updatePreview());
    this.elements.fontScriptSelect?.addEventListener('change', () => this.updatePreview());

    // Action buttons
    this.elements.saveBtn?.addEventListener('click', () => {
      void this.save();
    });
    this.elements.setActiveBtn?.addEventListener('click', () => {
      void this.setActive();
    });
    this.elements.deleteBtn?.addEventListener('click', () => {
      void this.delete();
    });
    this.elements.duplicateBtn?.addEventListener('click', () => {
      void this.duplicate();
    });

    // New theme buttons
    this.elements.newMidnightBtn?.addEventListener('click', () => this.newTheme('midnight'));
    this.elements.newDawnBtn?.addEventListener('click', () => this.newTheme('dawn'));

    // Undo/Redo
    this.elements.undoBtn?.addEventListener('click', () => this.undo());
    this.elements.redoBtn?.addEventListener('click', () => this.redo());

    // Export/Import
    this.elements.exportBtn?.addEventListener('click', () => this.exportCurrent());
    this.elements.exportAllBtn?.addEventListener('click', () => this.exportAll());
    this.elements.importBtn?.addEventListener('click', () => this.elements.importInput?.click());
    this.elements.importInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void this.importFromFile(file);
    });

    // Subscribe to theme manager changes
    this.manager.subscribe(() => this.render());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
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
    this.updateScopeSections();
    this.updatePreview();
    this.updateContrastCheck();
  }

  private syncCurrentPreset(): void {
    if (!this.state.currentPreset) return;

    const latest = this.manager.getPreset(this.state.currentPreset.mode, this.state.currentPreset.slug);
    if (latest && latest.updatedAt !== this.state.currentPreset.updatedAt) {
      this.state = {
        ...this.state,
        currentPreset: latest,
      };
    }
  }

  private renderForm(): void {
    const preset = this.state.currentPreset;
    const mode = this.state.mode;
    const defaults = this.manager.getDefaultVariables(mode);

    // Mode select
    if (this.elements.modeSelect) {
      (this.elements.modeSelect as HTMLSelectElement).value = mode;
    }

    // Name and slug
    if (this.elements.nameInput) {
      (this.elements.nameInput as HTMLInputElement).value = preset?.name || '';
    }
    if (this.elements.slugInput) {
      (this.elements.slugInput as HTMLInputElement).value = preset?.slug || '';
    }
    if (this.elements.categorySelect) {
      (this.elements.categorySelect as HTMLSelectElement).value = preset?.category || 'custom';
    }

    // Populate all comprehensive color and font inputs
    populateAllFormInputs(
      this.elements,
      preset?.variables || {},
      defaults,
      (value) => this.normalizeHex(value)
    );

    // Legacy colors
    ['primary', 'accent', 'background', 'textPrimary', 'textHeading', 'textMuted'].forEach((key) => {
      const value = preset?.variables[key] || defaults[key] || '';
      // Use colorToHex to handle rgba/rgb values for the color picker
      const hexValue = colorToHex(value);

      const picker = this.elements[`${key}Picker`] as HTMLInputElement;
      const input = this.elements[`${key}Input`] as HTMLInputElement;

      if (picker && hexValue) picker.value = hexValue;
      if (input) input.value = value;
    });

    // Legacy fonts
    if (this.elements.fontSerifSelect) {
      (this.elements.fontSerifSelect as HTMLSelectElement).value = preset?.variables.fontSerif || defaults.fontSerif || 'Literata';
    }
    if (this.elements.fontScriptSelect) {
      (this.elements.fontScriptSelect as HTMLSelectElement).value = preset?.variables.fontScript || defaults.fontScript || 'Parisienne';
    }

    // Update button states
    if (this.elements.deleteBtn) {
      (this.elements.deleteBtn as HTMLButtonElement).disabled = !preset;
    }
    if (this.elements.duplicateBtn) {
      (this.elements.duplicateBtn as HTMLButtonElement).disabled = !preset;
    }
    if (this.elements.setActiveBtn) {
      const btn = this.elements.setActiveBtn as HTMLButtonElement;
      btn.textContent = mode === 'dawn' ? 'Set as active dawn theme' : 'Set as active midnight theme';
      btn.disabled = !preset;
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

    if (this.elements.activeMidnight) {
      const slug = state.active.midnight;
      const preset = slug ? this.manager.getPreset('midnight', slug) : null;
      this.elements.activeMidnight.textContent = preset?.name || '—';
    }

    if (this.elements.activeDawn) {
      const slug = state.active.dawn;
      const preset = slug ? this.manager.getPreset('dawn', slug) : null;
      this.elements.activeDawn.textContent = preset?.name || '—';
    }
  }

  private updateBreadcrumbs(): void {
    if (!this.elements.breadcrumbs) return;

    const parts = ['Theme'];
    if (this.state.currentPreset) {
      parts.push(this.state.currentPreset.name);
    }
    if (this.state.editingScope !== 'global') {
      parts.push(this.state.editingScope);
    }

    this.elements.breadcrumbs.textContent = parts.join(' > ');
  }

  private updateUndoRedoButtons(): void {
    if (this.elements.undoBtn) {
      (this.elements.undoBtn as HTMLButtonElement).disabled = !this.undoRedo.canUndo();
    }
    if (this.elements.redoBtn) {
      (this.elements.redoBtn as HTMLButtonElement).disabled = !this.undoRedo.canRedo();
    }
  }

  private updatePreview(): void {
    if (!this.elements.previewRoot) return;

    const mode = this.state.mode;
    const defaults = this.manager.getDefaultVariables(mode);

    // Collect all current values
    const variables = collectAllFormValues(this.elements);

    // Update comprehensive preview variables
    updateAllPreviewVariables(this.elements.previewRoot, variables, defaults);

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
    const preview = this.elements.previewRoot as HTMLElement;
    preview.style.setProperty('--preview-primary', legacyVariables.primary);
    preview.style.setProperty('--preview-accent', legacyVariables.accent);
    preview.style.setProperty('--preview-background', legacyVariables.background);
    preview.style.setProperty('--preview-text', legacyVariables.textPrimary);
    preview.style.setProperty('--preview-text-heading', legacyVariables.textHeading);
    preview.style.setProperty('--preview-muted', legacyVariables.textMuted);

    // Calculate derived colors
    const bg = variables.background || defaults.background || '#0f0820';
    const bgRgb = hexToRgb(bg);
    if (bgRgb) {
      const luminance = this.getLuminance(bgRgb);
      const surface = this.adjustHex(bg, luminance > 0.5 ? -0.08 : 0.22);
      const border = this.adjustHex(bg, luminance > 0.5 ? -0.3 : 0.28);
      preview.style.setProperty('--preview-surface', surface);
      preview.style.setProperty('--preview-border', border);
    }

    preview.setAttribute('data-mode', mode);
  }

  private updateContrastCheck(): void {
    if (!this.elements.contrastDisplay) return;

    const background = this.getInputValue('backgroundInput') || '#0f0820';
    const textPrimary = this.getInputValue('textPrimaryInput') || '#fdfcfe';
    const textHeading = this.getInputValue('textHeadingInput') || '#ffffff';

    const result1 = checkContrast(textPrimary, background);
    const result2 = checkContrast(textHeading, background);

    const display = this.elements.contrastDisplay as HTMLElement;
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
    const el = this.elements[elementKey] as HTMLInputElement;
    return el?.value.trim() || '';
  }

  private collectFormData(): Partial<ThemePreset> {
    const mode = this.state.mode;
    const defaults = this.manager.getDefaultVariables(mode);

    // Collect all comprehensive variables
    const comprehensiveVariables = collectAllFormValues(this.elements);

    // Legacy variables for backwards compatibility
    const legacyVariables = {
      primary: this.getInputValue('primaryInput') || defaults.primary,
      accent: this.getInputValue('accentInput') || defaults.accent,
      background: this.getInputValue('backgroundInput') || defaults.background,
      textPrimary: this.getInputValue('textPrimaryInput') || defaults.textPrimary,
      textHeading: this.getInputValue('textHeadingInput') || defaults.textHeading,
      textMuted: this.getInputValue('textMutedInput') || defaults.textMuted,
      fontSerif: (this.elements.fontSerifSelect as HTMLSelectElement)?.value || defaults.fontSerif,
      fontScript: (this.elements.fontScriptSelect as HTMLSelectElement)?.value || defaults.fontScript,
    };

    return {
      name: this.getInputValue('nameInput'),
      slug: this.getInputValue('slugInput'),
      mode,
      category: (this.elements.categorySelect as HTMLSelectElement)?.value || 'custom',
      variables: {
        ...comprehensiveVariables,
        ...legacyVariables, // Legacy overrides comprehensive
      },
    };
  }

  private loadPreset(preset: ThemePreset, silent = false): void {
    this.pushState({
      ...this.state,
      mode: preset.mode,
      currentPreset: preset,
    });
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

  private async save(): Promise<void> {
    const data = this.collectFormData();

    if (!data.name || !data.slug) {
      this.setStatus('Please provide a theme name', 'error');
      return;
    }

    const isUpdate = !!this.state.currentPreset;

    try {
      this.setStatus(isUpdate ? 'Updating theme…' : 'Creating theme…', 'info');

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
      this.setStatus(
        `✓ ${isUpdate ? 'Updated' : 'Created'} "${result.name}"`,
        'success',
        { theme: result.slug, mode: result.mode }
      );
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : 'Failed to save', 'error');
    }
  }

  private async setActive(): Promise<void> {
    const preset = this.state.currentPreset;
    if (!preset) {
      this.setStatus('Please save the theme first', 'error');
      return;
    }

    try {
      this.setStatus('Setting active theme…', 'info');
      await this.manager.setActive(preset.mode, preset.slug);
      this.setStatus(
        `✓ Set "${preset.name}" as active ${preset.mode} theme`,
        'success',
        { theme: preset.slug, mode: preset.mode }
      );
      this.render();
    } catch (error) {
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
      this.setStatus(error instanceof Error ? error.message : 'Failed to export', 'error');
    }
  }

  private exportAll(): void {
    try {
      const json = this.manager.exportAll();
      this.downloadJson(json, 'witchclick-themes.json');
      this.setStatus('Exported all themes', 'success');
    } catch (error) {
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
    if (!this.elements.statusEl) return;

    const el = this.elements.statusEl as HTMLElement;
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
        activateBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 transition shadow-sm';
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
  private updateScopeUI(): void {
    const scope = this.state.editingScope;
    const preset = this.state.currentPreset;

    // Update scope info label
    if (this.elements.scopeLabel) {
      this.elements.scopeLabel.textContent = `Editing: ${this.getScopeName(scope)}`;
    }

    // Check if this scope has overrides
    const hasOverride = preset?.overrides?.some((o) => o.scope === scope) || false;

    // Toggle override status indicators
    if (this.elements.scopeHasOverride) {
      this.elements.scopeHasOverride.classList.toggle('hidden', !hasOverride || scope === 'global');
    }
    if (this.elements.scopeNoOverride) {
      this.elements.scopeNoOverride.classList.toggle('hidden', hasOverride || scope === 'global');
    }
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
    const scopeMap: Record<string, string> = {
      'global': 'Global Theme',
      'homepage': 'Homepage',
      'grimoire': 'Entity Grimoire',
      'post': 'Post Detail',
      'entity-detail': 'Entity Detail',
      'start': 'Start Page',
      'header': 'Site Header',
      'footer': 'Site Footer',
      'card': 'Post Cards',
      'sidebar': 'Sidebar',
      'hero': 'Hero Section',
    };
    return scopeMap[scopeId] || scopeId;
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

    if (scope === 'global' || !preset) {
      return preset?.variables || {};
    }

    const override = preset.overrides?.find((o) => o.scope === scope);
    return override?.variables || {};
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
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window as any).themeEditor = new ThemeEditor();
    });
  } else {
    (window as any).themeEditor = new ThemeEditor();
  }
}
