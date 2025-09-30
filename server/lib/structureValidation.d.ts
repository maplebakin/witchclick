import type { PostSpecV2, PostContentType } from './postSpecSchema.js';

export function needsSafetyNote(
  sections: { heading?: string; markdown?: string }[]
): boolean;

export function hasSafetySection(
  sections: { heading?: string; markdown?: string }[]
): boolean;

export function isPostContentType(value: unknown): value is PostContentType;

export function resolveContentType(
  spec: Partial<PostSpecV2>,
  warnings: string[]
): PostContentType;

export function validateStructure(
  spec: PostSpecV2,
  contentWords: number
): {
  errors: string[];
  warnings: string[];
};

export default validateStructure;
