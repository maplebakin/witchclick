import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as listGet } from "../src/pages/api/staging/list.json.ts";
import { POST as previewPost } from "../src/pages/api/staging/preview.json.ts";

const ADMIN_TOKEN = "test-admin-token";

function makeRequest(url: string, body?: unknown, method = "GET") {
  return new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
}

describe("staging API canonical post source", () => {
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

  it("returns draft file paths under src/content/posts from list endpoint", async () => {
    const response = await listGet({ request: makeRequest("http://localhost/api/staging/list") });
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.drafts)).toBe(true);
    expect(payload.drafts.length).toBeGreaterThan(0);
    for (const draft of payload.drafts) {
      expect(typeof draft.filePath).toBe("string");
      expect(draft.filePath.startsWith("src/content/posts/")).toBe(true);
    }
  });

  it("resolves preview files from src/content/posts", async () => {
    const listResponse = await listGet({ request: makeRequest("http://localhost/api/staging/list") });
    const listPayload = await listResponse.json();
    const firstDraft = listPayload.drafts?.[0];
    expect(firstDraft?.slug).toBeTruthy();

    const response = await previewPost({
      request: makeRequest(
        "http://localhost/api/staging/preview",
        { slug: firstDraft.slug },
        "POST",
      ),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(typeof payload.filePath).toBe("string");
    expect(payload.filePath.startsWith("src/content/posts/")).toBe(true);
  });
});
