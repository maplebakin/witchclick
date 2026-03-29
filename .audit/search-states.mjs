import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
for (const vp of [{ name: 'desktop', width: 1440, height: 1100 }, { name: 'mobile390', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/search', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const input = page.locator('#search-query');

  await input.fill('zzzzzz-no-match');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `.audit/screens/${vp.name}__search__empty.png`, fullPage: true });

  const emptyState = await page.evaluate(() => ({
    loadingHidden: document.getElementById('search-loading')?.classList.contains('hidden') ?? null,
    emptyHidden: document.getElementById('search-empty')?.classList.contains('hidden') ?? null,
    emptyText: document.getElementById('search-empty')?.textContent?.trim() ?? null,
    resultCount: document.querySelectorAll('#search-results a[href^="/post/"]').length,
    resultClass: document.getElementById('search-results')?.className ?? '',
  }));

  await input.fill('tarot');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `.audit/screens/${vp.name}__search__results.png`, fullPage: true });

  const resultsState = await page.evaluate(() => ({
    loadingHidden: document.getElementById('search-loading')?.classList.contains('hidden') ?? null,
    emptyHidden: document.getElementById('search-empty')?.classList.contains('hidden') ?? null,
    emptyText: document.getElementById('search-empty')?.textContent?.trim() ?? null,
    resultCount: document.querySelectorAll('#search-results a[href^="/post/"]').length,
    resultClass: document.getElementById('search-results')?.className ?? '',
    sample: Array.from(document.querySelectorAll('#search-results a[href^="/post/"] h2')).slice(0,5).map((h)=>h.textContent?.trim()),
  }));

  console.log(vp.name, { emptyState, resultsState });
  await context.close();
}
await browser.close();
