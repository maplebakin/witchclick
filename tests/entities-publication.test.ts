import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let tempRoot = "";

afterEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("entity public loader", () => {
  it("normalizes object relations and withholds empty records", async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "wc-entities-"));
    const dir = path.join(tempRoot, "content", "entities", "crystal");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "complete.json"),
      JSON.stringify({
        type: "crystal",
        slug: "complete",
        name: "Complete",
        summary: "A reviewed reference.",
        properties: { color: "blue" },
        related: [{ type: "herb", slug: "chamomile" }],
      }),
    );
    await fs.writeFile(
      path.join(dir, "empty.json"),
      JSON.stringify({
        type: "crystal",
        slug: "empty",
        name: "Empty",
        summary: "",
        properties: {},
      }),
    );

    vi.spyOn(process, "cwd").mockReturnValue(tempRoot);
    const { readAllEntities } = await import("../src/utils/entities.js");

    const publicEntities = readAllEntities();
    const publicCrystals = publicEntities.crystal ?? [];
    expect(publicCrystals).toHaveLength(1);
    expect(publicCrystals[0]?.related).toEqual(["herb:chamomile"]);

    const internalEntities = readAllEntities({ includeUnpublished: true });
    const internalCrystals = internalEntities.crystal ?? [];
    expect(internalCrystals).toHaveLength(2);
    expect(internalCrystals.find((entity: any) => entity.slug === "empty")?.isStub).toBe(true);
  });
});
