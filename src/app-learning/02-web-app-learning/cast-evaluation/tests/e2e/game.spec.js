const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { page.on('dialog', dialog => dialog.accept()); });

test('ゲームは選択と決定を分け、結果から次の対戦へ戻れる', async ({ page }, info) => {
  // Only one project is needed: this page has no post/user/storage dependency.
  test.skip(info.project.metadata.images, '共通UI検証は画像OFFプロジェクトで実行');
  await page.addInitScript(() => Math.random = () => 0); // CPU = rock, a fixed preview fixture.
  await page.goto('/examples/skill-janken');
  await expect(page.locator('#sidebar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'この手でじゃんけん！' })).toBeDisabled();
  await page.getByLabel('2. スキル').selectOption('win');
  await page.getByRole('radio', { name: 'パー' }).check();
  await expect(page.locator('#game-result')).toBeHidden();
  await page.getByRole('button', { name: 'この手でじゃんけん！' }).click();
  await expect(page.locator('#game-result')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'あなたの勝ち！' })).toBeVisible();
  await expect(page.locator('#round-points')).toHaveText('3ポイント獲得（基本 2点 ＋ スキル 1点）');
  await expect(page.locator('#total-points')).toHaveText('3');
  await expect(page.getByRole('button', { name: 'この手でじゃんけん！' })).toBeDisabled();
  await page.getByRole('button', { name: 'もう一度あそぶ' }).click();
  await expect(page.getByRole('radio', { name: 'グー' })).toBeFocused();
  await page.getByLabel('1. なかま').selectOption('shizuku');
  await expect(page.locator('#skill option')).toHaveCount(2);
  await page.getByLabel('2. スキル').selectOption('draw');
  await page.getByRole('radio', { name: 'グー' }).check();
  await page.getByRole('button', { name: 'この手でじゃんけん！' }).click();
  await expect(page.getByRole('heading', { name: 'あいこ！', exact: true })).toBeVisible();
  await expect(page.locator('#total-points')).toHaveText('5');
  await page.screenshot({ path: info.outputPath('game-result.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('#total-points')).toHaveText('0');
});
