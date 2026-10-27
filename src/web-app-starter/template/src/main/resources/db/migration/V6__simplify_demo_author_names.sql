-- Update the original display names only; preserve IDs, icons, posts and custom names.
update app_users
set name = replace(name, '（サンプル）', '')
where name in ('青木 はるか（サンプル）', '佐藤 蓮（サンプル）', '森 美緒（サンプル）');
