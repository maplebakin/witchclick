/**
 * Theme Manager
 * Thin client around the development API for managing theme presets.
 */

export type ThemeMode = 'midnight' | 'dawn';

export interface ThemeVariables {
  // Core Brand Colors
  colorMidnight?: string;
  colorNight?: string;
  colorIris?: string;
  colorAmethyst?: string;
  colorDusk?: string;
  colorGold?: string;
  colorRune?: string;
  colorFog?: string;
  colorInk?: string;
  colorMuted?: string;
  colorBorder?: string;
  colorBorderStrong?: string;
  colorOverlay?: string;
  colorOverlayStrong?: string;

  // Surface Colors
  surfacePlain?: string;
  surfacePlainBorder?: string;
  cardPanelSurface?: string;
  cardPanelSurfaceStrong?: string;
  cardPanelBorder?: string;
  cardPanelBorderStrong?: string;
  cardPanelBorderSoft?: string;

  // Text Colors
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
  textHint?: string;
  textDisabled?: string;
  inkBody?: string;
  inkStrong?: string;
  inkMuted?: string;
  linkColor?: string;

  // Card Components
  cardBadgeBg?: string;
  cardBadgeBorder?: string;
  cardBadgeText?: string;
  cardTagBg?: string;
  cardTagBorder?: string;
  cardTagText?: string;
  cardSpoonBg?: string;
  cardSpoonBorder?: string;
  cardSpoonText?: string;

  // Interactive Elements
  focusRingColor?: string;
  cardFocusOutline?: string;

  // Typography
  fontSerif?: string;
  fontScript?: string;
  fontHeading?: string;
  fontAccent?: string;

  // Shadows
  shadowSoft?: string;
  shadowStrong?: string;

  // Semantic Status Colors
  success?: string;
  warning?: string;
  error?: string;
  info?: string;

  // Entity Grimoire Specific
  entityCardBorder?: string;
  entityCardGlow?: string;
  entityCardHighlight?: string;
  entityCardSurfaceTop?: string;
  entityCardSurfaceBottom?: string;
  entityCardHeading?: string;
  entityCardText?: string;
  entityCardLabel?: string;
  entityCardCta?: string;
  entityCardCtaHover?: string;
  entityCardIcon?: string;
  entityCardIconShadow?: string;

  // Background
  backgroundImage?: string;

  // Legacy compatibility
  primary?: string;
  accent?: string;
  background?: string;
  textHeading?: string;
  textMuted?: string;

  // Additional custom variables
  [key: string]: string | undefined;
}

export interface ThemeOverride {
  scope: string; // e.g., 'header', 'footer', 'card', 'global'
  variables: ThemeVariables;
}

