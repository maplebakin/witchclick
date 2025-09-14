// tools/src/healthLinks.ts
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fetch } from 'undici';

/* minimal local JSON reader */
function readJSON(p: string) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

type Product = { key?: string; url?: string; utm?: string };

export async function healthLinks() {
  const CWD = process.cwd();
  const settings =
    readJSON(path.join(CWD, 'content', 'settings.json')) || { siteUrl: 'https://example.com' };
  const productsJson = readJSON(path.join(CWD, 'content', 'products.json')) || { products: [] };
  const products: Product[] = Array.isArray(productsJson.products) ? productsJson.products : [];

  const siteUrl = String(settings.siteUrl || '').trim();
  const base = safeBase(siteUrl);

  const targets = new Set<string>();
  if (base) targets.add(base);
  for (const p of products) {
    const u = normalizeUrl(p.url, base, p.utm);
    if (u) targets.add(u);
    if (p.key && base) targets.add(joinUrl(base, `/go/${safeKey(p.key)}`));
  }
  const urls = Array.from(targets);

  const CONCURRENCY = 5;
  const results = await mapLimit(urls, CONCURRENCY, (u) => checkUrl(u));

  process.stdout.write(
    JSON.stringify(
      {
        checked: results.length,
        ok: results.filter((r) => r.ok).length,
        fail: results.filter((r) => !r.ok).length,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}

/* ---------- helpers ---------- */

function safeBase(u?: string) {
  try {
    if (!u) return '';
    const x = new URL(u);
    x.pathname = x.pathname.replace(/\/+$/, '');
    return x.toString();
  } catch {
    return '';
  }
}

function normalizeUrl(u: unknown, base?: string, utm?: string) {
  try {
    if (!u) return '';
    const src = String(u);
    const url = base ? new URL(src, base) : new URL(src);
    if (utm) {
      const extra = new URLSearchParams(utm.startsWith('?') ? utm.slice(1) : utm);
      for (const [k, v] of extra.entries()) url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    return '';
  }
}

function joinUrl(base: string, part: string) {
  try {
    return new URL(part, base).toString();
  } catch {
    return '';
  }
}

function safeKey(v: string) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-');
}

async function checkUrl(url: string) {
  const headers = {
    'user-agent': 'WitchClick-Health/1.0 (+https://witchclick.space)',
    accept: '*/*',
  };

  const started = Date.now();

  // HEAD first (fast), then GET if blocked / fails
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers,
      // Node 18.17+ supports AbortSignal.timeout
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
    });

    if (blocksHead(r.status)) {
      const g = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers,
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
      });
      const time2 = Date.now() - started;
      return {
        url,
        ok: g.status < 400,
        status: g.status,
        method: 'GET',
        finalUrl: g.url, // available on fetch Response
        timeMs: time2,
        note: 'HEAD blocked; used GET',
      };
    }

    const time = Date.now() - started;
    return {
      url,
      ok: r.status < 400,
      status: r.status,
      method: 'HEAD',
      finalUrl: r.url,
      timeMs: time,
    };
  } catch (e: any) {
    // Retry with GET once
    try {
      const g = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers,
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
      });
      const time2 = Date.now() - started;
      return {
        url,
        ok: g.status < 400,
        status: g.status,
        method: 'GET',
        finalUrl: g.url,
        timeMs: time2,
        note: `HEAD error; GET fallback (${e?.message || 'unknown'})`,
      };
    } catch (e2: any) {
      const time = Date.now() - started;
      return {
        url,
        ok: false,
        status: 0,
        method: 'HEAD',
        finalUrl: url,
        timeMs: time,
        error: e2?.message || String(e2),
      };
    }
  }
}

function blocksHead(code: number) {
  return code === 405 || code === 403 || code === 501;
}

// simple promise pool
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (t: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await worker(items[idx]);
      } catch (e: any) {
        results[idx] = {
          url: String((items[idx] as any) || ''),
          ok: false,
          status: 0,
          method: 'HEAD',
          finalUrl: String((items[idx] as any) || ''),
          timeMs: 0,
          error: e?.message || String(e),
        } as any;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}
