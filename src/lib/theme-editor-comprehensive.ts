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

type DebouncedFunction<T extends (...args: any[]) => void> = ((
  ...args: Parameters<T>
) => void) & {
  flush: () => void;
  cancel: () => void;
};

/**
 * Lightweight debounce helper with flush/cancel controls
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: number | undefined;
  let lastCall: { args: Parameters<T>; context: ThisParameterType<T> } | undefined;

  const invoke = () => {
    timeoutId = undefined;
    if (lastCall) {
      fn.apply(lastCall.context, lastCall.args);
    } else if (fn.length === 0) {
      fn.call(undefined as ThisParameterType<T>);
    }
  };

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastCall = { args, context: this };
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(invoke, delay);
  } as DebouncedFunction<T>;

  debounced.flush = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      invoke();
      return;
    }

    if (lastCall) {
      fn.apply(lastCall.context, lastCall.args);
    } else if (fn.length === 0) {
      fn.call(undefined as ThisParameterType<T>);
    }
  };

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

export const ALL_COLOR_VARIABLES = [
  // Core Brand Colors
  'colorMidnight', 'colorNight', 'colorIris', 'colorAmethyst', 'colorDusk',
  'colorGold', 'colorRune', 'colorFog', 'colorInk',

  // Header & Footer
  'headerBackground', 'headerBorder', 'headerText', 'headerTextHover',
  'footerBackground', 'footerBorder', 'footerText', 'footerTextMuted',

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
  const debouncedUpdate = debounce(onUpdate, 120);

  ALL_COLOR_VARIABLES.forEach((key) => {
    const picker = elements[`${key}Picker`] as HTMLInputElement;
    const input = elements[`${key}Input`] as HTMLInputElement;

    picker?.addEventListener('input', () => {
      if (input) input.value = picker.value;
      debouncedUpdate();
    });

    input?.addEventListener('input', () => {
      debouncedUpdate();
    });

    input?.addEventListener('blur', () => {
      const normalized = normalizeHex(input.value);
      if (normalized && picker) {
        picker.value = normalized;
        input.value = normalized;
      }
      debouncedUpdate();
      debouncedUpdate.flush();
    });
  });

  ALL_FONT_VARIABLES.forEach((key) => {
    const select = elements[`${key}Select`];
    select?.addEventListener('change', () => {
      debouncedUpdate();
      debouncedUpdate.flush();
    });
  });
}

/**
 * Populate all form inputs from preset data
 */
