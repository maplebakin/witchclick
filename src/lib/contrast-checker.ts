/**
 * WCAG Contrast Checker
 * Calculates contrast ratios and validates WCAG AA/AAA compliance
 */

export interface ContrastResult {
  ratio: number;
  score: 'AAA' | 'AA' | 'Fail';
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim());
  if (!match || !match[1]) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getLuminance(rgb: RGB): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check contrast against WCAG guidelines
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = getContrastRatio(foreground, background) || 1;

  // WCAG 2.0 Level AA requires 4.5:1 for normal text, 3:1 for large text
  // WCAG 2.0 Level AAA requires 7:1 for normal text, 4.5:1 for large text
  const passesAA = ratio >= 4.5;
  const passesAAA = ratio >= 7;
  const passesAALarge = ratio >= 3;
  const passesAAALarge = ratio >= 4.5;

  let score: 'AAA' | 'AA' | 'Fail';
  if (passesAAA) {
    score = 'AAA';
  } else if (passesAA) {
    score = 'AA';
  } else {
    score = 'Fail';
  }

  return {
    ratio,
    score,
    passesAA,
    passesAAA,
    passesAALarge,
    passesAAALarge,
  };
}

/**
 * Pick a contrasting color (black or white) for a given background
 */
export function pickContrastColor(background: string): string {
  const rgb = hexToRgb(background);
  if (!rgb) return '#1f1630';
  const luminance = getLuminance(rgb);
  return luminance > 0.5 ? '#1f1630' : '#fdfcfe';
}

/**
 * Format contrast ratio for display
 */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
