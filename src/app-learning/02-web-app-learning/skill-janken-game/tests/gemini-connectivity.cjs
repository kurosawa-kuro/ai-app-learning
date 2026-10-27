// Called by GeminiBrowserTests against its isolated Spring context and mocked gateway.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: `http://127.0.0.1:${process.argv[2]}` });
    const page = await context.newPage();
    await page.goto('/admin/settings');
    await page.getByRole('link', {name:'Gemini接続確認を開く'}).click();
    assert.equal(await page.getByRole('button',{name:'接続を確認',exact:true}).isDisabled(),true);
    assert.equal((await context.request.post('/admin/ai/check',{form:{requestToken:'invalid'}})).status(),403);
    await page.getByRole('link',{name:'機能管理へ戻る'}).click();
    await page.locator('input[name="aiIntegration"]').check();
    await page.getByRole('button',{name:'設定を保存',exact:true}).click();
    await page.waitForURL('**/admin/settings');
    await page.getByRole('link',{name:'Gemini接続確認を開く'}).click();
    assert.equal((await context.request.post('/admin/ai/models',{form:{allowedModelsInput:'gemini-test'}})).status(),403);
    await page.getByLabel('許可するモデルID（1行に1つ）').fill('');
    await page.getByRole('button',{name:'許可モデルを保存',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'接続を確認',exact:true}).isDisabled(),true);
    const deniedToken=await page.locator('[name="requestToken"]').inputValue();
    const deniedCsrf=await page.locator('form[action="/admin/ai/check"] [name="_csrf"]').inputValue();
    const denied=await context.request.post('/admin/ai/check',{form:{requestToken:deniedToken,_csrf:deniedCsrf}});
    assert.match(await denied.text(),/使用モデルは許可されていません/);
    const cli=require('node:child_process').spawnSync('powershell.exe',
      ['-NoProfile','-File','scripts/check-gemini.ps1','-Port',process.argv[2]],{timeout:15000});
    assert.equal(cli.status,1,'CLI must obey the saved model restriction');
    assert.match(cli.stdout.toString('utf8'),/使用モデルは許可されていません/);
    await page.goto('/admin/ai');
    await page.getByLabel('許可するモデルID（1行に1つ）').fill('gemini-*');
    await page.getByRole('button',{name:'許可モデルを保存',exact:true}).click();
    assert.match(await page.locator('body').innerText(),/ワイルドカード/);
    await page.getByLabel('許可するモデルID（1行に1つ）').fill('gemini-test');
    await page.getByRole('button',{name:'許可モデルを保存',exact:true}).click();
    await page.reload();
    assert.equal(await page.getByLabel('許可するモデルID（1行に1つ）').inputValue(),'gemini-test');
    const token=await page.locator('[name="requestToken"]').inputValue();
    const csrf=await page.locator('form[action="/admin/ai/check"] [name="_csrf"]').inputValue();
    await page.evaluate(() => document.addEventListener('submit', event => {
      const button=event.target.querySelector('button[type=submit]');
      console.log('GEMINI_BUSY:'+JSON.stringify({disabled:button.disabled,text:button.textContent}));
    },{once:true}));
    const busyMessage=page.waitForEvent('console',message=>message.text().startsWith('GEMINI_BUSY:'));
    const submitting=page.getByRole('button',{name:'接続を確認',exact:true}).click();
    const busy=JSON.parse((await busyMessage).text().slice('GEMINI_BUSY:'.length));
    assert.deepEqual(busy,{disabled:true,text:'接続を確認中…'});
    await submitting;
    await page.getByRole('heading',{name:'接続できました',exact:true}).waitFor();
    assert.match(await page.locator('#ai-check-result').innerText(),/照会ID/);
    fs.mkdirSync('target/gemini-ui',{recursive:true});
    await page.screenshot({path:'target/gemini-ui/success-desktop.png',fullPage:true,animations:'disabled'});
    const replay=await context.request.post('/admin/ai/check',{form:{requestToken:token,_csrf:csrf}});
    assert.match(await replay.text(),/使用済み/);
    await page.goto('/admin/ai');
    await page.getByRole('button',{name:'接続を確認',exact:true}).click();
    await page.getByRole('heading',{name:'接続を確認できませんでした'}).waitFor();
    assert.match(await page.locator('#ai-check-result').innerText(),/利用上限/);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().right <= 0);
    await page.screenshot({path:'target/gemini-ui/rate-limit-mobile.png',fullPage:true,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.getByRole('button',{name:'接続を確認',exact:true}).isEnabled(),true);
    console.log('PASS: disabled, CSRF, busy, success, duplicate, failure, retry and mobile');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
