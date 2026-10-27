create table app_settings (
    id integer primary key check (id = 1),
    images_enabled boolean not null,
    ai_enabled boolean not null default false,
    default_user_id uuid references app_users(id) on delete set null,
    updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
revoke all on app_settings from anon, authenticated;
