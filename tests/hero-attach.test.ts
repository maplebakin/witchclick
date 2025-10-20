import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let attachHeroToPost: (
  payload: { slug: string; heroImage: string; heroAlt?: string | null },
) => Promise<{ path: string }>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-hero-attach-"));
  await fs.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "public", "images", "hero"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
}

async function cleanupTempDir() {
  if (cwdSpy) cwdSpy.mockRestore();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

describe("attachHeroToPost", () => {
  beforeEach(async () => {
    await prepareTempDir();
    vi.resetModules();
    ({ attachHeroToPost } = await import("../dev-api.js"));
  });

  afterEach(async () => {
    await cleanupTempDir();
    vi.resetModules();
  });

  it("updates frontmatter with hero image metadata", async () => {
    const slug = "cozy-hero";
    const postPath = path.join(tempDir, "content", "posts", `${slug}.md`);
    const heroDir = path.join(tempDir, "public", "images", "hero", slug);
    await fs.mkdir(heroDir, { recursive: true });
    await fs.writeFile(
      postPath,
      `---\ntitle: Cozy Hero\nslug: ${slug}\nexcerpt: Gentle intro\n---\n\nContent`,
      "utf8",
    );
    const heroFile = path.join(heroDir, "hero.png");
    await fs.writeFile(heroFile, Buffer.from("fake", "utf8"));

    const heroPath = `/images/hero/${slug}/hero.png`;
    const result = await attachHeroToPost({ slug, heroImage: heroPath, heroAlt: "Soft glow" });

    expect(result.path).toBe(`content/posts/${slug}.md`);

    const updatedRaw = await fs.readFile(postPath, "utf8");
    const parsed = matter(updatedRaw);

    expect(parsed.data.heroImage).toBe(heroPath);
    expect(parsed.data.heroImageSrc).toBe(heroPath);
    expect(parsed.data.heroAlt).toBe("Soft glow");
  });
});
