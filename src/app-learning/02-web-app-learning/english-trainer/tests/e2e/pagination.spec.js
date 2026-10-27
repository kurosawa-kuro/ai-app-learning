const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { page.on('dialog', dialog => dialog.accept()); });
const { randomUUID } = require('node:crypto');

test('投稿を10件ずつ表示し、絞込み・前後移動・スマホ表示を維持する', async ({ page }, info) => {
  test.skip(info.project.name !== 'images-off', 'ページ分割は画像設定に依存しない');
  await page.goto('/posts/new');
  const csrf = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const csrfHeader = await page.locator('meta[name="csrf-header"]').getAttribute('content');
  const headers = { [csrfHeader]: csrf };
  const added = await page.request.post('/posts/authors', { headers, form: { name: `ページ検証-${randomUUID().slice(0, 8)}` } });
  expect(added.ok()).toBeTruthy();
  const author = await added.json();
  const ids = [];
  try {
    await page.goto(`/posts?userId=${author.id}`);
    const emptyPager = page.getByRole('navigation', { name: '投稿一覧のページ' });
    await expect(emptyPager).toBeVisible();
    await expect(emptyPager).toContainText('1 / 1ページ');
    await expect(emptyPager.getByRole('button', { name: '前へ', exact: true })).toBeDisabled();
    await expect(emptyPager.getByRole('button', { name: '次へ', exact: true })).toBeDisabled();
    for (let i = 1; i <= 11; i++) {
      const response = await page.request.post('/posts', {
        headers: { ...headers, 'X-UI-Form': 'true' },
        form: { userId: author.id, title: `ページ投稿-${i}`, body: '' }
      });
      expect(response.ok()).toBeTruthy();
      ids.push((await response.json()).redirect.split('/').at(-1));
      if (i === 1) {
        await page.reload();
        await expect(emptyPager).toBeVisible();
        await expect(emptyPager).toContainText('1 / 1ページ');
        await expect(emptyPager.getByRole('button', { name: '次へ', exact: true })).toBeDisabled();
      }
    }
    await page.goto(`/posts?userId=${author.id}`);
    const pager = page.getByRole('navigation', { name: '投稿一覧のページ' });
    await expect(page.locator('[data-post-id]')).toHaveCount(10);
    await expect(page.getByRole('heading', { name: '11件の投稿', exact: true })).toBeVisible();
    await expect(page.getByText('1〜10件を表示', { exact: true })).toBeVisible();
    await expect(pager.getByRole('button', { name: '前へ', exact: true })).toBeDisabled();
    await pager.getByRole('button', { name: '次へ', exact: true }).click();
    expect(new URL(page.url()).searchParams.get('userId')).toBe(author.id);
    expect(new URL(page.url()).searchParams.get('page')).toBe('2');
    await expect(page.locator('[data-post-id]')).toHaveCount(1);
    await expect(page.getByText('11〜11件を表示', { exact: true })).toBeVisible();
    await expect(pager.getByRole('button', { name: '次へ', exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await pager.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('pagination-mobile.png'), fullPage: true, animations: 'disabled' });
    await pager.getByRole('button', { name: '前へ', exact: true }).click();
    await expect(page.locator('[data-post-id]')).toHaveCount(10);
    await page.goto(`/posts?userId=${author.id}&page=999`);
    await expect(pager).toContainText('2 / 2ページ');
    await page.getByRole('combobox', { name: '投稿者で絞込み' }).selectOption('');
    await page.getByRole('button', { name: '絞り込む', exact: true }).click();
    expect(new URL(page.url()).searchParams.has('page')).toBeFalsy();
    await expect(pager).toContainText('1 /');
  } finally {
    for (const id of ids) expect((await page.request.post(`/posts/${id}/delete`, { headers })).ok()).toBeTruthy();
    expect((await page.request.post(`/admin/users/${author.id}/delete`, { headers })).ok()).toBeTruthy();
  }
});
