export interface EntityRecord {
  type: string;
  slug: string;
  name: string;
  summary: string;
  properties: Record<string, unknown>;
  related: string[];
  isStub: boolean;
  published: boolean;
}

export interface EntityReadOptions {
  includeUnpublished?: boolean;
}

export declare function isEntityStub(record: unknown): boolean;
export declare function isEntityPublished(record: unknown): boolean;

export declare function readAllEntities(options?: EntityReadOptions): Record<string, EntityRecord[]>;
export declare function readEntity(type: string, slug: string, options?: EntityReadOptions): EntityRecord | null;
