
const colors = require('tailwindcss/colors');

/**
 * A leaner, more systematic color palette.
 * This replaces the overgrown `customColors` object.
 *
 * It's organized by:
 * - `brand`: Core brand identity colors.
 * - `neutral`: A full 50-950 scale for text, surfaces, and borders.
 * - `status`: Semantic colors for info, success, warning, and danger states.
 * - `focus`: A dedicated color for focus rings.
 */
const simplifiedColors = {
  // Core brand identity
  brand: {
    primary: '#d18c47',        // The main, rich gold
    'primary-strong': '#b8662f', // A deeper, more grounded gold for hovers
    accent: '#e4a667',          // A brighter, more energetic accent
  },

  // A complete neutral scale for UI elements.
  // Using 'zinc' for a modern, slightly warm gray.
  neutral: colors.zinc,

  // Semantic status colors
  status: {
    info: colors.blue[500],
    'info-soft': colors.blue[50],
    'info-strong': colors.blue[700],

    success: colors.green[600],
    'success-soft': colors.green[50],
    'success-strong': colors.green[800],

    warning: colors.amber[500],
    'warning-soft': colors.amber[50],
    'warning-strong': colors.amber[700],

    danger: colors.red[600],
    'danger-soft': colors.red[50],
    'danger-strong': colors.red[800],
  },

  // Dedicated focus ring color for accessibility
  focus: '#e4a667',

  // Basic inverse colors
  white: colors.white,
  black: colors.black,
  transparent: 'transparent',
};

/**
 * This function maps the simplified color palette to the existing semantic
 * color names used throughout the app. This is a temporary compatibility layer
 * to allow for a gradual refactor.
 *
 * New components should use the simplified colors directly (e.g., `bg-neutral-100`).
 * Existing components can continue to use the old names (e.g., `bg-surface-neutral-soft`)
 * until they are refactored.
 *
 * @returns {Record<string, string>} A flat object of color names to hex values.
 */
const mapToLegacySemanticNames = () => {
  return {
    // Brand mapping
    primary: simplifiedColors.brand.primary,
    'primary-strong': simplifiedColors.brand['primary-strong'],
    secondary: simplifiedColors.brand.accent, // Simplified: secondary is now accent
    tertiary: simplifiedColors.brand['primary-strong'], // Simplified: tertiary is now primary-strong
    accent: simplifiedColors.brand.accent,
    'accent-soft': '#f2bf8c', // Kept for smoother visual transition, but should be deprecated
    'accent-faint': '#f8e0c2', // Kept for smoother visual transition, but should be deprecated

    // Neutral text mapping (light mode)
    'body-strong': simplifiedColors.neutral[800],
    'body': simplifiedColors.neutral[700],
    'body-muted': simplifiedColors.neutral[600],
    'body-subtle': simplifiedColors.neutral[500],
    'body-faint': simplifiedColors.neutral[400],

    // Inverse text mapping (dark mode)
    'inverse': simplifiedColors.neutral[50],
    'inverse-soft': simplifiedColors.neutral[100],
    'inverse-muted': simplifiedColors.neutral[200],
    'inverse-subtle': simplifiedColors.neutral[300],
    'inverse-faint': simplifiedColors.neutral[400],

    // Status mapping
    info: simplifiedColors.status.info,
    'info-strong': simplifiedColors.status['info-strong'],
    'info-soft': simplifiedColors.status['info-soft'],
    success: simplifiedColors.status.success,
    'success-strong': simplifiedColors.status['success-strong'],
    'success-soft': simplifiedColors.status['success-soft'],
    warning: simplifiedColors.status.warning,
    'warning-strong': simplifiedColors.status['warning-strong'],
    'warning-soft': simplifiedColors.status['warning-soft'],
    danger: simplifiedColors.status.danger,
    'danger-strong': simplifiedColors.status['danger-strong'],
    'danger-soft': simplifiedColors.status['danger-soft'],

    // Surface mapping
    'surface-base': simplifiedColors.white,
    'surface-card': simplifiedColors.white,
    'surface-muted': simplifiedColors.neutral[50],
    'surface-soft': simplifiedColors.neutral[100],
    'surface-inverse': simplifiedColors.neutral[900],
    'surface-inverse-soft': simplifiedColors.neutral[800],
    'surface-inverse-muted': simplifiedColors.neutral[700],

    // Line (border) mapping
    'line-neutral': simplifiedColors.neutral[200],
    'line-neutral-strong': simplifiedColors.neutral[300],
    'line-muted': simplifiedColors.neutral[300],
    'line-strong': simplifiedColors.neutral[400],
    'line-subtle': simplifiedColors.brand.accent,
    'line-accent': simplifiedColors.brand.accent,
    'line-inverse': simplifiedColors.neutral[700],
    'line-inverse-muted': simplifiedColors.neutral[600],

    // Focus
    focus: simplifiedColors.focus,
  };
};

module.exports = {
  simplifiedColors,
  mapToLegacySemanticNames,
};
