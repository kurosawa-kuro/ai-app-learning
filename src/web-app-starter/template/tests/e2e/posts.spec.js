const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

test('Picoのローカル資産とモバイルメニュー', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
  for (const asset of ['/vendor/pico/pico.min.css', '/admin-pico/css/admin-theme.css',
    '/admin-pico/css/admin-layout.css', '/admin-pico/css/admin-components.css', '/admin-pico/js/admin.js']) {
    expect((await page.request.get(asset)).status()).toBe(200);
  }
  await expect(page.locator('body')).toHaveClass('admin-body');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--admin-lime-main').trim())).toBe('#a4ff00');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'メニュー', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-sidebar-open', 'true');
  await expect(page.locator('.admin-sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.getByLabel('投稿者名', { exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('mobile-menu.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-sidebar-open', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('認証なしで投稿者1人に複数投稿、絞込み、画像オプション、削除', async ({ page }, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  const author = `テスト投稿者-${suffix}`;
  const other = `別の投稿者-${suffix}`;
  const titles = [`メモ-${suffix}`, `写真-${suffix}`];
  await page.goto('/');
  await expect(page).toHaveTitle('投稿ノート');
  await expect(page.getByRole('heading', { name: 'ひとつの投稿から、始めよう。' })).toBeVisible();
  try {
    for (const name of [author, other]) {
      await page.getByLabel('投稿者名', { exact: true }).fill(name);
      await page.getByRole('button', { name: '追加', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('投稿者を登録しました。');
    }
    for (const [index, title] of titles.entries()) {
      await page.getByLabel('投稿者', { exact: true }).selectOption({ label: author });
      await page.getByLabel('タイトル').fill(title);
      await page.getByLabel('本文').fill('日本語の投稿を保存して、再読込後も確認します。');
      if (testInfo.project.metadata.images && index === 1) {
        await page.getByLabel('画像', { exact: false }).setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
      } else if (!testInfo.project.metadata.images) {
        await expect(page.locator('input[type=file]')).toHaveCount(0);
      }
      await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('投稿を保存しました。');
    }
    await page.reload();
    await expect(page.locator(`article[data-author="${author}"]`)).toHaveCount(2);
    if (testInfo.project.metadata.images) {
      const image = page.getByRole('img', { name: `${titles[1]}の添付画像` });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const response = await page.request.get(await image.getAttribute('src'));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }
    await page.locator(`.author-row[data-author="${other}"] a`).click();
    await expect(page.locator('article.post')).toHaveCount(0);
    await page.locator(`.author-row[data-author="${author}"] a`).click();
    await expect(page.locator('article.post')).toHaveCount(2);
    if (testInfo.project.metadata.images) {
      const image = page.getByRole('img', { name: `${titles[1]}の添付画像` });
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('posts.png'), fullPage: true, animations: 'disabled' });
    if (testInfo.project.metadata.images) {
      await page.getByLabel('タイトル').fill(`拒否-${suffix}`);
      await page.getByLabel('画像', { exact: false }).setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('JPEGまたはPNG');
      await expect(page.getByRole('heading', { name: `拒否-${suffix}` })).toHaveCount(0);
    }
    // Auth is absent, but cross-site form submission still needs a CSRF token.
    const denied = await page.request.post('/users', { form: { name: `csrf-${suffix}` } });
    expect(denied.status()).toBe(403);
  } finally {
    await page.goto('/');
    for (const title of titles) {
      const post = page.locator('article.post').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      if (await post.count()) {
        const image = post.locator('img');
        const imagePath = await image.count() ? await image.getAttribute('src') : null;
        await post.getByRole('button', { name: '投稿を削除' }).click();
        await expect(page.getByRole('status')).toHaveText('投稿を削除しました。');
        if (imagePath) expect((await page.request.get(imagePath)).status()).toBe(404);
      }
    }
    for (const name of [author, other]) {
      const button = page.getByRole('button', { name: `${name}を削除`, exact: true });
      if (await button.count()) {
        await button.click();
        await expect(page.getByRole('status')).toHaveText('投稿者を削除しました。');
      }
    }
  }
});