export function populateAllFormInputs(
  elements: Record<string, HTMLElement | null>,
  presetVariables: Record<string, string | undefined>,
  defaults: Record<string, string | undefined>
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
  const resolved: Record<string, string> = {};

  ALL_COLOR_VARIABLES.forEach((key) => {
    const resolvedValue = variables[key] || defaults[key] || '';
    resolved[key] = resolvedValue;

    if (resolvedValue) {
      previewRoot.style.setProperty(`--preview-${key}`, resolvedValue);
    } else {
      previewRoot.style.removeProperty(`--preview-${key}`);
    }

    const swatchValue = previewRoot.querySelector<HTMLElement>(`[data-preview-swatch-value="${key}"]`);
    if (swatchValue) {
      swatchValue.textContent = resolvedValue || '—';
    }

    const swatchContainer = previewRoot.querySelector<HTMLElement>(`[data-preview-swatch="${key}"]`);
    if (swatchContainer) {
      swatchContainer.setAttribute('title', resolvedValue || 'Not set');
    }
  });

  ALL_FONT_VARIABLES.forEach((key) => {
    const resolvedValue = variables[key] || defaults[key] || '';

    if (resolvedValue) {
      previewRoot.style.setProperty(`--preview-${key}`, resolvedValue);
    } else {
      previewRoot.style.removeProperty(`--preview-${key}`);
    }

    previewRoot
      .querySelectorAll<HTMLElement>(`[data-preview-font="${key}"]`)
      .forEach((element) => {
        element.style.fontFamily = resolvedValue || '';
      });

    previewRoot
      .querySelectorAll<HTMLElement>(`[data-preview-font-value="${key}"]`)
      .forEach((element) => {
        element.textContent = resolvedValue || 'System default';
      });
  });

  // Maintain legacy preview variables so older markup still renders gracefully
  previewRoot.style.setProperty(
    '--preview-card-surface',
    resolved.cardPanelSurface || defaults.cardPanelSurface || '#1a0d2e'
  );
  previewRoot.style.setProperty(
    '--preview-card-border',
    resolved.cardPanelBorder || defaults.cardPanelBorder || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-text-primary',
    resolved.textBody || defaults.textBody || resolved.textPrimary || defaults.textPrimary || '#f4f1ff'
  );
  previewRoot.style.setProperty(
    '--preview-text-secondary',
    resolved.textSecondary || defaults.textSecondary || '#f4f1ff'
  );
  previewRoot.style.setProperty(
    '--preview-text-heading',
    resolved.textHeading || defaults.textHeading || resolved.textStrong || defaults.textStrong || resolved.inkStrong || defaults.inkStrong || '#ffffff'
  );
  previewRoot.style.setProperty(
    '--preview-text-muted',
    resolved.textMuted || defaults.textMuted || resolved.inkMuted || defaults.inkMuted || '#d9b2c4'
  );
  previewRoot.style.setProperty(
    '--preview-link',
    resolved.linkColor || defaults.linkColor || '#e0c07d'
  );

  previewRoot.style.setProperty(
    '--preview-cardBadgeBg',
    resolved.cardBadgeBg || defaults.cardBadgeBg || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-cardBadgeBorder',
    resolved.cardBadgeBorder || defaults.cardBadgeBorder || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-cardBadgeText',
    resolved.cardBadgeText || defaults.cardBadgeText || '#f8f3ff'
  );
  previewRoot.style.setProperty(
    '--preview-cardTagBg',
    resolved.cardTagBg || defaults.cardTagBg || '#4b2a63'
  );
  previewRoot.style.setProperty(
    '--preview-cardTagBorder',
    resolved.cardTagBorder || defaults.cardTagBorder || '#4b2a63'
  );
  previewRoot.style.setProperty(
    '--preview-cardTagText',
    resolved.cardTagText || defaults.cardTagText || '#f4f1ff'
  );

  previewRoot.style.setProperty(
    '--preview-success',
    resolved.success || defaults.success || '#4ade80'
  );
  previewRoot.style.setProperty(
    '--preview-warning',
    resolved.warning || defaults.warning || '#fbbf24'
  );
  previewRoot.style.setProperty(
    '--preview-error',
    resolved.error || defaults.error || '#f87171'
  );
  previewRoot.style.setProperty(
    '--preview-info',
    resolved.info || defaults.info || '#60a5fa'
  );

  previewRoot.style.setProperty(
    '--preview-entityCardBorder',
    resolved.entityCardBorder || defaults.entityCardBorder || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardGlow',
    resolved.entityCardGlow || defaults.entityCardGlow || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardHighlight',
    resolved.entityCardHighlight || defaults.entityCardHighlight || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardSurfaceTop',
    resolved.entityCardSurfaceTop || defaults.entityCardSurfaceTop || '#1a0d2e'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardSurfaceBottom',
    resolved.entityCardSurfaceBottom || defaults.entityCardSurfaceBottom || '#120725'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardHeading',
    resolved.entityCardHeading || defaults.entityCardHeading || '#ffffff'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardText',
    resolved.entityCardText || defaults.entityCardText || '#f4f1ff'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardLabel',
    resolved.entityCardLabel || defaults.entityCardLabel || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardCta',
    resolved.entityCardCta || defaults.entityCardCta || '#7c4eb0'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardCtaHover',
    resolved.entityCardCtaHover || defaults.entityCardCtaHover || '#9b6fd0'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardIcon',
    resolved.entityCardIcon || defaults.entityCardIcon || '#d4af37'
  );
  previewRoot.style.setProperty(
    '--preview-entityCardIconShadow',
    resolved.entityCardIconShadow || defaults.entityCardIconShadow || '#d4af37'
  );
}
