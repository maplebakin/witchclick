/**
 * Theme-reactive Tailwind colors using CSS custom properties.
 *
 * IMPORTANT:
 * - Keep values as `var(--token)` or `hsl(var(--token))` so they react to runtime theme swaps.
 * - Avoid hardcoded hex values here.
 */

const simplifiedColors = {
  brand: {
    primary: 'var(--theme-primary)',
    'primary-strong': 'var(--text-accent-strong)',
    accent: 'var(--theme-accent)',
  },
  neutral: {
    50: 'hsl(var(--neutral-0))',
    100: 'hsl(var(--neutral-1))',
    200: 'hsl(var(--neutral-2))',
    300: 'hsl(var(--neutral-3))',
    400: 'hsl(var(--neutral-4))',
    500: 'hsl(var(--neutral-5))',
    600: 'hsl(var(--neutral-6))',
    700: 'hsl(var(--neutral-7))',
    800: 'hsl(var(--neutral-8))',
    900: 'hsl(var(--neutral-9))',
    950: 'hsl(var(--neutral-9))',
  },
  status: {
    info: 'var(--theme-info)',
    'info-soft': 'color-mix(in hsl, var(--theme-info) 14%, transparent)',
    'info-strong': 'color-mix(in hsl, var(--theme-info) 82%, black 18%)',
    success: 'var(--theme-success)',
    'success-soft': 'color-mix(in hsl, var(--theme-success) 14%, transparent)',
    'success-strong': 'color-mix(in hsl, var(--theme-success) 82%, black 18%)',
    warning: 'var(--theme-warning)',
    'warning-soft': 'color-mix(in hsl, var(--theme-warning) 14%, transparent)',
    'warning-strong': 'color-mix(in hsl, var(--theme-warning) 82%, black 18%)',
    danger: 'var(--theme-error)',
    'danger-soft': 'color-mix(in hsl, var(--theme-error) 14%, transparent)',
    'danger-strong': 'color-mix(in hsl, var(--theme-error) 82%, black 18%)',
  },
  focus: 'var(--focus-ring-color)',
  white: 'hsl(var(--neutral-0))',
  black: 'hsl(var(--neutral-9))',
  transparent: 'transparent',
};

const mapToLegacySemanticNames = () => ({
  primary: 'var(--theme-primary)',
  'primary-strong': 'var(--text-accent-strong)',
  secondary: 'var(--theme-accent)',
  tertiary: 'var(--theme-color-gold)',
  accent: 'var(--text-accent)',
  'accent-soft': 'var(--accent-purple-soft)',
  'accent-faint': 'color-mix(in hsl, var(--text-accent) 18%, transparent)',

  'body-strong': 'var(--text-strong)',
  body: 'var(--text-body)',
  'body-muted': 'var(--text-muted)',
  'body-subtle': 'var(--text-subtle)',
  'body-faint': 'color-mix(in hsl, var(--text-muted) 72%, transparent)',

  inverse: 'hsl(var(--neutral-0))',
  'inverse-soft': 'hsl(var(--neutral-1))',
  'inverse-muted': 'hsl(var(--neutral-2))',
  'inverse-subtle': 'hsl(var(--neutral-3))',
  'inverse-faint': 'hsl(var(--neutral-4))',

  info: 'var(--theme-info)',
  'info-strong': 'color-mix(in hsl, var(--theme-info) 82%, black 18%)',
  'info-soft': 'color-mix(in hsl, var(--theme-info) 14%, transparent)',
  success: 'var(--theme-success)',
  'success-strong': 'color-mix(in hsl, var(--theme-success) 82%, black 18%)',
  'success-soft': 'color-mix(in hsl, var(--theme-success) 14%, transparent)',
  warning: 'var(--theme-warning)',
  'warning-strong': 'color-mix(in hsl, var(--theme-warning) 82%, black 18%)',
  'warning-soft': 'color-mix(in hsl, var(--theme-warning) 14%, transparent)',
  danger: 'var(--theme-error)',
  'danger-strong': 'color-mix(in hsl, var(--theme-error) 82%, black 18%)',
  'danger-soft': 'color-mix(in hsl, var(--theme-error) 14%, transparent)',

  'surface-base': 'var(--surface-base)',
  'surface-card': 'var(--surface-card)',
  'surface-muted': 'var(--surface-muted)',
  'surface-soft': 'var(--surface-hover)',
  'surface-inverse': 'var(--color-night)',
  'surface-inverse-soft': 'var(--color-dusk)',
  'surface-inverse-muted': 'var(--color-midnight)',

  'line-neutral': 'var(--border-subtle)',
  'line-neutral-strong': 'var(--border-strong)',
  'line-muted': 'var(--border-subtle)',
  'line-strong': 'var(--border-strong)',
  'line-subtle': 'var(--text-accent)',
  'line-accent': 'var(--text-accent)',
  'line-inverse': 'var(--color-border)',
  'line-inverse-muted': 'var(--color-border-strong)',

  focus: 'var(--focus-ring-color)',
});

module.exports = {
  simplifiedColors,
  mapToLegacySemanticNames,
};
