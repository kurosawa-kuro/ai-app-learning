document.querySelectorAll('[data-learning-form]').forEach(form=>{
 let id=null,busy=false;
 form.addEventListener('input',()=>{id=null;form.dataset.saved='false';});
 form.addEventListener('submit',async event=>{event.preventDefault();form.dataset.saved='false';if(busy)return;busy=true;const button=form.querySelector('button'),status=form.querySelector('[data-learning-status]');button.disabled=true;status.textContent='考えています…';if(!id)id=crypto.randomUUID();const data=new FormData(form);data.set('requestId',id);
 try{const r=await fetch('/learning',{method:'POST',headers:{'X-UI-Form':'true','X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},body:data});if(r.status===403){const fresh=await(await fetch('/csrf',{cache:'no-store'})).json();document.querySelector('meta[name=csrf-token]').content=fresh.token;document.querySelectorAll('[name=_csrf]').forEach(e=>e.value=fresh.token);throw Error('送信準備を更新しました。入力を残しています。もう一度押してください。');}if(!(r.headers.get('content-type')||'').includes('json'))throw Error('結果を確認できませんでした。再試行してください。');const value=await r.json();if(!r.ok)throw Error(value.error||'保存できませんでした。');status.textContent=value.message;if(value.state==='SUCCESS'){form.querySelector('[data-learning-feedback]').textContent=value.text;form.dataset.saved='true';}else{id=null;}}
 catch(e){status.textContent=e.message;}finally{busy=false;button.disabled=false;}
 });
});

document.addEventListener("app:user-selected",event=>{location.assign("/learning?user="+encodeURIComponent(event.detail.id));});
