/**
 * Comprehensive Theme Editor Variables
 * List of all editable theme variables
 */

export const ALL_COLOR_VARIABLES = [
  // Core Brand Colors
  'colorMidnight', 'colorNight', 'colorIris', 'colorAmethyst', 'colorDusk',
  'colorGold', 'colorRune', 'colorFog', 'colorInk',

  // Surface Colors
  'surfacePlain', 'surfacePlainBorder', 'cardPanelSurface', 'cardPanelSurfaceStrong',
  'cardPanelBorder', 'cardPanelBorderStrong', 'cardPanelBorderSoft',

  // Text Colors
  'textPrimary', 'textSecondary', 'textTertiary', 'textHint', 'textDisabled',
  'inkBody', 'inkStrong', 'inkMuted', 'linkColor',

  // Card Components
  'cardBadgeBg', 'cardBadgeBorder', 'cardBadgeText',
  'cardTagBg', 'cardTagBorder', 'cardTagText',
  'cardSpoonBg', 'cardSpoonBorder', 'cardSpoonText',

  // Interactive
  'focusRingColor', 'cardFocusOutline',

  // Semantic Status
  'success', 'warning', 'error', 'info',
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
    const normalized = normalizeHex(value);

    const picker = elements[`${key}Picker`] as HTMLInputElement;
    const input = elements[`${key}Input`] as HTMLInputElement;

    if (picker && normalized) picker.value = normalized;
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
    variables.cardPanelBorder || defaults.cardPanelBorder || 'rgba(212, 175, 55, 0.32)');

  // Text colors
  previewRoot.style.setProperty('--preview-text-primary',
    variables.textPrimary || defaults.textPrimary || 'rgba(244, 241, 255, 0.96)');
  previewRoot.style.setProperty('--preview-text-secondary',
    variables.textSecondary || defaults.textSecondary || 'rgba(244, 241, 255, 0.85)');
  previewRoot.style.setProperty('--preview-text-heading',
    variables.inkStrong || defaults.inkStrong || '#ffffff');
  previewRoot.style.setProperty('--preview-text-muted',
    variables.inkMuted || defaults.inkMuted || '#d9b2c4');
  previewRoot.style.setProperty('--preview-link',
    variables.linkColor || defaults.linkColor || '#e0c07d');

  // Badge colors
  previewRoot.style.setProperty('--preview-badge-bg',
    variables.cardBadgeBg || defaults.cardBadgeBg || 'rgba(212, 175, 55, 0.30)');
  previewRoot.style.setProperty('--preview-badge-border',
    variables.cardBadgeBorder || defaults.cardBadgeBorder || 'rgba(212, 175, 55, 0.55)');
  previewRoot.style.setProperty('--preview-badge-text',
    variables.cardBadgeText || defaults.cardBadgeText || '#f8f3ff');

  // Tag colors
  previewRoot.style.setProperty('--preview-tag-bg',
    variables.cardTagBg || defaults.cardTagBg || 'rgba(75, 42, 99, 0.26)');
  previewRoot.style.setProperty('--preview-tag-border',
    variables.cardTagBorder || defaults.cardTagBorder || 'rgba(75, 42, 99, 0.42)');
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
}