export interface ThemePreset {
  name: string;
  slug: string;
  mode: ThemeMode;
  category: string;
  variables: ThemeVariables;
  overrides?: ThemeOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface ThemeState {
  presets: {
    midnight: ThemePreset[];
    dawn: ThemePreset[];
  };
  active: {
    midnight: string | null; // slug
    dawn: string | null; // slug
  };
}

const DEFAULT_VARIABLES: Record<ThemeMode, ThemeVariables> = {
  midnight: {
    // Core Brand Colors
    colorMidnight: '#07020f',
    colorNight: '#120725',
    colorIris: '#4b2a63',
    colorAmethyst: '#7c4eb0',
    colorDusk: '#271534',
    colorGold: '#d4af37',
    colorRune: '#f8f3ff',
    colorFog: '#d7c8f3',
    colorInk: '#f4f1ff',

    // Surface Colors
    surfacePlain: 'rgba(18, 10, 30, 0.92)',
    cardPanelSurface: '#1a0d2e',
    cardPanelSurfaceStrong: '#221638',
    cardPanelBorder: 'rgba(212, 175, 55, 0.32)',
    cardPanelBorderStrong: 'rgba(212, 175, 55, 0.48)',
    cardPanelBorderSoft: 'rgba(75, 42, 99, 0.28)',

    // Text Colors
    textPrimary: 'rgba(244, 241, 255, 0.96)',
    textSecondary: 'rgba(244, 241, 255, 0.85)',
    textTertiary: 'rgba(244, 241, 255, 0.75)',
    inkBody: '#f4f1ff',
    inkStrong: '#ffffff',
    inkMuted: '#d9b2c4',
    linkColor: '#e0c07d',

    // Card Components
    cardBadgeBg: 'rgba(212, 175, 55, 0.30)',
    cardBadgeBorder: 'rgba(212, 175, 55, 0.55)',
    cardBadgeText: '#f8f3ff',
    cardTagBg: 'rgba(75, 42, 99, 0.26)',
    cardTagBorder: 'rgba(75, 42, 99, 0.42)',
    cardTagText: '#f4f1ff',

    // Interactive
    focusRingColor: '#e8d591',
    cardFocusOutline: '#e8d591',

    // Typography
    fontSerif: 'Literata',
    fontScript: 'Parisienne',
    fontHeading: 'Cinzel',
    fontAccent: 'Cormorant Garamond',

    // Semantic
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',

    // Legacy compatibility
    primary: '#6b21a8',
    accent: '#d4af37',
    background: '#0f0820',
    textHeading: '#ffffff',
    textMuted: '#d9b2c4',
  },
  dawn: {
    // Core Brand Colors
    colorMidnight: '#f6f0e8',
    colorNight: '#ede5dc',
    colorIris: '#9b86c8',
    colorAmethyst: '#b49ad9',
    colorDusk: '#f2ecfa',
    colorGold: '#caa043',
    colorRune: '#2c1b3d',
    colorFog: '#f6f0e8',
    colorInk: '#2c1b3d',
    colorMuted: '#6b5d70',
    colorBorder: '#f0e5ff',
    colorBorderStrong: '#c7b6e8',
    colorOverlay: 'rgba(244, 236, 255, 0.35)',
    colorOverlayStrong: 'rgba(215, 197, 248, 0.55)',

    // Surface Colors
    surfacePlain: '#f7f3f8',
    surfacePlainBorder: 'rgba(155, 134, 200, 0.28)',
    cardPanelSurface: '#f6f0e8',
    cardPanelSurfaceStrong: '#efe6f7',
    cardPanelBorder: 'rgba(155, 134, 200, 0.35)',
    cardPanelBorderStrong: 'rgba(155, 134, 200, 0.45)',
    cardPanelBorderSoft: 'rgba(155, 134, 200, 0.26)',

    // Text Colors
    textPrimary: '#2c1b3d',
    textSecondary: '#4a375f',
    textTertiary: '#6b5d70',
    textHint: '#8f77b8',
    textDisabled: '#bfaed9',
    inkBody: '#2c1b3d',
    inkStrong: '#120725',
    inkMuted: '#6b5d70',
    linkColor: '#8f77b8',

    // Card Components
    cardBadgeBg: 'rgba(155, 134, 200, 0.26)',
    cardBadgeBorder: 'rgba(155, 134, 200, 0.45)',
    cardBadgeText: '#2c1b3d',
    cardTagBg: 'rgba(155, 134, 200, 0.28)',
    cardTagBorder: 'rgba(155, 134, 200, 0.45)',
    cardTagText: '#2c1b3d',

    // Interactive
    focusRingColor: '#a18fc4',
    cardFocusOutline: '#a18fc4',

    // Typography
    fontSerif: 'Literata',
    fontScript: 'Parisienne',
    fontHeading: 'Cinzel',
    fontAccent: 'Cormorant Garamond',

    // Semantic
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Legacy compatibility
    primary: '#9b86c8',
    accent: '#caa043',
    background: '#f7f3f8',
    textHeading: '#120725',
    textMuted: '#6b5d70',
  },
};

/**
 * Generate a slug from a name
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate theme preset data
 */
export function validatePreset(preset: Partial<ThemePreset>): string[] {
  const errors: string[] = [];

  if (!preset.name || !preset.name.trim()) {
    errors.push('Theme name is required');
  }

  if (!preset.slug || !preset.slug.trim()) {
    errors.push('Theme slug is required');
  }

  if (preset.mode !== 'midnight' && preset.mode !== 'dawn') {
    errors.push('Theme mode must be either "midnight" or "dawn"');
  }

  return errors;
}

export interface ThemeManagerOptions {
  baseUrl?: string;
}

interface ThemeRecord {
  slug: string;
  label?: string;
  mode: ThemeMode;
  category?: string;
  settings?: Record<string, string>;
  overrides?: ThemeOverride[];
}

interface ThemeListResponse {
  items?: {
    midnight?: ThemeRecord[];
    dawn?: ThemeRecord[];
  };
  active?: {
    midnight?: string | null;
    dawn?: string | null;
  };
}

interface ThemeSaveResponse {
  theme: ThemeRecord;
}

interface ThemeSetActiveResponse {
  active?: {
    midnight?: string | null;
    dawn?: string | null;
  };
  theme?: ThemeRecord;
}

interface ThemeDeleteResponse {
  slug: string;
  mode: ThemeMode;
  active?: {
    midnight?: string | null;
    dawn?: string | null;
  };
}

export class ThemeManager {
  private state: ThemeState = {
    presets: {
      midnight: [],
      dawn: [],
    },
    active: {
      midnight: null,
      dawn: null,
    },
  };

