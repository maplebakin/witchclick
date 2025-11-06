// src/types/post.ts
// Shared type definitions for post data across the application

/**
 * Post category types
 */
export type PostCategory = 'ritual' | 'meandering';

/**
 * Spoon level for energy/focus requirements
 */
export type SpoonLevel = 'low' | 'medium' | 'high';

/**
 * Card post data structure for display in lists/grids
 * Used across homepage, meanderings, tag pages, author pages, etc.
 */
export interface CardPost {
  slug: string;
  title: string;
  excerpt: string;
  tldr?: string;
  tags: string[];
  normalizedTags: string[];
  readingMinutes: number;
  publishedAt?: string;
  spoonLevel?: string;
  spoons?: string;
  heroImage?: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
  heroAlt?: string;
  category?: PostCategory;
}

/**
 * Flexible post card props - used by PostCard component
 * Accepts various field name variants for backward compatibility
 */
export interface PostCardProps {
  slug?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  metaDescription?: string;
  tags?: string[];
  readingMinutes?: number;
  publishedAt?: string;
  date?: string;
  spoonLevel?: string;
  spoons?: string;
  tldr?: string;
  heroImage?: unknown;
  heroImageSrc?: unknown;
  heroImageAlt?: unknown;
  heroAlt?: unknown;
  image?: unknown;
  imageSrc?: unknown;
  imageAlt?: unknown;
  cardImage?: unknown;
  cardImageAlt?: unknown;
  category?: PostCategory;
}
