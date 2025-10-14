import { describe, expect, it } from "vitest";
import { validateSettings } from "../src/utils/settings";

describe("validateSettings", () => {
  it("merges defaults with partial overrides", () => {
    const result = validateSettings({
      siteUrl: "https://example.org",
      analytics: { enabled: true, provider: "fathom", siteId: "ABC123" },
    });

    expect(result.siteUrl).toBe("https://example.org");
    expect(result.analytics?.enabled).toBe(true);
    expect(result.analytics?.provider).toBe("fathom");
    expect(result.analytics?.siteId).toBe("ABC123");
  });

  it("throws when provider is enabled without required fields", () => {
    expect(() =>
      validateSettings({
        siteUrl: "https://witchclick.space",
        analytics: { enabled: true, provider: "plausible" },
      }),
    ).toThrow(/analytics.domain/);

    expect(() =>
      validateSettings({
        siteUrl: "https://witchclick.space",
        analytics: { enabled: true, provider: "fathom" },
      }),
    ).toThrow(/analytics.siteId/);
  });

  it("rejects unknown analytics providers", () => {
    expect(() =>
      validateSettings({
        siteUrl: "https://witchclick.space",
        analytics: { enabled: true, provider: "mystic" as any },
      }),
    ).toThrow(/analytics.provider/);
  });
});
