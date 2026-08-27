-- OpenDesign hosted daemon metadata.
--
-- The application still exposes a synchronous better-sqlite3 repository to a
-- large amount of mature server code. In hosted mode that repository is an
-- in-memory compatibility cache; each logical SQLite row is persisted here as
-- ordinary Postgres data and restored on daemon boot. No app.sqlite object or
-- database snapshot bucket is used.

create table if not exists public.daemon_database_state (
  state_id text primary key check (state_id = 'singleton'),
  revision bigint not null default 0 check (revision >= 0),
  row_count bigint not null default 0 check (row_count >= 0),
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.daemon_table_rows (
  table_name text not null,
  row_key text not null,
  row_data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (table_name, row_key)
);

create index if not exists daemon_table_rows_table_idx
  on public.daemon_table_rows(table_name, updated_at desc);

-- These tables are intentionally service-role-only. The Express daemon
-- verifies the Supabase bearer token and project ownership before it calls
-- this adapter; exposing a browser policy here would bypass that route-level
-- authorization for the compatibility cache.
alter table public.daemon_database_state enable row level security;
alter table public.daemon_table_rows enable row level security;

comment on table public.daemon_table_rows is
  'Logical rows mirrored from the daemon synchronous repository; service-role only.';

comment on table public.daemon_database_state is
  'Revision marker for the daemon logical-row mirror; service-role only.';
