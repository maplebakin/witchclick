import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { server } from "../dev-api.js";

let baseUrl = "";

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function post(pathname: string, body: unknown, origin?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("local dev API boundaries", () => {
  it("rejects hostile browser origins before routing", async () => {
    const response = await post(
      "/entities/get",
      { type: "crystal", slug: "amethyst" },
      "https://attacker.example",
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows the loopback admin origin but rejects entity path traversal", async () => {
    const response = await post(
      "/entities/get",
      { type: "../..", slug: "package" },
      "http://127.0.0.1:4321",
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:4321",
    );
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("does not rewrite valid JSON string content that resembles a trailing comma", async () => {
    const response = await post("/genprompt", {
      topic: "keep ,} exactly",
      words: 1200,
      ads: "off",
      kofi: "off",
    });
    expect(response.status).toBe(200);
    expect((await response.json()).prompt).toContain("keep ,} exactly");
  });

  it("rejects an upload whose declared image type does not match its bytes", async () => {
    const response = await post("/upload/hero", {
      slug: "security-test",
      filename: "not-an-image.png",
      contentBase64: `data:image/png;base64,${Buffer.from("plain text").toString("base64")}`,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "Image header mismatch" });
  });
});
