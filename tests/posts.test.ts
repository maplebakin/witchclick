import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { createPostSpec } from "./postSpecTestUtils";

let tempDir: string;
let cwdSpy: MockInstance<() => string> | undefined;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-posts-"));
  await fs.mkdir(path.join(tempDir, "src", "content"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "content"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd");
  cwdSpy.mockReturnValue(tempDir);
}

async function cleanupTempDir() {
  if (cwdSpy) cwdSpy.mockRestore();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

describe("posts utilities", () => {
  beforeEach(async () => {
    await prepareTempDir();
  });

  afterEach(async () => {
    delete process.env.WC_PROJECT_ROOT;
    await cleanupTempDir();
    vi.resetModules();
  });

  it("prefers the content collection directory when both paths exist", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    const legacyDir = path.join(tempDir, "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(legacyDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, "source.md"),
      `---\ntitle: Source Post\npubDate: 2024-01-01T00:00:00Z\n---\nHello from src`,
      "utf8",
    );

    await fs.writeFile(
      path.join(legacyDir, "legacy.md"),
      `---\ntitle: Legacy Post\npubDate: 2024-01-02T00:00:00Z\n---\nHello from legacy`,
      "utf8",
    );

    vi.resetModules();
    const { loadAllPosts, resetPostCache } = await import("../src/utils/posts");
    resetPostCache();

    const posts = loadAllPosts();
    expect(posts).toHaveLength(1);
    const firstPost = posts[0];
    expect(firstPost).toBeDefined();
    expect(firstPost?.slug).toBe("source");
  });

  it("refreshes posts on subsequent reads when caching is disabled", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, "first.md"),
      `---\ntitle: First\npubDate: 2024-01-01T00:00:00Z\n---\nOne`,
      "utf8",
    );

    vi.resetModules();
    const { loadAllPosts } = await import("../src/utils/posts");

    let posts = loadAllPosts();
    expect(posts).toHaveLength(1);

    await fs.writeFile(
      path.join(srcDir, "second.md"),
      `---\ntitle: Second\npubDate: 2024-01-02T00:00:00Z\n---\nTwo`,
      "utf8",
    );

    posts = loadAllPosts();
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.slug)).toContain("second");
  });

  it("paginates posts deterministically", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });

    for (let i = 0; i < 5; i++) {
      await fs.writeFile(
        path.join(srcDir, `post-${i}.md`),
        `---\ntitle: Post ${i}\npubDate: 2024-01-0${i + 1}T00:00:00Z\n---\nBody ${i}`,
        "utf8",
      );
    }

    vi.resetModules();
    const { loadAllPosts, paginatePosts } = await import("../src/utils/posts");
    const posts = loadAllPosts();
    expect(posts).toHaveLength(5);

    const { totalPages, items } = paginatePosts(2, 2);
    expect(totalPages).toBe(3);
    expect(items).toHaveLength(2);
    const [firstItem, secondItem] = items;
    expect(firstItem).toBeDefined();
    expect(secondItem).toBeDefined();
    if (firstItem && secondItem) {
      expect(firstItem.date.getTime()).toBeGreaterThanOrEqual(secondItem.date.getTime());
    }
  });

  it("ingests posts into the directory used by loadAllPosts", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    const legacyDir = path.join(tempDir, "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(legacyDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, "seed.md"),
      `---\ntitle: Seed\npubDate: 2024-01-01T00:00:00Z\n---\nSeed content`,
      "utf8",
    );

    process.env.WC_PROJECT_ROOT = tempDir;
    vi.resetModules();

    const { loadAllPosts, resetPostCache } = await import("../src/utils/posts");
    resetPostCache();

    let posts = loadAllPosts();
    expect(posts.map((p) => p.slug)).toContain("seed");

    const { ingestFromSpec } = await import("../scripts/ingest.mjs");
    const spec = createPostSpec({ title: "Ingested Post", slug: "ingested-post" });
    await ingestFromSpec(spec);

    resetPostCache();
    posts = loadAllPosts();
    expect(posts.map((p) => p.slug)).toContain("ingested-post");

    const writtenFiles = await fs.readdir(srcDir);
    expect(writtenFiles).toContain("ingested-post.md");
  });

  it("accepts guide content type in ingest schema", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });

    process.env.WC_PROJECT_ROOT = tempDir;
    vi.resetModules();

    const { ingestFromSpec } = await import("../scripts/ingest.mjs");
    const spec = createPostSpec({
      title: "Guide Content",
      slug: "guide-content",
      contentType: "guide",
    });
    const result = await ingestFromSpec(spec, { dry: true });

    expect(result.spec.contentType).toBe("guide");
  });

  it("auto-fills TL;DR and spoons when missing", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });

    const intro = "This ritual is for test coverage. It checks that summaries and spoons are generated.";
    const filler = Array.from({ length: 200 }, () => "Additional context keeps flowing.").join(" ");

    await fs.writeFile(
      path.join(srcDir, "auto-summary.md"),
      `---\ntitle: Auto Summary Check\npubDate: 2024-02-01T00:00:00Z\n---\n${intro}\n\n${filler}`,
      "utf8",
    );

    vi.resetModules();
    const { loadAllPosts } = await import("../src/utils/posts");

    const posts = loadAllPosts();
    expect(posts).toHaveLength(1);
    const post = posts[0];
    if (!post) {
      throw new Error("Expected at least one post for summary assertions");
    }
    expect(post.tldr).toBeTruthy();
    expect(post.tldr).toMatch(/This ritual is for test coverage/);
    expect(post.spoons).toBe("medium");
    expect(post.data.tldr).toBe(post.tldr);
    expect(post.data.spoons).toBe(post.spoons);
  });

  it("honors auto summary toggles when disabled", async () => {
    const srcDir = path.join(tempDir, "src", "content", "posts");
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(
      path.join(srcDir, "manual.md"),
      `---\ntitle: Manual Summary Only\npubDate: 2024-03-01T00:00:00Z\n---\nA brief intro.`,
      "utf8",
    );

    const settingsDir = path.join(tempDir, "content");
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(
      path.join(settingsDir, "settings.json"),
      JSON.stringify({ siteUrl: "https://example.test", autoSummaries: false, autoSpoons: false }),
      "utf8",
    );

    vi.resetModules();
    const { loadAllPosts } = await import("../src/utils/posts");

    const posts = loadAllPosts();
    expect(posts).toHaveLength(1);
    const post = posts[0];
    if (!post) {
      throw new Error("Expected at least one post for manual summary assertions");
    }
    expect(post.tldr).toBeUndefined();
    expect(post.spoons).toBeUndefined();
    expect(post.data.tldr).toBeUndefined();
    expect(post.data.spoons).toBeUndefined();
  });
});
