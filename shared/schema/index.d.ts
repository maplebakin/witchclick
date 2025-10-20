import type { z } from 'zod';

export const ENTITY_TYPES: typeof import('./registry.js')['ENTITY_TYPES'];
export const CONTENT_TYPES: typeof import('./registry.js')['CONTENT_TYPES'];
export const CURSE_TYPES: typeof import('./registry.js')['CURSE_TYPES'];
export const CURSE_TARGETS: typeof import('./registry.js')['CURSE_TARGETS'];
export const CURSE_TONES: typeof import('./registry.js')['CURSE_TONES'];
export const CURSE_TAGS: typeof import('./registry.js')['CURSE_TAGS'];

export const EntityTypeSchema: typeof import('./registry.js')['EntityTypeSchema'];
export const PostContentTypeSchema: typeof import('./registry.js')['PostContentTypeSchema'];
export const PostSpecV2Schema: typeof import('./registry.js')['PostSpecV2Schema'];
export const CurseGeneratorInputSchema: typeof import('./registry.js')['CurseGeneratorInputSchema'];
export const CurseSpecSchema: typeof import('./registry.js')['CurseSpecSchema'];
export const EvergreenBlocksSchema: typeof import('./registry.js')['EvergreenBlocksSchema'];
export const SiteSettingsInputSchema: typeof import('./registry.js')['SiteSettingsInputSchema'];
export const DEFAULT_SITE_SETTINGS: typeof import('./registry.js')['DEFAULT_SITE_SETTINGS'];

export const schemaRegistry: typeof import('./registry.js')['schemaRegistry'];
export function listSchemas(): ReturnType<typeof import('./registry.js')['listSchemas']>;
export function getJsonSchema(
  id: Parameters<typeof import('./registry.js')['getJsonSchema']>[0],
  options?: Parameters<typeof import('./registry.js')['getJsonSchema']>[1],
): ReturnType<typeof import('./registry.js')['getJsonSchema']>;
export function stripMarkdownToPlainText(markdown: string): string;
export function generatePostSpecDocumentation(): string;
export function generateCurseSchemaDocumentation(): string;
export function countCurseWords(value: unknown): number;
export function applySiteSettingsDefaults(
  partial?: Parameters<typeof import('./registry.js')['applySiteSettingsDefaults']>[0],
): ReturnType<typeof import('./registry.js')['applySiteSettingsDefaults']>;

export type EntityType = z.infer<typeof EntityTypeSchema>;
export type PostContentType = z.infer<typeof PostContentTypeSchema>;
export type PostSpecV2 = z.infer<typeof PostSpecV2Schema>;
export type CurseSpec = z.infer<typeof CurseSpecSchema>;
export type CurseGeneratorInput = z.infer<typeof CurseGeneratorInputSchema>;
export type EvergreenBlocks = z.infer<typeof EvergreenBlocksSchema>;
export type SiteSettingsInput = z.infer<typeof SiteSettingsInputSchema>;
export type SiteSettings = ReturnType<typeof applySiteSettingsDefaults>;
export type AnalyticsSettings = NonNullable<SiteSettings['analytics']>;
export type AdsSettings = NonNullable<SiteSettings['ads']> | undefined;
export type ObservabilitySettings = NonNullable<SiteSettings['observability']>;
export type AnalyticsProvider = AnalyticsSettings['provider'];
