const {chromium,expect}=require('@playwright/test');const fs=require('node:fs');
(async()=>{const b=await chromium.launch();try{for(const width of [1280,412]){
 const c=await b.newContext({baseURL:process.env.RENDER_ACCEPTANCE_URL||'https://web-app-template-ofb7.onrender.com',viewport:{width,height:924}});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const url of ['/posts','/posts?page=2','/posts/new','/admin/users','/admin/settings','/admin/ai','/examples/skill-janken']){
  const t=Date.now();const r=await p.goto(url,{waitUntil:'networkidle',timeout:120000});if(!r.ok())throw Error(url+' '+r.status());
  const navigationMs=Date.now()-t;
  if(url==='/posts') { await expect(p.locator('[data-post-id]')).toHaveCount(10); await expect(p.locator('a[rel=next]')).toBeVisible(); }
  if(url==='/posts?page=2') expect(await p.locator('[data-post-id]').count()).toBeGreaterThan(0);
  for(const href of await p.locator('link[rel=stylesheet]').evaluateAll(es=>es.map(e=>e.href))){const s=await c.request.get(href);if(!s.ok()||!s.headers()['content-type'].startsWith('text/css'))throw Error('Invalid CSS '+new URL(href).pathname);}
  let imageCount=0;for(const img of await p.locator('img.post-image').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(e=>e.complete&&e.naturalWidth>0),{timeout:30000}).toBeTruthy();imageCount++;}
  if(url.startsWith('/posts?') || url==='/posts') expect(imageCount).toBeGreaterThan(0);
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Horizontal overflow '+width+' '+url);
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'.local/visual-'+width+'-'+url.replace(/[^a-z0-9]/gi,'-')+'.png',fullPage:true});
  console.log(JSON.stringify({width,url,navigationMs,imageCount}));
 }
 await p.goto('/posts');
 if(width<600) { await p.locator('[data-sidebar-toggle]').click(); await expect(p.locator('#sidebar')).toBeVisible(); }
 await p.locator('.ui-user-trigger').click();await expect(p.locator('#user-popup')).toBeVisible();
 await expect(p.locator('[data-user-options-list] button').first()).toBeVisible();
 if(errors.length)throw Error(errors.join('\n'));await c.close();
}}finally{await b.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
