-- Match the stable feed ordering, both globally and within an author filter.
create index posts_feed_order_idx on posts (created_at desc, id);
create index posts_user_feed_order_idx on posts (user_id, created_at desc, id);