  private listeners: Set<(state: ThemeState) => void> = new Set();
  private readonly baseUrl: string;

  constructor(options: ThemeManagerOptions = {}) {
    this.baseUrl = this.normalizeBaseUrl(options.baseUrl);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ThemeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): ThemeState {
    return {
      presets: {
        midnight: this.state.presets.midnight.map((preset) => this.clonePreset(preset)),
        dawn: this.state.presets.dawn.map((preset) => this.clonePreset(preset)),
      },
      active: { ...this.state.active },
    };
  }

  /**
   * Get all presets for a mode
   */
  getPresets(mode: ThemeMode): ThemePreset[] {
    return this.state.presets[mode].map((preset) => this.clonePreset(preset));
  }

  /**
   * Get a preset by slug
   */
  getPreset(mode: ThemeMode, slug: string): ThemePreset | null {
    const preset = this.state.presets[mode].find((p) => p.slug === slug);
    return preset ? this.clonePreset(preset) : null;
  }

  /**
   * Get active preset for a mode
   */
  getActivePreset(mode: ThemeMode): ThemePreset | null {
    const slug = this.state.active[mode];
    if (!slug) return null;
    return this.getPreset(mode, slug);
  }

  /**
   * Load the latest data from the backend
   */
  async initialize(): Promise<void> {
    const data = await this.request<ThemeListResponse>('/themes/list');

    const midnightRecords = Array.isArray(data.items?.midnight) ? data.items?.midnight ?? [] : [];
    const dawnRecords = Array.isArray(data.items?.dawn) ? data.items?.dawn ?? [] : [];

    this.state = {
      presets: {
        midnight: midnightRecords.map((record) => this.mergePresetFromRecord(record, null, false)),
        dawn: dawnRecords.map((record) => this.mergePresetFromRecord(record, null, false)),
      },
      active: {
        midnight: data.active?.midnight ?? null,
        dawn: data.active?.dawn ?? null,
      },
    };

    this.sortPresets();
    this.notifyListeners();
  }

  /**
   * Create a new preset
   */
  async createPreset(preset: Omit<ThemePreset, 'createdAt' | 'updatedAt'>): Promise<ThemePreset> {
    const now = new Date().toISOString();
    const draft: ThemePreset = {
      ...preset,
      createdAt: now,
      updatedAt: now,
    };

    const errors = validatePreset(draft);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return this.persistPreset(draft);
  }

  /**
   * Update a preset
   */
  async updatePreset(
    mode: ThemeMode,
    slug: string,
    updates: Partial<Omit<ThemePreset, 'slug' | 'mode' | 'createdAt'>>
  ): Promise<ThemePreset> {
    const existing = this.state.presets[mode].find((p) => p.slug === slug);
    if (!existing) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    const merged: ThemePreset = {
      ...existing,
      ...updates,
      name: updates.name ?? existing.name,
      category: updates.category ?? existing.category,
      variables: { ...existing.variables, ...(updates.variables || {}) },
      overrides: updates.overrides
        ? this.cloneOverrides(updates.overrides)
        : existing.overrides
        ? this.cloneOverrides(existing.overrides)
        : undefined,
      updatedAt: new Date().toISOString(),
    };

    const errors = validatePreset(merged);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return this.persistPreset(merged, existing);
  }

  /**
   * Duplicate a preset
   */
  async duplicatePreset(mode: ThemeMode, slug: string): Promise<ThemePreset> {
    const preset = this.state.presets[mode].find((p) => p.slug === slug);
    if (!preset) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    const baseName = `${preset.name} (Copy)`;
    let counter = 1;
    let nextName = baseName;
    let nextSlug = slugify(nextName);

    while (this.state.presets[mode].some((p) => p.slug === nextSlug)) {
      counter += 1;
      nextName = `${baseName} ${counter}`;
      nextSlug = slugify(nextName);
    }

    const now = new Date().toISOString();
    const duplicate: ThemePreset = {
      ...preset,
      name: nextName,
      slug: nextSlug,
      createdAt: now,
      updatedAt: now,
      variables: { ...preset.variables },
      overrides: preset.overrides ? this.cloneOverrides(preset.overrides) : undefined,
    };

    return this.persistPreset(duplicate);
  }

