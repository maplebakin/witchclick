export interface DraftRouteLeak {
  slug: string;
  pathname: string;
}

export interface DraftSitemapLeak extends DraftRouteLeak {
  sitemap: string;
}

export interface DraftDataLeak {
  slug: string;
  file: string;
  routes: string[];
}

export interface DraftLeakCheckResult {
  ok: boolean;
  draftSlugs: string[];
  routeLeaks: DraftRouteLeak[];
  sitemapLeaks: DraftSitemapLeak[];
  dataLeaks: DraftDataLeak[];
}

export function collectDraftPostSlugs(postsDir: string): string[];
export function findLeakedDraftRoutes(distDir: string, draftSlugs: string[]): DraftRouteLeak[];
export function findLeakedDraftSitemapUrls(distDir: string, draftSlugs: string[]): DraftSitemapLeak[];
export function findLeakedDraftDataFiles(distDir: string, draftSlugs: string[]): DraftDataLeak[];
export function verifyNoDraftLeaks(options?: {
  projectRoot?: string;
  postsDir?: string;
  distDir?: string;
}): DraftLeakCheckResult;
