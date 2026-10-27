create table app_users (
    id uuid primary key,
    name varchar(80) not null check (length(trim(name)) > 0),
    created_at timestamptz not null default now()
);

create table posts (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete restrict,
    title varchar(120) not null check (length(trim(title)) > 0),
    body varchar(5000) not null default '',
    image_bucket text,
    image_key text,
    image_type varchar(30),
    created_at timestamptz not null default now(),
    check ((image_bucket is null and image_key is null and image_type is null)
        or (image_bucket is not null and image_key is not null and image_type in ('image/png', 'image/jpeg')))
);
create index posts_user_created on posts(user_id, created_at desc);
alter table app_users enable row level security;
alter table posts enable row level security;
revoke all on app_users, posts from anon, authenticated;