  /**
   * Delete a preset
   */
  async deletePreset(mode: ThemeMode, slug: string): Promise<void> {
    await this.request<ThemeDeleteResponse>('/themes/delete', { mode, slug });

    const list = this.state.presets[mode];
    const index = list.findIndex((p) => p.slug === slug);
    if (index !== -1) {
      list.splice(index, 1);
    }

    if (this.state.active[mode] === slug) {
      this.state.active[mode] = null;
    }

    this.notifyListeners();
  }

  /**
   * Set active preset
   */
  async setActive(mode: ThemeMode, slug: string): Promise<void> {
    const data = await this.request<ThemeSetActiveResponse>('/themes/set-active', { mode, slug });

    if (data.active) {
      this.state.active = {
        midnight: data.active.midnight ?? this.state.active.midnight,
        dawn: data.active.dawn ?? this.state.active.dawn,
      };
    }

    if (data.theme) {
      const merged = this.mergePresetFromRecord(data.theme, this.state.presets[mode].find((p) => p.slug === data.theme.slug));
      this.upsertPreset(merged, false);
    }

    this.notifyListeners();
  }

  /**
   * Export preset as JSON
   */
  exportPreset(mode: ThemeMode, slug: string): string {
    const preset = this.state.presets[mode].find((p) => p.slug === slug);
    if (!preset) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    return JSON.stringify(this.clonePreset(preset), null, 2);
  }

  /**
   * Export all presets as JSON
   */
  exportAll(): string {
    return JSON.stringify(this.getState(), null, 2);
  }

