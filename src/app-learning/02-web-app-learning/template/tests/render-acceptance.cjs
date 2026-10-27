// Explicit live acceptance; one paid-provider probe only when RUN_RENDER_GEMINI=true.
const {chromium,expect,request}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const baseURL=process.env.RENDER_ACCEPTANCE_URL;
 if(!baseURL || !baseURL.startsWith('https://')) throw Error('Set HTTPS URL.');
 const anonymous=await request.newContext({baseURL});
 for(const path of ['/posts','/admin','/admin/ai']) {
  const response=await anonymous.get(path);if(response.status()!==200)throw Error(`Public ${path}: ${response.status()}`);
 }
 const health=await anonymous.get('/healthz');if(health.status()!==200)throw Error('Health check failed');await anonymous.dispose();
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({baseURL});
  const page=await context.newPage();await page.goto('/posts');await expect(page.getByRole('heading',{name:'投稿一覧',exact:true})).toBeVisible();
  // Check every shipped stylesheet, not just headings rendered without CSS.
  for (const href of await page.locator('link[rel=stylesheet]').evaluateAll(links => links.map(link => link.href))) {
   const css = await context.request.get(href);
   if(css.status() !== 200 || !(css.headers()['content-type'] || '').startsWith('text/css'))
    throw Error(`Stylesheet missing or invalid: ${new URL(href).pathname} (${css.status()})`);
  }
  const inputStyle = await page.locator('#post-search').evaluate(el => {
   const style = getComputedStyle(el); return {height:el.getBoundingClientRect().height, boxSizing:style.boxSizing};
  });
  if(inputStyle.height < 40 || inputStyle.boxSizing !== 'border-box') throw Error('Pico form styles are not applied');
  const csrf=await context.request.post('/admin/ai/models',{form:{allowedModelsInput:''}});
  if(csrf.status()!==403)throw Error(`CSRF protection failed: ${csrf.status()}`);
  console.log('Public pages without login, all CSS, Pico form styling and CSRF passed.');
  if(process.env.RUN_RENDER_GEMINI==='true') {
   await page.goto('/admin/settings');const toggle=page.locator('[name="aiIntegration"]');const original=await toggle.isChecked();
   try {
    if(!original){await toggle.check();await page.getByRole('button',{name:'設定を保存',exact:true}).click();await page.waitForURL('**/admin/settings');}
    await page.goto('/admin/ai');await expect(page.getByRole('button',{name:'接続を確認',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'接続を確認',exact:true}).click();
    await expect(page.locator('#ai-check-result h2')).toHaveText('接続できました',{timeout:60000});
    console.log(await page.locator('#ai-check-result').innerText());
    fs.mkdirSync('.local/render-acceptance',{recursive:true});await page.screenshot({path:'.local/render-acceptance/gemini-success.png',fullPage:true});
   } finally {
    await page.goto('/admin/settings');await page.locator('[name="aiIntegration"]').setChecked(original);await page.getByRole('button',{name:'設定を保存',exact:true}).click();
    await page.waitForURL('**/admin/settings');console.log(`AI permission restored: ${original}`);
   }
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exit(1);});
