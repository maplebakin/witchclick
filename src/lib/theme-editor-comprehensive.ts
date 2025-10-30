/**
 * Comprehensive Theme Editor Variables
 * List of all editable theme variables
 */

/**
 * Convert rgba/rgb CSS color to hex format for color pickers
 * Returns null if the value is not a valid color format
 */
export function colorToHex(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Already a hex value
  if (/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed.startsWith('#') ? trimmed.substring(0, 7) : `#${trimmed.substring(0, 6)}`;
  }

  // Parse rgba/rgb values
  const rgbaMatch = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(trimmed);
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);

    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      const hex = '#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');
      return hex;
    }
  }

  return null;
}

export const ALL_COLOR_VARIABLES = [
  // Core Brand Colors
  'colorMidnight', 'colorNight', 'colorIris', 'colorAmethyst', 'colorDusk',
  'colorGold', 'colorRune', 'colorFog', 'colorInk',

  // Surface Colors
  'surfacePlain', 'surfacePlainBorder', 'cardPanelSurface', 'cardPanelSurfaceStrong',
  'cardPanelBorder', 'cardPanelBorderStrong', 'cardPanelBorderSoft',

  // Text Colors
  'textPrimary', 'textSecondary', 'textTertiary', 'textStrong', 'textHint', 'textDisabled',
  'textBody', 'textSubtle', 'textAccent', 'textAccentStrong', 'textHeading',
  'inkBody', 'inkStrong', 'inkMuted', 'linkColor',

  // Card Components
  'cardBadgeBg', 'cardBadgeBorder', 'cardBadgeText',
  'cardTagBg', 'cardTagBorder', 'cardTagText',
  'cardSpoonBg', 'cardSpoonBorder', 'cardSpoonText',

  // Interactive
  'focusRingColor', 'cardFocusOutline',

  // Semantic Status
  'success', 'warning', 'error', 'info',

  // Entity Grimoire Specific
  'entityCardBorder', 'entityCardGlow', 'entityCardHighlight',
  'entityCardSurfaceTop', 'entityCardSurfaceBottom',
  'entityCardHeading', 'entityCardText', 'entityCardLabel',
  'entityCardCta', 'entityCardCtaHover', 'entityCardIcon', 'entityCardIconShadow',
] as const;

export const ALL_FONT_VARIABLES = [
  'fontSerif', 'fontScript', 'fontHeading', 'fontAccent'
] as const;

/**
 * Initialize all color inputs for the comprehensive editor
 */
export function initializeAllColorElements(elements: Record<string, HTMLElement | null>) {
  ALL_COLOR_VARIABLES.forEach((key) => {
    elements[`${key}Picker`] = document.querySelector(`[data-color-picker="${key}"]`);
    elements[`${key}Input`] = document.querySelector(`[data-color-input="${key}"]`);
  });

  ALL_FONT_VARIABLES.forEach((key) => {
    elements[`${key}Select`] = document.getElementById(`theme${key.charAt(0).toUpperCase() + key.slice(1)}`);
  });
}

/**
 * Setup event listeners for all color inputs
 */
export function setupAllColorListeners(
  elements: Record<string, HTMLElement | null>,
  onUpdate: () => void,
  normalizeHex: (value: string) => string | null
) {
  ALL_COLOR_VARIABLES.forEach((key) => {
    const picker = elements[`${key}Picker`] as HTMLInputElement;
    const input = elements[`${key}Input`] as HTMLInputElement;

    picker?.addEventListener('input', () => {
      if (input) input.value = picker.value;
      onUpdate();
    });

    input?.addEventListener('input', () => {
      onUpdate();
    });

    input?.addEventListener('blur', () => {
      const normalized = normalizeHex(input.value);
      if (normalized && picker) {
        picker.value = normalized;
        input.value = normalized;
      }
      onUpdate();
    });
  });

  ALL_FONT_VARIABLES.forEach((key) => {
    const select = elements[`${key}Select`];
    select?.addEventListener('change', () => onUpdate());
  });
}

/**
 * Populate all form inputs from preset data
 */
export function populateAllFormInputs(
  elements: Record<string, HTMLElement | null>,
  presetVariables: Record<string, string | undefined>,
  defaults: Record<string, string | undefined>,
  normalizeHex: (value: string) => string | null
) {
  // Colors
  ALL_COLOR_VARIABLES.forEach((key) => {
    const value = presetVariables[key] || defaults[key] || '';
    // Use colorToHex to handle rgba/rgb values for the color picker
    const hexValue = colorToHex(value);

    const picker = elements[`${key}Picker`] as HTMLInputElement;
    const input = elements[`${key}Input`] as HTMLInputElement;

    if (picker && hexValue) picker.value = hexValue;
    if (input) input.value = value;
  });

  // Fonts
  ALL_FONT_VARIABLES.forEach((key) => {
    const select = elements[`${key}Select`] as HTMLSelectElement;
    if (select) {
      select.value = presetVariables[key] || defaults[key] || '';
    }
  });
}

/**
 * Collect all current values from form inputs
 */
