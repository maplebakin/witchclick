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

  // HSL/HSLA values (space or comma separated)
  const hslMatch = /hsla?\s*\(\s*([0-9.+-]+)(?:deg)?\s*[, ]\s*([0-9.+-]+)%\s*[, ]\s*([0-9.+-]+)%/i.exec(trimmed);
  if (hslMatch && hslMatch[1] && hslMatch[2] && hslMatch[3]) {
    const h = ((parseFloat(hslMatch[1]) % 360) + 360) % 360;
    const s = Math.min(Math.max(parseFloat(hslMatch[2]), 0), 100) / 100;
    const l = Math.min(Math.max(parseFloat(hslMatch[3]), 0), 100) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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

import { ALL_COLOR_VARIABLE_KEYS, ALL_FONT_VARIABLE_KEYS } from './theme-variable-keys';

/**
 * Initialize all color inputs for the comprehensive editor
 */
type ElementValue =
  | HTMLElement
  | HTMLInputElement
  | HTMLSelectElement
  | Array<HTMLElement | HTMLInputElement | HTMLSelectElement>
  | null;

export function initializeAllColorElements(elements: Record<string, ElementValue>) {
  ALL_COLOR_VARIABLE_KEYS.forEach((key) => {
    const pickers = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-color-picker="${key}"]`));
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-color-input="${key}"]`));

    elements[`${key}Picker`] = pickers[0] ?? null;
    elements[`${key}Input`] = inputs[0] ?? null;
    elements[`${key}Pickers`] = pickers;
    elements[`${key}Inputs`] = inputs;
  });

  ALL_FONT_VARIABLE_KEYS.forEach((key) => {
    const keyStr = String(key);
    elements[`${keyStr}Select`] = document.getElementById(`theme${keyStr.charAt(0).toUpperCase() + keyStr.slice(1)}`);
  });
}

/**
 * Setup event listeners for all color inputs
 */
export function setupAllColorListeners(
  elements: Record<string, ElementValue>,
  onUpdate: () => void,
  normalizeHex: (value: string) => string | null
) {
  const debouncedUpdate = debounce(onUpdate, 120);

  ALL_COLOR_VARIABLE_KEYS.forEach((key) => {
    const pickers = Array.isArray(elements[`${key}Pickers`])
      ? (elements[`${key}Pickers`] as HTMLInputElement[])
      : elements[`${key}Picker`]
      ? [elements[`${key}Picker`] as HTMLInputElement]
      : [];
    const inputs = Array.isArray(elements[`${key}Inputs`])
      ? (elements[`${key}Inputs`] as HTMLInputElement[])
      : elements[`${key}Input`]
      ? [elements[`${key}Input`] as HTMLInputElement]
      : [];

    const syncAll = (value: string) => {
      pickers.forEach((picker) => {
        if (picker.value !== value) picker.value = value;
      });
      inputs.forEach((input) => {
        if (input.value !== value) input.value = value;
      });
    };

    pickers.forEach((picker) => {
      picker.addEventListener('input', () => {
        syncAll(picker.value);
        debouncedUpdate();
      });
      picker.addEventListener('change', () => {
        const normalized = normalizeHex(picker.value);
        if (normalized) {
          syncAll(normalized);
        }
        debouncedUpdate();
        debouncedUpdate.flush();
      });
    });

    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        syncAll(input.value);
        debouncedUpdate();
      });

      input.addEventListener('blur', () => {
        const normalized = normalizeHex(input.value);
        if (normalized) {
          syncAll(normalized);
        }
        debouncedUpdate();
        debouncedUpdate.flush();
      });
    });
  });

  ALL_FONT_VARIABLE_KEYS.forEach((key) => {
    const select = elements[`${key}Select`];
    if (select && !Array.isArray(select) && 'addEventListener' in select) {
      (select as HTMLSelectElement).addEventListener('change', () => {
        debouncedUpdate();
        debouncedUpdate.flush();
      });
    }
  });
}

/**
 * Populate all form inputs from preset data
 */
export function populateAllFormInputs(
  elements: Record<string, ElementValue>,
  presetVariables: Record<string, string | undefined>,
  defaults: Record<string, string | undefined>
) {
  // Colors
  ALL_COLOR_VARIABLE_KEYS.forEach((key) => {
    const value = presetVariables[key] || defaults[key] || '';
    // Use colorToHex to handle rgba/rgb values for the color picker
    const hexValue = colorToHex(value);

    const pickers = Array.isArray(elements[`${key}Pickers`])
      ? (elements[`${key}Pickers`] as HTMLInputElement[])
      : elements[`${key}Picker`]
      ? [elements[`${key}Picker`] as HTMLInputElement]
      : [];
    const inputs = Array.isArray(elements[`${key}Inputs`])
      ? (elements[`${key}Inputs`] as HTMLInputElement[])
      : elements[`${key}Input`]
      ? [elements[`${key}Input`] as HTMLInputElement]
      : [];

    pickers.forEach((picker) => {
      if (hexValue) picker.value = hexValue;
    });
    inputs.forEach((input) => {
      input.value = value;
    });
  });

  // Fonts
  ALL_FONT_VARIABLE_KEYS.forEach((key) => {
    const select = elements[`${key}Select`] as HTMLSelectElement;
    if (select) {
      select.value = presetVariables[key] || defaults[key] || '';
    }
  });
}

