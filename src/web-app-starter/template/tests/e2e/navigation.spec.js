const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const { deleteUser } = require('../settings-helper');

test('ユーザー切替ポップアップ・入力保持・管理メニュー・モバイル操作', async ({ page, context }, info) => {
  const names = [`切替A-${randomUUID().slice(0, 6)}`, `切替B-${randomUUID().slice(0, 6)}`];
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const popup = page.getByRole('dialog', { name: 'ユーザーを切り替え', exact: true });
  const trigger = page.locator('.ui-user-trigger');
  try {
    await page.goto('/admin/users');
    const defaultValue = await page.getByLabel('デフォルトユーザー', { exact: true }).inputValue();
    for (const name of names) {
      await page.getByLabel('投稿者名', { exact: false }).fill(name);
      await page.getByRole('button', { name: '追加して選択', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(name);
    }
    await page.goto('/posts/new');
    await page.locator('#title').fill('消さない下書き');
    await page.locator('#body').fill('本文も保持\n二行目');
    const file = page.locator('#image');
    if (await file.count()) await file.setInputFiles({ name: 'draft.png', mimeType: 'image/png', buffer: Buffer.from('draft attachment') });
    await trigger.click();
    await expect(popup).toBeVisible();
    await expect(popup.getByLabel('ユーザーを検索')).toBeFocused();
    await popup.getByLabel('ユーザーを検索').fill(names[0]);
    await popup.getByRole('button', { name: names[0], exact: true }).click();
    await expect(popup).toBeHidden();
    await expect(trigger).toContainText(names[0]);
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(/\/posts\/new$/);
    await expect(page.locator('#title')).toHaveValue('消さない下書き');
    await expect(page.locator('#body')).toHaveValue('本文も保持\n二行目');
    await expect(page.locator('#userId option:checked')).toHaveText(names[0]);
    if (await file.count()) expect(await file.evaluate(el => el.files[0].name)).toBe('draft.png');
    const selectedId = await page.locator('#userId').inputValue();
    expect((await context.cookies()).find(cookie => cookie.name === 'currentAuthor').value).toBe(selectedId);
    expect((await page.request.post('/admin/current-user', { form: { userId: selectedId } })).status()).toBe(403);

    await trigger.click();
    await expect(popup.getByRole('button', { name: `${names[0]} 選択中` })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: info.outputPath('user-popup-desktop.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(popup).toBeHidden();

    await page.route('**/admin/current-user', route => route.request().method() === 'POST' ? route.abort() : route.continue());
    await trigger.click();
    await popup.getByRole('button', { name: names[1], exact: true }).click();
    await expect(popup.getByRole('alert')).toContainText('確認できません');
    await expect(trigger).toContainText(names[0]);
    await expect(page.locator('#title')).toHaveValue('消さない下書き');
    await page.keyboard.press('Escape');
    await page.unroute('**/admin/current-user');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'メニュー', exact: true }).click();
    await trigger.click();
    await expect(popup).toBeInViewport();
    await expect(popup.getByRole('button', { name: names[1], exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('user-popup-mobile.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('button', { name: 'メニュー', exact: true })).toHaveAttribute('aria-expanded', 'true');
    const manage = page.getByRole('button', { name: '管理・設定', exact: true });
    await manage.click();
    const management = page.getByRole('dialog', { name: '管理・設定', exact: true });
    await expect(management).toBeInViewport();
    await expect(management.getByRole('link', { name: 'CSVエクスポート' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('management-popup-mobile.png'), animations: 'disabled' });
    await management.getByRole('link', { name: 'ユーザー管理', exact: true }).click();
    await expect(page.getByLabel('デフォルトユーザー', { exact: true })).toHaveValue(defaultValue);
    await expect(page.locator('.ui-user-trigger')).toContainText(names[0]);
    expect(errors).toEqual([]);
  } finally {
    await page.unroute('**/admin/current-user');
    for (const name of names) await deleteUser(page, name);
  }
});
