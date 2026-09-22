import { describe, expect, it } from "vitest";

import { buildAnalyticsInjection } from "../src/utils/analytics";
import type { SiteSettings } from "../src/utils/settings";

function settings(scriptUrl: string, domain = "witchclick.space"): SiteSettings {
  return {
    siteUrl: "https://witchclick.space",
    brandName: "WitchClick",
    analytics: {
      enabled: true,
      provider: "plausible",
      scriptUrl,
      domain,
    },
  };
}

describe("analytics script boundaries", () => {
  it("falls back instead of emitting a non-web script scheme", () => {
    const injection = buildAnalyticsInjection(settings("javascript:alert(1)"));
    expect(injection?.head?.attributes?.src).toBe("https://plausible.io/js/script.js");
  });

  it("escapes closing script markup in inline configuration", () => {
    const injection = buildAnalyticsInjection(
      settings("https://analytics.example/script.js", "</script><script>alert(1)</script>"),
    );
    expect(injection?.config?.inline).not.toContain("</script>");
    expect(injection?.config?.inline).toContain("\\u003c/script>");
  });
});
