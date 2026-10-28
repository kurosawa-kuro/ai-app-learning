const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createHarness}=require('../tests/gas-harness.cjs');const root=path.resolve(__dirname,'..'),gas=createHarness(root);
const bridge=`<script>window.google={script:{get run(){let success,failure;return {withSuccessHandler(fn){success=fn;return this},withFailureHandler(fn){failure=fn;return this},rpc(operation,input){fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,input})}).then(r=>r.json()).then(success).catch(failure)}}}}};</script>`;
const render=name=>fs.readFileSync(path.join(root,'src',name+'.html'),'utf8').replace(/<\?!= include_\('([a-z]+)'\); \?>/g,(_,name)=>render(name));
const port=Number(process.argv[2]||8190);
http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(render('index').replace('<body>','<body>'+bridge+'<p class="notice">ローカル確認用：保存先はメモリです。GAS・Sheetsへの接続は行いません。</p>'));return;}
 if(req.method==='POST'&&req.url==='/rpc'){
  if(req.headers.origin!==`http://127.0.0.1:${port}`){res.writeHead(403).end();return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('large input');}const {operation,input}=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(gas.rpc(operation,input)));}catch{res.writeHead(400).end('{}');}return;
 }
 res.writeHead(404).end();
}).listen(port,'127.0.0.1',()=>console.log(`Local mock: http://127.0.0.1:${port}`));
