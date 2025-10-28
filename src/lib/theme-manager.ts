/**
 * Theme Manager
 * Manages theme presets with localStorage persistence
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

const STORAGE_KEY = 'witchclick_themes';

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
    colorRune: '#fffdf6',
    colorFog: '#e5daf5',
    colorInk: '#2c1b3d',

    // Surface Colors
    surfacePlain: 'rgba(252, 248, 242, 0.96)',
    cardPanelSurface: 'rgba(255, 252, 247, 0.92)',
    cardPanelSurfaceStrong: 'rgba(248, 244, 240, 0.95)',
    cardPanelBorder: 'rgba(155, 134, 200, 0.32)',
    cardPanelBorderStrong: 'rgba(155, 134, 200, 0.48)',
    cardPanelBorderSoft: 'rgba(155, 134, 200, 0.28)',

    // Text Colors
    textPrimary: 'rgba(44, 27, 61, 1)',
    textSecondary: 'rgba(44, 27, 61, 0.9)',
    textTertiary: 'rgba(44, 27, 61, 0.75)',
    inkBody: '#2c1b3d',
    inkStrong: '#1a0e28',
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

export class ThemeManager {
  private state: ThemeState;
  private listeners: Set<(state: ThemeState) => void> = new Set();

  constructor() {
    this.state = this.loadState();
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
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get all presets for a mode
   */
  getPresets(mode: ThemeMode): ThemePreset[] {
    return [...this.state.presets[mode]];
  }

  /**
   * Get a preset by slug
   */
  getPreset(mode: ThemeMode, slug: string): ThemePreset | null {
    return this.state.presets[mode].find((p) => p.slug === slug) || null;
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
   * Create a new preset
   */
  createPreset(preset: Omit<ThemePreset, 'createdAt' | 'updatedAt'>): ThemePreset {
    const errors = validatePreset(preset);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check for duplicate slug
    if (this.getPreset(preset.mode, preset.slug)) {
      throw new Error(`A theme with slug "${preset.slug}" already exists`);
    }

    const now = new Date().toISOString();
    const newPreset: ThemePreset = {
      ...preset,
      createdAt: now,
      updatedAt: now,
    };

    this.state.presets[preset.mode].push(newPreset);
    this.saveState();
    this.notifyListeners();

    return { ...newPreset };
  }

  /**
   * Update a preset
   */
  updatePreset(mode: ThemeMode, slug: string, updates: Partial<Omit<ThemePreset, 'slug' | 'mode' | 'createdAt'>>): ThemePreset {
    const index = this.state.presets[mode].findIndex((p) => p.slug === slug);
    if (index === -1) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    const preset = this.state.presets[mode][index];
    if (!preset) {
      throw new Error(`Theme at index ${index} not found`);
    }
    const updatedPreset: ThemePreset = {
      ...preset,
      ...updates,
      slug: preset.slug, // Prevent slug changes
      mode: preset.mode, // Prevent mode changes
      createdAt: preset.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    this.state.presets[mode][index] = updatedPreset;
    this.saveState();
    this.notifyListeners();

    return { ...updatedPreset };
  }

  /**
   * Rename a preset (changes slug)
   */
  renamePreset(mode: ThemeMode, oldSlug: string, newName: string, newSlug?: string): ThemePreset {
    const preset = this.getPreset(mode, oldSlug);
    if (!preset) {
      throw new Error(`Theme with slug "${oldSlug}" not found`);
    }

    const finalSlug = newSlug || slugify(newName);

    // Check if new slug conflicts with another preset
    if (finalSlug !== oldSlug && this.getPreset(mode, finalSlug)) {
      throw new Error(`A theme with slug "${finalSlug}" already exists`);
    }

    // Update preset
    const index = this.state.presets[mode].findIndex((p) => p.slug === oldSlug);
    const updatedPreset: ThemePreset = {
      ...preset,
      name: newName,
      slug: finalSlug,
      updatedAt: new Date().toISOString(),
    };

    this.state.presets[mode][index] = updatedPreset;

    // Update active reference if this was the active theme
    if (this.state.active[mode] === oldSlug) {
      this.state.active[mode] = finalSlug;
    }

    this.saveState();
    this.notifyListeners();

    return { ...updatedPreset };
  }

  /**
   * Duplicate a preset
   */
  duplicatePreset(mode: ThemeMode, slug: string, newName?: string): ThemePreset {
    const preset = this.getPreset(mode, slug);
    if (!preset) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    const baseName = newName || `${preset.name} (Copy)`;
    let finalName = baseName;
    let finalSlug = slugify(finalName);
    let counter = 1;

    // Ensure unique slug
    while (this.getPreset(mode, finalSlug)) {
      finalName = `${baseName} ${counter}`;
      finalSlug = slugify(finalName);
      counter++;
    }

    const now = new Date().toISOString();
    const duplicatedPreset: ThemePreset = {
      ...preset,
      name: finalName,
      slug: finalSlug,
      createdAt: now,
      updatedAt: now,
    };

    this.state.presets[mode].push(duplicatedPreset);
    this.saveState();
    this.notifyListeners();

    return { ...duplicatedPreset };
  }

  /**
   * Delete a preset
   */
  deletePreset(mode: ThemeMode, slug: string): void {
    const index = this.state.presets[mode].findIndex((p) => p.slug === slug);
    if (index === -1) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    this.state.presets[mode].splice(index, 1);

    // Clear active if this was the active theme
    if (this.state.active[mode] === slug) {
      this.state.active[mode] = null;
    }

    this.saveState();
    this.notifyListeners();
  }

  /**
   * Set active preset
   */
  setActive(mode: ThemeMode, slug: string | null): void {
    if (slug && !this.getPreset(mode, slug)) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    this.state.active[mode] = slug;
    this.saveState();
    this.notifyListeners();
  }

  /**
   * Export preset as JSON
   */
  exportPreset(mode: ThemeMode, slug: string): string {
    const preset = this.getPreset(mode, slug);
    if (!preset) {
      throw new Error(`Theme with slug "${slug}" not found`);
    }

    return JSON.stringify(preset, null, 2);
  }

  /**
   * Export all presets as JSON
   */
  exportAll(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(json: string, overwrite = false): ThemePreset {
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

    // Check if preset already exists
    const existing = this.getPreset(preset.mode, preset.slug);
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
    } else {
      return this.createPreset({
        name: preset.name,
        slug: preset.slug,
        mode: preset.mode,
        category: preset.category,
        variables: preset.variables,
        overrides: preset.overrides,
      });
    }
  }

  /**
   * Import all presets from JSON
   */
  importAll(json: string, merge = false): void {
    let importedState: ThemeState;
    try {
      importedState = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    if (!importedState.presets || !importedState.active) {
      throw new Error('Invalid theme state format');
    }

    if (merge) {
      // Merge with existing presets
      importedState.presets.midnight.forEach((preset) => {
        const existing = this.getPreset('midnight', preset.slug);
        if (existing) {
          this.updatePreset('midnight', preset.slug, {
            name: preset.name,
            category: preset.category,
            variables: preset.variables,
            overrides: preset.overrides,
          });
        } else {
          this.createPreset(preset);
        }
      });

      importedState.presets.dawn.forEach((preset) => {
        const existing = this.getPreset('dawn', preset.slug);
        if (existing) {
          this.updatePreset('dawn', preset.slug, {
            name: preset.name,
            category: preset.category,
            variables: preset.variables,
            overrides: preset.overrides,
          });
        } else {
          this.createPreset(preset);
        }
      });
    } else {
      // Replace all presets
      this.state = importedState;
      this.saveState();
      this.notifyListeners();
    }
  }

  /**
   * Get default variables for a mode
   */
  getDefaultVariables(mode: ThemeMode): ThemeVariables {
    return { ...DEFAULT_VARIABLES[mode] };
  }

  /**
   * Load state from localStorage
   */
  private loadState(): ThemeState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeState;
        return {
          presets: {
            midnight: Array.isArray(parsed.presets?.midnight) ? parsed.presets.midnight : [],
            dawn: Array.isArray(parsed.presets?.dawn) ? parsed.presets.dawn : [],
          },
          active: {
            midnight: parsed.active?.midnight || null,
            dawn: parsed.active?.dawn || null,
          },
        };
      }
    } catch (error) {
      console.error('[ThemeManager] Failed to load state:', error);
    }

    return {
      presets: {
        midnight: [],
        dawn: [],
      },
      active: {
        midnight: null,
        dawn: null,
      },
    };
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[ThemeManager] Failed to save state:', error);
      throw new Error('Failed to save theme state. localStorage might be full or disabled.');
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  /**
   * Clear all data (for testing or reset)
   */
  clearAll(): void {
    this.state = {
      presets: {
        midnight: [],
        dawn: [],
      },
      active: {
        midnight: null,
        dawn: null,
      },
    };
    this.saveState();
    this.notifyListeners();
  }
}
