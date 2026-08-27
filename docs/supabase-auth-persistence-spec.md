# Supabase Auth and Hosted Persistence Specification

Status: implementation target for `feature/mobile-multi-screen-editor`

## Goal

Make the Render deployment restart-safe and user-scoped while preserving the
existing local desktop, workspace, preview-scope, and tool-token authorization
contracts.

Supabase is the hosted persistence boundary:

- Supabase Auth identifies a web user.
- Supabase Postgres stores project metadata, conversations, messages, tabs,
  ownership, and file manifests.
- Supabase Storage stores project file bytes and durable hosted-Bash workspace
  snapshots.
- The daemon remains the policy enforcement point for agent execution and
  project access.

The target architecture does not upload the SQLite database file: its logical
schema and data-access operations are migrated to Postgres. During that
migration, the hosted single-instance bridge may upload a consistent SQLite
backup to a private Supabase Storage bucket so Render restarts do not erase the
current metadata graph. The bridge is explicitly not a multi-replica database
and remains a transitional compatibility path.

## Non-goals

- Replacing existing desktop authentication or Vela/Workspace authorization.
- Exposing a Supabase service key to the browser.
- Running arbitrary host processes from hosted Bash.
- Making Supabase Storage behave as a direct POSIX mount.
- Solving multi-region concurrent shell execution in the first release.

## Current branch boundary

The branch currently has three independent state owners:

1. The web client uses the daemon API for project operations.
2. The daemon uses SQLite for metadata and local project storage for file bytes.
3. Hosted Bash uses a project-scoped `just-bash` `InMemoryFs`.

The hosted implementation must keep the in-memory filesystem as an execution
cache, but hydrate it from and flush it to durable storage. Project routes must
use the same storage abstraction as the browser file APIs so an agent-created
file is visible in the project browser.

## Identity and authorization model

### Web identity

The web runtime uses Supabase Auth with email/password as the first provider.
OAuth providers can be added later without changing daemon authorization.
The browser stores only the normal Supabase client session and publishes an
access token to API requests through an `Authorization: Bearer` header.

### Daemon identity

The daemon validates the Supabase access token and attaches a request principal:

```ts
type HostedPrincipal = {
  kind: 'supabase';
  userId: string;
  email?: string;
};
```

Missing or invalid hosted credentials receive `401`. A valid user requesting a
different user's project receives `403` or a project-not-found response,
according to the route's existing information-disclosure policy.

### Existing authorization remains valid

Supabase identity is one authorization input, not a replacement for the
existing gates:

- local loopback daemon requests keep local-origin validation;
- desktop/workspace authorization remains available for packaged/local use;
- API/tool tokens remain supported for explicitly scoped automation;
- project capabilities still distinguish read, comment, and write operations;
- team-project authority remains governed by the existing workspace model.

For hosted mode, Supabase ownership is the minimum project gate. A route must
never trust a caller-provided `userId` or use only a project ID as authority.

## Postgres model

The existing SQLite tables are ported to Postgres with these hosted additions:

```sql
profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ...existing project metadata...,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

project_files (
  project_id text not null references projects(id) on delete cascade,
  path text not null,
  size bigint not null,
  content_type text,
  content_hash text not null,
  storage_key text not null,
  revision bigint not null default 1,
  updated_at timestamptz not null,
  primary key (project_id, path)
)

bash_workspaces (
  project_id text primary key references projects(id) on delete cascade,
  revision bigint not null default 0,
  manifest_hash text,
  updated_at timestamptz not null
)
```

The existing conversations, messages, tabs, run, deployment, collaboration,
and other metadata tables are migrated with `owner_id` either directly or via
their project foreign key. The database migration must preserve the current
behavior of deletes, ordering, transactions, and nullable fields.

Row Level Security is enabled for browser-accessible tables. The daemon still
performs explicit project authorization because privileged server operations
use a server credential and therefore must not rely on RLS as an accidental
policy boundary.

## Storage model

Use a private bucket named by deployment configuration, defaulting to a
project-files bucket. Object keys are derived only from validated identifiers:

```text
projects/<project-id>/files/<relative-path>
```

The file manifest in Postgres is the authoritative index. Storage listing is
not used as the only source of truth because the application needs stable
ordering, hashes, revisions, and safe deletion semantics.

The following paths are never accepted as project files:

- absolute paths;
- traversal segments;
- paths that resolve outside the project root;
- control-plane or credential files;
- files exceeding the configured hosted limits.

## Hosted Bash durability

The hosted Bash manager keeps one serialized in-memory session per project.
On first use it loads the project manifest and file bytes into `InMemoryFs`.
After every command, including commands that exit non-zero after writing, it:

1. enumerates the virtual project files;
2. hashes and compares them with the loaded manifest;
3. uploads new or changed files;
4. deletes files removed by the command;
5. commits the new manifest/revision;
6. returns the command result only after the persistence attempt completes.

The in-memory session may be evicted or lost during a restart. The durable
workspace is the recovery source. Shell process state such as open descriptors
and uncommitted environment variables is intentionally not durable; the
working directory can be restored as metadata if needed.

Project routes and hosted Bash use the same `ProjectStorage` contract. This
prevents the shell workspace from becoming a second invisible project tree.

## Secrets and environment

Browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Daemon-only variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
SUPABASE_DB_URL
```

The service-role key must never use a `NEXT_PUBLIC_` prefix, be serialized in
an API response, or be bundled into client JavaScript. Render receives it only
as a secret environment variable.

## Request flows

### Browser project request

```text
Browser Supabase session
  → Bearer access token
  → daemon token verifier
  → hosted user principal
  → project ownership/capability gate
  → Postgres and/or Storage operation
```

### Hosted Bash request

```text
Bearer token or explicitly scoped tool token
  → authenticate caller
  → resolve project owner and capability
  → hydrate project workspace
  → execute hardened just-bash
  → persist file delta
  → return result
```

Tool-token requests must remain explicitly scoped. A tool token must not gain
access to every project belonging to the Supabase user.

## Rollout and rollback

1. Add Supabase configuration and health diagnostics without changing the
   default local mode.
2. Add the Postgres schema and a one-time import path for existing local data.
3. Add Supabase project storage and hosted-Bash hydration/flush tests.
4. Enable hosted persistence only when all required Supabase variables exist.
5. Keep local SQLite/filesystem mode as a deliberate development fallback.
6. If hosted initialization fails, fail clearly rather than silently writing to
   ephemeral Render storage.

Rollback is an environment/configuration change back to local mode. No code
path may delete local data during a failed hosted migration.

## Acceptance criteria

- A signed-out browser cannot list or mutate projects.
- A signed-in user sees only their projects.
- A user cannot read, write, export, deploy, or run Bash against another
  user's project by changing the project ID.
- A project survives daemon restart and Render redeploy.
- A file created with hosted Bash is visible through the project file API.
- A file deleted with hosted Bash is removed from the project file API and
  Storage manifest.
- Concurrent Bash calls for one project remain serialized.
- Invalid path and oversized-file checks remain enforced.
- Existing local/desktop and scoped tool-token tests remain green.
- The web and daemon production builds complete with hosted integration
  disabled when credentials are absent.
