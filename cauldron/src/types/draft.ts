export interface OutlineItem {
  heading?: string;
  id?: string;
}

export interface Section {
  heading?: string;
  markdown?: string;
}

export interface EntityLink {
  type?: string;
  slug?: string;
  name?: string;
  summary?: string;
}

export interface InternalLinkHint {
  anchor?: string;
  rationale?: string;
}

export interface AffiliateHint {
  key?: string;
  product?: string;
  anchor?: string;
  rationale?: string;
}

export interface CallToAction {
  type?: string;
  id?: string;
  headline?: string;
  body?: string;
  buttonLabel?: string;
}

export interface DraftSpec {
  version?: number;
  specVersion?: number;
  title?: string;
  slug?: string;
  status?: string;
  excerpt?: string;
  metaDescription?: string;
  tags?: string[];
  outline?: OutlineItem[];
  sections?: Section[];
  entities?: EntityLink[];
  internalLinkHints?: InternalLinkHint[];
  affiliateHints?: AffiliateHint[];
  heroImagePrompt?: string;
  altTexts?: string[];
  heroImageUrl?: string;
  adPlacements?: string[];
  includeAds?: boolean;
  includeKofi?: boolean;
  cta?: CallToAction;
  draftNotes?: string;
}

export interface PromptBlueprint {
  topic: string;
  audience: string;
  tone: string;
  primaryGoal: string;
  affiliateFocus: string;
  ritualFocus: string;
  extraNotes: string;
}

export interface LoadedDraft {
  slug: string;
  title: string;
  status?: string;
  source: 'seed' | 'local';
  spec: DraftSpec;
}
