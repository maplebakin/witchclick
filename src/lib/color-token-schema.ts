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
    textPrimary: '#f4f1ff',
    textSecondary: '#f4f1ff',
    textTertiary: '#f4f1ff',
    textHint: '#f4f1ff',
    textDisabled: '#f4f1ff',
    textStrong: '#f9f5ff',
    textBody: '#f9f5ff',
    textMuted: '#f9f5ff',
    textSubtle: '#f9f5ff',
    textAccent: '#d4af37',
    textAccentStrong: '#d4af37',
    linkColor: '#e0c07d',
  },
  dawn: {
    textPrimary: '#2c1b3d',
    textSecondary: '#2c1b3d',
    textTertiary: '#2c1b3d',
    textHint: '#2c1b3d',
    textDisabled: '#2c1b3d',
    textStrong: '#3a2854',
    textBody: '#573f73',
    textMuted: '#573f73',
    textSubtle: '#573f73',
    textAccent: '#9b86c8',
    textAccentStrong: '#573f73',
    linkColor: '#caa043',
  },
};
