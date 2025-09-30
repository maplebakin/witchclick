import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let savePostFromWrite: (payload: any) => Promise<any>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-admin-write-"));
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

describe("admin write pipeline", () => {
  beforeEach(async () => {
    await prepareTempDir();
    vi.resetModules();
    ({ savePostFromWrite } = await import("../dev-api.js"));
  });

  afterEach(async () => {
    await cleanupTempDir();
    vi.resetModules();
  });

  it("auto-generates clean metadata and warns about adjustments", async () => {
    const markdown = [
      "## Opening Reflection",
      "",
      "A gentle intro to the ritual with cozy reassurance.",
      "Another sentence invites the reader to breathe and focus.",
      "",
      "## Ritual Steps",
      "",
      "1. Boil water with a sprig of peppermint.",
      "2. Stir clockwise while naming the focus you want to invite.",
      "",
      "## Reflection Prompt",
      "",
      "What energy will you carry into the next task?",
    ].join("\n");

    const result = await savePostFromWrite({
      title: "Cozy Focus Tea",
      slug: "",
      excerpt: "",
      metaDescription: "",
      tags: "Tea, Ritual\nFocus, Cozy, Herbal , Tea",
      includeAds: true,
      includeKofi: false,
      entities: "herb:peppermint, crystal:fluorite, invalid", // one invalid entry
      markdown,
    });

    expect(result.slug).toBe("cozy-focus-tea");
    expect(result.path.endsWith(`${result.slug}.md`)).toBe(true);
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities).toHaveLength(2);
    expect(result.entities?.map((e: any) => e.type)).toContain("herb");
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContain("Excerpt auto-generated from Markdown.");
    expect(result.warnings).toContain("Meta description auto-generated from Markdown.");
    expect(result.warnings).toContain("Dropped 1 invalid entity entry.");

    const filePath = path.join(tempDir, "src", "content", "posts", `${result.slug}.md`);
    const contents = await fs.readFile(filePath, "utf8");

    const descriptionLine = contents.match(/^description: (.+)$/m);
    const metaLine = contents.match(/^metaDescription: (.+)$/m);
    const tagsLine = contents.match(/^tags: (.+)$/m);

    expect(descriptionLine).not.toBeNull();
    expect(metaLine).not.toBeNull();
    expect(tagsLine).not.toBeNull();

    const excerpt = descriptionLine ? JSON.parse(descriptionLine[1]) : "";
    const meta = metaLine ? JSON.parse(metaLine[1]) : "";
    const tags = tagsLine ? JSON.parse(tagsLine[1]) : [];

    expect(excerpt.length).toBeGreaterThan(0);
    expect(meta.length).toBeGreaterThan(0);
    expect(meta.length).toBeLessThanOrEqual(160);
    expect(tags.length).toBe(5);
    expect(new Set(tags.map((t: string) => t.toLowerCase())).size).toBe(5);
  });

  it("requires markdown content to save", async () => {
    await expect(
      savePostFromWrite({
        title: "Empty Draft",
        tags: "focus, ritual, calm, cozy",
        markdown: "   ",
      }),
    ).rejects.toThrow(/markdown is required/);
  });
});