  /**
   * Import preset from JSON
   */
  async importPreset(json: string, overwrite = false): Promise<ThemePreset> {
    let preset: ThemePreset;
    try {
      preset = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    const errors = validatePreset(preset);
    if (errors.length > 0) {
      throw new Error(`Invalid preset: ${errors.join(', ')}`);
    }

    const existing = this.state.presets[preset.mode].find((p) => p.slug === preset.slug);

    if (existing && !overwrite) {
      throw new Error(`Theme with slug "${preset.slug}" already exists. Use overwrite option to replace it.`);
    }

    if (existing && overwrite) {
      return this.updatePreset(preset.mode, preset.slug, {
        name: preset.name,
        category: preset.category,
        variables: preset.variables,
        overrides: preset.overrides,
      });
    }

    return this.createPreset({
      name: preset.name,
      slug: preset.slug,
      mode: preset.mode,
      category: preset.category,
      variables: preset.variables,
      overrides: preset.overrides,
    });
  }

  /**
   * Import all presets from JSON
   */
  async importAll(json: string, merge = false): Promise<void> {
    let importedState: ThemeState;
    try {
      importedState = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    if (!importedState.presets || !importedState.active) {
      throw new Error('Invalid theme state format');
    }

    if (!merge) {
      const existing = [
        ...this.state.presets.midnight.map((preset) => ({ mode: 'midnight' as ThemeMode, slug: preset.slug })),
        ...this.state.presets.dawn.map((preset) => ({ mode: 'dawn' as ThemeMode, slug: preset.slug })),
      ];

      for (const { mode, slug } of existing) {
        await this.deletePreset(mode, slug);
      }
    }

    for (const preset of importedState.presets.midnight) {
      await this.createPreset({
        name: preset.name,
        slug: preset.slug,
        mode: 'midnight',
        category: preset.category,
        variables: preset.variables,
        overrides: preset.overrides,
      });
    }

    for (const preset of importedState.presets.dawn) {
      await this.createPreset({
        name: preset.name,
        slug: preset.slug,
        mode: 'dawn',
        category: preset.category,
        variables: preset.variables,
        overrides: preset.overrides,
      });
    }

    if (importedState.active.midnight) {
      await this.setActive('midnight', importedState.active.midnight);
    } else {
      this.state.active.midnight = null;
    }

    if (importedState.active.dawn) {
      await this.setActive('dawn', importedState.active.dawn);
    } else {
      this.state.active.dawn = null;
    }

    this.notifyListeners();
  }

  /**
   * Get default variables for a mode
   */
  getDefaultVariables(mode: ThemeMode): ThemeVariables {
    return { ...DEFAULT_VARIABLES[mode] };
  }

  /**
   * Clear all presets (helper for tests)
   */
  async clearAll(): Promise<void> {
    await this.importAll(
      JSON.stringify({
        presets: { midnight: [], dawn: [] },
        active: { midnight: null, dawn: null },
      }),
      false
    );
  }

  private normalizeBaseUrl(baseUrl?: string): string {
    const fallback = 'http://localhost:8787';
    if (!baseUrl) return fallback;
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private clonePreset(preset: ThemePreset): ThemePreset {
    return {
      ...preset,
      variables: { ...preset.variables },
      overrides: preset.overrides ? this.cloneOverrides(preset.overrides) : undefined,
    };
  }

  private cloneOverrides(overrides: ThemeOverride[]): ThemeOverride[] {
    return overrides.map((override) => ({
      scope: override.scope,
      variables: { ...override.variables },
    }));
  }

  private serializeOverrides(overrides?: ThemeOverride[]): ThemeOverride[] | undefined {
    if (!Array.isArray(overrides)) {
      return undefined;
    }

    const sanitized: ThemeOverride[] = [];

    for (const override of overrides) {
      const scope = typeof override.scope === 'string' ? override.scope.trim() : '';
      if (!scope) continue;

      const variables: ThemeVariables = {};
      if (override.variables && typeof override.variables === 'object') {
        for (const [key, value] of Object.entries(override.variables)) {
          if (typeof value !== 'string') continue;
          const trimmed = value.trim();
          if (!trimmed) continue;
          variables[key] = trimmed;
        }
      }

      if (Object.keys(variables).length === 0) continue;

      sanitized.push({
        scope,
        variables,
      });
    }

    return sanitized;
  }

  private mergeOverridesFromRecord(record: ThemeRecord, existing: ThemePreset | null): ThemeOverride[] | undefined {
    const hasOverridesField = Object.prototype.hasOwnProperty.call(record, 'overrides');

    if (Array.isArray(record.overrides)) {
      return this.cloneOverrides(record.overrides);
    }

    if (!hasOverridesField && existing?.overrides) {
      return this.cloneOverrides(existing.overrides);
    }

    return undefined;
  }

  private sortPresets(): void {
    (['midnight', 'dawn'] as ThemeMode[]).forEach((mode) => {
      this.sortList(this.state.presets[mode]);
    });
  }

  private sortList(list: ThemePreset[]): void {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildSavePayload(preset: ThemePreset): {
    label: string;
    slug: string;
    mode: ThemeMode;
    category: string;
    settings: Record<string, string>;
    overrides?: ThemeOverride[];
  } {
    const defaults = this.getDefaultVariables(preset.mode);
    const mergedVariables: Record<string, string> = {};

    const combined = { ...defaults, ...preset.variables } as Record<string, string | undefined>;
    for (const [key, value] of Object.entries(combined)) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      mergedVariables[key] = trimmed;
    }

    const overrides = this.serializeOverrides(preset.overrides);

    const payload: {
      label: string;
      slug: string;
      mode: ThemeMode;
      category: string;
      settings: Record<string, string>;
      overrides?: ThemeOverride[];
    } = {
      label: preset.name,
      slug: preset.slug,
      mode: preset.mode,
      category: preset.category,
      settings: mergedVariables,
    };

    if (overrides !== undefined) {
      payload.overrides = overrides;
    }

    return payload;
  }

  private mergePresetFromRecord(
    record: ThemeRecord,
    fallback: ThemePreset | null = null,
    notify = true
  ): ThemePreset {
    const existing = fallback ?? this.state.presets[record.mode].find((p) => p.slug === record.slug) ?? null;
    const defaults = this.getDefaultVariables(record.mode);
    const variables = {
      ...defaults,
      ...(existing?.variables || {}),
      ...(record.settings || {}),
    };
    const now = new Date().toISOString();

    const merged: ThemePreset = {
      name: record.label || existing?.name || record.slug,
      slug: record.slug,
      mode: record.mode,
      category: record.category || existing?.category || 'custom',
      variables,
      overrides: this.mergeOverridesFromRecord(record, existing),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (notify) {
      this.upsertPreset(merged);
    }

    return merged;
  }

  private upsertPreset(preset: ThemePreset, notify = true): void {
    const list = this.state.presets[preset.mode];
    const index = list.findIndex((p) => p.slug === preset.slug);
    if (index >= 0) {
      list[index] = preset;
    } else {
      list.push(preset);
    }
    this.sortList(list);
    if (notify) {
      this.notifyListeners();
    }
  }

  private async persistPreset(preset: ThemePreset, existing?: ThemePreset): Promise<ThemePreset> {
    const payload = this.buildSavePayload(preset);
    const data = await this.request<ThemeSaveResponse>('/themes/save', payload);

    const merged = this.mergePresetFromRecord(data.theme, existing ?? preset, false);
    this.upsertPreset(merged);
    return this.clonePreset(merged);
  }

  private async request<T>(path: string, payload?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const message = data?.error || `Request to ${path} failed with status ${response.status}`;
        throw new Error(message);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request to ${path} failed`);
    }
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
