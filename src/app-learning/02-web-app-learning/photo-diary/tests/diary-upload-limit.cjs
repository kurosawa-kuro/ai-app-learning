const { chromium, expect } = require('@playwright/test');
// Creates no diary: the server must reject the oversized file and preserve the form.
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto((process.env.DIARY_URL || 'http://localhost:8091') + '/diary/new');
    await page.locator('[name=userId]').selectOption({ index: 1 });
    await page.locator('[name=title]').fill('容量超過の確認');
    await page.locator('[name=body]').fill('入力は残ります');
    await page.locator('[name=photos]').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024) });
    await page.getByRole('button', { name: '日記を保存', exact: true }).click();
    await expect(page.locator('[data-diary-error]')).toContainText('5MB');
    await expect(page.locator('[name=body]')).toHaveValue('入力は残ります');
    expect(await page.locator('[name=photos]').evaluate(input => input.files.length)).toBe(1);
    console.log('PASS: oversized upload is rejected with Japanese guidance; body and file remain');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
