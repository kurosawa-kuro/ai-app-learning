const {test,expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');const path=require('node:path');const {saveFeatures}=require('../settings-helper');
test('502とトークン失効403の後も本文と画像を残し一度だけ保存できる',async({page,context},info)=>{
 test.skip(info.project.name!=='images-on','実画像保存の検証');
 await saveFeatures(page,true);await page.goto('/posts/new');
 const initial=await page.locator('meta[name="csrf-token"]').getAttribute('content');
 const author=await(await page.request.post('/posts/authors',{headers:{'X-CSRF-TOKEN':initial},form:{name:'再接続-'+randomUUID().slice(0,8)}})).json();
 let postId;const title='再接続-'+randomUUID().slice(0,8);
 try {
  await page.reload();await page.locator('#author-picker').evaluate(el=>el.open=true);await page.locator('#userId').selectOption(author.id);
  await page.locator('#title').fill(title);await page.locator('#body').fill('再起動しても残す本文');await page.locator('#image').setInputFiles(path.join(__dirname,'../fixtures/sample.png'));
  const requestId=await page.locator('[name=requestId]').inputValue();
  await page.route('**/posts',route=>route.request().method()==='POST'?route.fulfill({status:502,contentType:'text/html',body:'Bad Gateway'}):route.continue(),{times:1});
  await page.getByRole('button',{name:'投稿を保存',exact:true}).click();await expect(page.locator('[data-post-error]')).toContainText('保存を確認できませんでした');
  await context.clearCookies({name:'XSRF-TOKEN'});
  await page.getByRole('button',{name:'投稿を保存',exact:true}).click();await expect(page.locator('[data-post-error]')).toContainText('送信の準備を更新しました');
  await expect(page.locator('#body')).toHaveValue('再起動しても残す本文');expect(await page.locator('#image').evaluate(el=>el.files.length)).toBe(1);await expect(page.locator('[name=requestId]')).toHaveValue(requestId);
  await page.getByRole('button',{name:'投稿を保存',exact:true}).click();await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);postId=new URL(page.url()).pathname.split('/').pop();
  await expect.poll(()=>page.locator('.post-image').evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
  await page.goto('/posts?q='+encodeURIComponent(title));await expect(page.locator('[data-post-id]')).toHaveCount(1);
 } finally {
  await page.unroute('**/posts');await page.evaluate(()=>document.querySelectorAll('[data-unsaved-form]').forEach(f=>f.dataset.saved='true'));
  const token=(await(await page.request.get('/csrf')).json()).token;const headers={'X-CSRF-TOKEN':token};
  if(postId)expect((await page.request.post(`/posts/${postId}/delete`,{headers})).ok()).toBeTruthy();
  expect((await page.request.post(`/admin/users/${author.id}/delete`,{headers})).ok()).toBeTruthy();
 }
});
