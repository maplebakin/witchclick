import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { APIContext } from "astro";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

let tempDir: string;
let cwdSpy: MockInstance<() => string> | undefined;

async function setupTempSettings() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-aff-click-"));
  await fs.mkdir(path.join(tempDir, "content"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd");
  cwdSpy.mockReturnValue(tempDir);
  vi.resetModules();
}

async function teardownTempSettings() {
  if (cwdSpy) {
    cwdSpy.mockRestore();
    cwdSpy = undefined;
  }
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  vi.resetModules();
}

async function writeSettings(overrides: Record<string, any>) {
  const settingsPath = path.join(tempDir, "content", "settings.json");
  const data: Record<string, any> = {
    siteUrl: "https://witch.click",
    analytics: { enabled: false },
    ...overrides,
  };
  if (overrides.analytics) {
    data.analytics = { enabled: false, ...overrides.analytics };
  }
  await fs.writeFile(settingsPath, JSON.stringify(data), "utf8");
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/affiliate-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

function createContext(request: Request): APIContext {
  const url = new URL(request.url);

  return {
    request,
    url,
    originPathname: url.pathname,
    params: {},
    routePattern: url.pathname,
    props: {} as APIContext["props"],
    site: undefined,
    generator: "tests",
    redirect: () => {
      throw new Error("redirect not implemented in tests");
    },
    rewrite: async () => new Response(null, { status: 501 }),
    locals: {} as APIContext["locals"],
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    currentLocale: undefined,
    isPrerendered: false,
    clientAddress: "127.0.0.1",
    csp: {
      insertDirective: () => {},
      insertStyleResource: () => {},
      insertStyleHash: () => {},
      insertScriptResource: () => {},
      insertScriptHash: () => {},
    },
    cookies: {
      get: () => undefined,
      has: () => false,
      set: () => {},
      delete: () => {},
      merge: () => {},
      headers: () => ([] as string[])[Symbol.iterator]() as Generator<string, void, unknown>,
    } as unknown as APIContext["cookies"],
    getActionResult: () => undefined,
    callAction: async () => {
      throw new Error("actions not implemented in tests");
    },
  };
}

describe("affiliate click API", () => {
  beforeEach(async () => {
    await setupTempSettings();
  });

  afterEach(async () => {
    await teardownTempSettings();
    vi.restoreAllMocks();
  });

  it("forwards events when an endpoint is configured", async () => {
    await writeSettings({
      analytics: { enabled: true, endpoint: "https://example.test/collect", domain: "witch.click" },
    });

    const fetchSpy = vi
      .spyOn(globalThis as any, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));

    const { POST } = await import("../src/pages/api/affiliate-click.json.ts");

    const response = await POST(
      createContext(makeRequest({ url: "https://merchant.example/item", ts: "2024-01-01T00:00:00Z" })),
    );

    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.forwarded).toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstCall = fetchSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [endpoint, init] = firstCall!;
    expect(endpoint).toBe("https://example.test/collect");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String((init as any).body))).toMatchObject({ url: "https://merchant.example/item" });

    fetchSpy.mockRestore();
  });

  it("rejects invalid timestamps", async () => {
    await writeSettings({
      analytics: { enabled: true, endpoint: "https://example.test/collect", domain: "witch.click" },
    });

    const { POST } = await import("../src/pages/api/affiliate-click.json.ts");
    const response = await POST(
      createContext(makeRequest({ url: "https://merchant.example/item", ts: "not-a-date" })),
    );

    expect(response.status).toBe(422);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("ts");
  });

  it("acknowledges events when analytics is disabled", async () => {
    await writeSettings({ analytics: { enabled: false } });

    const { POST } = await import("../src/pages/api/affiliate-click.json.ts");
    const response = await POST(
      createContext(makeRequest({ url: "https://merchant.example/item", ts: "2024-01-01T00:00:00Z" })),
    );

    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.forwarded).toBe(false);
    expect(payload.reason).toBe("analytics_disabled");
  });
});
