# OpenDesign hosted Supabase setup

The migration in `migrations/0001_hosted_persistence_foundation.sql` creates
the Auth-owned project/file/workspace foundation and a private
`open-design-projects` Storage bucket. Run it once from the Supabase SQL
editor or with the Supabase CLI.

For the current hosted Auth + file-storage slice, configure Render with:

```text
OD_HOST=0.0.0.0
OD_HOSTED_AUTH_REQUIRED=1
OD_PROJECT_STORAGE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
SUPABASE_STORAGE_BUCKET=open-design-projects
NEXT_PUBLIC_OD_HOSTED_AUTH_REQUIRED=1
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`SUPABASE_SERVICE_ROLE_KEY` belongs only in Render's server environment. Never
use it in a `NEXT_PUBLIC_*` variable. The browser uses the publishable key and
the daemon verifies its access token before project operations.

Important current boundary: the daemon's full metadata graph (conversations,
messages, runs, tabs, deployments, and collaboration state) still uses its
SQLite adapter. The migration is the Postgres foundation; it does not yet make
that entire graph restart-safe. Complete project/database durability requires
the follow-up Postgres adapter and SQLite import/synchronization work described
in `docs/supabase-auth-persistence-implementation.md`.
