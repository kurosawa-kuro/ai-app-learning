const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const base=process.env.DIARY_URL||'http://localhost:8091';let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/diary/new');
 const users=await page.locator('[name=userId] option').evaluateAll(es=>es.filter(e=>e.value).map(e=>e.value));
 if(!users.length)throw Error('Create a fictional user and enable images/AI before this acceptance run.');
 const samples=[];
 for(const [w,h,color] of [[640,400,'#ffd9e8'],[400,640,'#d9f0e8'],[480,480,'#e0dcff']]){
  const png=await page.evaluate(({w,h,color})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,w,h);x.fillStyle='#fff';x.beginPath();x.arc(w/2,h/2,Math.min(w,h)/4,0,7);x.fill();x.fillStyle='#594d68';x.font='24px sans-serif';x.fillText('Learning diary',25,50);return c.toDataURL('image/png').split(',')[1]},{w,h,color});
  samples.push({name:'sample-'+samples.length+'.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 }
 const title='受入確認 '+Date.now();
 await page.locator('[name=userId]').selectOption(users[0]);await page.locator('[name=title]').fill(title);
 await page.locator('[name=tags]').fill('受入確認,散歩');await page.locator('[name=photos]').setInputFiles(samples);
 await page.locator('#diary-material').fill('公園で春の色を見つけた。');
 await page.getByRole('button',{name:'AIで下書きを作る'}).click();await expect(page.locator('#diary-draft')).toBeVisible();
 await page.getByRole('button',{name:'本文へ反映'}).click();await page.locator('[name=body]').fill('本人が確認して手直しした日記です。\n写真を3枚残しました。');
 await page.getByRole('button',{name:'日記を保存',exact:true}).click();await page.waitForURL(/\/diary\/[0-9a-f-]{36}$/);
 await page.reload();await expect(page.locator('h1')).toHaveText(title);await expect(page.locator('.post-body')).toContainText('本人が確認');
 await expect(page.locator('img.post-image')).toHaveCount(3);
 await expect.poll(()=>page.locator('img.post-image').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0))).toBe(true);
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/diary-desktop.png',fullPage:true});
 const detail=page.url();await page.setViewportSize({width:390,height:844});await page.reload();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/diary-mobile.png',fullPage:true});
 await page.goto(base+'/diary?tag='+encodeURIComponent('受入確認'));await expect(page.getByRole('link',{name:title,exact:true})).toBeVisible();
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({result:'passed',detail,images:3,viewports:['1440x1000','390x844'],checks:[process.env.DIARY_URL?.includes('8096')?'live AI':'configured AI','manual edit','save','reload','tag filter','image decode','no horizontal overflow']}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
