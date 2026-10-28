// Run against one app at a time. AI responses are intercepted for deterministic delay/failure tests.
// Only fictional users and explicitly tested records are added; existing records are never removed.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const kind = process.env.APP_KIND;
const paths = { janken: '/janken', english: '/learning', diary: '/diary/new', evaluation: '/evaluation' };
const base = process.env.APP_URL;
if (!base || !paths[kind]) throw Error('Set APP_URL and APP_KIND (janken/english/diary/evaluation)');
const output = `test-results/uiux-priorities/${kind}`;
const tab = (p, id) => p.locator(`[data-workspace-nav] a[href="#lesson-${id}"]`).click();
const dialog = (p, accept) => p.once('dialog', d => accept ? d.accept() : d.dismiss());
const success = (route, text = 'テスト用の応答です。') => route.fulfill({ json: { state: 'SUCCESS', text, message: '結果を保存しました。' } });
let browser;
(async () => {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  // Establish two fictional users through the real server, preserving all existing data.
  if (kind !== 'evaluation') {
    for (const name of ['UIUX確認 あお', 'UIUX確認 しろ']) {
      await p.goto(base + '/admin/users');
      if (!await p.locator(`[data-author="${name}"]`).count()) {
        await p.locator('[name=name]').fill(name);
        await p.getByRole('button', { name: '追加して選択', exact: true }).click();
        await p.waitForLoadState();
      }
    }
  }
  await p.goto(base + paths[kind]);
  if (kind === 'janken') {
    const options = await p.locator('#player option').evaluateAll(es => ['UIUX確認 あお', 'UIUX確認 しろ'].map(name => es.find(e => e.textContent === name)).filter(Boolean).map(e => ({ id: e.value, name: e.textContent })));
    expect(options.length).toBe(2);
    await p.goto(base + '/janken?user=' + options[0].id);
    const firstScore = await p.locator('#total-points').textContent();
    await p.locator('#player').selectOption(options[1].id);
    await expect(p).toHaveURL(new RegExp('user=' + options[1].id));
    await expect(p.locator('#sidebar-current-user')).toHaveText(options[1].name);
    const secondScore = Number(await p.locator('#total-points').textContent());
    await p.locator('[name=hand][value=rock]').check();
    const roundRequest = p.waitForRequest(r => r.url().endsWith('/janken/round'));
    await p.locator('#play-round').click();
    expect((await roundRequest).postData()).toContain(options[1].id);
    await expect(p.locator('#game-result')).toBeVisible();
    const added = Number((await p.locator('#round-points').textContent()).match(/\d+/)[0]);
    await expect(p.locator('#total-points')).toHaveText(String(secondScore + added));
    await p.reload();
    await expect(p.locator('#total-points')).toHaveText(String(secondScore + added));
    await p.goto(base + '/janken?user=' + options[0].id);
    await expect(p.locator('#total-points')).toHaveText(firstScore);
    await tab(p, 'line');
    await p.locator('#line-material').fill('やさしい応援');
    await p.locator('#line-text').fill('手直しを守る文章');
    dialog(p, false); await p.locator('#line-character').selectOption('shizuku');
    await expect(p.locator('#line-character')).toHaveValue('hinoko');
    await expect(p.locator('#line-text')).toHaveValue('手直しを守る文章');
    dialog(p, false); await p.locator('#player').selectOption(options[1].id);
    await expect(p.locator('#player')).toHaveValue(options[0].id);
    await p.locator('.ui-user-trigger').click();
    dialog(p, false);
    await p.locator('[data-user-options-list] button').filter({ hasText: options[1].name }).first().click();
    await expect(p.locator('#sidebar-current-user')).toHaveText(options[0].name);
    await p.keyboard.press('Escape');
    let draft;
    await p.route('**/janken/line/draft', r => { draft = r; });
    dialog(p, false); await p.locator('#line-generate').click(); expect(draft).toBeUndefined();
    dialog(p, true); await p.locator('#line-generate').click();
    await expect.poll(() => !!draft).toBe(true);
    await expect(p.locator('#line-text')).toHaveAttribute('readonly', '');
    await expect(p.locator('#line-character')).toBeDisabled();
    await draft.fulfill({ status: 503, json: { error: 'テスト用の生成失敗' } });
    await expect(p.locator('#line-status')).toContainText('生成失敗');
    await expect(p.locator('#line-text')).toHaveValue('手直しを守る文章');
    draft = null; dialog(p, true); await p.locator('#line-generate').click();
    await expect.poll(() => !!draft).toBe(true); await success(draft, '新しい応援');
    await expect(p.locator('#line-text')).toHaveValue('新しい応援');
    await p.locator('#line-text').fill('公開確認用の応援です');
    await p.locator('#line-adopt').click(); await expect(p.locator('#line-status')).toContainText('保存しました');
    await p.reload(); await tab(p, 'line');
    await p.locator('#line-text').fill('離脱時にも守る');
    dialog(p, false); await p.locator('#actions a').click();
    await expect(p.locator('#line-text')).toHaveValue('離脱時にも守る');
    dialog(p, true); await p.locator('#line-character').selectOption('shizuku');
    await expect(p.locator('#line-text')).toHaveValue('');
    await tab(p, 'play'); await expect(p.locator('#line-text')).toBeHidden();
    await tab(p, 'history'); await expect(p.locator('#lesson-history')).toBeVisible();
    await p.goBack(); await expect(p.locator('#play-round')).toBeVisible();
  }
  if (kind === 'english') {
    const form = p.locator('[data-learning-form]').first();
    let response;
    await p.route('**/learning', r => r.request().method() === 'POST' ? (response = r) : r.continue());
    await form.locator('[name=input]').fill('My first answer.');
    await form.locator('button').click(); await expect.poll(() => !!response).toBe(true);
    await expect(form.locator('[name=input]')).toHaveAttribute('readonly', '');
    await expect(form.locator('[name=question]')).toBeDisabled();
    await tab(p, 'chat'); await p.locator('[data-learning-form]').nth(1).locator('[name=input]').fill('Unsent conversation.');
    await tab(p, 'quiz'); await expect(form.locator('[name=input]')).toHaveValue('My first answer.');
    dialog(p, false);
    // pending request protects ordinary navigation as well as the user switch.
    await p.locator('[data-workspace-nav] a').first().focus();
    await p.evaluate(() => { location.href = '/admin'; });
    await expect(form.locator('[name=input]')).toHaveValue('My first answer.');
    await success(response, 'First answer feedback.');
    await expect(form.locator('[data-learning-feedback]')).toHaveText('First answer feedback.');
    await expect(form.locator('[data-learning-submitted]')).toContainText('My first answer.');
    await expect(form.locator('[name=input]')).toBeEditable();
    await form.locator('[name=input]').fill('My changed answer.');
    await expect(form.locator('[data-learning-feedback]')).toBeEmpty();
    response = null; await form.locator('button').click(); await expect.poll(() => !!response).toBe(true);
    await response.fulfill({ status: 503, json: { error: 'テスト用の保存失敗' } });
    await expect(form.locator('[data-learning-status]')).toContainText('保存失敗');
    await expect(form.locator('[name=input]')).toHaveValue('My changed answer.');
    await expect(form).toHaveAttribute('data-saved', 'false');
    const learner = p.locator('[data-learner-switch] select');
    const current = await learner.inputValue(); const other = await learner.locator('option').evaluateAll(es => es.map(e => e.value));
    dialog(p, false); await learner.selectOption(other.find(id => id !== current));
    await expect(learner).toHaveValue(current);
    await tab(p, 'chat'); await expect(p.locator('[data-learning-form]').nth(1).locator('[name=input]')).toHaveValue('Unsent conversation.');
    await tab(p, 'quiz');
    // Remove drafts via a confirmed navigation for screenshot setup.
    dialog(p, true); await p.evaluate(() => { location.href = '/admin/users'; });
    await p.waitForURL('**/admin/users');
    await p.goto(base + '/learning#lesson-reflect');
    await expect(p.locator('#lesson-reflect')).toBeVisible();
    await tab(p, 'quiz');
  }
  if (kind === 'diary') {
    await p.route('**/api/diary/draft', r => success(r, 'AIで作った下書き'));
    await p.locator('#diary-material').fill('架空の散歩の記録');
    await p.locator('#diary-generate').click();
    await expect(p.locator('#diary-draft')).toBeVisible();
    await p.locator('#diary-body').fill('自分で手直しした日記');
    dialog(p, false); await p.locator('#diary-apply').click();
    await expect(p.locator('#diary-body')).toHaveValue('自分で手直しした日記');
    await expect(p.locator('#diary-draft')).toBeVisible();
    dialog(p, true); await p.locator('#diary-apply').click();
    await expect(p.locator('#diary-body')).toHaveValue('AIで作った下書き');
    await expect(p.locator('#diary-draft')).toBeHidden();
  }
  if (kind === 'evaluation') {
    await expect(p.locator('#lesson-ranking')).toBeVisible();
    await expect(p.locator('[name=drinks]')).toBeHidden();
    await tab(p, 'record'); await p.locator('[name=drinks]').fill('7');
    await tab(p, 'members'); await p.getByLabel('新しいメンバー名').fill('未保存の架空名');
    await tab(p, 'rules'); await expect(p.locator('#lesson-rules')).toBeVisible();
    await tab(p, 'record'); await expect(p.locator('[name=drinks]')).toHaveValue('7');
    await tab(p, 'members'); await expect(p.getByLabel('新しいメンバー名')).toHaveValue('未保存の架空名');
    dialog(p, false); await p.evaluate(() => { location.href = '/admin/users'; });
    await expect(p.getByLabel('新しいメンバー名')).toHaveValue('未保存の架空名');
    await tab(p, 'ranking');
  }
  fs.mkdirSync(output, { recursive: true });
  for (const width of [1440, 390]) {
    await p.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await p.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    if (width === 390) await expect.poll(() => p.locator('#sidebar').evaluate(e => e.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await p.screenshot({ path: `${output}/${width}.png`, fullPage: true, animations: 'disabled' });
    if (kind !== 'diary') {
      for (const link of await p.locator('[data-workspace-nav] a').all()) {
        await link.click();
        const id = (await link.getAttribute('href')).slice(1);
        await expect(p.locator('[data-workspace-panel]:visible')).toHaveCount(1);
        await expect(link).toHaveAttribute('aria-current', 'page');
        await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await p.screenshot({ path: `${output}/${width}-${id}.png`, fullPage: true, animations: 'disabled' });
      }
    }
  }
  expect(errors).toEqual([]);
  console.log(`PASS ${kind}: protected input, operation context, workspaces, PC/mobile, no JS errors`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
