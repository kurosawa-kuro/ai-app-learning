const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { saveFeatures, confirmDelete } = require('../settings-helper');

test('管理画面・機能設定の共有・デフォルトユーザー・選択の優先順位', async ({ page, browser }, testInfo) => {
  const images = testInfo.project.metadata.images;
  const name = `管理検証-${randomUUID().slice(0, 8)}`;
  const other = `選択検証-${randomUUID().slice(0, 8)}`;
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/admin/users');
  const originalDefault = await page.getByLabel('デフォルトユーザー', { exact: true }).inputValue();
  const fresh = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const visitor = await fresh.newPage();
  try {
    for (const user of [name, other]) {
      await page.getByLabel('投稿者名', { exact: false }).fill(user);
      await page.getByRole('button', { name: '追加して選択', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(user);
    }
    await page.getByLabel('デフォルトユーザー', { exact: true }).selectOption({ label: name });
    await page.getByRole('button', { name: 'デフォルトを保存', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('デフォルトユーザーを保存しました。');
    await page.goto('/posts/new');
    await expect(page.locator('#userId option:checked')).toHaveText(other);
    await expect(page.getByRole('region', { name: '選択中のユーザー' })).toContainText(other);
    await visitor.goto('/posts/new');
    await expect(visitor.locator('#userId option:checked')).toHaveText(name);
    await expect(visitor.getByRole('region', { name: '選択中のユーザー' })).toContainText(name);
    const selectedUser = page.getByRole('region', { name: '選択中のユーザー' });
    const sidebar = await page.locator('#sidebar').boundingBox();
    const userPanel = await selectedUser.boundingBox();
    expect(userPanel.y).toBeGreaterThan(sidebar.y + sidebar.height / 2);
    await selectedUser.getByRole('button', { name: /選択中のユーザー/ }).click();
    await page.getByRole('dialog', { name: 'ユーザーを切り替え' }).getByRole('link', { name: 'ユーザーの追加・管理' }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'メニュー', exact: true }).click();
    await expect(selectedUser).toBeInViewport();
    await expect(selectedUser).toContainText(other);
    await page.screenshot({ path: testInfo.outputPath('selected-user-mobile.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: 800 });
    await saveFeatures(page, images, true);
    await visitor.goto('/admin/settings');
    await expect(visitor.getByRole('switch', { name: 'AI連携を許可する' })).toBeChecked();
    await expect(visitor.getByText('このテンプレートにはAI処理・接続先はまだありません。', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('switch', { name: 'AI連携を許可する' })).toBeChecked();
    await page.getByRole('switch', { name: 'AI連携を許可する' }).uncheck();
    await page.getByRole('button', { name: '変更を取り消す' }).click();
    await expect(page.getByRole('switch', { name: 'AI連携を許可する' })).toBeChecked();
    expect((await page.request.post('/admin/settings', { form: { aiIntegration: 'false' } })).status()).toBe(403);
    await page.goto('/admin');
    await page.getByRole('button', { name: '機能管理を開く' }).click();
    for (const width of [390, 820, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const content = await page.locator('.admin-content').boundingBox();
      const header = await page.locator('.ui-page-header').boundingBox();
      expect(content.width).toBeLessThanOrEqual(800);
      expect(Math.abs(header.x - content.x)).toBeLessThan(1);
      await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`), fullPage: true, animations: 'disabled' });
    }
  } finally {
    await fresh.close();
    await saveFeatures(page, images, false);
    await page.goto('/admin/users');
    await page.getByLabel('デフォルトユーザー', { exact: true }).selectOption(originalDefault);
    await page.getByRole('button', { name: 'デフォルトを保存', exact: true }).click();
    for (const user of [name, other]) {
      await page.getByRole('button', { name: `${user}を削除`, exact: true }).click();
      await confirmDelete(page);
      await expect(page.getByRole('status')).toHaveText('投稿者を削除しました。');
    }
  }
});

test('画像禁止は古いフォームでも拒否し、保存済み画像の表示と削除は維持する', async ({ page, context }, testInfo) => {
  test.skip(!testInfo.project.metadata.images, '実Storageを使用するケース');
  const name = `画像設定-${randomUUID().slice(0, 8)}`;
  const control = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  const title = `${name}の投稿`;
  try {
    await saveFeatures(control, true);
    await page.goto('/admin/users');
    await page.getByLabel('投稿者名', { exact: false }).fill(name);
    await page.getByRole('button', { name: '追加して選択', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(name);
    await page.goto('/posts/new');
    await page.getByLabel('タイトル').fill(title);
    await page.locator('#image').setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
    await saveFeatures(control, false);
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page.locator('[data-post-error]')).toContainText('画像投稿はOFF');
    await expect(page.getByLabel('タイトル')).toHaveValue(title);
    await expect(page.locator('#image')).toBeVisible();
    await saveFeatures(control, true);
    await page.goto('/posts/new');
    await page.getByLabel('タイトル').fill(title);
    await page.locator('#image').setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
    const detail = page.url();
    await saveFeatures(control, false);
    await page.goto(detail);
    const image = page.getByRole('img', { name: `${title}の添付画像` });
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.locator('.ui-danger-zone summary').click();
    await page.getByRole('button', { name: '投稿を削除' }).click();
    await confirmDelete(page);
    await expect(page.getByRole('status')).toHaveText('投稿を削除しました。');
  } finally {
    await saveFeatures(control, true);
    await page.goto('/posts');
    const link = page.getByRole('link', { name: title, exact: true });
    if (await link.count()) {
      await link.click();
      await page.locator('.ui-danger-zone summary').click();
    await page.getByRole('button', { name: '投稿を削除' }).click();
    await confirmDelete(page);
      await expect(page.getByRole('status')).toHaveText('投稿を削除しました。');
    }
    await page.goto('/admin/users');
    const remove = page.getByRole('button', { name: `${name}を削除`, exact: true });
    if (await remove.count()) {
      await remove.click();
      await confirmDelete(page);
      await expect(page.getByRole('status')).toHaveText('投稿者を削除しました。');
    }
    await control.close();
  }
});
