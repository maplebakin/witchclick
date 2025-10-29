// tools/src/export.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderMarkdown } from './render';
import { readJSON, writeBufferEnsure, writeFileEnsure } from './utils';

export async function exportCmd(args: string[]) {
  const slug = getArg(args, '--slug');
  const format = getArg(args, '--format', 'html');
  if (!slug) throw new Error('--slug required');

  // --- paths ---
  const CWD = process.cwd();
  const CONTENT_DIR = path.join(CWD, 'content');
  const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
  const SETTINGS_PATH = path.join(CONTENT_DIR, 'settings.json');
  const PRODUCTS_PATH = path.join(CONTENT_DIR, 'products.json');
  const PUBLIC_DIR = path.join(CWD, 'public');
  const HERO_DIR = path.join(PUBLIC_DIR, 'hero-images');
  const DIST_EXPORTS = path.join(CWD, 'dist', 'exports');

  // --- read post ---
  const mdPath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) throw new Error(`post not found: ${slug}`);
  const raw = fs.readFileSync(mdPath, 'utf8');
  const { data, content } = matter(raw);

  // --- settings/products (safe fallbacks) ---
  const settings = readJSON(SETTINGS_PATH) || { siteUrl: 'https://example.com', kofiUsername: '' };
  const productsJson = readJSON(PRODUCTS_PATH) || { products: [] };
  const products = Array.isArray(productsJson.products) ? productsJson.products : [];

  // --- ads: if includeAds === true, use all three slots; else none ---
  const adSlots: ('lead' | 'mid' | 'end')[] = data.includeAds ? ['lead', 'mid', 'end'] : [];

  // --- hero image auto-detect (optional) ---
  const heroFile = findHeroImage(HERO_DIR, slug);
  const heroSrc = heroFile
    ? toAbsoluteUrl(settings.siteUrl, `/hero-images/${path.basename(heroFile)}`)
    : null;
  const heroAlt = heroFile ? String(data.title || 'Hero image') : null;

  // --- render ---
  const htmlBody = renderMarkdown(content, {
    adPlacements: adSlots,
    affiliateAnchors: (data.affiliateAnchors || []).map((a: any) => ({
      key: a.key,
      text: a.text,
    })),
    internalLinks: (data.internalLinks || []).map((l: any) => ({
      slug: l.slug,
      anchor: l.anchor,
    })),
    siteUrl: settings.siteUrl,
    products,
    kofiUsername: settings.kofiUsername || '',
    includeKofi: !!data.includeKofi,
    heroImageSrc: heroSrc,
    heroImageAlt: heroAlt,
  });

  const pageHtml = htmlShell({
    title: String(data.title || ''),
    description: String(data.metaDescription || ''),
    canonical: toAbsoluteUrl(settings.siteUrl, `/post/${slug}`),
    ogImage: heroSrc || '',
    bodyHtml: `<div class="post">${htmlBody}</div>`,
  });

  if (format === 'html') {
    const out = path.join(DIST_EXPORTS, `${slug}.html`);
    writeFileEnsure(out, pageHtml);
    process.stdout.write(`Wrote ${out}\n`);
  } else if (format === 'pdf') {
    const out = path.join(DIST_EXPORTS, `${slug}.pdf`);
    try {
      await renderPdf(pageHtml, out);
      process.stdout.write(`Wrote ${out}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF export failed: ${message}`);
    }
  } else {
    throw new Error('Unknown format');
  }
}

async function renderPdf(html: string, outPath: string) {
  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    throw new Error(
      'Playwright is not installed. Run `npm run tools:export:install` (or `npx playwright install chromium`) and try again.',
    );
  }

  let browser: any = null;
  let page: any = null;
  try {
    browser = await playwright.chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to launch Chromium for PDF rendering. Install the browser binaries with \`npm run tools:export:install\`. (${message})`,
    );
  }

  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    if (typeof page.emulateMedia === 'function') {
      await page.emulateMedia({ media: 'print' }).catch(() => undefined);
    }
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    writeBufferEnsure(outPath, pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed while rendering PDF: ${message}`);
  } finally {
    if (page && typeof page.close === 'function') {
      await page.close().catch(() => undefined);
    }
    if (browser && typeof browser.close === 'function') {
      await browser.close().catch(() => undefined);
    }
  }
}

function getArg(a: string[], k: string, def?: string) {
  const i = a.indexOf(k);
  return i >= 0 ? a[i + 1] : def;
}

function findHeroImage(dir: string, slug: string): string | null {
  const exts = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
  for (const ext of exts) {
    const p = path.join(dir, `${slug}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function toAbsoluteUrl(siteUrl: string, route: string) {
  const base = String(siteUrl || '').replace(/\/$/, '');
  const rel = route.startsWith('/') ? route : `/${route}`;
  return `${base}${rel}`;
}

function htmlShell(opts: {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  bodyHtml: string;
}) {
  const { title, description, canonical, ogImage = '', bodyHtml } = opts;
  const esc = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${esc(title)}</title>`,
    description ? `  <meta name="description" content="${esc(description)}">` : '',
    canonical ? `  <link rel="canonical" href="${esc(canonical)}">` : '',
    // Open Graph / Twitter
    `  <meta property="og:title" content="${esc(title)}">`,
    description ? `  <meta property="og:description" content="${esc(description)}">` : '',
    canonical ? `  <meta property="og:url" content="${esc(canonical)}">` : '',
    ogImage ? `  <meta property="og:image" content="${esc(ogImage)}">` : '',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${esc(title)}">`,
    description ? `  <meta name="twitter:description" content="${esc(description)}">` : '',
    ogImage ? `  <meta name="twitter:image" content="${esc(ogImage)}">` : '',
    // super minimal inline styles so exports aren’t naked
    '  <style>',
    '    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;line-height:1.6;margin:0;background:#fff;color:#111}',
    '    .post{max-width:720px;margin:3rem auto;padding:0 1rem}',
    '    .hero img{display:block;max-width:100%;height:auto;border-radius:12px;margin:0 0 1rem}',
    '    .ad{margin:1.25rem 0;padding:0.75rem;border:1px dashed #ccc;border-radius:10px;background:#fafafa}',
    '    .ad.disclosure{font-size:.9rem}',
    '    h2{margin-top:2rem}',
    '    a{color:#1a73e8;text-decoration:none} a:hover{text-decoration:underline}',
    '    pre{overflow:auto;background:#0b1020;color:#f6f7fb;padding:0.75rem;border-radius:8px}',
    '    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}',
    '  </style>',
    '</head>',
    '<body>',
    bodyHtml,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}
