import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let attachHeroToPost: (
  payload: { slug: string; heroImage: string; heroAlt?: string | null },
) => Promise<{ path: string }>;

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(testDir, "..");

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-hero-attach-"));
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
    await fs.mkdir(path.dirname(postPath), { recursive: true });
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

  it("preserves existing title and slug for real post frontmatter", async () => {
    const fixture = await loadSamplePostFrontmatter();
    const tempPostDir = path.join(tempDir, fixture.relativeDir);
    await fs.mkdir(tempPostDir, { recursive: true });

    const tempPostPath = path.join(tempPostDir, fixture.fileName);
    await fs.writeFile(tempPostPath, fixture.raw, "utf8");

    const heroDir = path.join(tempDir, "public", "images", "hero", fixture.slug);
    await fs.mkdir(heroDir, { recursive: true });
    const heroFile = path.join(heroDir, "hero.png");
    await fs.writeFile(heroFile, Buffer.from("fake", "utf8"));

    const heroPath = `/images/hero/${fixture.slug}/hero.png`;

    await expect(
      attachHeroToPost({ slug: fixture.slug, heroImage: heroPath, heroAlt: "Gleaming focus" }),
    ).resolves.toEqual({
      path: path.relative(tempDir, tempPostPath).replace(/\\/g, "/"),
    });

    const updatedRaw = await fs.readFile(tempPostPath, "utf8");
    const parsed = matter(updatedRaw);

    expect(parsed.data.title).toBe(fixture.title);
    expect(parsed.data.slug).toBe(fixture.slug);
    expect(parsed.data.heroImage).toBe(heroPath);
    expect(parsed.data.heroImageSrc).toBe(heroPath);
    expect(parsed.data.heroAlt).toBe("Gleaming focus");
  });
});

async function loadSamplePostFrontmatter() {
  const candidateDirs = [
    path.join(repoRoot, "src", "content", "posts"),
    path.join(repoRoot, "content", "posts"),
  ];

  for (const candidate of candidateDirs) {
    let entries;
    try {
      entries = await fs.readdir(candidate, { withFileTypes: true });
    } catch {
      continue;
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of files) {
      const filePath = path.join(candidate, entry.name);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = matter(raw);
      const title = typeof parsed.data.title === "string" ? parsed.data.title : "";
      const slug = typeof parsed.data.slug === "string" ? parsed.data.slug.trim() : "";

      if (title && slug) {
        const relativeDir = path.dirname(path.relative(repoRoot, filePath));

        return {
          raw,
          title,
          slug,
          relativeDir: relativeDir === "." ? "" : relativeDir,
          fileName: entry.name,
        };
      }
    }
  }

  throw new Error("No sample post frontmatter found for hero attach regression test");
}
