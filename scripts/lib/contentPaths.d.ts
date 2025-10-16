export declare function createPostsDirectoryCandidates(root: string): string[];
export declare function isDirectory(candidate: string): boolean;
export declare function directoryHasMarkdown(candidate: string): boolean;
export declare function resolvePrimaryPostsDir(options?: { root?: string }): string;
export declare function resolvePostsDirectories(options?: {
  root?: string;
  preferred?: string | null;
}): string[];
import { slugify, ensureUniqueSlug, slugifyId } from "./slug.js";
export { slugify, ensureUniqueSlug, slugifyId };
