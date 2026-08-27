# Supabase Auth and Persistence Implementation Plan

This is the execution checklist for the companion specification.

## Current implementation checkpoint

The current branch now contains the hosted implementation:

- opt-in Supabase Auth with email/password sign-in, sign-up, session restore,
  sign-out, bearer transport, and daemon token verification;
- server-side project ownership attribution and ownership gates;
- a private Supabase Storage adapter with path validation, recursive listing,
  mirroring for preview code, and explicit delete/write behavior;
- project-scoped `just-bash` hydration and flush across daemon restarts when
  `OD_PROJECT_STORAGE=supabase` is enabled;
- an in-memory SQLite compatibility cache backed by Supabase Postgres logical
  rows (`daemon_table_rows`), with legacy `app.sqlite` import and cleanup;
- private Supabase Storage project files plus `project_files` manifests,
  content hashes, revisions, ownership metadata, and the 50 MiB file limit;
- project-file route wiring, upload/Figma synchronization, durable Bash
  hydrate/flush, and a terminal agent-run persistence boundary;
- the hosted migrations in `supabase/migrations/0001_hosted_persistence_foundation.sql`
  and `0002_daemon_postgres_metadata.sql`.

The compatibility cache preserves the daemon's mature synchronous SQL call
surface while the durable source of truth is Postgres. The hosted process does
not create or upload `app.sqlite`; only a pre-existing local file is accepted
as a one-time migration source when the remote row store is empty.

## Phase 0 — committed design baseline

- [x] Document current SQLite, local project-file, and `InMemoryFs` owners.
- [x] Define hosted identity, ownership, file manifest, and Bash recovery
  contracts.
- [x] Define secret handling, rollout, rollback, and acceptance criteria.

## Phase 1 — configuration and clients

- [x] Add daemon-only Supabase server clients for Auth and Storage.
- [x] Add a browser Supabase client module with safe public variables.
- [x] Add strict configuration parsing and actionable startup diagnostics.
- [x] Add dependency versions compatible with the repository's Node and pnpm
  baseline.
- [x] Keep local mode working when hosted variables are absent.

## Phase 2 — authentication

- [x] Add email/password sign-up, sign-in, sign-out, and session restoration.
- [x] Add an auth gate/loading state to the web shell.
- [x] Add a client API wrapper that sends the current access token.
- [x] Add daemon middleware for Bearer-token verification.
- [x] Expose a minimal authenticated-user/health endpoint without leaking
  secrets.
- [x] Preserve local desktop and explicitly scoped tool-token paths.

## Phase 3 — Postgres persistence

- [x] Create the hosted persistence foundation migration.
- [x] Port project metadata and ownership into the live hosted database path.
- [x] Persist conversations, messages, tabs, and required run metadata through
  the logical-row mirror.
- [x] Add ownership-aware project queries and indexes.
- [x] Add RLS policies for browser-accessible relational tables; keep the
  service-role-only compatibility tables closed to direct browser access.
- [x] Add one-time import tooling for an existing SQLite database at startup.
- [x] Keep the synchronous SQLite compatibility cache in memory only during
  the migration window.

## Phase 4 — project file storage

- [x] Implement `SupabaseProjectStorage` against the private bucket.
- [x] Store file metadata and content hashes in `project_files`.
- [x] Make writes idempotent and deletes explicit.
- [x] Enforce path, project ownership, file-size, and content-type limits.
- [x] Wire project file APIs, uploads, Figma imports, and legacy direct-write
  paths through the selected storage adapter.
- [x] Seed existing local project files into the remote manifest on first open.

## Phase 5 — durable hosted Bash

- [x] Add a filesystem hydration layer for one project.
- [x] Add file enumeration, hashing, delta upload, and deletion detection.
- [x] Flush changes after successful and non-zero command exits.
- [x] Keep the per-project execution queue and flush before session eviction.
- [x] Handle persistence failure as a visible command failure with retry-safe
  state, not as a successful invisible write.
- [x] Keep temporary/interpreter-only state ephemeral.

## Phase 6 — route authorization and compatibility

- [x] Require hosted identity on hosted project routes.
- [x] Resolve ownership from the server-side project row, never request input.
- [x] Apply the same ownership gate to chat, files, exports, deployments,
  previews, terminal/Bash, runs, and conversations.
- [x] Verify team/workspace routes retain their existing authority semantics.
- [x] Verify tool tokens remain project-scoped and cannot bypass ownership.
- [x] Return stable `401`, `403`, and `404` API errors.

## Phase 7 — verification and deployment

- [x] Unit-test token verification, path validation, ownership, manifest
  revisions, and storage error mapping.
- [x] Integration-test create → write → restart → read (adapter-level).
- [x] Integration-test Bash create/delete → project file listing.
- [x] Test missing and malformed Supabase configuration.
- [x] Run daemon typechecks and focused tests.
- [x] Run the daemon production compile and web production server build with
  the repository's checked-in TypeScript/Next toolchain and native modules.
- [ ] Run the full daemon suite; the current suite setup attempts a live
  OpenAI request and must be isolated before it can run safely in CI.
- [ ] Build the deployment image with hosted mode configured only through
  Render secrets.
- [x] Commit the implementation and push the verified feature branch.

## Proposed commit sequence

1. `docs: specify Supabase auth and durable persistence`
2. `feat: add Supabase configuration and server clients`
3. `feat: add Supabase web authentication and bearer transport`
4. `feat: add hosted identity and project ownership enforcement`
5. `feat: add Supabase Postgres persistence adapter`
6. `feat: add Supabase project file storage`
7. `feat: persist hosted Bash workspaces`
8. `test: cover Supabase restart and authorization flows`
9. `fix: resolve build and deployment regressions`

## Stop conditions

Stop and surface the issue instead of silently falling back when:

- the daemon is configured for hosted mode but Supabase credentials are
  missing;
- a project has no owner during hosted migration;
- a Storage write succeeds but its Postgres manifest update fails;
- a caller's identity and project ownership disagree;
- a file path cannot be normalized safely.
