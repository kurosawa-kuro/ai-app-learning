CREATE TABLE shop_products(id uuid PRIMARY KEY,name varchar(120) NOT NULL,description text NOT NULL,price bigint NOT NULL CHECK(price BETWEEN 0 AND 10000000),active boolean NOT NULL DEFAULT true);
CREATE TABLE shop_orders(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_users(id),fingerprint varchar(64) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),cancelled_at timestamptz);
CREATE TABLE shop_items(order_id uuid NOT NULL REFERENCES shop_orders(id),product_id uuid NOT NULL REFERENCES shop_products(id),product_name varchar(120) NOT NULL,unit_price bigint NOT NULL CHECK(unit_price>=0),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),PRIMARY KEY(order_id,product_id));
CREATE INDEX shop_orders_user_created ON shop_orders(user_id,created_at DESC,id);
INSERT INTO shop_products VALUES('10000000-0000-0000-0000-000000000001','色を楽しむノート','身近な発見を書き残す、架空の教材用ノートです。',500,true),('10000000-0000-0000-0000-000000000002','小さなペンケース','持ち歩く道具をまとめる、架空の教材用商品です。',800,true),('10000000-0000-0000-0000-000000000003','学習カードセット','学んだことを一枚ずつ整理する、架空の教材用商品です。',1200,true);
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON shop_products,shop_orders,shop_items FROM anon,authenticated;
