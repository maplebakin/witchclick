import { describe, expect, it } from "vitest";

import {
  buildCanonicalTagRecords,
  buildTagRouteEntries,
  canonicalTagHref,
  canonicalizeTagSlug,
  tagsFromFrontmatter,
} from "../src/utils/tags";

describe("tag canonicalization", () => {
  it("canonicalizes equivalent tag variants to one slug", () => {
    expect(canonicalizeTagSlug("Cursing Ritual")).toBe("cursing-ritual");
    expect(canonicalizeTagSlug("cursing-ritual")).toBe("cursing-ritual");
    expect(canonicalizeTagSlug("  cursing   ritual  ")).toBe("cursing-ritual");
    expect(canonicalTagHref("cursing ritual")).toBe("/tag/cursing-ritual");
  });

  it("normalizes tag frontmatter arrays and comma-separated strings", () => {
    expect(tagsFromFrontmatter({ tags: ["Focus ", " gentle rituals"] })).toEqual([
      "Focus",
      "gentle rituals",
    ]);
    expect(tagsFromFrontmatter({ tags: "focus, gentle rituals,  adhd-friendly " })).toEqual([
      "focus",
      "gentle rituals",
      "adhd-friendly",
    ]);
  });

  it("builds one canonical tag record per logical tag", () => {
    const posts = [
      { data: { tags: ["Cursing Ritual", "Gentle Rituals"] } },
      { data: { tags: ["cursing-ritual", "gentle rituals"] } },
      { data: { tags: ["cursing ritual"] } },
    ];

    const records = buildCanonicalTagRecords(posts);
    const cursing = records.find((record) => record.canonical === "cursing-ritual");
    const gentle = records.find((record) => record.canonical === "gentle-rituals");

    expect(cursing).toBeDefined();
    expect(cursing?.count).toBe(3);
    expect(cursing?.aliases).toContain("cursing ritual");

    expect(gentle).toBeDefined();
    expect(gentle?.count).toBe(2);
    expect(gentle?.aliases).toContain("gentle rituals");
  });

  it("creates legacy route entries that redirect to canonical tag URLs", () => {
    const posts = [
      { data: { tags: ["Shadow Work", "shadow-work"] } },
    ];

    const routes = buildTagRouteEntries(posts);
    const canonical = routes.find((entry) => entry.routeTag === "shadow-work");
    const legacy = routes.find((entry) => entry.routeTag === "shadow work");

    expect(canonical).toMatchObject({
      canonicalTag: "shadow-work",
      redirectTo: null,
    });
    expect(legacy).toMatchObject({
      canonicalTag: "shadow-work",
      redirectTo: "/tag/shadow-work",
    });
  });
});
