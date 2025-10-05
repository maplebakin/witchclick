import { readAllEntities } from "./entities";
import type { TypeMetadataEntry } from "../data/typeMetadata";

type RawEntity = {
  type: string;
  slug: string;
  name: string;
  summary: string;
  properties: Record<string, unknown>;
};

const STUB_PATTERN = /stub entity/i;

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function collectFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectFromValue(entry));
  }
  if (typeof value === "string") {
    return value
      .split(/[,;/]| & |\band\b/i)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function extractKeywords(entity: RawEntity): string[] {
  const properties = entity.properties ?? {};
  const keywords = new Set<string>();

  [properties.tags, properties.keywords, properties.aspects, properties.vibes, properties.talismans].forEach((value) => {
    collectFromValue(value).forEach((keyword) => keywords.add(keyword));
  });

  if (properties.correspondences && typeof properties.correspondences === "object") {
    Object.values(properties.correspondences as Record<string, unknown>).forEach((value) => {
      collectFromValue(value).forEach((keyword) => keywords.add(keyword));
    });
  }

  [properties.element, properties.planet, properties.color, properties.chakra].forEach((value) => {
    collectFromValue(value).forEach((keyword) => keywords.add(keyword));
  });

  return Array.from(keywords);
}

export function getEntitiesForType(type: string, metadata: TypeMetadataEntry) {
  const all = readAllEntities();
  const entries = Array.isArray(all[type]) ? (all[type] as RawEntity[]) : [];

  return entries
    .map((entry) => {
      const rawSummary = typeof entry.summary === "string" ? entry.summary.trim() : "";
      const isStub = !rawSummary || STUB_PATTERN.test(rawSummary);
      const summary = isStub ? metadata.stubLine : rawSummary;
      const tags = extractKeywords(entry);

      const displayName = entry.name
        ? toTitleCase(entry.name)
        : toTitleCase(entry.slug.replace(/-/g, " "));

      return {
        ...entry,
        type: entry.type || type,
        name: displayName,
        summary,
        isStub,
        tags,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
