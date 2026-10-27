const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

test('管理画面から日本語CSVをダウンロードできる', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'images-off', '画像設定に依存しないCSV出力');
  await page.goto('/admin');
  const exports = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'CSVエクスポート' }) });
  await expect(exports).toContainText('全件を出力します');
  for (const [label, prefix, column] of [['ユーザー', 'users', 'ユーザーID'], ['投稿', 'posts', '投稿ID']]) {
    const downloaded = page.waitForEvent('download');
    await exports.getByRole('button', { name: `${label}をCSVで保存` }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(new RegExp(`^${prefix}-\\d{8}-\\d{6}\\.csv$`));
    const bytes = await fs.readFile(await download.path());
    expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
    expect(bytes.toString('utf8')).toContain(`"${column}"`);
    expect(await download.failure()).toBeNull();
    await expect(page).toHaveURL(/\/admin$/);
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`admin-export-${width}.png`), fullPage: true, animations: 'disabled' });
  }
});
