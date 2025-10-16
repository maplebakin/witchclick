export interface EntityRecord {
  type: string;
  slug: string;
  name: string;
  summary: string;
  properties: Record<string, unknown>;
  related: string[];
}

export declare function readAllEntities(): Record<string, EntityRecord[]>;
export declare function readEntity(type: string, slug: string): EntityRecord | null;
