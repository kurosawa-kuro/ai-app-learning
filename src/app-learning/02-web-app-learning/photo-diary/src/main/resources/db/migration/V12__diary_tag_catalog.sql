create table diary_tag_catalog (
 id uuid primary key default gen_random_uuid(),
 name varchar(30) not null unique check(length(trim(name)) > 0 and name !~ '[,、]'),
 version bigint not null default 0
);
insert into diary_tag_catalog(name) select distinct tag from diary_tags;
insert into diary_tag_catalog(name) values ('散歩'),('発見'),('食事'),('学び'),('日常') on conflict do nothing;
alter table diary_tags add column tag_id uuid;
update diary_tags t set tag_id=c.id from diary_tag_catalog c where c.name=t.tag;
alter table diary_tags alter column tag_id set not null;
alter table diary_tags drop constraint diary_tags_pkey;
drop index diary_tag_idx;
alter table diary_tags drop column tag;
alter table diary_tags add primary key(entry_id,tag_id);
alter table diary_tags add foreign key(tag_id) references diary_tag_catalog(id) on delete restrict;
create index diary_tag_idx on diary_tags(tag_id,entry_id);
alter table diary_tag_catalog enable row level security;
revoke all on diary_tag_catalog from anon,authenticated;
