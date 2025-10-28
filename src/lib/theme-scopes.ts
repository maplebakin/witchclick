/**
 * Theme Scopes
 * Defines page and component-specific styling scopes
 */

export interface ThemeScope {
  id: string;
  label: string;
  description: string;
  category: 'page' | 'component';
  variables?: string[]; // Optional: specific variables available for this scope
}

export const THEME_SCOPES: ThemeScope[] = [
  // Global
  {
    id: 'global',
    label: 'Global Theme',
    description: 'Default colors applied site-wide',
    category: 'page',
  },

  // Pages
  {
    id: 'homepage',
    label: 'Homepage',
    description: 'Landing page with hero and featured content',
    category: 'page',
  },
  {
    id: 'grimoire',
    label: 'Entity Grimoire',
    description: 'Main entity directory page',
    category: 'page',
    variables: [
      'entityCardBorder',
      'entityCardGlow',
      'entityCardHighlight',
      'entityCardSurfaceTop',
      'entityCardSurfaceBottom',
      'entityCardHeading',
      'entityCardText',
      'entityCardLabel',
      'entityCardCta',
      'entityCardCtaHover',
      'entityCardIcon',
      'entityCardIconShadow',
    ],
  },
  {
    id: 'post',
    label: 'Post Detail',
    description: 'Individual blog post pages',
    category: 'page',
  },
  {
    id: 'entity-detail',
    label: 'Entity Detail',
    description: 'Individual entity pages (crystals, herbs, etc.)',
    category: 'page',
  },
  {
    id: 'start',
    label: 'Start Page',
    description: 'Getting started guide',
    category: 'page',
  },

  // Components
  {
    id: 'header',
    label: 'Site Header',
    description: 'Navigation and site branding',
    category: 'component',
  },
  {
    id: 'footer',
    label: 'Site Footer',
    description: 'Footer links and information',
    category: 'component',
  },
  {
    id: 'card',
    label: 'Post Cards',
    description: 'Post preview cards',
    category: 'component',
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    description: 'Sidebar widgets and navigation',
    category: 'component',
  },
  {
    id: 'hero',
    label: 'Hero Section',
    description: 'Hero banners on various pages',
    category: 'component',
  },
];

/**
 * Get scope by ID
 */
export function getScopeById(scopeId: string): ThemeScope | null {
  return THEME_SCOPES.find((s) => s.id === scopeId) || null;
}

/**
 * Get scopes by category
 */
export function getScopesByCategory(category: 'page' | 'component'): ThemeScope[] {
  return THEME_SCOPES.filter((s) => s.category === category);
}

/**
 * Check if a scope has custom variables defined
 */
export function scopeHasCustomVariables(scopeId: string): boolean {
  const scope = getScopeById(scopeId);
  return scope?.variables !== undefined && scope.variables.length > 0;
}

/**
 * Get available variables for a scope
 * Returns custom variables if defined, otherwise returns all variables
 */
export function getScopeVariables(scopeId: string): string[] | null {
  const scope = getScopeById(scopeId);
  return scope?.variables || null;
}
