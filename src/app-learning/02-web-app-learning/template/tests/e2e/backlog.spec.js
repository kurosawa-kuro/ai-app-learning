const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { saveFeatures } = require('../settings-helper');

test('画像フィード・応答消失後の再送・投稿編集・ユーザー名変更を完結できる', async ({ page }, info) => {
  test.skip(info.project.name !== 'images-on', '実Storageと画像UIの受入');
  await saveFeatures(page, true);
  await page.goto('/posts/new');
  const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const headers = { 'X-CSRF-TOKEN': token };
  const suffix = randomUUID().slice(0, 8), title = `編集と再送-${suffix}`;
  const added = await page.request.post('/posts/authors', { headers, form: { name: `変更前-${suffix}` } });
  const author = await added.json(); let postId;
  try {
    await page.reload();
    await page.locator('#author-picker').evaluate(el => el.open = true);
    await page.locator('#userId').selectOption(author.id);
    await page.locator('#title').fill(title); await page.locator('#body').fill('元の本文');
    await page.locator('#image').setInputFiles(path.join(__dirname, '../fixtures/sample.png'));
    let lost = false;
    await page.route('**/posts', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const data = await new Response(route.request().postDataBuffer(), { headers: { 'content-type': route.request().headers()['content-type'] } }).formData();
      if (lost) return route.continue();
      // Playwright route.fetch omits file-backed multipart bytes. Send the real fixture,
      // commit once, then lose only the response to the browser's original request.
      const response = await page.request.post('/posts', { headers: { ...headers, 'X-UI-Form': 'true' }, multipart: {
        requestId: data.get('requestId'), userId: data.get('userId'), title: data.get('title'), body: data.get('body'),
        image: { name: 'sample.png', mimeType: 'image/png', buffer: require('node:fs').readFileSync(path.join(__dirname, '../fixtures/sample.png')) }
      } }); expect(response.ok()).toBeTruthy();
      postId = (await response.json()).redirect.split('/').at(-1);
      lost = true; await route.abort('failed');
    });
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page.locator('[data-post-error]')).toContainText('通信が途切れました');
    await expect(page.locator('#title')).toHaveValue(title);
    await expect(page.locator('#image')).not.toHaveValue('');
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
    await page.unroute('**/posts');
    await page.getByRole('button', { name: '投稿を編集', exact: true }).click();
    await page.locator('#body').fill('変更した本文');
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page.locator('.post-body')).toHaveText('変更した本文');
    await expect.poll(() => page.locator('.post-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
    const imageButton = page.locator('[data-image-enlarge]'); await imageButton.click();
    const viewer = page.getByRole('dialog', { name: '投稿画像の拡大' }); await expect(viewer).toBeVisible();
    await page.keyboard.press('Escape'); await expect(viewer).not.toBeVisible(); await expect(imageButton).toBeFocused();
    await page.goto(`/posts?userId=${author.id}&q=${encodeURIComponent(title)}&sort=oldest`);
    await expect(page.locator('[data-post-id]')).toHaveCount(1);
    const card = page.locator('[data-post-id]'); await expect(card).toHaveClass(/post-card/);
    expect(await card.locator('img.post-image').evaluate(img => getComputedStyle(img).objectFit)).toBe('contain');
    await page.locator('.post-list-title').click(); await page.getByRole('link', { name: '投稿一覧へ戻る' }).click();
    expect(new URL(page.url()).searchParams.get('q')).toBe(title);
    await page.goto(`/admin/users/${author.id}/edit`);
    await page.locator('#name').fill(`変更後-${suffix}`); await page.getByRole('button', { name: '名前を保存' }).click();
    await page.goto(`/posts/${postId}`); await expect(page.locator('#metadata')).toContainText(`変更後-${suffix}`);
    await page.getByRole('button', { name: '投稿を編集', exact: true }).click();
    await page.getByLabel('保存済みの画像を外す').check();
    await page.getByRole('button', { name: '投稿を保存', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
    await expect(page.locator('.ui-notice[role="status"]')).toHaveText('投稿を更新しました。');
    await expect(page.locator('[data-post-media]')).toHaveCount(0);
    await page.goto(`/posts?userId=${author.id}`);
    await expect(page.locator('[data-post-media]')).toHaveCount(0);
  } finally {
    await page.unroute('**/posts');
    await page.evaluate(() => document.querySelectorAll('[data-unsaved-form]').forEach(form => form.dataset.saved = 'true'));
    if (postId) expect((await page.request.post(`/posts/${postId}/delete`, { headers })).ok()).toBeTruthy();
    expect((await page.request.post(`/admin/users/${author.id}/delete`, { headers })).ok()).toBeTruthy();
  }
});

test('画像の遅延・失敗・再読込と未保存の離脱確認', async ({ page }, info) => {
  test.skip(info.project.name !== 'images-on', '画像の状態表示');
  await saveFeatures(page, true); await page.goto('/posts/new');
  const token = await page.locator('meta[name="csrf-token"]').getAttribute('content'); const headers = { 'X-CSRF-TOKEN': token };
  const author = await (await page.request.post('/posts/authors', { headers, form: { name: `画像障害-${randomUUID().slice(0, 8)}` } })).json();
  const response = await page.request.post('/posts', { headers: { ...headers, 'X-UI-Form': 'true' }, multipart: { userId: author.id, title: '画像状態の確認', body: '画像が失敗しても読める本文', image: { name: 'sample.png', mimeType: 'image/png', buffer: require('node:fs').readFileSync(path.join(__dirname, '../fixtures/sample.png')) } } });
  const postId = (await response.json()).redirect.split('/').at(-1);
  try {
    let fail = true;
    await page.route(`**/posts/${postId}/image*`, route => fail ? route.fulfill({ status: 404, body: '' }) : route.continue());
    await page.goto(`/posts/${postId}`);
    await expect(page.locator('[data-post-media]')).toHaveAttribute('data-image-state', 'error');
    await expect(page.locator('.post-body')).toHaveText('画像が失敗しても読める本文');
    fail = false; await page.getByRole('button', { name: '画像を再読み込み' }).click();
    await expect(page.locator('[data-post-media]')).toHaveAttribute('data-image-state', 'loaded');
    let release;
    const gate = new Promise(resolve => release = resolve);
    await page.unroute(`**/posts/${postId}/image*`);
    await page.route(`**/posts/${postId}/image*`, async route => { await gate; await route.continue(); });
    await page.goto(`/posts/${postId}`, { waitUntil: 'domcontentloaded' });
    const height = await page.locator('.post-image-button').evaluate(el => el.getBoundingClientRect().height);
    await expect(page.locator('.post-image-status')).toContainText('読み込み中');
    release(); await expect(page.locator('[data-post-media]')).toHaveAttribute('data-image-state', 'loaded');
    expect(await page.locator('.post-image-button').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
    await page.goto(`/posts/${postId}/edit`); await page.locator('#body').fill('未保存');
    let dialogSeen = false; page.once('dialog', async dialog => { dialogSeen = true; await dialog.dismiss(); });
    await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
    expect(dialogSeen).toBeTruthy(); await expect(page.locator('#body')).toHaveValue('未保存');
    await page.evaluate(() => document.querySelector('[data-post-form]').dataset.saved = 'true');
  } finally {
    await page.unroute(`**/posts/${postId}/image*`);
    await page.evaluate(() => document.querySelectorAll('[data-unsaved-form]').forEach(form => form.dataset.saved = 'true'));
    expect((await page.request.post(`/posts/${postId}/delete`, { headers })).ok()).toBeTruthy();
    expect((await page.request.post(`/admin/users/${author.id}/delete`, { headers })).ok()).toBeTruthy();
  }
});

test('管理画面で状態・再試行・画像照会・バックアップを操作できる', async ({ page }, info) => {
  test.skip(info.project.name !== 'images-off', '共通の運用機能');
  await page.goto('/admin'); await page.getByRole('button', { name: '状態と復旧を開く' }).click();
  await expect(page.getByRole('heading', { name: '状態と復旧', exact: true })).toBeVisible();
  await expect(page.getByText('データベース：正常', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '後片付けを再試行' }).click();
  await expect(page.getByRole('status')).toContainText('再試行しました');
  await page.getByRole('button', { name: '保存済み画像を確認' }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'バックアップを保存' }).click();
  const download = await downloaded; expect(download.suggestedFilename()).toMatch(/^backup-.*\.zip$/); expect(await download.failure()).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
