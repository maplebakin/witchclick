import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

let tempDir: string;
let cwdSpy: MockInstance<() => string> | undefined;
let prepareSpecForPersistence: (
  payload: any,
  options?: Record<string, unknown>,
) => any;
let persistPreparedSpec: (
  prepared: any,
) => Promise<{ postPath: string; createdEntities: string[] }>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-admin-generator-"));
  await fs.mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd");
  cwdSpy.mockReturnValue(tempDir);
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
    ({ prepareSpecForPersistence, persistPreparedSpec } = await import("../dev-api.js"));
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
      summary: " Quick focus tea summary. ",
      tags: ["Focus ", " cozy", "ritual", "tea"],
      sections: [
        { heading: "Opening Reflection", markdown: "A gentle opening." },
        { heading: "Quick Ritual", title: "Quick Ritual", content: "Quick ritual steps include a Focus tea ritual mention." },
        { heading: "Deep Dive", markdown: "A longer companion ritual that feels like a deep dive ritual." },
        { heading: "Ritual Checklist", markdown: "- Checklist items anchor for quick packing with Enamel mug on hand." },
        { heading: "Reflection Prompt", markdown: "Reflection prompt question anchor for journaling." },
      ],
      outline: [
        { heading: "Opening Reflection", id: "opening-reflection" },
        { heading: "Quick Ritual", id: "quick-ritual" },
        { heading: "Deep Dive", id: "deep-dive" },
        { heading: "Ritual Checklist", id: "ritual-checklist" },
        { heading: "Reflection Prompt", id: "reflection-prompt" },
      ],
      entities: [
        { type: "herb", slug: "Peppermint" },
        { type: "crystal", name: "Fluorite" },
        { type: "herb", slug: "" },
      ],
      heroImagePrompt: "A cozy desk with tea.",
      altTexts: ["A warm mug"],
      internalLinkHints: [
        { anchor: "Focus tea ritual", rationale: "Link to breathing guide." },
        { anchor: "Checklist items anchor", rationale: "Link to supply checklist." },
        { anchor: "Reflection prompt question", rationale: "Link to journaling prompts." },
        { anchor: "Deep dive ritual", rationale: "Link to deep ritual guide." },
        { anchor: "Quick ritual steps", rationale: "Link to quick ritual." },
      ],
      affiliateHints: [
        { key: "mug", anchor: "Enamel mug", rationale: "Suggest favorite mug." },
        { key: "invalid", anchor: "" },
      ],
      cta: { type: "kofi" },
      adPlacements: ["Lead", "footer", "mid"],
    };

    const prepared = prepareSpecForPersistence(rawSpec, {
      cwd: tempDir,
      postsDirectories: [
        path.join(tempDir, "src", "content", "posts"),
        path.join(tempDir, "content", "posts"),
      ],
    });

    expect(prepared.spec.slug).toBe("cozy-focus-tea-2");
    expect(prepared.spec.title).toBe("Cozy Focus Tea");
    expect(prepared.spec.excerpt).toBe("Quick focus tea summary.");
    expect(prepared.spec.metaDescription).toBe("Quick focus tea summary.");
    expect(prepared.spec.tags).toEqual(["Focus", "cozy", "ritual", "tea"]);
    expect(prepared.spec.entities).toEqual([
      { type: "herb", slug: "peppermint" },
      { type: "crystal", slug: "fluorite" },
    ]);
    expect(prepared.spec.internalLinkHints).toHaveLength(5);
    expect(prepared.spec.internalLinkHints.map((hint: any) => hint.anchor)).toEqual(
      expect.arrayContaining([
        "Focus tea ritual",
        "Checklist items anchor",
        "Reflection prompt question",
        "Deep dive ritual",
        "Quick ritual steps",
      ]),
    );
    expect(prepared.spec.affiliateHints).toHaveLength(1);
    expect(prepared.spec.adPlacements).toEqual(["lead", "mid"]);
    expect(prepared.spec.cta.type).toBe("kofi");
    expect(prepared.spec.outline).toHaveLength(5);
    expect(prepared.spec.heroImagePrompt).toBe("A cozy desk with tea.");

    expect(prepared.normalizationReport).toEqual(
      expect.arrayContaining([
        expect.stringContaining("summary→metaDescription"),
        expect.stringContaining("sections.content"),
        expect.stringContaining("slug→cozy-focus-tea-2"),
      ]),
    );

    expect(prepared.post.filePath.endsWith("cozy-focus-tea-2.md")).toBe(true);
    expect(prepared.post.contents).toContain('title: "Cozy Focus Tea"');
    expect(prepared.post.contents).toContain('slug: "cozy-focus-tea-2"');
    expect(prepared.post.contents).toContain('metaDescription: "Quick focus tea summary."');
    expect(prepared.post.contents).toContain("includeAds: true");
    expect(prepared.post.contents).toContain("includeKofi: true");
    expect(prepared.post.contents).toContain('outline: ["Opening Reflection","Quick Ritual","Deep Dive","Ritual Checklist","Reflection Prompt"]');

    await persistPreparedSpec(prepared);

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
