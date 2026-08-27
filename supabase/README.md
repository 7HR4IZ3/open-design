# OpenDesign hosted Supabase setup

Run `migrations/0001_hosted_persistence_foundation.sql` and
`migrations/0002_daemon_postgres_metadata.sql` from the Supabase SQL editor or
with the Supabase CLI. They create Auth-owned projects, private project-file
Storage, file manifests, and the Postgres-backed daemon metadata mirror.

Configure Render with:

```text
OD_HOST=0.0.0.0
OD_HOSTED_AUTH_REQUIRED=1
OD_PROJECT_STORAGE=supabase
OD_DAEMON_DB=postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
SUPABASE_STORAGE_BUCKET=open-design-projects
SUPABASE_DB_TABLE=daemon_table_rows
SUPABASE_DB_STATE_TABLE=daemon_database_state
SUPABASE_DB_FLUSH_INTERVAL_MS=15000
NEXT_PUBLIC_OD_HOSTED_AUTH_REQUIRED=1
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`SUPABASE_SERVICE_ROLE_KEY` belongs only in Render's server environment. Never
use it in a `NEXT_PUBLIC_*` variable. The browser uses the publishable key and
the daemon verifies its access token before project operations.

`OD_DAEMON_DB=postgres` keeps the daemon's existing synchronous repository
interface over an in-memory SQLite compatibility cache. The cache is hydrated
from `daemon_table_rows` on boot and flushed to Postgres after mutations, on a
short debounce, periodically, and during shutdown. Conversations, messages,
tabs, runs, deployments, collaboration rows, and future SQLite tables all use
the same logical-row mirror, while `projects` and `project_files` also have
explicit relational tables for ownership and file manifests.

The daemon imports an existing local `app.sqlite` once when the Postgres row
store is empty, then removes the local SQLite artifacts after the first
successful flush. It never uploads the SQLite file to Supabase Storage.

The service-role key belongs only in Render's server environment. The browser
uses the publishable key; the daemon verifies its bearer token and checks
project ownership before metadata, file, Bash, run, or deployment operations.
