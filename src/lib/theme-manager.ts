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
  textBody?: string;
  textSubtle?: string;
  textAccent?: string;
  textAccentStrong?: string;
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

  // Header & Footer Specific
  headerBackground?: string;
  headerBorder?: string;
  headerText?: string;
  headerTextHover?: string;
  footerBackground?: string;
  footerBorder?: string;
  footerText?: string;
  footerTextMuted?: string;

  // Glass Surfaces
  glassSurface?: string;
  glassSurfaceStrong?: string;
  glassCard?: string;
  glassHover?: string;
  glassBorder?: string;
  glassBorderStrong?: string;
  glassHighlight?: string;
  glassGlow?: string;
  glassShadowSoft?: string;
  glassShadowStrong?: string;
  glassBlur?: string;
  glassNoiseOpacity?: string;

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
    colorMidnight: '#070a05',
    colorNight: '#261a0d',
    colorIris: '#f2bf8c',
    colorAmethyst: '#d18c47',
    colorDusk: '#22170b',
    colorGold: '#e4a667',
    colorRune: '#f8f2ed',
    colorFog: '#cc9966',
    colorInk: '#ebd9c7',

    // Surface Colors
    surfacePlain: '#22170b',
    cardPanelSurface: '#452e17',
    cardPanelSurfaceStrong: '#764a1e',
    cardPanelBorder: '#764a1e',
    cardPanelBorderStrong: '#452e17',
    cardPanelBorderSoft: '#362412',

    // Glass Surfaces
    glassSurface: '#452e17',
    glassSurfaceStrong: '#764a1e',
    glassCard: '#362412',
    glassHover: '#764a1e',
    glassBorder: '#cc9966',
    glassBorderStrong: '#f2bf8c',
    glassHighlight: '#d4af37',
    glassGlow: '#f2bf8c',
    glassShadowSoft: '0 22px 55px -32px rgba(11, 6, 20, 0.65)',
    glassShadowStrong: '0 32px 85px -36px rgba(3, 2, 12, 0.78)',
    glassBlur: '16px',
    glassNoiseOpacity: '0.08',

    // Text Colors
    textPrimary: '#ebd9c7',
    textSecondary: '#d18c47',
    textTertiary: '#f2bf8c',
    textStrong: '#f8f2ed',
    textBody: '#f9f5ff',
    textSubtle: '#f9f5ff',
    textAccent: '#f2bf8c',
    textAccentStrong: '#d18c47',
    inkBody: '#ebd9c7',
    inkStrong: '#f8f2ed',
    inkMuted: '#f2bf8c',
    linkColor: '#f2bf8c',

    // Card Components
    cardBadgeBg: '#d18c47',
    cardBadgeBorder: '#d18c47',
    cardBadgeText: '#0f0a05',
    cardTagBg: '#d18c47',
    cardTagBorder: '#d18c47',
    cardTagText: '#0f0a05',

    // Interactive
    focusRingColor: '#e4a667',
    cardFocusOutline: '#e4a667',

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

    // Header & Footer
    headerBackground: '#261a0d',
    headerBorder: '#cc9966',
    headerText: '#f4f1ff',
    headerTextHover: '#d4af37',
    footerBackground: '#261a0d',
    footerBorder: '#cc9966',
    footerText: '#f4f1ff',
    footerTextMuted: '#d9b2c4',

    // Legacy compatibility
    primary: '#1f140a',
    accent: '#cc9966',
    background: '#0f0a05',
    textHeading: '#261a0d',
    textMuted: '#f2bf8c',
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
    colorOverlay: '#f4ecff',
    colorOverlayStrong: '#d7c5f8',

    // Surface Colors
    surfacePlain: '#f7f3f8',
    surfacePlainBorder: '#9b86c8',
    cardPanelSurface: '#f6f0e8',
    cardPanelSurfaceStrong: '#efe6f7',
    cardPanelBorder: '#9b86c8',
    cardPanelBorderStrong: '#9b86c8',
    cardPanelBorderSoft: '#9b86c8',

    // Glass Surfaces
    glassSurface: '#f6f0e8',
    glassSurfaceStrong: '#efe6f7',
    glassCard: '#ede5dc',
    glassHover: '#f2ecfa',
    glassBorder: '#c7b6e8',
    glassBorderStrong: '#9b86c8',
    glassHighlight: '#9b86c8',
    glassGlow: '#caa043',
    glassShadowSoft: '0 22px 55px -32px rgba(63, 49, 86, 0.28)',
    glassShadowStrong: '0 32px 85px -36px rgba(99, 80, 128, 0.35)',
    glassBlur: '16px',
    glassNoiseOpacity: '0.08',

    // Text Colors
    textPrimary: '#2c1b3d',
    textSecondary: '#4a375f',
    textTertiary: '#6b5d70',
    textHint: '#8f77b8',
    textDisabled: '#bfaed9',
    textStrong: '#3a2854',
    textBody: '#573f73',
    textSubtle: '#573f73',
    textAccent: '#9b86c8',
    textAccentStrong: '#573f73',
    inkBody: '#2c1b3d',
    inkStrong: '#120725',
    inkMuted: '#6b5d70',
    linkColor: '#8f77b8',

    // Card Components
    cardBadgeBg: '#9b86c8',
    cardBadgeBorder: '#9b86c8',
    cardBadgeText: '#2c1b3d',
    cardTagBg: '#9b86c8',
    cardTagBorder: '#9b86c8',
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

    // Header & Footer
    headerBackground: '#ede5dc',
    headerBorder: '#9b86c8',
    headerText: '#2c1b3d',
    headerTextHover: '#9b86c8',
    footerBackground: '#f6f0e8',
    footerBorder: '#9b86c8',
    footerText: '#2c1b3d',
    footerTextMuted: '#6b5d70',

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
  overrides?: Array<{ scope: string; variables: Record<string, string> }>;
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
      const record = data.theme;
      const existing = this.state.presets[mode].find((p) => p.slug === record.slug);
      const merged = this.mergePresetFromRecord(record, existing);
      this.upsertPreset(merged, false);

      // Update localStorage and apply theme immediately
      this.updateLocalStorageTheme(merged);
      this.applyThemeToDocument(merged);
    }

    this.notifyListeners();
  }

  /**
   * Convert theme variables to runtime loader token format
   * Strategy: Generate complete token set from base colors, then allow explicit overrides
   *
   * TOKEN SYSTEM ALIGNMENT:
   * This method generates tokens that are consumed by:
   * 1. Admin page: applyThemeToDocument() - applies tokens immediately on theme change
   * 2. Public pages: Base.astro runtime loader - applies tokens on every page load
   * 3. CSS fallback: src/styles/tokens.css - provides default values
   *
   * All three systems use IDENTICAL token names for consistency:
   * - accent1/2/3 → --accent-1/2/3
   * - surfaceBase/Panel/Card/Elevated/Hover → --surface-base/panel/card/elevated/hover
   * - textStrong/Body/Muted → --text-strong/body/muted
   * - borderSubtle/Strong → --border-subtle/strong
   * - pageBackground → --page-bg-base
   * - headerBackground/Border → --header-bg-base/border-base
   * - footerBackground/Border → --footer-bg-base/border-base
   * - success/warning/error/info → --success/warning/error/info
   */
  private convertToRuntimeTokens(variables: ThemeVariables): Record<string, string> {
    console.log('[convertToRuntimeTokens] Starting conversion with variables:', {
      background: variables.background,
      colorMidnight: variables.colorMidnight,
      primary: variables.primary,
      colorAmethyst: variables.colorAmethyst
    });

    // First, generate tokens from base colors (background, primary, accent)
    const generatedTokens = this.generateTokensFromBase(variables);

    // Get base colors for override comparison
    const background = variables.background || variables.colorMidnight || '#0f0820';

    // Then apply explicit overrides from theme variables
    const tokens: Record<string, string> = { ...generatedTokens };
    console.log('[convertToRuntimeTokens] After base generation, pageBackground:', tokens.pageBackground);

    // Allow explicit overrides for each token
    // Accent scale
    if (variables.colorAmethyst) {
      tokens.accent1 = this.hexToHSL(variables.colorAmethyst);
    }
    if (variables.colorIris || variables.primary) {
      tokens.accent2 = this.hexToHSL(variables.colorIris || variables.primary!);
    }
    if (variables.colorDusk) {
      tokens.accent3 = this.hexToHSL(variables.colorDusk);
    }

    // Surface hierarchy overrides
    // Cards can have explicit colors for visual accent (e.g., warm pinkish cards on cool blue bg)
    // But other surfaces auto-generate for consistency
    if (variables.cardPanelSurfaceStrong) {
      tokens.surfaceCard = this.hexToHSL(variables.cardPanelSurfaceStrong);
      tokens.surfaceElevated = this.hexToHSL(variables.cardPanelSurfaceStrong);
    }
    if (variables.cardPanelSurface) {
      tokens.surfacePanel = this.hexToHSL(variables.cardPanelSurface);
    }

    // Text hierarchy overrides
    if (variables.textPrimary || variables.textHeading || variables.colorRune) {
      const textColor = variables.textPrimary || variables.textHeading || variables.colorRune;
      if (textColor) tokens.textStrong = this.hexToHSL(textColor);
    }
    if (variables.textBody || variables.colorInk) {
      const bodyColor = variables.textBody || variables.colorInk;
      if (bodyColor) tokens.textBody = this.hexToHSL(bodyColor);
    }
    if (variables.textMuted || variables.colorFog) {
      const mutedColor = variables.textMuted || variables.colorFog;
      if (mutedColor) tokens.textMuted = this.hexToHSL(mutedColor);
    }

    // Border overrides
    if (variables.cardPanelBorderSoft || variables.colorIris) {
      const borderColor = variables.cardPanelBorderSoft || variables.colorIris;
      if (borderColor) tokens.borderSubtle = this.hexToHSL(borderColor);
    }
    if (variables.cardPanelBorder || variables.cardPanelBorderStrong || variables.colorGold) {
      const borderColor = variables.cardPanelBorder || variables.cardPanelBorderStrong || variables.colorGold;
      if (borderColor) tokens.borderStrong = this.hexToHSL(borderColor);
    }

    // Page area overrides
    // Only use colorMidnight as fallback if background wasn't explicitly provided
    // (for backwards compatibility with old themes that only have colorMidnight)
    if (!background && variables.colorMidnight) {
      console.log('[convertToRuntimeTokens] Using colorMidnight as fallback pageBackground:', variables.colorMidnight);
      tokens.pageBackground = this.hexToHSL(variables.colorMidnight);
    }

    // Note: headerBackground and footerBackground are now ALWAYS auto-generated from the base
    // background color to ensure consistency. Explicit overrides are ignored to prevent stale
    // values from theme duplication. Borders can still be customized.
    if (variables.headerBorder) {
      tokens.headerBorder = this.hexToHSL(variables.headerBorder);
    }
    if (variables.footerBorder) {
      tokens.footerBorder = this.hexToHSL(variables.footerBorder);
    }

    // Status colors (always use explicit values if provided)
    if (variables.success) tokens.success = variables.success;
    if (variables.warning) tokens.warning = variables.warning;
    if (variables.error) tokens.error = variables.error;
    if (variables.info) tokens.info = variables.info;

    console.log('[convertToRuntimeTokens] Final tokens:', {
      pageBackground: tokens.pageBackground,
      headerBackground: tokens.headerBackground,
      footerBackground: tokens.footerBackground
    });

    return tokens;
  }

  /**
   * Parse hex color to RGB components
   */
  private hexToRGB(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle 3-digit hex
    if (hex.length === 3) {
      const r = hex.charAt(0);
      const g = hex.charAt(1);
      const b = hex.charAt(2);
      hex = r + r + g + g + b + b;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
  }

  /**
   * Convert RGB to hex format
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Mix two colors at a given ratio (0-1)
   * ratio = 0 means 100% color1, ratio = 1 means 100% color2
   */
  private mixColors(color1: string, color2: string, ratio: number): string {
    const rgb1 = this.hexToRGB(color1);
    const rgb2 = this.hexToRGB(color2);

    const r = rgb1.r + (rgb2.r - rgb1.r) * ratio;
    const g = rgb1.g + (rgb2.g - rgb1.g) * ratio;
    const b = rgb1.b + (rgb2.b - rgb1.b) * ratio;

    return this.rgbToHex(r, g, b);
  }

  /**
   * Convert hex color to HSL format
   */
  private hexToHSL(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    const hDeg = Math.round(h * 360);
    const sPercent = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `hsl(${hDeg} ${sPercent}% ${lPercent}%)`;
  }

  /**
   * Detect if a color is dark (luminance < 0.5)
   */
  private isColorDark(hex: string): boolean {
    const rgb = this.hexToRGB(hex);
    // Calculate relative luminance
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 0.5;
  }

  /**
   * Generate complete token set from base colors
   * Creates surface scales, border scales, text scales, etc.
   */
  private generateTokensFromBase(variables: ThemeVariables): Record<string, string> {
    const tokens: Record<string, string> = {};

    // Get base colors (with fallbacks)
    const background = variables.background || variables.colorMidnight || '#0f0820';
    const primary = variables.primary || variables.colorAmethyst || '#d18c47';
    const accent = variables.accent || variables.colorGold || '#d4af37';

    console.log('[generateTokensFromBase] Input colors:', { background, primary, accent });

    const isDark = this.isColorDark(background);
    console.log('[generateTokensFromBase] isDark:', isDark);
    const mixLight = '#ffffff';  // Always white to lighten colors
    const mixDark = '#000000';   // Always black to darken colors

    // Generate surface hierarchy (background mixed with white to lighten)
    // Creates elevated surfaces that are lighter than the base for both themes
    tokens.surfaceBase = this.hexToHSL(background);
    tokens.surfacePanel = this.hexToHSL(this.mixColors(background, mixLight, isDark ? 0.08 : 0.04));
    tokens.surfaceCard = this.hexToHSL(this.mixColors(background, mixLight, isDark ? 0.12 : 0.06));
    tokens.surfaceElevated = this.hexToHSL(this.mixColors(background, mixLight, isDark ? 0.16 : 0.08));
    tokens.surfaceHover = this.hexToHSL(this.mixColors(background, mixLight, isDark ? 0.10 : 0.05));

    // Generate accent scale (primary color at different intensities)
    tokens.accent1 = this.hexToHSL(this.mixColors(primary, mixLight, isDark ? 0.25 : 0.15));
    tokens.accent2 = this.hexToHSL(primary);
    tokens.accent3 = this.hexToHSL(this.mixColors(primary, mixDark, isDark ? 0.25 : 0.15));

    // Generate text hierarchy
    // For dark themes: white with varying opacity, for light themes: black with varying opacity
    if (isDark) {
      tokens.textStrong = this.hexToHSL(this.mixColors(background, '#ffffff', 0.95));
      tokens.textBody = this.hexToHSL(this.mixColors(background, '#ffffff', 0.85));
      tokens.textMuted = this.hexToHSL(this.mixColors(background, '#ffffff', 0.60));
    } else {
      tokens.textStrong = this.hexToHSL(this.mixColors(background, '#000000', 0.90));
      tokens.textBody = this.hexToHSL(this.mixColors(background, '#000000', 0.75));
      tokens.textMuted = this.hexToHSL(this.mixColors(background, '#000000', 0.50));
    }

    // Generate border colors (mixing primary/accent with background)
    tokens.borderSubtle = this.hexToHSL(this.mixColors(background, primary, isDark ? 0.25 : 0.20));
    tokens.borderStrong = this.hexToHSL(this.mixColors(background, accent, isDark ? 0.50 : 0.45));

    // Generate page area colors (always generate, don't check variables here)
    tokens.pageBackground = this.hexToHSL(background);
    tokens.headerBackground = this.hexToHSL(this.mixColors(background, mixLight, isDark ? 0.05 : 0.02));
    tokens.headerBorder = this.hexToHSL(this.mixColors(background, primary, isDark ? 0.30 : 0.25));
    tokens.footerBackground = this.hexToHSL(this.mixColors(background, mixDark, isDark ? 0.03 : 0.01));
    tokens.footerBorder = this.hexToHSL(this.mixColors(background, primary, isDark ? 0.25 : 0.20));

    // Status colors (keep as-is or use defaults)
    tokens.success = variables.success || (isDark ? '#4ade80' : '#22c55e');
    tokens.warning = variables.warning || (isDark ? '#fbbf24' : '#f59e0b');
    tokens.error = variables.error || (isDark ? '#f87171' : '#ef4444');
    tokens.info = variables.info || (isDark ? '#60a5fa' : '#3b82f6');

    console.log('[generateTokensFromBase] Generated tokens:', {
      pageBackground: tokens.pageBackground,
      headerBackground: tokens.headerBackground,
      surfaceBase: tokens.surfaceBase,
      surfaceCard: tokens.surfaceCard,
      textStrong: tokens.textStrong
    });

    return tokens;
  }

  /**
   * Update localStorage with theme data following runtime loader structure
   */
  private updateLocalStorageTheme(preset: ThemePreset): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return; // Skip if not in browser environment
    }

    const tokens = this.convertToRuntimeTokens(preset.variables);

    const themeData = {
      id: preset.slug, // Legacy compatibility
      slug: preset.slug,
      mode: preset.mode === 'dawn' ? 'light' : preset.mode,
      tokens,
    };

    try {
      localStorage.setItem('wc-active-theme', JSON.stringify(themeData));
      console.log('[ThemeManager] Updated localStorage with theme:', preset.slug, preset.mode);
      console.log('[ThemeManager] Stored tokens:', Object.keys(tokens).length, 'tokens');
      console.log('[ThemeManager] DEBUG - Base colors used for generation:');
      console.log('  background:', preset.variables.background || preset.variables.colorMidnight || '(none)');
      console.log('  primary:', preset.variables.primary || preset.variables.colorAmethyst || '(none)');
      console.log('  accent:', preset.variables.accent || preset.variables.colorGold || '(none)');
      console.log('[ThemeManager] DEBUG - Generated background tokens:');
      console.log('  pageBackground:', tokens.pageBackground);
      console.log('  headerBackground:', tokens.headerBackground);
      console.log('  footerBackground:', tokens.footerBackground);
    } catch (error) {
      console.error('Failed to update localStorage theme:', error);
    }
  }

  /**
   * Apply theme attributes and tokens to document.documentElement
   */
  private applyThemeToDocument(preset: ThemePreset): void {
    if (typeof document === 'undefined') {
      return; // Skip if not in browser environment
    }

    const root = document.documentElement;
    const tokens = this.convertToRuntimeTokens(preset.variables);

    // Set data-theme attribute
    root.setAttribute('data-theme', preset.slug);

    // Set data-comfort-theme attribute based on mode
    if (preset.mode === 'dawn') {
      root.setAttribute('data-comfort-theme', 'dawn');
    } else {
      root.removeAttribute('data-comfort-theme');
    }

    // Apply tokens as CSS custom properties
    const cssVarMap: Record<string, string> = {
      '--accent-1': 'accent1',
      '--accent-2': 'accent2',
      '--accent-3': 'accent3',
      '--surface-base': 'surfaceBase',
      '--surface-panel': 'surfacePanel',
      '--surface-card': 'surfaceCard',
      '--surface-elevated': 'surfaceElevated',
      '--surface-hover': 'surfaceHover',
      '--text-strong': 'textStrong',
      '--text-body': 'textBody',
      '--text-muted': 'textMuted',
      '--border-subtle': 'borderSubtle',
      '--border-strong': 'borderStrong',
      '--page-bg-base': 'pageBackground',
      '--header-bg-base': 'headerBackground',
      '--header-border-base': 'headerBorder',
      '--footer-bg-base': 'footerBackground',
      '--footer-border-base': 'footerBorder',
    };

    // Apply HSL tokens (strip hsl() wrapper to get just the components)
    Object.entries(cssVarMap).forEach(([cssVar, tokenKey]) => {
      const value = tokens[tokenKey];
      if (value && value.startsWith('hsl(')) {
        // Strip "hsl(" prefix and ")" suffix to get just the HSL components
        const strippedValue = value.replace('hsl(', '').replace(')', '');
        root.style.setProperty(cssVar, strippedValue);
      } else if (value) {
        root.style.setProperty(cssVar, value);
      }
    });

    // Apply status colors (plain hex values)
    const statusMap: Record<string, string> = {
      '--success': 'success',
      '--warning': 'warning',
      '--error': 'error',
      '--info': 'info',
    };

    Object.entries(statusMap).forEach(([cssVar, tokenKey]) => {
      const value = tokens[tokenKey];
      if (value && value.startsWith('#')) {
        root.style.setProperty(cssVar, value);
      }
    });

    // Apply canonical design tokens directly from theme variables so components using base tokens stay in sync.
    const v = preset.variables;
    const directVars: Record<string, string | undefined> = {
      '--color-midnight': v.colorMidnight || v.background,
      '--color-night': v.colorNight,
      '--color-iris': v.colorIris || v.primary,
      '--color-amethyst': v.colorAmethyst || v.primary,
      '--color-dusk': v.colorDusk,
      '--color-gold': v.colorGold || v.accent,
      '--color-rune': v.colorRune || v.textHeading,
      '--color-fog': v.colorFog || v.textMuted,
      '--color-ink': v.colorInk || v.textBody,
      '--color-muted': v.textMuted,
      '--color-border': v.cardPanelBorder || v.cardPanelBorderSoft,
      '--color-border-strong': v.cardPanelBorderStrong || v.colorGold,
      '--color-overlay': v.surfacePlain,
      '--color-overlay-strong': v.surfacePlain,
      '--surface-plain': v.surfacePlain || v.cardPanelSurface || v.background,
      '--surface-plain-border': v.surfacePlainBorder || v.cardPanelBorder,
      '--surface-plain-shadow': v.shadowSoft,
      '--surface-card': v.cardPanelSurfaceStrong || v.cardPanelSurface,
      '--surface-elevated': v.cardPanelSurfaceStrong || v.cardPanelSurface,
      '--surface-hover': v.surfaceHover || v.cardPanelSurfaceStrong,
      '--text-primary': v.textPrimary || v.colorInk,
      '--text-heading': v.textHeading || v.textPrimary,
      '--text-muted': v.textMuted || v.colorFog,
      '--ink-body': v.inkBody || v.textBody || v.colorInk,
      '--ink-strong': v.inkStrong || v.textStrong || v.textPrimary,
      '--ink-muted': v.inkMuted || v.textMuted,
      '--link-color': v.linkColor || v.colorGold || v.accent,
      '--border-subtle': v.cardPanelBorderSoft || v.cardPanelBorder,
      '--border-strong': v.cardPanelBorderStrong || v.cardPanelBorder || v.colorGold,
      '--focus-ring': v.focusRingColor || v.cardFocusOutline || v.accent,
      '--card-badge-bg': v.cardBadgeBg || v.cardPanelSurface || v.background,
      '--card-badge-border': v.cardBadgeBorder || v.cardPanelBorder || v.cardPanelBorderStrong,
      '--card-badge-text': v.cardBadgeText || v.textStrong || v.textPrimary,
      '--card-tag-bg': v.cardTagBg || v.cardPanelSurface || v.background,
      '--card-tag-border': v.cardTagBorder || v.cardPanelBorder || v.cardPanelBorderStrong,
      '--card-tag-text': v.cardTagText || v.textPrimary || v.textStrong,
    };

    Object.entries(directVars).forEach(([cssVar, value]) => {
      if (typeof value === 'string' && value.trim()) {
        root.style.setProperty(cssVar, value.trim());
      }
    });

    // Derive accent-linked globals (after HSL tokens are set)
    // Get the computed value which should now be HSL components without wrapper
    const accent1Value = getComputedStyle(root).getPropertyValue('--accent-1').trim();
    if (accent1Value) {
      const accent1Full = `hsl(${accent1Value})`;
      root.style.setProperty('--text-accent', accent1Value);
      root.style.setProperty('--ring-focus', `0 0 0 3px ${accent1Full}`);
      root.style.setProperty('--link-color', accent1Full);
    }
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

  private sortPresets(): void {
    (['midnight', 'dawn'] as ThemeMode[]).forEach((mode) => {
      this.sortList(this.state.presets[mode]);
    });
  }

  private sortList(list: ThemePreset[]): void {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildSavePayload(preset: ThemePreset) {
    const defaults = this.getDefaultVariables(preset.mode);
    const mergedVariables: Record<string, string> = {};

    const combined = { ...defaults, ...preset.variables } as Record<string, string | undefined>;
    for (const [key, value] of Object.entries(combined)) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      mergedVariables[key] = trimmed;
    }

    const payload: {
      label: string;
      slug: string;
      mode: ThemeMode;
      category: string;
      settings: Record<string, string>;
      overrides?: Array<{ scope: string; variables: Record<string, string> }>;
    } = {
      label: preset.name,
      slug: preset.slug,
      mode: preset.mode,
      category: preset.category,
      settings: mergedVariables,
    };

    // Include overrides if they exist
    if (preset.overrides && preset.overrides.length > 0) {
      payload.overrides = preset.overrides.map((override) => {
        const overrideVariables: Record<string, string> = {};
        for (const [key, value] of Object.entries(override.variables)) {
          if (typeof value !== 'string') continue;
          const trimmed = value.trim();
          if (!trimmed) continue;
          overrideVariables[key] = trimmed;
        }
        return {
          scope: override.scope,
          variables: overrideVariables,
        };
      });
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

    // Restore overrides from the API record, falling back to existing overrides
    let overrides: ThemeOverride[] | undefined;
    if (record.overrides && Array.isArray(record.overrides) && record.overrides.length > 0) {
      overrides = record.overrides.map((override) => ({
        scope: override.scope,
        variables: { ...override.variables },
      }));
    } else if (existing?.overrides) {
      overrides = this.cloneOverrides(existing.overrides);
    }

    const merged: ThemePreset = {
      name: record.label || existing?.name || record.slug,
      slug: record.slug,
      mode: record.mode,
      category: record.category || existing?.category || 'custom',
      variables,
      overrides,
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

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
    } catch (error) {
      const networkError = new Error(`Could not reach the theme API at ${url}`);
      (networkError as Error & { cause?: unknown }).cause = error;
      throw networkError;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      const parseError = new Error(`Received invalid JSON from ${url}`);
      (parseError as Error & { cause?: unknown }).cause = error;
      throw parseError;
    }

    if (typeof data !== 'object' || data === null) {
      throw new Error(`Received invalid JSON from ${url}`);
    }

    const body = data as { ok?: boolean; error?: string };

    if (!response.ok || !body.ok) {
      const message = body.error || `Request to ${path} failed with status ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
