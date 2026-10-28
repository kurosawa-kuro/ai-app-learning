const {test,expect}=require('@playwright/test');
const path=require('node:path');
const {saveFeatures}=require('../settings-helper');

test('ログイン切れ401でも投稿本文・画像・要求IDを保持する',async({page},info)=>{
 if(info.project.metadata.images) await saveFeatures(page,true);
 await page.goto('/posts/new');
 await page.locator('#title').fill('認証切れの未保存入力');
 await page.locator('#body').fill('ログインし直してから保存する本文');
 const file=page.locator('#image');
 if(info.project.metadata.images) await expect(file).toHaveCount(1);
 if(await file.count()) await file.setInputFiles(path.join(__dirname,'../fixtures/sample.png'));
 const id=await page.locator('[name=requestId]').inputValue();
 await page.route('**/posts',route=>route.request().method()==='POST'?route.fulfill({status:401,contentType:'application/json',body:'{"error":"expired"}'}):route.continue());
 // Required author may be unselected on an empty fixture; use the native submit event after checking fields.
 await page.locator('[data-post-form]').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await expect(page.locator('[data-post-error]')).toContainText('ログインの期限が切れました');
 await expect(page.locator('[data-post-error] a')).toHaveAttribute('target','_blank');
 await expect(page.locator('#title')).toHaveValue('認証切れの未保存入力');
 await expect(page.locator('#body')).toHaveValue('ログインし直してから保存する本文');
 await expect(page.locator('[name=requestId]')).toHaveValue(id);
 if(await file.count()) expect(await file.evaluate(el=>el.files.length)).toBe(1);
 await page.screenshot({path:info.outputPath('expired-input.png'),fullPage:true});
 await page.evaluate(()=>document.querySelectorAll('[data-unsaved-form]').forEach(f=>f.dataset.saved='true'));
});

test('標準フォームは認証切れで入力を保持し再ログイン後に一度だけ保存できる',async({page})=>{
 page.on('dialog',d=>d.accept());
 await page.goto('/admin/users');
 // The normal fixture has Auth off. Load precisely the signed-in-only recovery script for this browser test.
 await page.addScriptTag({path:path.join(__dirname,'../../src/main/resources/static/ui/auth-forms.js')});
 const name='認証復帰-'+Date.now();
 await page.getByLabel('投稿者名',{exact:false}).fill(name);
 await page.route('**/csrf',route=>route.fulfill({status:401,contentType:'application/json',body:'{"error":"expired"}'}));
 await page.getByRole('button',{name:'追加して選択',exact:true}).click();
 await expect(page.locator('[data-auth-error]')).toContainText('ログインの期限が切れました');
 await expect(page.getByLabel('投稿者名',{exact:false})).toHaveValue(name);
 await expect(page.locator('[data-auth-error] a')).toHaveAttribute('target','_blank');
 await page.unroute('**/csrf');
 await page.getByRole('button',{name:'追加して選択',exact:true}).click();
 await expect(page.locator('.ui-notice[role="status"]')).toContainText(name);
 const edit=page.getByRole('link',{name:name+'のアイコンを変更',exact:true});
 const url=await edit.getAttribute('href');
 const id=url.split('/')[3];
 const csrf=(await(await page.request.get('/csrf')).json()).token;
 const result=await page.request.post('/admin/users/'+id+'/delete',{headers:{'X-CSRF-TOKEN':csrf}});
 expect(result.ok()).toBeTruthy();
});
