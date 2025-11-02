export interface EntityRecord {
  type: string;
  slug: string;
  name: string;
  summary: string;
  properties: Record<string, unknown>;
  related: string[];
}

export interface EntityIndexItem {
  slug: string;
  type: string;
  name: string;
  summary: string;
  tags: string[];
  keywords: string[];
}

export interface EntityIndexFacets {
  types: Record<string, number>;
  tags: Record<string, number>;
}

export interface EntityIndexPayload {
  items: EntityIndexItem[];
  facets: EntityIndexFacets;
}

export declare function readAllEntities(): Record<string, EntityRecord[]>;
export declare function readEntity(type: string, slug: string): EntityRecord | null;
export declare function flattenEntitySlug(entity: EntityRecord): string;
export declare function resolveEntityByFlatSlug(slug: string): EntityRecord | null;
export declare function computeFacets(entities: EntityIndexItem[]): EntityIndexFacets;
export declare function buildEntityIndex(source?: Record<string, EntityRecord[]>): EntityIndexPayload;
