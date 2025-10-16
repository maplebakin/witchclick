export interface PostMetadataEntry {
  title: string;
  slug: string;
  file: string;
}

export declare function collectPostMetadata(root: string): PostMetadataEntry[];
export default function postInventory(): {
  collectPostMetadata: typeof collectPostMetadata;
};
