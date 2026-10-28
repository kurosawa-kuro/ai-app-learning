// Explicit live acceptance: creates new fictional data only, never modifies old records or settings.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
if (process.env.RUN_UIUX_LIVE !== 'true') throw Error('Set RUN_UIUX_LIVE=true to call real AI and save fictional records');
const kind = process.env.APP_KIND, base = process.env.APP_URL;
const routes = { diary: '/diary/new', english: '/learning', janken: '/janken', evaluation: '/evaluation' };
if (!routes[kind] || !base) throw Error('Set APP_KIND and APP_URL');
const name = '公開UIUX確認 ' + Date.now();
const tab = (p, id) => p.locator(`[data-workspace-nav] a[href="#lesson-${id}"]`).click();
let browser;
(async () => {
  browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultNavigationTimeout(120000);
  const errors = [], assets = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('response', r => { if (/\.(css|js)(\?|$)/.test(r.url())) assets.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] }); });
  if (kind !== 'evaluation') {
    await p.goto(base + '/admin/users');
    await p.locator('[name=name]').fill(name);
    await p.getByRole('button', { name: '追加して選択', exact: true }).click();
    await p.waitForLoadState();
  }
  await p.goto(base + routes[kind]);
  if (kind !== 'evaluation') await expect(p.getByText('デモ：AIは固定応答です。外部AIへ送信しません。', { exact: true })).toHaveCount(0);
  if (kind === 'janken') {
    await expect(p.locator('#player option:checked')).toHaveText(name);
    await tab(p, 'line');
    await p.locator('#line-material').fill('架空の友達を励ます短い応援');
    await p.locator('#line-generate').click();
    await expect(p.locator('#line-text')).not.toHaveValue('', { timeout: 60000 });
    await p.locator('#line-text').fill('また一緒に挑戦しよう！');
    await p.locator('#line-adopt').click();
    await expect(p.locator('#line-status')).toContainText('保存しました');
    await tab(p, 'play');
    let duringBattle = 0;
    p.on('request', r => { if (r.url().endsWith('/line/draft')) duringBattle++; });
    await p.locator('[name=hand][value=rock]').check(); await p.locator('#play-round').click();
    await expect(p.locator('#game-result')).toBeVisible();
    await expect(p.locator('#round-line')).toHaveText('また一緒に挑戦しよう！');
    const total = await p.locator('#total-points').textContent();
    expect(duringBattle).toBe(0);
    await p.reload(); await expect(p.locator('#total-points')).toHaveText(total);
    await tab(p, 'history'); await expect(p.locator('[data-workspace-panel="lesson-history"]')).toContainText('また一緒に挑戦しよう！');
    await p.getByRole('link', { name: '履歴を再表示', exact: true }).click();
    await expect(p.locator('#lesson-history')).toBeVisible();
    await tab(p, 'play');
  } else if (kind === 'english') {
    for (const [i, id, value] of [[0, 'quiz', 'My name is Sora.'], [1, 'chat', 'I enjoyed a walk today.'], [2, 'reflect', '短い英文を自分で書けました。']]) {
      await tab(p, id); const form = p.locator('[data-learning-form]').nth(i);
      await form.locator('[name=input]').fill(value); await form.locator('button').click();
      await expect(form.locator('[data-learning-status]')).toContainText('保存', { timeout: 60000 });
      await expect(form.locator('[data-learning-feedback]')).not.toBeEmpty();
      await expect(form.locator('[data-learning-submitted]')).toContainText(value);
    }
    await tab(p, 'history'); await p.getByRole('link', { name: '履歴を再表示', exact: true }).click();
    await expect(p.locator('#lesson-history')).toBeVisible();
    await expect(p.locator('[data-workspace-panel="lesson-history"] details')).toHaveCount(3);
    await tab(p, 'quiz');
  } else if (kind === 'evaluation') {
    await tab(p, 'members'); await p.getByLabel('新しいメンバー名').fill(name);
    await p.getByRole('button', { name: 'メンバーを追加', exact: true }).click();
    await expect(p.locator('#lesson-members')).toBeVisible();
    await tab(p, 'record'); await p.locator('[name=memberId]').selectOption({ label: name });
    await p.locator('[name=drinks]').fill('2'); await p.locator('[name=sales]').fill('12000');
    await p.getByRole('button', { name: '実績を保存', exact: true }).click();
    await expect(p.locator('#lesson-record')).toBeVisible();
    const edit = p.getByRole('link', { name: new RegExp(name + 'を編集') });
    await edit.click(); await expect(p.locator('[name=drinks]')).toHaveValue('2');
    await p.locator('[name=drinks]').fill('3');
    await p.getByRole('button', { name: '実績を保存', exact: true }).click();
    await edit.click(); await expect(p.locator('[name=drinks]')).toHaveValue('3');
    await tab(p, 'ranking');
    await expect(p.locator('tbody tr').filter({ hasText: name })).toContainText('12000');
  } else {
    await p.locator('[name=title]').fill(name);
    const samples = [];
    for (const [w, h] of [[640, 400], [400, 640], [480, 480]]) {
      const png = await p.evaluate(({ w, h }) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f3dce9'; x.fillRect(0, 0, w, h); x.fillStyle = '#443344'; x.font = '24px sans-serif'; x.fillText('Fictional UIUX sample', 15, 40); return c.toDataURL('image/png').split(',')[1]; }, { w, h });
      samples.push({ name: `sample-${w}-${h}.png`, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    }
    await p.locator('[name=photos]').setInputFiles(samples);
    await p.locator('#diary-material').fill('架空の公園を散歩して、やさしい色を見つけた。');
    await p.locator('#diary-generate').click(); await expect(p.locator('#diary-draft')).toBeVisible({ timeout: 60000 });
    await p.locator('#diary-body').fill('自分で書いた文章を守ります。');
    p.once('dialog', d => d.dismiss()); await p.locator('#diary-apply').click();
    await expect(p.locator('#diary-body')).toHaveValue('自分で書いた文章を守ります。');
    p.once('dialog', d => d.accept()); await p.locator('#diary-apply').click();
    await p.locator('#diary-body').fill('これは公開UIUX確認用の架空の日記です。写真と文章を保存して読み返しました。');
    const id = await p.locator('[name=requestId]').inputValue();
    await p.context().clearCookies();
    await p.getByRole('button', { name: '日記を保存', exact: true }).click();
    await expect(p.locator('[data-diary-error]')).toContainText('送信の準備を更新');
    expect(await p.locator('[name=photos]').evaluate(e => e.files.length)).toBe(3);
    await expect(p.locator('[name=requestId]')).toHaveValue(id);
    await p.getByRole('button', { name: '日記を保存', exact: true }).click();
    await p.waitForURL(/\/diary\/[0-9a-f-]{36}$/); await p.reload();
    await expect(p.locator('h1')).toHaveText(name);
    await expect(p.locator('img.post-image')).toHaveCount(3);
    await expect.poll(() => p.locator('img.post-image').evaluateAll(es => es.every(e => e.complete && e.naturalWidth > 0))).toBe(true);
  }
  fs.mkdirSync(`test-results/uiux-live/${kind}`, { recursive: true });
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await p.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    if (width === 390) await expect.poll(() => p.locator('#sidebar').evaluate(e => e.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await p.screenshot({ path: `test-results/uiux-live/${kind}/${width}.png`, fullPage: true, animations: 'disabled' });
  }
  expect(errors).toEqual([]);
  expect(assets.length).toBeGreaterThan(0);
  for (const a of assets) { expect(a.status, a.url).toBe(200); expect(a.type, a.url).toMatch(/css|javascript/); }
  console.log(JSON.stringify({ result: 'PASS', kind, url: p.url(), fictionalName: name, realAI: kind !== 'evaluation', assets: assets.length }));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
