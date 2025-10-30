export interface ColorTokenField {
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
}

export const COLOR_TOKEN_FIELDS: ColorTokenField[] = [
  {
    key: 'textPrimary',
    label: 'Text Primary',
    description: 'Default body text',
    placeholder: '#f4f1ff',
  },
  {
    key: 'textSecondary',
    label: 'Text Secondary',
    description: 'Secondary body copy',
    placeholder: '#d9c6f2',
  },
  {
    key: 'textTertiary',
    label: 'Text Tertiary',
    description: 'Tertiary text and metadata',
    placeholder: '#c9b6e5',
  },
  {
    key: 'textHint',
    label: 'Text Hint',
    description: 'Hint text and helper copy',
    placeholder: '#bda8db',
  },
  {
    key: 'textDisabled',
    label: 'Text Disabled',
    description: 'Disabled UI text',
    placeholder: '#9b86c8',
  },
  {
    key: 'textStrong',
    label: 'Text Strong',
    description: 'High contrast headings',
    placeholder: '#f9f5ff',
  },
  {
    key: 'textBody',
    label: 'Text Body',
    description: 'Paragraph text',
    placeholder: '#f9f5ff',
  },
  {
    key: 'textMuted',
    label: 'Text Muted',
    description: 'Muted/supplementary text',
    placeholder: '#d9b2c4',
  },
  {
    key: 'textSubtle',
    label: 'Text Subtle',
    description: 'Subtle captions',
    placeholder: '#b998c9',
  },
  {
    key: 'textAccent',
    label: 'Text Accent',
    description: 'Accent/gold text',
    placeholder: '#d4af37',
  },
  {
    key: 'textAccentStrong',
    label: 'Text Accent Strong',
    description: 'High emphasis accent',
    placeholder: '#f1cf63',
  },
  {
    key: 'linkColor',
    label: 'Link Color',
    description: 'Default link treatment',
    placeholder: '#e0c07d',
  },
];

export const COLOR_TOKEN_DEFAULTS: Record<string, Record<string, string>> = {
  midnight: {
    textPrimary: 'rgba(244, 241, 255, 0.96)',
    textSecondary: 'rgba(244, 241, 255, 0.85)',
    textTertiary: 'rgba(244, 241, 255, 0.75)',
    textHint: 'rgba(244, 241, 255, 0.65)',
    textDisabled: 'rgba(244, 241, 255, 0.45)',
    textStrong: 'rgba(249, 245, 255, 0.95)',
    textBody: 'rgba(249, 245, 255, 0.82)',
    textMuted: 'rgba(249, 245, 255, 0.72)',
    textSubtle: 'rgba(249, 245, 255, 0.7)',
    textAccent: 'rgba(212, 175, 55, 0.7)',
    textAccentStrong: 'rgba(212, 175, 55, 0.92)',
    linkColor: '#e0c07d',
  },
  dawn: {
    textPrimary: 'rgba(44, 27, 61, 1)',
    textSecondary: 'rgba(44, 27, 61, 0.9)',
    textTertiary: 'rgba(44, 27, 61, 0.75)',
    textHint: 'rgba(44, 27, 61, 0.6)',
    textDisabled: 'rgba(44, 27, 61, 0.4)',
    textStrong: 'rgba(58, 40, 84, 0.95)',
    textBody: 'rgba(87, 63, 115, 0.82)',
    textMuted: 'rgba(87, 63, 115, 0.7)',
    textSubtle: 'rgba(87, 63, 115, 0.65)',
    textAccent: 'rgba(155, 134, 200, 0.7)',
    textAccentStrong: 'rgba(87, 63, 115, 0.9)',
    linkColor: '#caa043',
  },
};
