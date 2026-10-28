const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({baseURL:`http://127.0.0.1:${process.argv[2]}`});
  const page=await context.newPage();await page.goto('/posts/new');
  await page.locator('[name="title"]').fill('下書き検証');await page.locator('[name="body"]').fill('今日の素材');
  await page.locator('[name="image"]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDa0AAAAASUVORK5CYII=','base64')});
  assert.equal((await context.request.post('/ai/drafts',{form:{input:'素材',requestId:require('node:crypto').randomUUID()}})).status(),403);
  const pending=page.waitForResponse(r=>r.url().endsWith('/ai/drafts')&&r.request().method()==='POST');
  await page.locator('[data-ai-generate]').click();await expect(page.locator('[data-ai-generate]')).toBeDisabled();
  const response=await pending;const data=await response.json();assert.equal(data.state,'SUCCESS');
  await expect(page.locator('[data-ai-result]')).toBeVisible();await expect(page.locator('[name="body"]')).toHaveValue('今日の素材');
  await page.locator('[data-ai-apply]').click();await expect(page.locator('[name="body"]')).toHaveValue('AIが作った下書きです。');
  await page.locator('[data-ai-discard]').click();await expect(page.locator('[name="body"]')).toHaveValue('今日の素材');
  assert.equal(await page.locator('[name="image"]').evaluate(el=>el.files.length),1);
  assert.equal((await (await context.request.get(`/ai/drafts/${data.requestId}`)).json()).text,'AIが作った下書きです。');
  const other=await browser.newContext({baseURL:`http://127.0.0.1:${process.argv[2]}`});assert.equal((await other.request.get(`/ai/drafts/${data.requestId}`)).status(),404);await other.close();
  await page.route('**/ai/drafts',route=>route.abort());await page.locator('[data-ai-generate]').click();
  await expect(page.locator('[data-ai-check]')).toBeVisible();await expect(page.locator('[name="body"]')).toHaveValue('今日の素材');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.admin-sidebar').getBoundingClientRect().right <= 0);await page.locator('[data-ai-draft]').scrollIntoViewIfNeeded();await page.screenshot({path:'target/openai-ui/draft-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('Draft UI: image, CSRF, generation, apply, discard, owner isolation, network loss, mobile passed');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
