import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";

import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let attachHeroToPost: (
  payload: { slug: string; heroImage: string; heroAlt?: string | null },
) => Promise<{ path: string }>;
let handleRequest:
  | ((req: MockRequest, res: MockResponse) => Promise<void> | void)
  | undefined;

let capturedRequestHandler:
  | ((req: MockRequest, res: MockResponse) => Promise<void> | void)
  | undefined;

const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
};

vi.mock("node:http", () => {
  const http = {
    createServer: vi.fn((handler: typeof capturedRequestHandler) => {
      capturedRequestHandler = handler as typeof capturedRequestHandler;
      return mockServer;
    }),
  };
  return {
    default: http,
    ...http,
  };
});

class MockRequest extends EventEmitter {
  method: string;
  url: string;
  headers: Record<string, string>;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
    this.headers = {};
  }
}

class MockResponse {
  statusCode = 200;
  headersSent = false;
  headers: Record<string, string> = {};
  body = "";
  ended = false;

  writeHead(status: number, headers: Record<string, string>) {
    this.statusCode = status;
    this.headers = { ...headers };
    this.headersSent = true;
  }

  end(chunk?: string | Buffer) {
    if (chunk) {
      this.body += typeof chunk === "string" ? chunk : chunk.toString();
    }
    this.ended = true;
    if (!this.headersSent) {
      this.headersSent = true;
    }
  }
}

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-hero-attach-"));
  await fs.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
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
    capturedRequestHandler = undefined;
    handleRequest = undefined;
    vi.resetModules();
    mockServer.listen.mockClear();
    mockServer.close.mockClear();
    ({ attachHeroToPost } = await import("../dev-api.js"));
    handleRequest = capturedRequestHandler;
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

  it("lists posts from both content directories", async () => {
    expect(handleRequest).toBeDefined();

    const legacyPost = path.join(tempDir, "content", "posts", "legacy-post.md");
    const srcPost = path.join(tempDir, "src", "content", "posts", "src-post.md");

    await fs.writeFile(
      legacyPost,
      "---\ntitle: Legacy Listing\nslug: legacy-post\n---\nOld world",
      "utf8",
    );

    await fs.writeFile(
      srcPost,
      "---\ntitle: Modern Listing\nslug: src-post\n---\nNew world",
      "utf8",
    );

    const req = new MockRequest("POST", "/posts/list");
    const res = new MockResponse();
    await handleRequest?.(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBe("");

    const payload = JSON.parse(res.body) as {
      ok: boolean;
      items: Array<{ slug: string }>;
    };

    expect(payload.ok).toBe(true);
    const slugs = payload.items.map((item) => item.slug);
    expect(slugs).toContain("legacy-post");
    expect(slugs).toContain("src-post");
  });
});
