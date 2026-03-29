import * as fs from 'node:fs';
import * as path from 'node:path';

type Product = { key?: string; url?: string; utm?: string };
type ProductCatalog = { products: Product[] };

function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function ensureDir(filePath: string): void {
  fs.mkdirSync(filePath, { recursive: true });
}

function withUtm(url: string, utm?: string): string {
  if (!url) return '/';
  if (!utm) return url;
  return url.includes('?') ? `${url}&${utm}` : `${url}?${utm}`;
}

export function buildAffiliateRedirects(cwd = process.cwd()): number {
  const products = readJSON<ProductCatalog>(path.join(cwd, 'content', 'products.json'));

  if (!products || !Array.isArray(products.products)) {
    throw new Error('[go:build] Invalid or missing content/products.json');
  }

  const lines: string[] = [];
  lines.push('/admin      /404  404');
  lines.push('/admin/*    /404  404');

  for (const product of products.products) {
    const key = (product.key || '').trim();
    if (!key) continue;
    const target = withUtm(String(product.url || '').trim(), String(product.utm || '').trim());
    lines.push(`/go/${key}    ${target || '/'}   302`);
  }

  const outDir = path.join(cwd, 'public');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, '_redirects'), `${lines.join('\n')}\n`, 'utf8');

  return products.products.length;
}

export function goBuild(): void {
  const count = buildAffiliateRedirects();
  process.stdout.write(
    `[go:build] wrote ${path.join('public', '_redirects')} with ${count} entries\n`,
  );
}
