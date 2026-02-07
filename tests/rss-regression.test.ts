import { describe, expect, it } from "vitest";

import { GET } from "../src/pages/rss.xml.ts";
import { loadAllPosts } from "../src/utils/posts.ts";

describe("rss route regression", () => {
  it("returns at least one item when published posts exist", async () => {
    const publishedPosts = loadAllPosts();
    expect(publishedPosts.length).toBeGreaterThan(0);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type") || "").toContain("application/rss+xml");

    const xml = await response.text();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toMatch(/<item>[\s\S]*?<\/item>/);

    const firstSlug = publishedPosts[0]?.slug;
    if (firstSlug) {
      expect(xml).toContain(`/post/${firstSlug}`);
    }
  });
});
