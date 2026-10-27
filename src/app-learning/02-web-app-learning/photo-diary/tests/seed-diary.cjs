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
 const token=await page.locator('[name=_csrf]').inputValue();
 const crypto=require('node:crypto');
 for(let i=0;i<13;i++){
  const hex=crypto.createHash('sha256').update('photo-diary-fictional-v1-'+i).digest('hex');
  const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20,32);
  if((await page.request.get(base+'/diary/'+id)).status()===200)continue;
  const data={requestId:id,userId:users[0],entryDate:'2026-10-'+String(i+1).padStart(2,'0'),title:['散歩で見つけた色','お気に入りの時間','今日できた小さなこと'][i%3]+' '+(i+1),body:i%4===0?'架空の教材データです。\n身近なできごとを、自分の言葉で残す練習をしました。'.repeat(18):'架空の教材データです。今日は一つ、できることが増えました。',tags:i%2?'学び,発見':'散歩,発見',_csrf:token};
  if(i%3===0)data.photos=samples[(i/3)%3];
  const response=await page.request.post(base+'/diary',{multipart:data});
  if(!response.ok())throw Error('seed '+i+' HTTP '+response.status()+' '+await response.text());
 }
 await page.goto(base+'/diary?tag='+encodeURIComponent('発見'));await expect(page.locator('[data-diary-entry]')).toHaveCount(10);
 await page.getByRole('button',{name:'次へ',exact:true}).click();await expect(page.locator('[data-diary-entry]')).toHaveCount(3);
 console.log('PASS: 13 stable fictional diaries, 5 images, two pages');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
