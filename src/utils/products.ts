import fs from "node:fs";
import path from "node:path";

export interface ProductRecord {
  key?: string;
  name?: string;
  brand?: string;
  url?: string;
  utm?: string;
  rel?: string;
  tags?: string[];
  image?: string;
  description?: string;
  summary?: string;
  published?: boolean;
}

interface ProductCatalogDocument {
  products?: ProductRecord[];
}

let cachedProducts: ProductRecord[] | null = null;

function productsFilePath(): string {
  return path.join(process.cwd(), "content", "products.json");
}

export function buildAffiliateTarget(product: ProductRecord | null | undefined): string {
  const base = typeof product?.url === "string" ? product.url.trim() : "";
  if (!isSafeAffiliateTarget(base)) return "";

  const utm = typeof product?.utm === "string" ? product.utm.trim() : "";
  if (!utm) return base;

  return base.includes("?") ? `${base}&${utm}` : `${base}?${utm}`;
}

export function isSafeAffiliateTarget(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function readProductCatalog(): ProductRecord[] {
  if (cachedProducts) {
    return cachedProducts;
  }

  const filePath = productsFilePath();

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as ProductCatalogDocument | ProductRecord[];
    const products = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.products)
        ? parsed.products
        : [];

    cachedProducts = products
      .filter((product): product is ProductRecord => Boolean(product) && typeof product === "object")
      .filter((product) => product.published !== false)
      .map((product) => ({ ...product }));
    return cachedProducts;
  } catch {
    cachedProducts = [];
    return cachedProducts;
  }
}

export function findProductByKey(key: string): ProductRecord | null {
  const normalizedKey = key.trim();
  if (!normalizedKey) return null;

  return readProductCatalog().find((product) => product.key === normalizedKey) ?? null;
}

export function resetProductCatalogCache() {
  cachedProducts = null;
}
