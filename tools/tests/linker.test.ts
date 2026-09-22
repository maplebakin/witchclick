// tools/tests/linker.test.ts
import { describe, it, expect } from "vitest";
import { autoLink } from "../src/linker";

describe("autoLink (affiliate)", () => {
  const products = [
    { key: "plannerA5", url: "https://shop.example.com/a5", utm: "utm_source=witchclick" },
  ];

  it("links first occurrence only and adds rel/target", () => {
    const htmlIn = `<p>I love my A5 planner. Some say an A5 planner is perfect.</p>`;
    const { html, stats } = autoLink(htmlIn, {
      affiliateAnchors: [{ key: "plannerA5", text: "A5 planner" }],
      products,
      firstOccurrenceOnly: true,
    });

    expect(html).toContain(`href="https://shop.example.com/a5?utm_source=witchclick"`);
    expect(html).toContain(`rel="sponsored nofollow noopener noreferrer"`);
    expect(html).toContain(`target="_blank"`);
    // only first occurrence turned into a link
    const count = (html.match(/<a /g) || []).length;
    expect(count).toBe(1);
    expect(stats.affiliateCount).toBe(1);
  });

  it("does not link inside existing anchors, code, pre, or headings", () => {
    const htmlIn = `
      <h2>A5 planner</h2>
      <p>Try the A5 planner now.</p>
      <a href="#">A5 planner</a>
      <code>A5 planner</code>
      <pre>A5 planner</pre>
    `;
    const { html, stats } = autoLink(htmlIn, {
      affiliateAnchors: [{ key: "plannerA5", text: "A5 planner" }],
      products,
      firstOccurrenceOnly: true,
    });

    // Should link the one in the paragraph only
    const anchors = (html.match(/<a /g) || []).length;
    expect(anchors).toBe(2); // one existing link + one affiliate link
    expect(stats.affiliateCount).toBe(1);

    // Heading should remain unlinked
    expect(html).toMatch(/<h2>\s*A5 planner\s*<\/h2>/);
  });

  it("rejects unsafe product protocols and enforces affiliate rel tokens", () => {
    const unsafe = autoLink("<p>Use this planner.</p>", {
      affiliateAnchors: [{ key: "bad", text: "planner" }],
      products: [{ key: "bad", url: "javascript:alert(1)" }],
    });
    expect(unsafe.stats.affiliateCount).toBe(0);
    expect(unsafe.html).not.toContain("javascript:");

    const safe = autoLink("<p>Use this planner.</p>", {
      affiliateAnchors: [{ key: "safe", text: "planner" }],
      products: [{ key: "safe", url: "https://shop.example/item", rel: "custom" }],
    });
    expect(safe.html).toContain('rel="custom sponsored nofollow noopener noreferrer"');
  });
});

describe("autoLink (internal)", () => {
  it("adds internal post links after affiliate linking", () => {
    const htmlIn = `<p>Read our tea ritual guide and also our tarot intro.</p>`;
    const { html, stats } = autoLink(htmlIn, {
      affiliateAnchors: [],
      products: [],
      internalLinks: [
        { slug: "tea-ritual-for-focus", anchor: "tea ritual" },
        { slug: "tarot-as-secular-tool", anchor: "tarot" },
      ],
      firstOccurrenceOnly: true,
    });

    expect(html).toContain(`href="/post/tea-ritual-for-focus"`);
    expect(html).toContain(`href="/post/tarot-as-secular-tool"`);
    expect(stats.internalCount).toBe(2);
  });
});
