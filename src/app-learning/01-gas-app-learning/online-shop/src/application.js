const APP = {
  kind:'online-shop-cr-v1',title:'学びのショップ',
  tables:{
    users:['id','name'],products:['id','name','price','active'],
    orders:['id','user_id','created_at','fingerprint'],
    order_items:['order_id','product_id','product_name','unit_price','quantity','fingerprint']
  },
  seed:{
    users:[{id:'user-haruka',name:'教材 はるか'},{id:'user-sora',name:'教材 そら'}],
    products:[{id:'product-cards',name:'学習カードセット',price:'1200',active:'true'},{id:'product-pen',name:'小さなペンケース',price:'800',active:'true'},{id:'product-notebook',name:'学びのノート',price:'600',active:'true'}]
  }
};
function orderDetail_(order, users, allItems) {
  const user=users.find(u=>u.id===order.user_id);require_(user,'注文者のデータを確認してください。');
  const items=allItems.filter(i=>i.order_id===order.id).map(row=>({...row,unit_price:int_(row.unit_price,1e6,'保存単価'),quantity:int_(row.quantity,99,'保存数量')}));
  require_(items.length>0 && new Set(items.map(i=>i.product_id)).size===items.length && items.every(i=>i.quantity>0 && i.fingerprint===order.fingerprint),'注文の明細が不整合です。保存データを確認してください。');
  return {...order,userName:user.name,items,total:items.reduce((sum,i)=>sum+i.unit_price*i.quantity,0)};
}
const Operations = {
  catalog() {
    return {users:Store.read('users'),products:Store.read('products').filter(p=>p.active==='true').map(p=>({...p,price:int_(p.price,1e6,'商品価格')}))};
  },
  orders(input) {
    const user=text_(input.userId,80,'注文する人'), users=Store.read('users');require_(users.some(u=>u.id===user),'注文する人を選び直してください。');
    const items=Store.read('order_items');
    return Store.read('orders').filter(o=>o.user_id===user).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).map(o=>orderDetail_(o,users,items));
  },
  detail(input) {
    const order=Store.read('orders').find(o=>o.id===input.id && o.user_id===input.userId);
    require_(order,'選択中の人の注文が見つかりません。');return orderDetail_(order,Store.read('users'),Store.read('order_items'));
  },
  createOrder(input) {
    const id=requestId_(input.requestId), user=text_(input.userId,80,'注文する人');
    require_(Array.isArray(input.items) && input.items.length>0 && input.items.length<=20,'商品と数量を指定してください。');
    const selected=input.items.map(item=>{
      require_(item && typeof item==='object','注文内容を確認してください。');
      const productId=text_(item.productId,80,'商品'), quantity=int_(item.quantity,99,'数量'), price=int_(item.price,1e6,'表示価格');
      require_(quantity>0,'数量は1〜99個です。');return {productId,quantity,price};
    }).sort((a,b)=>a.productId.localeCompare(b.productId));
    require_(new Set(selected.map(i=>i.productId)).size===selected.length,'同じ商品を重複指定できません。');
    const fingerprint=hash_([user,selected]), orders=Store.read('orders'), users=Store.read('users'), allItems=Store.read('order_items');
    const existing=orders.find(o=>o.id===id);
    if(existing){require_(existing.fingerprint===fingerprint,'送信済みの注文内容と異なります。');return orderDetail_(existing,users,allItems);}
    require_(users.some(u=>u.id===user),'注文する人を選び直してください。');
    const pending=allItems.filter(i=>i.order_id===id);
    require_(new Set(pending.map(i=>i.product_id)).size===pending.length && pending.every(i=>i.fingerprint===fingerprint && selected.some(s=>s.productId===i.product_id && String(s.price)===i.unit_price && String(s.quantity)===i.quantity)),'途中保存の注文内容と異なります。同じ内容で再試行してください。');
    const products=Store.read('products'), missing=[];
    selected.forEach(item=>{
      if(pending.some(p=>p.product_id===item.productId))return;
      const product=products.find(p=>p.id===item.productId);
      require_(product && product.active==='true' && int_(product.price,1e6,'商品価格')===item.price,'商品の価格・販売状態が変わりました。商品を再読込して確認してください。');
      missing.push({order_id:id,product_id:product.id,product_name:product.name,unit_price:String(item.price),quantity:String(item.quantity),fingerprint});
    });
    // 明細→親の順。途中停止後は同じ要求IDで不足行だけ追加する。
    Store.append('order_items',missing);
    const row={id,user_id:user,created_at:now_(),fingerprint};Store.append('orders',[row]);
    return orderDetail_(row,users,pending.concat(missing));
  }
};
