export declare function readSlugHistory(root: string): string[];
export declare function writeSlugHistory(root: string, slugs: readonly string[]): void;
export default function slugHistory(): {
  readSlugHistory: typeof readSlugHistory;
  writeSlugHistory: typeof writeSlugHistory;
};
