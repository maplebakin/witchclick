import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as bundlePost } from "../src/pages/api/bundle.json.ts";
import { POST as ingestPost } from "../src/pages/api/ingest.json.ts";
import { POST as cursesIngestPost } from "../src/pages/api/curses/ingest.json.ts";
import { POST as publishPost } from "../src/pages/api/staging/publish.json.ts";
import { POST as deletePost } from "../src/pages/api/staging/delete.json.ts";

const ADMIN_TOKEN = "test-admin-token";

function makeJsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("admin mutating API guards", () => {
  const previousAdminToken = process.env.ADMIN_API_TOKEN;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVitest = process.env.VITEST;

  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = ADMIN_TOKEN;
    process.env.NODE_ENV = "test";
    process.env.VITEST = "true";
  });

  afterEach(() => {
    if (previousAdminToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = previousAdminToken;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousVitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = previousVitest;
  });

  it("rejects unauthorized requests on mutating endpoints", async () => {
    const requests = [
      () => bundlePost({ request: makeJsonRequest("http://localhost/api/bundle", {}) }),
      () => ingestPost({ request: makeJsonRequest("http://localhost/api/ingest", {}) }),
      () => cursesIngestPost({ request: makeJsonRequest("http://localhost/api/curses/ingest", {}) }),
      () => publishPost({ request: makeJsonRequest("http://localhost/api/staging/publish", { slug: "valid-slug" }) }),
      () => deletePost({ request: makeJsonRequest("http://localhost/api/staging/delete", { slug: "valid-slug" }) }),
    ];

    for (const call of requests) {
      const response = await call();
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload).toMatchObject({
        ok: false,
        code: "UNAUTHORIZED",
        error: "Unauthorized",
      });
    }
  });

  it("rejects traversal-style slugs for staging publish/delete", async () => {
    const auth = { Authorization: `Bearer ${ADMIN_TOKEN}` };
    const invalidSlugs = ["../escape", "nested/path", "draft.md", "hello world"];

    for (const slug of invalidSlugs) {
      const publishResponse = await publishPost({
        request: makeJsonRequest("http://localhost/api/staging/publish", { slug }, auth),
      });
      expect(publishResponse.status).toBe(400);
      expect(await publishResponse.json()).toMatchObject({
        ok: false,
        code: "INVALID_SLUG",
      });

      const deleteResponse = await deletePost({
        request: makeJsonRequest("http://localhost/api/staging/delete", { slug }, auth),
      });
      expect(deleteResponse.status).toBe(400);
      expect(await deleteResponse.json()).toMatchObject({
        ok: false,
        code: "INVALID_SLUG",
      });
    }
  });

  it("blocks mutating endpoints outside development sessions", async () => {
    process.env.NODE_ENV = "production";

    const response = await publishPost({
      request: makeJsonRequest(
        "http://localhost/api/staging/publish",
        { slug: "valid-slug" },
        { Authorization: `Bearer ${ADMIN_TOKEN}` },
      ),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
      error: "Not found",
    });
  });
});
