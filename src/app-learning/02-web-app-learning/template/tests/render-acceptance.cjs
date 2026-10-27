// Explicit live acceptance; one paid-provider probe only when RUN_RENDER_GEMINI=true.
const {chromium,expect,request}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const baseURL=process.env.RENDER_ACCEPTANCE_URL;
 if(!baseURL || !baseURL.startsWith('https://') || !process.env.APP_ACCESS_PASSWORD) throw Error('Set HTTPS URL and environment access credentials.');
 const anonymous=await request.newContext({baseURL});
 for(const path of ['/posts','/admin','/admin/ai']) {
  const response=await anonymous.get(path);if(response.status()!==401)throw Error(`Anonymous ${path}: ${response.status()}`);
 }
 const health=await anonymous.get('/healthz');if(health.status()!==200)throw Error('Health check failed');await anonymous.dispose();
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({baseURL,httpCredentials:{username:process.env.APP_ACCESS_USER||'starter',password:process.env.APP_ACCESS_PASSWORD}});
  const page=await context.newPage();await page.goto('/posts');await expect(page.getByRole('heading',{name:'投稿一覧',exact:true})).toBeVisible();
  await page.goto('/admin/operations');const ops=await page.locator('#content').innerText();
  if(!ops.includes('app_template_render') || ops.includes('接続失敗'))throw Error('Production schema or connection check failed');
  const auth='Basic '+Buffer.from(`${process.env.APP_ACCESS_USER||'starter'}:${process.env.APP_ACCESS_PASSWORD}`).toString('base64');
  const csrf=await context.request.post('/admin/ai/models',{headers:{Authorization:auth},form:{allowedModelsInput:''}});
  if(![401,403].includes(csrf.status()))throw Error(`CSRF protection failed: ${csrf.status()}`);
  console.log(`POST without CSRF rejected: ${csrf.status()}`);
  console.log('HTTPS, health, anonymous rejection, authenticated pages, production schema, DB/Storage and CSRF passed.');
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
