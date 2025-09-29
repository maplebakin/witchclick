import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

async function setupTempContent() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-search-"));
  await fs.mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
}

async function teardownTempContent() {
  if (cwdSpy) {
    cwdSpy.mockRestore();
    cwdSpy = undefined;
  }
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

describe("search endpoint", () => {
  beforeEach(async () => {
    await setupTempContent();
  });

  afterEach(async () => {
    await teardownTempContent();
    vi.resetModules();
  });

  it("builds a searchable index from markdown posts", async () => {
    const postsDir = path.join(tempDir, "src", "content", "posts");
    await fs.writeFile(
      path.join(postsDir, "first.md"),
      `---\ntitle: Moon Mapping\npubDate: 2024-01-01T00:00:00Z\ntags:\n  - Moon\n  - Rituals\n---\nFirst paragraph about the moon.\n\nMore content here.`,
      "utf8",
    );

    await fs.writeFile(
      path.join(postsDir, "second.md"),
      `---\ntitle: Crystal Grids\npubDate: 2024-01-02T00:00:00Z\nexcerpt: Arrange stones for focus\n---\nCrystals everywhere.`,
      "utf8",
    );

    vi.resetModules();
    const { GET } = await import("../src/pages/search.json");

    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    const slugs = body.map((item: any) => item.slug);
    expect(slugs).toEqual(["second", "first"]);

    expect(body[0]).toMatchObject({
      slug: "second",
      title: "Crystal Grids",
      excerpt: "Arrange stones for focus",
    });

    expect(body[1]).toMatchObject({
      slug: "first",
      title: "Moon Mapping",
    });

    expect(body[1].excerpt).toContain("First paragraph about the moon.");
    expect(body[1].tags).toEqual(["Moon", "Rituals"]);
  });
});
