const { expect } = require('@playwright/test');

async function saveFeatures(page, images, ai = false) {
  await page.goto('/admin/settings');
  await page.getByRole('switch', { name: '画像投稿を許可する' }).setChecked(images);
  await page.getByRole('switch', { name: 'AI連携を許可する' }).setChecked(ai);
  await page.getByRole('button', { name: '設定を保存', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('機能設定を保存しました。');
}
async function confirmDelete(page) {
  await page.getByRole('dialog').getByRole('button', { name: '削除する', exact: true }).click();
}
async function deletePost(page, title) {
  await page.goto('/posts');
  const link = page.getByRole('link', { name: title, exact: true });
  if (!await link.count()) return;
  await link.click();
  await page.locator('.ui-danger-zone summary').click();
  const image = page.locator('.post-image');
  const imagePath = await image.count() ? await image.getAttribute('src') : null;
  await page.getByRole('button', { name: '投稿を削除', exact: true }).click();
  await confirmDelete(page);
  await expect(page.getByRole('status')).toHaveText('投稿を削除しました。');
  if (imagePath) expect((await page.request.get(imagePath)).status()).toBe(404);
}
async function deleteUser(page, name) {
  await page.goto('/admin/users');
  const button = page.getByRole('button', { name: `${name}を削除`, exact: true });
  if (!await button.count()) return;
  await button.click(); await confirmDelete(page);
  await expect(page.getByRole('status')).toHaveText('投稿者を削除しました。');
}
module.exports = { saveFeatures, confirmDelete, deletePost, deleteUser };
