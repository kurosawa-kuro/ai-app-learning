// Read-only acceptance check of the actual app's two image-bearing demo posts.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const baseURL = process.env.SEED_PREVIEW_URL || 'http://127.0.0.1:8080';
  const output = path.join(__dirname, '..', 'test-results', 'post-images-preview');
  fs.mkdirSync(output, { recursive: true });
  const ids = ['3a630dd0-51b3-3fc8-90be-1ce0664ffe31', '0d00a32a-34f0-3d13-81ba-d44af9286594'];
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ids) {
        const imageResponse = await page.request.get(`/posts/${id}/image`);
        expect(imageResponse.status()).toBe(200);
        expect(imageResponse.headers()['content-type']).toContain('image/png');
        await page.goto(`/posts/${id}`);
        await expect.poll(() => page.locator('.post-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
        await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
        await page.screenshot({ path: path.join(output, `detail-${id}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
      // Search pages as the feed grows; don't assume both demo posts are on page 1.
      let next = '/posts';
      const found = new Set();
      while (next && found.size < ids.length) {
        await page.goto(next);
        for (const id of ids) {
          const row = page.locator(`[data-post-id="${id}"]`);
          if (!await row.count()) continue;
          const thumbnail = row.locator('.post-thumbnail img');
          await thumbnail.scrollIntoViewIfNeeded();
          await expect.poll(() => thumbnail.evaluate(image => image.complete && image.naturalWidth > 0)).toBeTruthy();
          found.add(id);
        }
        await page.screenshot({ path: path.join(output, `list-${width}-${found.size}.png`), fullPage: true, animations: 'disabled' });
        const link = page.locator('.post-pagination a[rel="next"]');
        next = await link.count() ? await link.getAttribute('href') : null;
      }
      expect(found.size).toBe(ids.length);
    }
    console.log('Actual app verified: both demo images load in list and detail at 1280px and 390px.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
