const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function createHarness(root=path.resolve(__dirname,'..'),initialize=true){
 const sheets=new Map(),properties=new Map();let held=false,fault=null;
 const checkFault=(sheet,phase)=>{if(fault?.sheet===sheet&&fault.phase===phase){fault=null;throw Error('simulated storage failure');}};
 class Sheet{
  constructor(name){this.name=name;this.rows=[];this.maxRows=1000;}
  getLastRow(){return this.rows.length;}getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));}getMaxRows(){return this.maxRows;}
  insertRowsAfter(_after,count){this.maxRows+=count;}setFrozenRows(){}
  getRange(row,col,count,width){const sheet=this;return{
   getDisplayValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>String(sheet.rows[row-1+i]?.[col-1+j]??'')));},
   setNumberFormat(){return this;},
   setRichTextValues(values){checkFault(sheet.name,'before');values.forEach((r,i)=>{sheet.rows[row-1+i]??=[];r.forEach((v,j)=>sheet.rows[row-1+i][col-1+j]=v.text);});checkFault(sheet.name,'after');return this;}
  };}
 }
 const book={getId:()=> 'test-book',getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>{if(sheets.has(name))throw Error('duplicate sheet');const s=new Sheet(name);sheets.set(name,s);return s;}};
 const context=vm.createContext({console,SpreadsheetApp:{getActiveSpreadsheet:()=>book,openById:id=>{if(id!=='test-book')throw Error('unknown book');return book;},flush(){},newRichTextValue:()=>({setText(text){this.text=text;return this;},build(){return {text:this.text};}})},PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key)||null,setProperty:(key,value)=>properties.set(key,value)})},LockService:{getScriptLock:()=>({tryLock(){if(held)return false;held=true;return true;},releaseLock(){held=false;}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_algorithm,text)=>Array.from(crypto.createHash('sha256').update(text).digest()),formatDate:()=> '2026-10-28 12:00:00'}});
 for(const file of ['store.js','application.js','web.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),context,{filename:file});
 if(initialize)context.initializeApp();
 return {rpc:(op,input={})=>JSON.parse(JSON.stringify(context.rpc(op,input))),initialize:()=>context.initializeApp(),rows:name=>sheets.get(name).rows,properties,sheets,failNext:(sheet,phase='before')=>fault={sheet,phase},isLocked:()=>held};
}
module.exports={createHarness};
