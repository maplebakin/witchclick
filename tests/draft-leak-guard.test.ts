import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

let tempDir = "";

async function writeFile(relativePath: string, content: string) {
  const fullPath = path.join(tempDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

async function setupTempProject() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-draft-guard-"));
}

describe("draft leak guard", () => {
  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("passes when draft slugs are absent from public routes and sitemap", async () => {
    await setupTempProject();

    await writeFile(
      "src/content/posts/draft-post.md",
      `---\ntitle: Draft Post\ndraft: true\n---\nHidden draft`,
    );
    await writeFile(
      "src/content/posts/live-post.md",
      `---\ntitle: Live Post\n---\nPublished content`,
    );
    await writeFile("dist/post/live-post/index.html", "<html></html>");
    await writeFile(
      "dist/sitemap-0.xml",
      `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://witchclick.space/post/live-post</loc></url></urlset>`,
    );

    const modulePath = "../scripts/verify-no-draft-leaks.mjs";
    const { verifyNoDraftLeaks } = await import(modulePath);
    const result = verifyNoDraftLeaks({ projectRoot: tempDir });

    expect(result.ok).toBe(true);
    expect(result.draftSlugs).toContain("draft-post");
    expect(result.routeLeaks).toEqual([]);
    expect(result.sitemapLeaks).toEqual([]);
  });

  it("fails when a draft slug appears in a generated route and sitemap URL", async () => {
    await setupTempProject();

    await writeFile(
      "src/content/posts/hidden.md",
      `---\ntitle: Hidden\nslug: secret-draft\ndraft: true\n---\nHidden`,
    );
    await writeFile("dist/sampler/secret-draft/index.html", "<html></html>");
    await writeFile(
      "dist/sitemap-0.xml",
      `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://witchclick.space/sampler/secret-draft</loc></url></urlset>`,
    );

    const modulePath = "../scripts/verify-no-draft-leaks.mjs";
    const { verifyNoDraftLeaks } = await import(modulePath);
    const result = verifyNoDraftLeaks({ projectRoot: tempDir });

    expect(result.ok).toBe(false);
    expect(result.routeLeaks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "secret-draft", pathname: "/sampler/secret-draft" }),
      ]),
    );
    expect(result.sitemapLeaks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "secret-draft",
          pathname: "/sampler/secret-draft",
          sitemap: "sitemap-0.xml",
        }),
      ]),
    );
  });
});
