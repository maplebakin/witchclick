import fs from "node:fs";
import path from "node:path";

import {
  EvergreenBlocksSchema as HomeBlocksSchema,
  type EvergreenBlocks,
} from "../../shared/schema/index.js";

export type { EvergreenBlocks } from "../../shared/schema/index.js";

let cachedBlocks: EvergreenBlocks | null = null;
let cachedMtimeMs = 0;

export function readEvergreenBlocks(filePath = path.join(process.cwd(), "content", "blocks", "home.json")): EvergreenBlocks {
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (cachedBlocks && stat && stat.mtimeMs === cachedMtimeMs) {
      return cachedBlocks;
    }

    if (!stat) {
      cachedBlocks = { testimonials: [] };
      cachedMtimeMs = 0;
      return cachedBlocks;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = HomeBlocksSchema.parse(parsed);
    cachedBlocks = data;
    cachedMtimeMs = stat.mtimeMs;
    return data;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[blocks] Failed to load evergreen blocks from ${filePath}:`,
        error
      );
    }
    cachedBlocks = null;
    cachedMtimeMs = 0;
    return { testimonials: [] };
  }
}

export function resetBlocksCache() {
  cachedBlocks = null;
  cachedMtimeMs = 0;
}
