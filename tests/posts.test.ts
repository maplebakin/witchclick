import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-posts-"));
  await fs.mkdir(path.join(tempDir, "src", "content"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "content"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
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
    expect(posts[0].slug).toBe("source");
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
    expect(items[0].date.getTime()).toBeGreaterThanOrEqual(items[1].date.getTime());
  });
});
