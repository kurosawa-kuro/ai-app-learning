// Read-only UI checks against a running app after seed-reset. Never deletes or submits data.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const baseURL = process.env.SEED_PREVIEW_URL || 'http://127.0.0.1:8080';
  const output = path.join(__dirname, '..', 'test-results', 'seed-preview');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/posts');
      await expect(page.getByRole('heading', { name: '8件の投稿' })).toBeVisible();
      await expect(page.locator('[data-post-id]')).toHaveCount(8);
      await expect(page.locator('[data-post-id]').first()).toContainText('今週は「ひとつ動かす」から始める');
      await page.screenshot({ path: path.join(output, `list-${width}.png`), fullPage: true });
      await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);

      const author = await page.getByLabel('投稿者で絞込み').locator('option').evaluateAll(options =>
        options.find(option => option.textContent === '青木 はるか（サンプル）')?.value);
      if (!author) throw new Error('Sample author not found');
      await page.getByLabel('投稿者で絞込み').selectOption(author);
      await page.getByRole('button', { name: '絞り込む', exact: true }).click();
      await expect(page.locator('[data-post-id]')).toHaveCount(3);
      await page.goto('/posts');
      const links = await page.locator('.post-list-title').evaluateAll(items => items.map(item => ({ title: item.textContent, href: item.getAttribute('href') })));
      for (const item of links) {
        await page.goto(item.href);
        await expect(page.getByRole('heading', { level: 1, name: item.title, exact: true })).toBeVisible();
        await expect(page.locator('.post-body')).toBeVisible();
        await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
        if (await page.locator('.post-image').count()) {
          await expect.poll(() => page.locator('.post-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        }
        if (item === links[0] || item.title.startsWith('AIへの頼み方')) {
          await page.screenshot({ path: path.join(output, `${item === links[0] ? 'featured' : 'long'}-${width}.png`), fullPage: true });
        }
      }
    }
    expect(errors).toEqual([]);
    console.log('Seed UI passed: 8 posts, 3-author filtering, desktop/mobile detail pages, no overflow or browser errors.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
