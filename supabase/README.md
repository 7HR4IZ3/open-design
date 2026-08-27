# OpenDesign hosted Supabase setup

The migration in `migrations/0001_hosted_persistence_foundation.sql` creates
the Auth-owned project/file/workspace foundation plus private
`open-design-projects` and `open-design-database` Storage buckets. Run it once
from the Supabase SQL editor or with the Supabase CLI.

For the current hosted Auth + file-storage slice, configure Render with:

```text
OD_HOST=0.0.0.0
OD_HOSTED_AUTH_REQUIRED=1
OD_PROJECT_STORAGE=supabase
OD_DAEMON_DB=supabase-snapshot
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
SUPABASE_STORAGE_BUCKET=open-design-projects
SUPABASE_DATABASE_BUCKET=open-design-database
OD_DAEMON_DB_RESTORE=if-missing
NEXT_PUBLIC_OD_HOSTED_AUTH_REQUIRED=1
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`SUPABASE_SERVICE_ROLE_KEY` belongs only in Render's server environment. Never
use it in a `NEXT_PUBLIC_*` variable. The browser uses the publishable key and
the daemon verifies its access token before project operations.

`OD_DAEMON_DB=supabase-snapshot` is the transitional single-instance bridge:
the daemon keeps its synchronous SQLite API, but uploads a consistent
`app.sqlite` backup to the private `open-design-database` bucket, restores it
on boot, flushes after mutations, and retries on a periodic interval. This
makes the current metadata graph (conversations, messages, runs, tabs,
deployments, and collaboration state) restart-safe on a single Render
instance. It is not a multi-replica Postgres database; the eventual
relational adapter and SQLite import path remain follow-up work.

Set `OD_DAEMON_DB_RESTORE=always` only when the Supabase snapshot is the
authoritative copy for an existing local data directory; the default
`if-missing` mode leaves a usable local SQLite database in place.
