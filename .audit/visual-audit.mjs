import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = 'http://127.0.0.1:4322';
const routes = [
  '/',
  '/hub',
  '/hub/release',
  '/post/creativity-tarot-ritual',
  '/post/april-full-moon-libra-2026',
  '/post/april-new-moon-aries-2026',
  '/entities',
  '/entities/tarot',
  '/entities/crystal',
  '/entities/herb',
  '/entities/planetaryDay',
  '/entities/tarot/the-magician',
  '/entities/crystal/obsidian',
  '/entities/herb/lavender',
  '/tools',
  '/lab',
  '/start',
  '/search',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile390', width: 390, height: 844 },
];

function safeName(route) {
  return route.replace(/^\//, '').replace(/\//g, '__') || 'home';
}

const browser = await chromium.launch({ headless: true });
const out = [];

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

    const url = `${base}${route}`;
    let status = null;
    let navError = null;

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      status = resp ? resp.status() : null;
      await page.waitForTimeout(700);

      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const doc = document.documentElement;
        const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 0);
        const steps = Math.min(10, Math.max(1, Math.ceil(maxScroll / 600)));
        for (let i = 0; i <= steps; i += 1) {
          const y = Math.round((maxScroll * i) / steps);
          window.scrollTo(0, y);
          await sleep(120);
        }
        window.scrollTo(0, 0);
        await sleep(250);
      });

      await page.waitForTimeout(400);
    } catch (err) {
      navError = String(err?.message || err);
    }

    const diagnostics = await page.evaluate(() => {
      const hiddenReveal = Array.from(document.querySelectorAll('[class*="reveal"], [data-reveal], .reveal, .is-reveal, .js-reveal')).filter((el) => {
        const st = getComputedStyle(el);
        return st.display === 'none' || st.visibility === 'hidden' || Number.parseFloat(st.opacity || '1') < 0.1;
      }).length;

      const headingSnapshots = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 14).map((el) => {
        const st = getComputedStyle(el);
        return {
          text: (el.textContent || '').trim().slice(0, 80),
          tag: el.tagName.toLowerCase(),
          transform: st.textTransform,
          className: el.className || '',
        };
      });

      const h1 = document.querySelector('h1');
      return {
        title: document.title,
        h1: h1 ? (h1.textContent || '').trim() : null,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hiddenReveal,
        headingSnapshots,
        bodyTextSnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
      };
    }).catch(() => null);

    const shotPath = path.join('.audit', 'screens', `${vp.name}__${safeName(route)}.png`);
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

    out.push({ route, viewport: vp.name, status, navError, consoleErrors, pageErrors, diagnostics, screenshot: shotPath });
    await page.close();
  }

  await context.close();
}

await browser.close();
await fs.writeFile('.audit/visual-audit-results.json', JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} route audits to .audit/visual-audit-results.json`);
