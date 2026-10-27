-- Educational schema: one user, zero/one icon, many posts; explicit settings and receipts.
-- V1-V9 remain immutable so existing installations can migrate without a reset.
alter table app_users
    add column icon_bucket text,
    add column icon_key text,
    add column icon_type varchar(30);
update app_users u set icon_bucket=i.image_bucket,icon_key=i.image_key,icon_type=i.image_type
from user_icons i where i.user_id=u.id;
alter table app_users add constraint app_users_icon_complete check (
    (icon_bucket is null and icon_key is null and icon_type is null) or
    (icon_bucket is not null and length(trim(icon_bucket))>0 and
     icon_key is not null and length(trim(icon_key))>0 and
     icon_type is not null and icon_type in ('image/png','image/jpeg')));
-- Data has been copied; this table has no independent lifecycle or remaining references.
drop table user_icons;

create table allowed_ai_models (
    model_id varchar(90) primary key check (model_id ~ '^gemini-[a-z0-9.-]{1,80}$'),
    position integer not null unique check (position between 0 and 19)
);
insert into allowed_ai_models(model_id,position)
select model, (row_number() over(order by first_position)-1)::integer from (
    select trim(model) as model,min(ordinality) as first_position
    from app_settings, regexp_split_to_table(allowed_ai_models,E'[\\r\\n]+') with ordinality as items(model,ordinality)
    where trim(model)<>'' group by trim(model)
) normalized;
alter table app_settings drop column allowed_ai_models;
alter table allowed_ai_models enable row level security;
revoke all on allowed_ai_models from anon,authenticated;

-- A deleted post leaves a receipt, so a retry cannot silently resurrect it.
alter table post_requests alter column post_id drop not null;
update post_requests r set post_id=null where not exists(select 1 from posts p where p.id=r.post_id);
alter table post_requests add constraint post_requests_post_fk
    foreign key(post_id) references posts(id) on delete set null;
create unique index post_requests_post_idx on post_requests(post_id) where post_id is not null;
alter table post_requests add constraint post_requests_fingerprint_format check(fingerprint ~ '^[0-9a-f]{64}$');
alter table posts add constraint posts_version_nonnegative check(version>=0);
alter table posts add constraint posts_image_location_nonblank check (
    image_key is null or (length(trim(image_bucket))>0 and length(trim(image_key))>0));
drop index posts_user_created;
create index posts_image_reference_idx on posts(image_bucket,image_key) where image_key is not null;
create index app_users_icon_reference_idx on app_users(icon_bucket,icon_key) where icon_key is not null;

-- Retired operational data is not an app dependency. Preserve populated historical
-- tables outside the active schema; a new installation has nothing to archive.
do $$
declare
    retired text;
    populated boolean;
    archive_schema text := current_schema() || '_legacy';
begin
    foreach retired in array array['operation_events','ai_requests'] loop
        execute format('select exists(select 1 from %I)',retired) into populated;
        if populated then
            if length(archive_schema)>63 then raise exception 'Archive schema name exceeds 63 characters'; end if;
            execute format('create schema if not exists %I',archive_schema);
            execute format('revoke all on schema %I from public,anon,authenticated',archive_schema);
            execute format('alter table %I set schema %I',retired,archive_schema);
        else
            execute format('drop table %I',retired);
        end if;
    end loop;
end $$;
