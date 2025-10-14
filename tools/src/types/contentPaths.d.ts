declare module '../../scripts/lib/contentPaths.js' {
  export function resolvePostsDirectories(options?: {
    root?: string;
    preferred?: string | null;
  }): string[];
  export function slugify(value: string): string;
}
