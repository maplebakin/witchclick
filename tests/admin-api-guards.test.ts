import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as bundlePost } from "../src/pages/api/bundle.json.ts";
import { POST as ingestPost } from "../src/pages/api/ingest.json.ts";
import { POST as cursesIngestPost } from "../src/pages/api/curses/ingest.json.ts";
import { POST as publishPost } from "../src/pages/api/staging/publish.json.ts";
import { POST as deletePost } from "../src/pages/api/staging/delete.json.ts";
import { GET as listGet } from "../src/pages/api/staging/list.json.ts";
import { POST as previewPost } from "../src/pages/api/staging/preview.json.ts";
import { requireStagingAccess, requireMutatingAccess, enforceMutatingAccess } from "../src/pages/api/_mutating";

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
  const previousLoopback = process.env.WITCHCLICK_STAGING_LOOPBACK;

  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = ADMIN_TOKEN;
    process.env.NODE_ENV = "test";
    process.env.VITEST = "true";
    delete process.env.WITCHCLICK_STAGING_LOOPBACK;
  });

  afterEach(() => {
    if (previousAdminToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = previousAdminToken;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousVitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = previousVitest;
    if (previousLoopback === undefined) delete process.env.WITCHCLICK_STAGING_LOOPBACK;
    else process.env.WITCHCLICK_STAGING_LOOPBACK = previousLoopback;
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

describe("Staging opt-in loopback access", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_API_TOKEN", ADMIN_TOKEN);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VITEST", "true");
    vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", "1");
  });
  afterEach(() => vi.unstubAllEnvs());
  const request = (url = "http://localhost:4321/api/staging/preview.json", headers: Record<string, string> = {}) => new Request(url, { headers });

  it.each(["localhost", "127.0.0.1", "[::1]"])("allows opted-in development on %s", (host) => {
    expect(requireStagingAccess(request(`http://${host}:4321/api/staging/preview.json`))).toBeNull();
  });
  it.each(["", "0", "true", "01"])("requires the exact opt-in value, rejecting %s", (flag) => {
    vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", flag);
    expect(requireStagingAccess(request())?.status).toBe(401);
  });
  it("rejects a missing opt-in flag", () => {
    delete process.env.WITCHCLICK_STAGING_LOOPBACK;
    expect(requireStagingAccess(request())?.status).toBe(401);
  });
  it.each(["example.com", "192.168.1.2", "localhost.example.com", "127.0.0.2", "[::ffff:127.0.0.1]"])("rejects non-allowlisted hostname %s", (host) => {
    expect(requireStagingAccess(request(`http://${host}:4321/api/staging/preview.json`))?.status).toBe(401);
  });
  it.each(["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"])("rejects presence of %s, including empty values", (header) => {
    for (const value of ["", "127.0.0.1"]) expect(requireStagingAccess(request(undefined, { [header]: value }))?.status).toBe(401);
  });
  it.each(["http://localhost:4321", "http://127.0.0.1:4321", "http://[::1]:4321"])("accepts loopback Origin with matching port: %s", (origin) => {
    expect(requireStagingAccess(request(undefined, { Origin: origin }))).toBeNull();
  });
  it.each(["http://localhost:4322", "http://example.com:4321", "null", "", "not a URL"])("rejects mismatching or invalid Origin: %s", (origin) => {
    expect(requireStagingAccess(request(undefined, { Origin: origin }))?.status).toBe(401);
  });
  it("compares effective default ports and does not confuse HTTP 80 with HTTPS 443", () => {
    expect(requireStagingAccess(request("http://localhost/api/staging/list.json", { Origin: "http://127.0.0.1:80" }))).toBeNull();
    expect(requireStagingAccess(request("http://localhost/api/staging/list.json", { Origin: "https://localhost" }))?.status).toBe(401);
    expect(requireStagingAccess(request("https://localhost/api/staging/list.json", { Origin: "https://[::1]:443" }))).toBeNull();
  });
  it("remains unavailable in production, even with valid credentials and opt-in", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireStagingAccess(request())?.status).toBe(404);
    expect(requireStagingAccess(request(undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` }))?.status).toBe(404);
  });
  it.each(["Authorization", "X-Witchclick-Admin-Secret"])("preserves %s token auth when the exemption does not qualify", (header) => {
    vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", "0");
    const value = header === "Authorization" ? `Bearer ${ADMIN_TOKEN}` : ADMIN_TOKEN;
    expect(requireStagingAccess(request("http://example.com/api/staging/preview.json", { [header]: value, Forwarded: "for=proxy", Origin: "http://example.com" }))).toBeNull();
  });
  it("falls through to the existing token configuration error when not opted in", () => {
    vi.stubEnv("ADMIN_API_TOKEN", ""); vi.stubEnv("THEME_ADMIN_TOKEN", ""); vi.stubEnv("DEV_API_TOKEN", "");
    expect(requireStagingAccess(request())).toBeNull();
    vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", "0");
    expect(requireStagingAccess(request())?.status).toBe(500);
  });
  it("uses the exemption in all four staging endpoints without writing fixtures", async () => {
    expect((await listGet({ request: request("http://localhost:4321/api/staging/list.json") })).status).toBe(200);
    // Invalid slugs reach endpoint validation only if the access check passes.
    for (const endpoint of [previewPost, publishPost, deletePost]) {
      const result = await endpoint({ request: makeJsonRequest("http://localhost:4321/api/staging/action.json", { slug: "../invalid" }) });
      expect(result.status).toBe(400);
      expect(await result.json()).toMatchObject({ code: "INVALID_SLUG" });
    }
  });
  it("leaves bundle, generic ingest, curse ingest, and shared policies token-gated", async () => {
    expect(requireMutatingAccess(request())?.status).toBe(401);
    expect(enforceMutatingAccess(request(), "mutating")?.status).toBe(401);
    expect(enforceMutatingAccess(request(), "auth-only")?.status).toBe(401);
    for (const endpoint of [bundlePost, ingestPost, cursesIngestPost]) {
      expect((await endpoint({ request: makeJsonRequest("http://localhost:4321/api/action", {}) })).status).toBe(401);
    }
  });
  it("shows the explicit locked-actions message for 401 and 403 responses", () => {
    const source = fs.readFileSync(new URL("../src/pages/admin/staging.astro", import.meta.url), "utf8");
    const helper = source.match(/function checkStagingAccess\(response\) \{[\s\S]*?\n {10}\}/)![0];
    const check = new Function(`${helper}; return checkStagingAccess;`)() as (response: { status: number }) => void;
    for (const status of [401, 403]) expect(() => check({ status })).toThrow(/Staging actions are locked.*loopback exemption or authorized token authentication/);
    for (const status of [200, 400, 404, 500]) expect(() => check({ status })).not.toThrow();
  });
});