/**
 * Collect all current values from form inputs
 */
export function collectAllFormValues(elements: Record<string, ElementValue>): Record<string, string> {
  const values: Record<string, string> = {};

  // Colors
  ALL_COLOR_VARIABLE_KEYS.forEach((key) => {
    const inputCandidates = Array.isArray(elements[`${key}Inputs`])
      ? (elements[`${key}Inputs`] as HTMLInputElement[])
      : elements[`${key}Input`]
      ? [elements[`${key}Input`] as HTMLInputElement]
      : [];
    const input = inputCandidates.find((candidate) => !!candidate.value);
    if (input && input.value) values[key] = input.value;
  });

  // Fonts
  ALL_FONT_VARIABLE_KEYS.forEach((key) => {
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

  ALL_COLOR_VARIABLE_KEYS.forEach((key) => {
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

  ALL_FONT_VARIABLE_KEYS.forEach((key) => {
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
  previewRoot.style.setProperty('--preview-card-surface',
    resolved.cardPanelSurface || defaults.cardPanelSurface || ''
  );
  previewRoot.style.setProperty(
    '--preview-card-border',
    resolved.cardPanelBorder || defaults.cardPanelBorder || ''
  );
  previewRoot.style.setProperty(
    '--preview-text-primary',
    resolved.textBody || defaults.textBody || resolved.textPrimary || defaults.textPrimary || ''
  );
  previewRoot.style.setProperty(
    '--preview-text-secondary',
    resolved.textSecondary || defaults.textSecondary || ''
  );
  previewRoot.style.setProperty(
    '--preview-text-heading',
    resolved.textHeading || defaults.textHeading || resolved.textStrong || defaults.textStrong || resolved.inkStrong || defaults.inkStrong || ''
  );
  previewRoot.style.setProperty(
    '--preview-text-muted',
    resolved.textMuted || defaults.textMuted || resolved.inkMuted || defaults.inkMuted || ''
  );
  previewRoot.style.setProperty(
    '--preview-link',
    resolved.linkColor || defaults.linkColor || ''
  );

  previewRoot.style.setProperty(
    '--preview-cardBadgeBg',
    resolved.cardBadgeBg || defaults.cardBadgeBg || ''
  );
  previewRoot.style.setProperty(
    '--preview-cardBadgeBorder',
    resolved.cardBadgeBorder || defaults.cardBadgeBorder || ''
  );
  previewRoot.style.setProperty(
    '--preview-cardBadgeText',
    resolved.cardBadgeText || defaults.cardBadgeText || ''
  );
  previewRoot.style.setProperty(
    '--preview-cardTagBg',
    resolved.cardTagBg || defaults.cardTagBg || ''
  );
  previewRoot.style.setProperty(
    '--preview-cardTagBorder',
    resolved.cardTagBorder || defaults.cardTagBorder || ''
  );
  previewRoot.style.setProperty(
    '--preview-cardTagText',
    resolved.cardTagText || defaults.cardTagText || ''
  );

  previewRoot.style.setProperty(
    '--preview-success',
    resolved.success || defaults.success || ''
  );
  previewRoot.style.setProperty(
    '--preview-warning',
    resolved.warning || defaults.warning || ''
  );
  previewRoot.style.setProperty(
    '--preview-error',
    resolved.error || defaults.error || ''
  );
  previewRoot.style.setProperty(
    '--preview-info',
    resolved.info || defaults.info || ''
  );

  previewRoot.style.setProperty(
    '--preview-entityCardBorder',
    resolved.entityCardBorder || defaults.entityCardBorder || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardGlow',
    resolved.entityCardGlow || defaults.entityCardGlow || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardHighlight',
    resolved.entityCardHighlight || defaults.entityCardHighlight || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardSurfaceTop',
    resolved.entityCardSurfaceTop || defaults.entityCardSurfaceTop || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardSurfaceBottom',
    resolved.entityCardSurfaceBottom || defaults.entityCardSurfaceBottom || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardHeading',
    resolved.entityCardHeading || defaults.entityCardHeading || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardText',
    resolved.entityCardText || defaults.entityCardText || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardLabel',
    resolved.entityCardLabel || defaults.entityCardLabel || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardCta',
    resolved.entityCardCta || defaults.entityCardCta || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardCtaHover',
    resolved.entityCardCtaHover || defaults.entityCardCtaHover || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardIcon',
    resolved.entityCardIcon || defaults.entityCardIcon || ''
  );
  previewRoot.style.setProperty(
    '--preview-entityCardIconShadow',
    resolved.entityCardIconShadow || defaults.entityCardIconShadow || ''
  );
}
