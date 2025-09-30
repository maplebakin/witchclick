import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let prepareNormalizedSpec: (payload: any) => any;
let persistNormalizedSpec: (prepared: any) => Promise<void>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-admin-generator-"));
  await fs.mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
}

async function cleanupTempDir() {
  if (cwdSpy) cwdSpy.mockRestore();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

describe("admin post generator pipeline", () => {
  beforeEach(async () => {
    await prepareTempDir();
    vi.resetModules();
    ({ prepareNormalizedSpec, persistNormalizedSpec } = await import("../dev-api.js"));
  });

  afterEach(async () => {
    await cleanupTempDir();
    vi.resetModules();
  });

  it("normalizes specs, reports adjustments, and persists markdown", async () => {
    const postsDir = path.join(tempDir, "src", "content", "posts");
    await fs.writeFile(path.join(postsDir, "cozy-focus-tea.md"), "# existing\n", "utf8");

    const rawSpec = {
      specVersion: "1",
      title: " Cozy Focus Tea ",
      slug: "Cozy Focus Tea",
      excerpt: "  Quick focus tea summary. ",
      tags: ["Focus ", " cozy", "ritual"],
      sections: [
        { heading: "Opening Reflection", markdown: "A gentle opening." },
        { title: "Quick Ritual", content: "Step one." },
        { heading: "Deep Dive", markdown: "A longer companion ritual." },
      ],
      entities: [
        { type: "herb", slug: "Peppermint" },
        { type: "crystal", name: "Fluorite" },
        { type: "herb", slug: "" },
      ],
      heroPrompt: "A cozy desk with tea.",
      altTexts: ["A warm mug"],
      internalLinkHints: [
        { anchor: "Focus tea ritual", rationale: "Link to breathing guide." },
        { text: "" },
      ],
      affiliateHints: [
        { key: "mug", anchor: "Enamel mug" },
        { key: "invalid", anchor: "" },
      ],
      cta: { type: "kofi" },
      adPlacements: ["Lead", "footer", "mid"],
    };

    const prepared = prepareNormalizedSpec(rawSpec);

    expect(prepared.spec.slug).toBe("cozy-focus-tea-2");
    expect(prepared.spec.title).toBe("Cozy Focus Tea");
    expect(prepared.spec.excerpt).toBe("Quick focus tea summary.");
    expect(prepared.spec.metaDescription).toBe("Quick focus tea summary.");
    expect(prepared.spec.tags).toEqual(["Focus", "cozy", "ritual"]);
    expect(prepared.spec.entities).toEqual([
      { type: "herb", slug: "peppermint" },
      { type: "crystal", slug: "fluorite" },
    ]);
    expect(prepared.spec.internalLinkHints).toHaveLength(1);
    expect(prepared.spec.affiliateHints).toHaveLength(1);
    expect(prepared.spec.adPlacements).toEqual(["lead", "mid"]);
    expect(prepared.spec.cta.type).toBe("kofi");
    expect(prepared.spec.outline).toHaveLength(3);
    expect(prepared.spec.heroImagePrompt).toBe("A cozy desk with tea.");

    expect(prepared.normalizationReport).toEqual(
      expect.arrayContaining([
        "specVersion forced to 2.",
        "Dropped invalid entity entry.",
        "Dropped invalid ad placement \"footer\".",
        "Derived outline from sections.",
        "Slug collision resolved as cozy-focus-tea-2.",
      ]),
    );

    expect(prepared.post.filePath.endsWith("cozy-focus-tea-2.md")).toBe(true);
    expect(prepared.post.contents).toContain('title: "Cozy Focus Tea"');
    expect(prepared.post.contents).toContain("slug: cozy-focus-tea-2");
    expect(prepared.post.contents).toContain('metaDescription: "Quick focus tea summary."');
    expect(prepared.post.contents).toContain("includeAds: true");
    expect(prepared.post.contents).toContain("includeKofi: true");
    expect(prepared.post.contents).toContain('outline: ["Opening Reflection", "Quick Ritual", "Deep Dive"]');

    await persistNormalizedSpec(prepared);

    const saved = await fs.readFile(path.join(postsDir, "cozy-focus-tea-2.md"), "utf8");
    expect(saved).toBe(prepared.post.contents);

    const herbStub = await fs.readFile(
      path.join(tempDir, "content", "entities", "herb", "peppermint.json"),
      "utf8",
    );
    const crystalStub = await fs.readFile(
      path.join(tempDir, "content", "entities", "crystal", "fluorite.json"),
      "utf8",
    );

    expect(JSON.parse(herbStub).slug).toBe("peppermint");
    expect(JSON.parse(crystalStub).slug).toBe("fluorite");
  });
});
