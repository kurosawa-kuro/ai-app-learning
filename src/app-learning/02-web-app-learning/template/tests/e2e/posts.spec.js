const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { page.on('dialog', dialog => dialog.accept()); });
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { saveFeatures, deletePost, deleteUser } = require('../settings-helper');

test.beforeEach(async ({ page }, info) => { await saveFeatures(page, info.project.metadata.images); });

test('共通UI・画面幅・ナビゲーション・モバイルとキーボード', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const asset of ['/vendor/pico/pico.min.css', '/ui/photo-diary-theme.css', '/ui/favicon.svg', '/ui/ui.css', '/ui/ui.js', '/features/authors/user-selection.js', '/features/posts/posts.css', '/features/posts/posts.js']) {
    expect((await page.request.get(asset)).status()).toBe(200);
  }
  const kinds = [['/posts', 1200], ['/posts/new', 800], ['/admin/users', 1200], ['/admin/settings', 800], ['/admin', 1200], ['/examples/skill-janken', 960]];
  for (const width of [390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [url, maxWidth] of kinds) {
      await page.goto(url);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${url} at ${width}`).toBeLessThanOrEqual(width);
      const bounds = await page.locator('.ui-page').boundingBox();
      expect(bounds.width).toBeLessThanOrEqual(maxWidth);
      const heading = await page.locator('.ui-page-header').boundingBox();
      const content = await page.locator('.admin-content').boundingBox();
      expect(Math.abs(heading.x - content.x)).toBeLessThan(1);
      expect(Math.abs(heading.width - content.width)).toBeLessThan(1);
      await page.screenshot({ path: info.outputPath(`${width}${url.replaceAll('/', '-')}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/posts');
  const nav = page.getByRole('navigation', { name: 'メインメニュー' });
  await expect(nav).toBeHidden();
  const toggle = page.getByRole('button', { name: 'メニュー', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#main')).toHaveAttribute('inert', '');
  await expect(page.locator('#sidebar .ui-brand')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.ui-user-trigger')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(nav.getByRole('link', { name: 'ユーザー管理', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: '機能管理', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '管理・設定', exact: true }).click();
  await page.getByRole('dialog', { name: '管理・設定' }).getByRole('link', { name: 'ユーザー管理', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByRole('link', { name: '管理画面へ戻る' }).click();
  await page.getByRole('button', { name: '機能管理を開く' }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await toggle.click();
  await page.getByRole('button', { name: '管理・設定', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '管理・設定' }).getByRole('link', { name: '機能管理', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goto('/examples/skill-janken');
  await expect(page.locator('#sidebar')).toHaveCount(0);
  await expect(page.getByText('選択中の投稿者')).toHaveCount(0);
  await page.goto(`/posts/${randomUUID()}`);
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('投稿者の一か所での変更・入力保持・1対多・詳細・絞込み・削除確認', async ({ page }, info) => {
  const images = info.project.metadata.images;
  const suffix = randomUUID().slice(0, 8), author = `投稿者-${suffix}`, other = `別の投稿者-${suffix}`;
  const titles = [`メモ-${suffix}`, `写真-${suffix}`];
  try {
    await page.goto('/posts/new');
    await page.getByLabel('タイトル', { exact: false }).fill(titles[0]);
    await page.getByRole('textbox', { name: '本文 任意', exact: true }).fill('入力中も投稿者を変更できます。');
    // Inline creation never navigates away from the draft.
    const picker = page.locator('#author-picker');
    if (!await picker.getAttribute('open')) await picker.locator('summary').click();
    for (const name of [author, other]) {
      if (!await picker.evaluate(el => el.open)) await picker.locator('summary').click();
      await page.getByLabel('新しい投稿者名').fill(name);
      await page.getByRole('button', { name: '追加してこの投稿で使う' }).click();
      await expect(page.locator('[data-author-name]')).toHaveText(name);
    }
    await expect(page.getByLabel('タイトル', { exact: false })).toHaveValue(titles[0]);
    await expect(page.getByRole('textbox', { name: '本文 任意', exact: true })).toHaveValue('入力中も投稿者を変更できます。');
    await picker.locator('summary').click();
    await page.locator('#userId').selectOption({ label: author });
    await expect(page.locator('[data-author-name]')).toHaveText(author);
    await page.getByLabel('タイトル', { exact: false }).fill('   ');
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page.locator('[data-post-error]')).toContainText('タイトルは1〜120文字');
    await expect(page.locator('#title')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#body')).toHaveValue('入力中も投稿者を変更できます。');
    for (const [index, title] of titles.entries()) {
      if (index) await page.goto('/posts/new');
      await expect(page.locator('[data-author-name]')).toHaveText(author);
      await page.locator('#title').fill(title);
      await page.locator('#body').fill('日本語の長文を読みやすく表示します。\n'.repeat(index ? 200 : 2));
      if (images && index) {
        await page.locator('#image').setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
        await expect.poll(() => page.locator('[data-image-preview]').evaluate(img => !img.hidden && img.complete && img.naturalWidth > 0)).toBeTruthy();
      }
      if (!images) await expect(page.locator('#image')).toHaveCount(0);
      await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
      await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
      await expect(page.locator('.ui-notice[role="status"]')).toHaveText('投稿を保存しました。');
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('#metadata')).toContainText(author);
      expect((await page.locator('.ui-prose').boundingBox()).width).toBeLessThanOrEqual(640);
    }
    if (images) {
      await expect.poll(() => page.locator('.post-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.goto('/posts');
      const thumbnail = page.getByRole('button', { name: titles[1] + 'の画像を拡大', exact: true }).locator('img');
      await expect.poll(() => thumbnail.evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
      await page.screenshot({ path: info.outputPath('post-thumbnails.png'), fullPage: true, animations: 'disabled' });
      await page.locator('.post-list-title').filter({ hasText: titles[1] }).click();
    }
    await page.screenshot({ path: info.outputPath('detail-long.png'), fullPage: true, animations: 'disabled' });
    await page.locator('.ui-danger-zone summary').click();
    await page.getByRole('button', { name: '投稿を削除' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
    await expect(dialog).toContainText(titles[1]);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: '投稿を削除' })).toBeFocused();
    await page.goto('/posts');
    await page.getByLabel('投稿者で絞込み', { exact: true }).selectOption({ label: other });
    await page.getByRole('button', { name: '絞り込む' }).click();
    await expect(page.getByRole('heading', { name: '条件に合う投稿はありません' })).toBeVisible();
    await page.goto('/posts/new');
    await expect(page.locator('[data-author-name]')).toHaveText(author);
    await page.goto('/posts');
    await page.getByLabel('投稿者で絞込み', { exact: true }).selectOption({ label: author });
    await page.getByRole('button', { name: '絞り込む' }).click();
    await expect(page.locator('[data-post-id]')).toHaveCount(2);
    await page.reload(); await expect(page.locator('[data-post-id]')).toHaveCount(2);
    expect((await page.request.post('/admin/users', { form: { name: 'csrf-test' } })).status()).toBe(403);
    if (images) {
      await page.goto('/posts/new');
      await page.locator('#title').fill('拒否テスト');
      await page.locator('#image').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
      await page.getByRole('button', { name: '投稿を保存' }).click();
      await expect(page.locator('#image-error')).toContainText('JPEGまたはPNG');
      await expect(page.locator('#title')).toHaveValue('拒否テスト');
    }
  } finally {
    for (const title of titles) await deletePost(page, title);
    for (const name of [author, other]) await deleteUser(page, name);
  }
});

test('通信失敗・保存中の二重送信抑止・容量超過時も下書きを保持', async ({ page }, info) => {
  const name = `通信検証-${randomUUID().slice(0, 8)}`, title = `${name}の投稿`;
  try {
    await page.goto('/admin/users');
    await page.getByLabel('投稿者名', { exact: false }).fill(name);
    await page.getByRole('button', { name: '追加して選択', exact: true }).click();
    await expect(page.locator('.ui-notice[role="status"]')).toContainText(name);
    await page.goto('/posts/new');
    await page.locator('#title').fill(title); await page.locator('#body').fill('失わない本文');
    await page.route('**/posts', route => route.request().method() === 'POST' ? route.abort() : route.continue());
    await page.getByRole('button', { name: '投稿を保存' }).click();
    await expect(page.locator('[data-post-error]')).toContainText('通信が途切れました');
    await expect(page.locator('#body')).toHaveValue('失わない本文');
    await page.unroute('**/posts');
    if (info.project.metadata.images) {
      await page.locator('#image').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
      await page.getByRole('button', { name: '投稿を保存' }).click();
      await expect(page.locator('#image-error')).toContainText('5MB');
      await expect(page.locator('#body')).toHaveValue('失わない本文');
      await page.getByRole('button', { name: '画像の選択を解除' }).click();
    }
    let release, calls = 0;
    const gate = new Promise(resolve => release = resolve);
    await page.route('**/posts', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      calls++; await gate; await route.continue();
    });
    await page.getByRole('button', { name: '投稿を保存' }).click();
    try { await expect(page.getByRole('button', { name: '保存中…' })).toBeDisabled(); }
    finally { release(); }
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
    expect(calls).toBe(1);
    await page.unroute('**/posts');
  } finally { await page.unroute('**/posts'); await deletePost(page, title); await deleteUser(page, name); }
});
