const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHarness}=require('./gas-harness.cjs');
const ok=result=>{assert.equal(result.ok,true,result.error);return result.data;};

const record=(overrides={})=>({requestId:randomUUID(),memberId:'member-aoi',businessDate:'2026-10-01',drinks:2,bottles:1,nominations:1,accompaniments:1,sales:6000,...overrides});
test('メンバー登録と実績の作成・再読込・月の絞込み',()=>{
 const h=createHarness(),m=ok(h.rpc('createMember',{requestId:randomUUID(),name:'=1+1 <script>alert(1)</script>'}));
 ok(h.rpc('createRecord',record({memberId:m.id})));
 const view=ok(h.rpc('overview',{month:'2026-10'}));assert.equal(view.records.length,1);assert.equal(view.members.find(x=>x.id===m.id).name,m.name);assert.equal(view.results.find(x=>x.id===m.id).points,15);
 assert.equal(ok(h.rpc('overview',{month:'2026-11'})).records.length,0);
});
test('同一日・同一メンバーの重複と不正入力を拒否',()=>{
 const h=createHarness();ok(h.rpc('createRecord',record()));
 for(const overrides of [{},{businessDate:'2026-02-30'},{drinks:-1},{sales:1.5},{memberId:'missing'},{businessDate:'2200-01-01'}])assert.equal(h.rpc('createRecord',record(overrides)).ok,false);
 assert.equal(h.rows('daily_records').length,2);
});
test('保存後の応答消失を再送しても1件。内容変更した同一IDは拒否',()=>{
 const h=createHarness(),payload=record();h.failNext('daily_records','after');assert.equal(h.rpc('createRecord',payload).ok,false);assert.equal(h.isLocked(),false);
 ok(h.rpc('createRecord',payload));assert.equal(h.rows('daily_records').length,2);assert.equal(h.rpc('createRecord',{...payload,drinks:3}).ok,false);
});
test('月合計に売上配点し、同点同売上は1,1,3位',()=>{
 const h=createHarness();h.rows('evaluation_rules').find(r=>r[0]==='SALES')[3]='true';
 const third=ok(h.rpc('createMember',{requestId:randomUUID(),name:'教材 みどり'}));
 for(const memberId of ['member-aoi','member-sakura'])for(const businessDate of ['2026-10-01','2026-10-02'])ok(h.rpc('createRecord',record({memberId,businessDate})));
 const rows=ok(h.rpc('overview',{month:'2026-10'})).results;assert.deepEqual(rows.map(r=>r.rank),[1,1,3]);assert.equal(rows[0].points,31);assert.equal(rows[2].id,third.id);
});
test('売上を同点時の順位に使う。ルール不整合は説明を表示',()=>{
 const h=createHarness();ok(h.rpc('createRecord',record()));ok(h.rpc('createRecord',record({memberId:'member-sakura',sales:8000})));
 assert.equal(ok(h.rpc('overview',{month:'2026-10'})).results[0].id,'member-sakura');h.rows('evaluation_rules')[1][1]='0';assert.equal(h.rpc('overview',{month:'2026-10'}).ok,false);
});

test('初期化の再実行は非破壊。登録済み表の欠落は再作成しない',()=>{
 const h=createHarness(),before=JSON.stringify(h.rows('members'));h.initialize();assert.equal(JSON.stringify(h.rows('members')),before);h.sheets.delete('members');assert.throws(()=>h.initialize());assert.equal(h.sheets.has('members'),false);
});
test('未初期化と列不整合は停止。公開操作は許可したものだけ',()=>{
 const h=createHarness(undefined,false);assert.equal(h.rpc('catalog').ok,false);h.initialize();h.rows('members')[0][0]='wrong';assert.throws(()=>h.initialize());assert.equal(h.rpc('toString').ok,false);assert.equal(h.rpc('initializeApp').ok,false);
});
