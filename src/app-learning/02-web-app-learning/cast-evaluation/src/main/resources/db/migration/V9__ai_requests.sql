create table ai_requests (
 request_id uuid primary key,
 owner_id varchar(64) not null,
 fingerprint varchar(64) not null,
 purpose varchar(40) not null default 'post-draft',
 prompt_version varchar(40) not null,
 model varchar(90) not null,
 state varchar(12) not null default 'RUNNING' check (state in ('RUNNING','SUCCESS','FAILED','UNKNOWN','EXPIRED')),
 result_text varchar(5000) not null default '',
 message varchar(300) not null default '生成中です。',
 created_at timestamptz not null default now()
);
alter table ai_requests enable row level security;
revoke all on ai_requests from anon,authenticated;
-- PostgreSQL CHECK permits UNKNOWN; require a non-null type explicitly.
alter table posts add constraint posts_image_type_present check (image_key is null or image_type is not null);
