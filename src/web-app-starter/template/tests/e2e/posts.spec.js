const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

test.beforeEach(({ page }) => {
  // Delete buttons ask for confirmation.
  page.on('dialog', dialog => dialog.accept());
});

test('Picoのローカル資産、サイドバー移動、モバイル表示', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/posts$/);
  for (const asset of ['/vendor/pico/pico.min.css', '/admin-pico/css/admin-theme.css',
    '/admin-pico/css/admin-layout.css', '/admin-pico/css/admin-components.css', '/admin-pico/js/admin.js']) {
    expect((await page.request.get(asset)).status()).toBe(200);
  }
  await expect(page.locator('body')).toHaveClass('admin-body');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--admin-lime-main').trim())).toBe('#a4ff00');
  const menu = page.getByRole('navigation', { name: 'メインメニュー' });
  for (const [label, url, title] of [['新規投稿', /\/posts\/new$/, '新規投稿'], ['投稿者の管理', /\/users$/, '投稿者の管理'], ['投稿一覧', /\/posts$/, '投稿一覧']]) {
    await menu.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(menu.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  // Laptop width keeps the two-column detail layout that admin-pico would otherwise stack.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/users');
  const [table, form] = await page.locator('#content > .admin-card').all();
  expect((await form.boundingBox()).x).toBeGreaterThan((await table.boundingBox()).x + 100);
  await expect(page.locator('.notes-topbar')).toBeHidden();

  for (const [width, height, name] of [[390, 844, 'mobile'], [820, 1180, 'tablet']]) {
    await page.setViewportSize({ width, height });
    await page.goto('/posts');
    const toggle = page.getByRole('button', { name: 'メニュー', exact: true });
    // The closed drawer stays out of the accessibility tree.
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.locator('body')).toHaveAttribute('data-sidebar-open', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.admin-sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    await expect(menu.getByRole('link', { name: '投稿者の管理', exact: true })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`${name}-menu.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-sidebar-open', 'false');
    await expect(toggle).toBeFocused();
    for (const url of ['/posts', '/posts/new', '/users']) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${name} ${url}`).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`${name}${url.replaceAll('/', '-')}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  // Phones navigate with the bottom tab bar.
  await page.setViewportSize({ width: 390, height: 844 });
  const tabs = page.getByRole('navigation', { name: '画面切り替え' });
  for (const [label, url] of [['新規投稿', /\/posts\/new$/], ['投稿者', /\/users$/], ['投稿一覧', /\/posts$/]]) {
    await tabs.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(tabs.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(tabs).toBeHidden();
  await page.goto(`/posts/${randomUUID()}`);
  await expect(page.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('投稿者の作成・選択、投稿フォーム、一覧の絞込み、詳細、削除', async ({ page }, testInfo) => {
  const images = testInfo.project.metadata.images;
  const suffix = randomUUID().slice(0, 8);
  const author = `テスト投稿者-${suffix}`;
  const other = `別の投稿者-${suffix}`;
  const titles = [`メモ-${suffix}`, `写真-${suffix}`];
  const menu = page.getByRole('navigation', { name: 'メインメニュー' });
  const chip = page.getByRole('link', { name: /選択中の投稿者/ });
  const shot = name => page.screenshot({ path: testInfo.outputPath(name), fullPage: true, animations: 'disabled' });
  await page.goto('/users');
  try {
    for (const name of [author, other]) {
      await page.getByLabel('投稿者名', { exact: true }).fill(name);
      await page.getByRole('button', { name: '追加して選択', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText(`投稿者「${name}」を登録し、選択しました。`);
      await expect(chip).toContainText(name);
    }
    await expect(page.locator(`tr[data-author="${other}"]`)).toContainText('選択中');
    await shot('users.png');

    await page.getByRole('button', { name: `${author}で投稿`, exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/new$/);
    await expect(page.getByRole('status')).toHaveText(`投稿者を「${author}」に切り替えました。`);
    await expect(chip).toContainText(author);
    await expect(page.getByLabel('投稿者', { exact: true })).toHaveValue(/.+/);
    await expect(page.getByLabel('投稿者', { exact: true }).locator('option:checked')).toHaveText(author);

    // Server-side validation keeps what was typed.
    await page.getByLabel('タイトル').fill('   ');
    await page.getByLabel('本文').fill('残しておきたい本文');
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('タイトルは1〜120文字');
    await expect(page.getByLabel('本文')).toHaveValue('残しておきたい本文');
    await shot('form-error.png');

    for (const [index, title] of titles.entries()) {
      await menu.getByRole('link', { name: '新規投稿', exact: true }).click();
      // The last used author is remembered.
      await expect(page.getByLabel('投稿者', { exact: true }).locator('option:checked')).toHaveText(author);
      await page.getByLabel('タイトル').fill(title);
      await page.getByLabel('本文').fill('日本語の投稿を保存して、\n詳細画面で確認します。');
      if (images && index === 1) {
        await page.getByLabel('画像', { exact: false }).setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
      } else if (!images) {
        await expect(page.locator('input[type=file]')).toHaveCount(0);
      }
      if (index === 1) await shot('form.png');
      await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
      await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
      await expect(page.getByRole('status')).toHaveText('投稿を保存しました。');
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
    if (images) {
      const image = page.getByRole('img', { name: `${titles[1]}の添付画像` });
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const response = await page.request.get(await image.getAttribute('src'));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }
    await shot('detail.png');

    await menu.getByRole('link', { name: '投稿一覧', exact: true }).click();
    await page.getByLabel('投稿者', { exact: true }).selectOption({ label: other });
    await page.getByRole('button', { name: '絞り込む', exact: true }).click();
    await expect(page.getByText('投稿はまだありません。')).toBeVisible();
    await page.getByLabel('投稿者', { exact: true }).selectOption({ label: author });
    await page.getByRole('button', { name: '絞り込む', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.locator('tbody tr').first()).toContainText(titles[1]);
    await page.reload();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await shot('list.png');
    await page.getByRole('link', { name: titles[0], exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: titles[0] })).toBeVisible();
    await expect(page.locator('.admin-detail-item').first()).toContainText(author);

    if (images) {
      await page.goto('/posts/new');
      await page.getByLabel('タイトル').fill(`拒否-${suffix}`);
      await page.getByLabel('画像', { exact: false }).setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('JPEGまたはPNG');
      await expect(page.getByLabel('タイトル')).toHaveValue(`拒否-${suffix}`);
    }
    // Auth is absent, but cross-site form submission still needs a CSRF token.
    const denied = await page.request.post('/users', { form: { name: `csrf-${suffix}` } });
    expect(denied.status()).toBe(403);
  } finally {
    for (const title of titles) {
      await page.goto('/posts');
      const link = page.getByRole('link', { name: title, exact: true });
      if (!await link.count()) continue;
      await link.click();
      const image = page.locator('.notes-post-image');
      const imagePath = await image.count() ? await image.getAttribute('src') : null;
      await page.getByRole('button', { name: '投稿を削除' }).click();
      await expect(page).toHaveURL(/\/posts$/);
      await expect(page.getByRole('status')).toHaveText('投稿を削除しました。');
      if (imagePath) expect((await page.request.get(imagePath)).status()).toBe(404);
    }
    await page.goto('/users');
    for (const name of [author, other]) {
      const button = page.getByRole('button', { name: `${name}を削除`, exact: true });
      if (await button.count()) {
        await button.click();
        await expect(page.getByRole('status')).toHaveText('投稿者を削除しました。');
      }
    }
  }
});
