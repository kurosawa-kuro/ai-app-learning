// Read-only UI checks after additive seed or seed-reset. Never deletes or creates posts.
const { chromium, expect } = require('@playwright/test');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const baseURL = process.env.SEED_PREVIEW_URL || 'http://127.0.0.1:8080';
  const output = path.join(__dirname, '..', 'test-results', 'seed-preview');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const seedId = number => {
    const bytes = createHash('md5').update(`web-app-template:demo:v1:post:${number}`).digest();
    bytes[6] = (bytes[6] & 15) | 48; bytes[8] = (bytes[8] & 63) | 128;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  const expectedIds = new Set(Array.from({ length: 12 }, (_, i) => seedId(i + 1)));
  const page = await browser.newPage({ baseURL });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/posts');
      const links = [], seen = new Set();
      let pages = 0;
      while (true) {
        pages++;
        const rows = await page.locator('[data-post-id]').evaluateAll(items => items.map(row => ({
          id: row.dataset.postId, title: row.querySelector('.post-list-title').textContent,
          href: row.querySelector('.post-list-title').getAttribute('href')
        })));
        expect(rows.length).toBeLessThanOrEqual(10);
        for (const row of rows) {
          expect(seen.has(row.id)).toBeFalsy(); seen.add(row.id);
          if (expectedIds.has(row.id)) links.push(row);
        }
        await expect(page.locator('.post-pagination')).toBeVisible();
        await page.screenshot({ path: path.join(output, `list-${width}-page-${pages}.png`), fullPage: true, animations: 'disabled' });
        await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
        const next = page.locator('.post-pagination a[rel="next"]');
        if (!await next.count()) break;
        await next.click();
      }
      expect(pages).toBeGreaterThanOrEqual(2);
      expect(links.length).toBe(12);
      await page.locator('.post-pagination a[rel="prev"]').click();
      await expect(page.locator('[data-post-id]').first()).toBeVisible();

      const author = await page.getByLabel('投稿者で絞込み').locator('option').evaluateAll(options =>
        options.find(option => option.textContent === '青木 はるか')?.value);
      if (!author) throw new Error('Sample author not found');
      await page.getByLabel('投稿者で絞込み').selectOption(author);
      await page.getByRole('button', { name: '絞り込む', exact: true }).click();
      expect(await page.locator('[data-post-id]').count()).toBeGreaterThanOrEqual(4);
      await page.goto('/posts');
      for (const item of links) {
        await page.goto(item.href);
        await expect(page.getByRole('heading', { level: 1, name: item.title, exact: true })).toBeVisible();
        await expect(page.locator('.post-body')).toBeVisible();
        await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
        if (await page.locator('.post-image').count()) {
          await expect.poll(() => page.locator('.post-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        }
        if (item === links[0] || item.title.startsWith('AIへの頼み方')) {
          await page.screenshot({ path: path.join(output, `${item === links[0] ? 'featured' : 'long'}-${width}.png`), fullPage: true, animations: 'disabled' });
        }
      }
    }
    expect(errors).toEqual([]);
    console.log('Seed UI passed: all 12 demo posts across multiple pages, filtering, desktop/mobile details; existing user posts allowed.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
