package com.example.webapptemplate.shop;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.platform.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.simple.JdbcClient;
import java.util.*;
import java.time.OffsetDateTime;
@Service public class ShopService {
 public record Product(UUID id,String name,String description,long price,boolean active){}
 public record Line(UUID productId,String productName,long unitPrice,int quantity){public long total(){return Math.multiplyExact(unitPrice,quantity);}}
 public record Order(UUID id,UUID userId,String name,OffsetDateTime createdAt,OffsetDateTime cancelledAt,long total){public String createdLabel(){return java.time.format.DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(java.time.ZoneId.of("Asia/Tokyo")).format(createdAt);}}
 private final JdbcClient db;private final UnitOfWork tx;private final AuthorOperations users;
 public ShopService(JdbcClient db,UnitOfWork tx,AuthorOperations users){this.db=db;this.tx=tx;this.users=users;}
 public List<Product> products(){return db.sql("select * from shop_products where active order by name,id").query(Product.class).list();}
 public Product product(UUID id){return db.sql("select * from shop_products where id=:id").param("id",id).query(Product.class).optional().orElseThrow(()->new MissingEntity("商品が見つかりません。"));}
 private List<Line> lines(Map<UUID,Integer> quantities,Map<UUID,Long> prices,boolean lock){
  if(quantities==null||quantities.isEmpty()||quantities.size()>20)throw new IllegalArgumentException("商品を1つ以上選んでください。");
  if(quantities.values().stream().anyMatch(n->n==null||n<1||n>99))throw new IllegalArgumentException("数量は1〜99個です。");
  var products=db.sql("select * from shop_products where id in (:ids) order by id"+(lock?" for update":"")).param("ids",quantities.keySet()).query(Product.class).list();
  if(products.size()!=quantities.size())throw new IllegalArgumentException("商品が見つかりません。");
  var lines=new ArrayList<Line>();
  for(var p:products){if(!p.active()||(prices!=null&&!Objects.equals(prices.get(p.id()),p.price())))throw new IllegalArgumentException("商品の価格・販売状態が変わりました。商品一覧から確認し直してください。");lines.add(new Line(p.id(),p.name(),p.price(),quantities.get(p.id())));}
  return List.copyOf(lines);
 }
 public List<Line> preview(Map<UUID,Integer> quantities){return lines(quantities,null,false);}
 public UUID order(UUID id,UUID user,Map<UUID,Integer> quantities,Map<UUID,Long> prices){
  if(id==null||user==null||quantities.isEmpty()||quantities.size()>20||!quantities.keySet().equals(prices.keySet()))throw new IllegalArgumentException("注文内容を確認してください。");
  var hash=fingerprint(user,quantities,prices);
  return tx.execute(()->{
   db.sql("select pg_advisory_xact_lock(hashtextextended(:id,0))").param("id",id.toString()).query((r,n)->1).single();
   var existing=db.sql("select fingerprint from shop_orders where id=:id").param("id",id).query(String.class).optional();if(existing.isPresent()){if(!existing.get().equals(hash))throw new IllegalArgumentException("確定済みの注文内容と異なります。");return id;}
   users.requireAuthor(user);var lines=lines(quantities,prices,true);
   db.sql("insert into shop_orders(id,user_id,fingerprint) values(:id,:user,:hash)").param("id",id).param("user",user).param("hash",hash).update();
   for(var line:lines)db.sql("insert into shop_items values(:order,:product,:name,:price,:qty)").param("order",id).param("product",line.productId()).param("name",line.productName()).param("price",line.unitPrice()).param("qty",line.quantity()).update();return id;
  });
 }
 public List<Order> orders(){return db.sql("select o.id,o.user_id,u.name,o.created_at,o.cancelled_at,sum(i.unit_price*i.quantity)::bigint as total from (select id from shop_orders order by created_at desc,id limit 30) recent join shop_orders o on o.id=recent.id join app_users u on u.id=o.user_id join shop_items i on i.order_id=o.id group by o.id,u.name order by o.created_at desc,o.id").query(Order.class).list();}
 public List<Line> items(UUID id){return db.sql("select product_id,product_name,unit_price,quantity from shop_items where order_id=:id order by product_name,product_id").param("id",id).query(Line.class).list();}
 public Order detail(UUID id){return db.sql("select o.id,o.user_id,u.name,o.created_at,o.cancelled_at,sum(i.unit_price*i.quantity)::bigint as total from shop_orders o join app_users u on u.id=o.user_id join shop_items i on i.order_id=o.id where o.id=:id group by o.id,u.name").param("id",id).query(Order.class).optional().orElseThrow(()->new MissingEntity("注文が見つかりません。"));}
 public void cancel(UUID id){detail(id);db.sql("update shop_orders set cancelled_at=coalesce(cancelled_at,now()) where id=:id").param("id",id).update();}
 private String fingerprint(UUID user,Map<UUID,Integer> quantities,Map<UUID,Long> prices){try{var d=java.security.MessageDigest.getInstance("SHA-256");d.update(user.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));for(var id:quantities.keySet().stream().sorted().toList())d.update((id+":"+quantities.get(id)+":"+prices.get(id)+";").getBytes(java.nio.charset.StandardCharsets.UTF_8));return HexFormat.of().formatHex(d.digest());}catch(Exception e){throw new IllegalStateException(e);}}
}
