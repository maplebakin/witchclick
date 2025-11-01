import type {
  PrepareSpecOptions,
  PreparedSpec,
  PersistResult,
} from "./server/lib/specPreparation.js";

export declare function savePostFromWrite(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  postPath: string;
  createdEntities: string[];
  warnings?: string[];
}>;

export declare function slugify(value: string): string;
export declare function markdownToPlainText(markdown: string): string;
export declare function generateExcerpt(
  markdown: string,
  options?: Record<string, unknown>,
): string;
export declare function generateMetaDescription(
  markdown: string,
  options?: Record<string, unknown>,
): string;
export declare function normalizeTags(tags: unknown): string[];
export declare function buildGenprompt(options: Record<string, unknown>): { prompt: string };
export declare function buildPresetPrompt(options: {
  preset: {
    system: string;
    goal: string;
    strictOutputContract: string[];
    looseOutputContract: string[];
    [extra: string]: unknown;
  };
  topic: string;
  strict?: boolean;
  styleDirective?: string;
  contentType?: string;
}): string;

export declare function prepareSpecForPersistence(
  rawSpec: unknown,
  options?: PrepareSpecOptions,
): PreparedSpec;
export declare function persistPreparedSpec(prepared: PreparedSpec): Promise<PersistResult>;

export interface AdminPipelineHelpers {
  savePostFromWrite: typeof savePostFromWrite;
  slugify: typeof slugify;
  markdownToPlainText: typeof markdownToPlainText;
  generateExcerpt: typeof generateExcerpt;
  generateMetaDescription: typeof generateMetaDescription;
  normalizeTags: typeof normalizeTags;
  buildGenprompt: typeof buildGenprompt;
  buildPresetPrompt: typeof buildPresetPrompt;
  prepareSpecForPersistence: typeof prepareSpecForPersistence;
  persistPreparedSpec: typeof persistPreparedSpec;
}

export declare const adminPipelineHelpers: AdminPipelineHelpers;

export type AdminThemeRequiredField = "primary" | "accent" | "background" | "fontSerif" | "fontScript";

export type AdminThemeOptionalField =
  | "textPrimary"
  | "textHeading"
  | "textMuted"
  | "textSecondary"
  | "textTertiary"
  | "textStrong"
  | "textHint"
  | "textDisabled"
  | "textBody"
  | "textSubtle"
  | "textAccent"
  | "textAccentStrong"
  | "inkBody"
  | "inkStrong"
  | "inkMuted"
  | "linkColor"
  | "colorMidnight"
  | "colorNight"
  | "colorIris"
  | "colorAmethyst"
  | "colorDusk"
  | "colorGold"
  | "colorRune"
  | "colorFog"
  | "colorInk"
  | "colorMuted"
  | "colorBorder"
  | "colorBorderStrong"
  | "colorOverlay"
  | "colorOverlayStrong"
  | "surfacePlain"
  | "surfacePlainBorder"
  | "cardPanelSurface"
  | "cardPanelSurfaceStrong"
  | "cardPanelBorder"
  | "cardPanelBorderStrong"
  | "cardPanelBorderSoft"
  | "cardBadgeBg"
  | "cardBadgeBorder"
  | "cardBadgeText"
  | "cardTagBg"
  | "cardTagBorder"
  | "cardTagText"
  | "cardSpoonBg"
  | "cardSpoonBorder"
  | "cardSpoonText"
  | "focusRingColor"
  | "cardFocusOutline"
  | "fontHeading"
  | "fontAccent"
  | "shadowSoft"
  | "shadowStrong"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "entityCardBorder"
  | "entityCardGlow"
  | "entityCardHighlight"
  | "entityCardSurfaceTop"
  | "entityCardSurfaceBottom"
  | "entityCardHeading"
  | "entityCardText"
  | "entityCardLabel"
  | "entityCardCta"
  | "entityCardCtaHover"
  | "entityCardIcon"
  | "entityCardIconShadow"
  | "backgroundImage";

export type AdminThemeSettings = Record<AdminThemeRequiredField, string> &
  Partial<Record<AdminThemeOptionalField, string>>;

export type AdminThemeMode = "midnight" | "dawn";

export interface AdminThemeRecord {
  slug: string;
  label: string;
  mode: AdminThemeMode;
  settings: AdminThemeSettings;
}

export interface AdminThemeListing {
  items: {
    midnight: AdminThemeRecord[];
    dawn: AdminThemeRecord[];
  };
  active: {
    midnight: string | null;
    dawn: string | null;
  };
}

export declare function listThemes(): Promise<AdminThemeListing>;
export declare function saveThemeRecord(payload: Record<string, unknown>): Promise<AdminThemeRecord>;
export declare function setActiveThemeRecord(
  payload: Record<string, unknown>,
): Promise<{ active: AdminThemeListing["active"]; theme: AdminThemeRecord }>;
export declare function attachHeroToPost(options: {
  slug: string;
  heroImage: string;
  heroAlt?: string | null;
}): Promise<{ path: string }>;
