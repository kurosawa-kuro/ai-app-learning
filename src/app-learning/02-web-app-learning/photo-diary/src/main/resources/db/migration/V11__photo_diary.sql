create table diary_entries (
 id uuid primary key,
 user_id uuid not null references app_users(id) on delete restrict,
 entry_date date not null,
 title varchar(120) not null check(length(trim(title))>0),
 body varchar(5000) not null check(length(trim(body))>0),
 fingerprint char(64) not null,
 created_at timestamptz not null default now()
);
create table diary_tags (
 entry_id uuid not null references diary_entries(id) on delete cascade,
 tag varchar(30) not null check(length(trim(tag))>0),
 primary key(entry_id,tag)
);
create table diary_photos (
 id uuid primary key,
 entry_id uuid not null references diary_entries(id) on delete cascade,
 position integer not null check(position between 0 and 2),
 image_bucket text not null,
 image_key text not null,
 image_type varchar(30) not null check(image_type in ('image/png','image/jpeg')),
 unique(entry_id,position), unique(image_bucket,image_key)
);
create index diary_feed_idx on diary_entries(entry_date desc,created_at desc,id);
create index diary_user_idx on diary_entries(user_id);
create index diary_tag_idx on diary_tags(tag,entry_id);
alter table diary_entries enable row level security;
alter table diary_tags enable row level security;
alter table diary_photos enable row level security;
revoke all on diary_entries,diary_tags,diary_photos from anon,authenticated;