export function collectAllFormValues(elements: Record<string, HTMLElement | null>): Record<string, string> {
  const values: Record<string, string> = {};

  // Colors
  ALL_COLOR_VARIABLES.forEach((key) => {
    const input = elements[`${key}Input`] as HTMLInputElement;
    if (input && input.value) {
      values[key] = input.value;
    }
  });

  // Fonts
  ALL_FONT_VARIABLES.forEach((key) => {
    const select = elements[`${key}Select`] as HTMLSelectElement;
    if (select && select.value) {
      values[key] = select.value;
    }
  });

  return values;
}

/**
 * Update preview with all theme variables
 */
export function updateAllPreviewVariables(
  previewRoot: HTMLElement,
  variables: Record<string, string | undefined>,
  defaults: Record<string, string | undefined>
) {
  // Card surface colors
  previewRoot.style.setProperty('--preview-card-surface',
    variables.cardPanelSurface || defaults.cardPanelSurface || '#1a0d2e');
  previewRoot.style.setProperty('--preview-card-border',
    variables.cardPanelBorder || defaults.cardPanelBorder || '#d4af37');

  // Text colors
  previewRoot.style.setProperty('--preview-text-primary',
    variables.textBody || defaults.textBody || variables.textPrimary || defaults.textPrimary || '#f4f1ff');
  previewRoot.style.setProperty('--preview-text-secondary',
    variables.textSecondary || defaults.textSecondary || '#f4f1ff');
  previewRoot.style.setProperty('--preview-text-heading',
    variables.textHeading || defaults.textHeading || variables.textStrong || defaults.textStrong || variables.inkStrong || defaults.inkStrong || '#ffffff');
  previewRoot.style.setProperty('--preview-text-muted',
    variables.textMuted || defaults.textMuted || variables.inkMuted || defaults.inkMuted || '#d9b2c4');
  previewRoot.style.setProperty('--preview-link',
    variables.linkColor || defaults.linkColor || '#e0c07d');

  // Badge colors
  previewRoot.style.setProperty('--preview-badge-bg',
    variables.cardBadgeBg || defaults.cardBadgeBg || '#d4af37');
  previewRoot.style.setProperty('--preview-badge-border',
    variables.cardBadgeBorder || defaults.cardBadgeBorder || '#d4af37');
  previewRoot.style.setProperty('--preview-badge-text',
    variables.cardBadgeText || defaults.cardBadgeText || '#f8f3ff');

  // Tag colors
  previewRoot.style.setProperty('--preview-tag-bg',
    variables.cardTagBg || defaults.cardTagBg || '#4b2a63');
  previewRoot.style.setProperty('--preview-tag-border',
    variables.cardTagBorder || defaults.cardTagBorder || '#4b2a63');
  previewRoot.style.setProperty('--preview-tag-text',
    variables.cardTagText || defaults.cardTagText || '#f4f1ff');

  // Semantic status colors
  previewRoot.style.setProperty('--preview-success',
    variables.success || defaults.success || '#4ade80');
  previewRoot.style.setProperty('--preview-warning',
    variables.warning || defaults.warning || '#fbbf24');
  previewRoot.style.setProperty('--preview-error',
    variables.error || defaults.error || '#f87171');
  previewRoot.style.setProperty('--preview-info',
    variables.info || defaults.info || '#60a5fa');

  // Entity Grimoire specific colors
  previewRoot.style.setProperty('--preview-entity-border',
    variables.entityCardBorder || defaults.entityCardBorder || '#d4af37');
  previewRoot.style.setProperty('--preview-entity-glow',
    variables.entityCardGlow || defaults.entityCardGlow || '#d4af37');
  previewRoot.style.setProperty('--preview-entity-highlight',
    variables.entityCardHighlight || defaults.entityCardHighlight || '#d4af37');
  previewRoot.style.setProperty('--preview-entity-surface-top',
    variables.entityCardSurfaceTop || defaults.entityCardSurfaceTop || '#1a0d2e');
  previewRoot.style.setProperty('--preview-entity-surface-bottom',
    variables.entityCardSurfaceBottom || defaults.entityCardSurfaceBottom || '#120725');
  previewRoot.style.setProperty('--preview-entity-heading',
    variables.entityCardHeading || defaults.entityCardHeading || '#ffffff');
  previewRoot.style.setProperty('--preview-entity-text',
    variables.entityCardText || defaults.entityCardText || '#f4f1ff');
  previewRoot.style.setProperty('--preview-entity-label',
    variables.entityCardLabel || defaults.entityCardLabel || '#d4af37');
  previewRoot.style.setProperty('--preview-entity-cta',
    variables.entityCardCta || defaults.entityCardCta || '#7c4eb0');
  previewRoot.style.setProperty('--preview-entity-cta-hover',
    variables.entityCardCtaHover || defaults.entityCardCtaHover || '#9b6fd0');
  previewRoot.style.setProperty('--preview-entity-icon',
    variables.entityCardIcon || defaults.entityCardIcon || '#d4af37');
  previewRoot.style.setProperty('--preview-entity-icon-shadow',
    variables.entityCardIconShadow || defaults.entityCardIconShadow || '#d4af37');
}
