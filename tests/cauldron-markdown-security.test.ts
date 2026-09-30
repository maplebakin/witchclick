import { describe, expect, it } from "vitest";

import { renderSafeMarkdown } from "../cauldron/src/lib/safeMarkdown";

describe("Cauldron markdown preview", () => {
  it("renders raw HTML as text instead of executable markup", () => {
    const html = renderSafeMarkdown('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("removes obfuscated non-web link schemes", () => {
    const html = renderSafeMarkdown("[unsafe](java&#x73;cript:alert(1)) [safe](/start)");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="/start"');
  });
});
