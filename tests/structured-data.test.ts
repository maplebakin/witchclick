import { describe, expect, it } from "vitest";
import { createItemListSchema, createCollectionPageSchema } from "../src/utils/structuredData";
import type { SiteSettings } from "../src/utils/settings";

const settings: SiteSettings = {
  siteUrl: "https://witchclick.space",
  analytics: { enabled: false, provider: "plausible" },
};

describe("structured data helpers", () => {
  it("builds an item list with absolute URLs", () => {
    const result = createItemListSchema(
      settings,
      { name: "Latest", url: "/", description: "Latest posts" },
      [
        { name: "Post", url: "/post/example", description: "Example" },
      ],
    );

    expect(result["@type"]).toBe("ItemList");
    const firstElement = result.itemListElement[0];
    expect(firstElement?.item.url).toBe("https://witchclick.space/post/example");
  });

  it("wraps an item list inside a collection page", () => {
    const result = createCollectionPageSchema(
      settings,
      { name: "Downloads", url: "/downloads" },
      [
        { name: "Planner", url: "/downloads/planner" },
      ],
    );

    expect(result["@type"]).toBe("CollectionPage");
    expect(result.mainEntity.itemListElement).toHaveLength(1);
  });
});
