export interface DraftRouteLeak {
  slug: string;
  pathname: string;
}

export interface DraftSitemapLeak extends DraftRouteLeak {
  sitemap: string;
}

export interface DraftLeakCheckResult {
  ok: boolean;
  draftSlugs: string[];
  routeLeaks: DraftRouteLeak[];
  sitemapLeaks: DraftSitemapLeak[];
}

export function collectDraftPostSlugs(postsDir: string): string[];
export function findLeakedDraftRoutes(distDir: string, draftSlugs: string[]): DraftRouteLeak[];
export function findLeakedDraftSitemapUrls(distDir: string, draftSlugs: string[]): DraftSitemapLeak[];
export function verifyNoDraftLeaks(options?: {
  projectRoot?: string;
  postsDir?: string;
  distDir?: string;
}): DraftLeakCheckResult;
