alter table shop_products add constraint shop_product_name_nonblank check(length(trim(name)) > 0);
alter table shop_items add constraint shop_item_name_nonblank check(length(trim(product_name)) > 0);
alter table shop_orders add constraint shop_order_fingerprint_format check(fingerprint ~ '^[0-9a-f]{64}$');
alter table shop_orders add constraint shop_order_cancel_time check(cancelled_at is null or cancelled_at >= created_at);
create index shop_orders_created on shop_orders(created_at desc,id);
