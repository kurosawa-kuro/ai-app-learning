alter table posts add column version bigint not null default 0;
create table post_requests (
    request_id uuid primary key,
    fingerprint varchar(64) not null,
    post_id uuid not null,
    created_at timestamptz not null default now()
);
create table operation_events (
    id uuid primary key,
    operation varchar(80) not null,
    result varchar(30) not null,
    reference varchar(120),
    created_at timestamptz not null default now()
);
create index operation_events_created on operation_events(created_at desc);
alter table post_requests enable row level security;
alter table operation_events enable row level security;
revoke all on post_requests, operation_events from anon, authenticated;
