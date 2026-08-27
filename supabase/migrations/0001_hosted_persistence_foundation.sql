-- OpenDesign hosted persistence foundation.
--
-- The daemon currently uses SQLite for its complete local metadata graph. This
-- migration establishes the hosted ownership/file/workspace tables that the
-- Supabase adapter will use while the remaining conversation/run tables are
-- ported. Keep the bucket private: the daemon's service-role client is the
-- only storage client in the hosted deployment.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  skill_id text,
  design_system_id text,
  pending_prompt text,
  metadata jsonb,
  custom_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects(owner_id, updated_at desc);

create table if not exists public.project_files (
  project_id text not null references public.projects(id) on delete cascade,
  path text not null,
  size bigint not null check (size >= 0),
  content_type text,
  content_hash text not null,
  storage_key text not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (project_id, path)
);

create table if not exists public.bash_workspaces (
  project_id text primary key references public.projects(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  manifest_hash text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.bash_workspaces enable row level security;

create policy "profiles_owner_read"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_owner_update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_owner_all"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "project_files_owner_all"
  on public.project_files for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.owner_id = auth.uid()
    )
  );

create policy "bash_workspaces_owner_all"
  on public.bash_workspaces for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = bash_workspaces.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = bash_workspaces.project_id and p.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('open-design-projects', 'open-design-projects', false)
on conflict (id) do update set public = false;

create or replace function public.handle_new_open_design_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_open_design on auth.users;
create trigger on_auth_user_created_open_design
  after insert on auth.users
  for each row execute procedure public.handle_new_open_design_user();
