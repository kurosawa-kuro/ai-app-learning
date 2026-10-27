package com.example.webapptemplate;
import com.example.webapptemplate.shop.ShopService;
import com.example.webapptemplate.authors.AuthorOperations;
import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.transaction.annotation.Transactional;import org.springframework.jdbc.core.simple.JdbcClient;import java.util.*;import static org.assertj.core.api.Assertions.*;
@SpringBootTest @Transactional class ShopTests {
 @Autowired ShopService shop;@Autowired AuthorOperations users;@Autowired JdbcClient db;
 @Test void snapshotsPricesAndRejectsChangedPricesAndReplaysOnlyIdenticalOrders(){
  var user=users.addAuthor("注文確認");var a=UUID.fromString("10000000-0000-0000-0000-000000000001");var b=UUID.fromString("10000000-0000-0000-0000-000000000002");var qty=Map.of(a,2,b,1);var prices=Map.of(a,500L,b,800L);var id=UUID.randomUUID();
  assertThat(shop.preview(qty).stream().mapToLong(ShopService.Line::total).sum()).isEqualTo(1800);
  shop.order(id,user,qty,prices);shop.order(id,user,qty,prices);assertThat(shop.items(id)).hasSize(2);assertThat(shop.detail(id).total()).isEqualTo(1800);
  db.sql("update shop_products set price=600 where id=:id").param("id",a).update();assertThat(shop.detail(id).total()).isEqualTo(1800);
  assertThatThrownBy(()->shop.order(UUID.randomUUID(),user,qty,prices)).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->shop.order(id,user,Map.of(a,1),Map.of(a,500L))).isInstanceOf(IllegalArgumentException.class);
  shop.cancel(id);shop.cancel(id);assertThat(shop.detail(id).cancelledAt()).isNotNull();
  assertThatThrownBy(()->users.deleteAuthor(user)).isInstanceOf(IllegalArgumentException.class);
 }
}
