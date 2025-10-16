import { readAllEntities, readEntity } from "./entities.js";
import { getTypeMetadata } from "../data/typeMetadata";

export type EntityReference = {
  type: string;
  slug: string;
};

export type EntityRelation = {
  type: string;
  slug: string;
  name: string;
  summary: string;
  reference: string;
  direction: "outbound" | "inbound" | "bidirectional";
};

const STUB_PATTERN = /stub entity/i;

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((part) => {
      const first = part.charAt(0);
      return first ? first.toUpperCase() + part.slice(1) : "";
    })
    .join(" ");
}

function safeName(name: unknown, slug: string): string {
  if (typeof name === "string" && name.trim()) {
    return toTitleCase(name.trim());
  }
  return toTitleCase(slug);
}

function summarize(entity: { type: string; summary?: string }): string {
  const raw = typeof entity.summary === "string" ? entity.summary.trim() : "";
  if (!raw || STUB_PATTERN.test(raw)) {
    const meta = getTypeMetadata(entity.type);
    return meta?.stubLine ?? "Lore notes are still forming.";
  }
  return raw;
}

export function parseEntityRef(ref: unknown): EntityReference | null {
  if (typeof ref !== "string") return null;
  const value = ref.trim();
  if (!value) return null;
  const [type, slug] = value.split(":");
  if (!type || !slug) return null;
  return { type: type.trim(), slug: slug.trim() };
}

export function resolveEntityRefs(refs: unknown[]): EntityRelation[] {
  if (!Array.isArray(refs)) return [];
  const seen = new Set<string>();
  const results: EntityRelation[] = [];

  for (const ref of refs) {
    const parsed = parseEntityRef(ref);
    if (!parsed) continue;
    const key = `${parsed.type}:${parsed.slug}`;
    if (seen.has(key)) continue;
    const entity = readEntity(parsed.type, parsed.slug);
    if (!entity) continue;
    seen.add(key);
    results.push({
      type: entity.type,
      slug: entity.slug,
      name: safeName(entity.name, entity.slug),
      summary: summarize(entity),
      reference: key,
      direction: "outbound",
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function findInboundRelations(targetType: string, targetSlug: string): EntityRelation[] {
  const all = readAllEntities();
  const results: EntityRelation[] = [];
  const seen = new Set<string>();
  const needle = `${targetType}:${targetSlug}`;

  for (const [type, entries] of Object.entries(all)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries as any[]) {
      const refList = Array.isArray(entry?.related) ? entry.related : [];
      for (const ref of refList) {
        const parsed = parseEntityRef(ref);
        if (!parsed) continue;
        if (`${parsed.type}:${parsed.slug}` !== needle) continue;
        const key = `${entry.type || type}:${entry.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const name = safeName(entry.name, entry.slug);
        const summary = summarize({ type: entry.type || type, summary: entry.summary });
        results.push({
          type: entry.type || type,
          slug: entry.slug,
          name,
          summary,
          reference: key,
          direction: "inbound",
        });
        break;
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function combineRelations(outbound: EntityRelation[], inbound: EntityRelation[]): EntityRelation[] {
  const combined = [...outbound, ...inbound];
  const deduped = new Map<string, EntityRelation>();

  for (const relation of combined) {
    const existing = deduped.get(relation.reference);
    if (!existing) {
      deduped.set(relation.reference, relation);
    } else if (existing.direction !== relation.direction) {
      deduped.set(relation.reference, {
        ...relation,
        direction: "bidirectional",
      });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
}
