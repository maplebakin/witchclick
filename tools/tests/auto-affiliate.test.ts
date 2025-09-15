import { describe, it, expect } from "vitest";
import { autoLinkAffiliates, suggestAnchorsForProduct } from "../src/auto-affiliate";

describe("autoLinkAffiliates", () => {
  const products = [
    { key: "plannerA5", name: "A5 Minimal Planner", url: "https://shop/p", utm: "u=1", tags: ["planner","A5"] },
    { key: "strainer", name: "Fine Mesh Tea Strainer", url: "https://shop/s", utm: "u=1", tags: ["tea","strainer"] },
  ];

  it("links a sensible phrase per product up to limit", () => {
    const html = `<p>I love my A5 planner. For tea, a simple tea strainer keeps leaves out.</p>`;
    const out = autoLinkAffiliates(html, products, { maxLinksPerPost: 2 });
    expect(out.count).toBe(2);
    expect(out.html).toContain(`href="https://shop/p?u=1"`);
    expect(out.html).toContain(`href="https://shop/s?u=1"`);
  });

  it("suggests readable anchors", () => {
    const a = suggestAnchorsForProduct(products[1]);
    expect(a.some((s) => /Tea Strainer/i.test(s))).toBe(true);
  });
});
