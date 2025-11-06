// src/utils/postTransforms.ts
// Utilities for transforming LoadedPost objects into display-ready formats

import type { LoadedPost } from './posts';
import type { CardPost } from '@/types/post';
import { firstParagraph, estimateReadingMinutes, extractHeroImage, getPostCategory } from './posts';

/**
 * Transform a LoadedPost into CardPost format for display in lists/grids
 * This consolidates logic that was duplicated across index, meanderings, tag, author pages
 */
export function postToCardData(post: LoadedPost): CardPost {
  const fm = post.data ?? {};
  const title = typeof fm.title === "string" && fm.title.trim() ? fm.title : post.title;

  // Excerpt with fallback chain: excerpt → description → metaDescription → first paragraph
  const excerptCandidate =
    typeof fm.excerpt === "string" && fm.excerpt.trim()
      ? fm.excerpt
      : typeof fm.description === "string" && fm.description.trim()
        ? fm.description
        : typeof fm.metaDescription === "string" && fm.metaDescription.trim()
          ? fm.metaDescription
          : firstParagraph(post.content);

  // Tags: normalize and deduplicate
  const tagsRaw = Array.isArray(fm.tags)
    ? fm.tags
    : typeof fm.tags === "string"
      ? fm.tags.split(",")
      : [];

  const tags = Array.from(
    new Map(
      tagsRaw
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean)
        .map((tag) => [tag.toLowerCase(), tag])
    ).values()
  );

  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  // Published date with fallback chain
  const publishedAtCandidate =
    fm.publishedAt ?? fm.pubDate ?? fm.date ?? (post.date ? post.date.toISOString() : undefined);

  // Spoons/spoonLevel handling
  const spoonsValue =
    typeof fm.spoons === "string"
      ? fm.spoons
      : typeof post.spoons === "string"
        ? post.spoons
        : typeof fm.spoonLevel === "string"
          ? fm.spoonLevel
          : undefined;

  // TL;DR handling
  const tldrValue =
    typeof post.tldr === "string"
      ? post.tldr
      : typeof fm.tldr === "string"
        ? fm.tldr
        : undefined;

  // Hero image extraction
  const hero = extractHeroImage(fm);
  const heroSrc = typeof hero.src === "string" && hero.src.trim() ? hero.src.trim() : undefined;
  const heroAlt = typeof hero.alt === "string" && hero.alt.trim() ? hero.alt.trim() : undefined;

  // Category
  const category = getPostCategory(post);

  return {
    slug: post.slug,
    title,
    excerpt: excerptCandidate,
    tldr: tldrValue,
    tags,
    normalizedTags,
    readingMinutes: fm.readingMinutes ?? estimateReadingMinutes(post.content),
    publishedAt: typeof publishedAtCandidate === "string" ? publishedAtCandidate : undefined,
    spoonLevel: typeof fm.spoonLevel === "string" ? fm.spoonLevel : undefined,
    spoons: spoonsValue,
    heroImage: heroSrc,
    heroImageSrc: heroSrc,
    heroImageAlt: heroAlt,
    heroAlt: heroAlt,
    category,
  };
}

/**
 * Transform multiple posts to card data
 */
export function postsToCardData(posts: LoadedPost[]): CardPost[] {
  return posts.map(postToCardData);
}
