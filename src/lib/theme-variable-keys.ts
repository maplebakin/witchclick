import type { ThemeVariables } from './theme-manager';

export const ALL_COLOR_VARIABLE_KEYS: (keyof ThemeVariables)[] = [
  // Page base
  'background',
  // Core Brand Colors
  'colorMidnight', 'colorNight', 'colorIris', 'colorAmethyst', 'colorDusk',
  'colorGold', 'colorRune', 'colorFog', 'colorInk',

  // Header & Footer
  'headerBackground', 'headerBorder', 'headerText', 'headerTextHover',
  'footerBackground', 'footerBorder', 'footerText', 'footerTextMuted',

  // Surface Colors
  'surfacePlain', 'surfacePlainBorder', 'cardPanelSurface', 'cardPanelSurfaceStrong',
  'cardPanelBorder', 'cardPanelBorderStrong', 'cardPanelBorderSoft',
  'glassSurface', 'glassSurfaceStrong', 'glassCard', 'glassHover',
  'glassBorder', 'glassBorderStrong', 'glassHighlight', 'glassGlow',
  'glassShadowSoft', 'glassShadowStrong', 'glassBlur', 'glassNoiseOpacity',

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
];

export const ALL_FONT_VARIABLE_KEYS: (keyof ThemeVariables)[] = [
  'fontSerif', 'fontScript', 'fontHeading', 'fontAccent'
];
