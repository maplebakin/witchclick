import { describe, expect, it } from "vitest";

import { buildEntityIndex, flattenEntitySlug, readAllEntities } from "../src/utils/entities.js";

describe("entity index helpers", () => {
  it("produces unique flattened slugs across all entities", () => {
    const all = readAllEntities();
    const seen = new Map<string, { type: string; slug: string }>();

    for (const [type, entries] of Object.entries(all)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const flat = flattenEntitySlug(entry);
        expect(flat).toBeTruthy();
        const previous = seen.get(flat);
        expect(previous).toBeUndefined();
        seen.set(flat, { type, slug: entry.slug });
      }
    }

    expect(seen.size).toBeGreaterThan(0);
  });

  it("builds an index payload with facets and trimmed summaries", () => {
    const mock = {
      herb: [
        {
          type: "herb",
          slug: "mock-herb",
          name: "Mock Herb",
          summary: "<p>" + "a".repeat(260) + "</p>",
          properties: {
            tags: ["focus"],
            correspondences: {
              uses: ["focus", "memory"],
            },
          },
          related: [],
        },
      ],
    } as any;

    const { items, facets } = buildEntityIndex(mock);
    expect(items).toHaveLength(1);
    const [item] = items;
    expect(item.slug).toBe("mock-herb");
    expect(item.summary.length).toBeLessThanOrEqual(241);
    expect(item.summary).not.toMatch(/<[^>]+>/);
    expect(Array.isArray(item.keywords)).toBe(true);
    expect(item.keywords).toContain("Focus");
    expect(facets.types.herb).toBe(1);
    expect(facets.tags.Focus).toBe(1);
  });
});
