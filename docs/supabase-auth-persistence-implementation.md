# Supabase Auth and Persistence Implementation Plan

This is the execution checklist for the companion specification.

## Phase 0 — committed design baseline

- [x] Document current SQLite, local project-file, and `InMemoryFs` owners.
- [x] Define hosted identity, ownership, file manifest, and Bash recovery
  contracts.
- [x] Define secret handling, rollout, rollback, and acceptance criteria.

## Phase 1 — configuration and clients

- [ ] Add a daemon-only Supabase server client module.
- [ ] Add a browser Supabase client module with safe public variables.
- [ ] Add strict configuration parsing and actionable startup diagnostics.
- [ ] Add dependency versions compatible with the repository's Node and pnpm
  baseline.
- [ ] Keep local mode working when hosted variables are absent.

## Phase 2 — authentication

- [ ] Add email/password sign-up, sign-in, sign-out, and session restoration.
- [ ] Add an auth gate/loading state to the web shell.
- [ ] Add a client API wrapper that sends the current access token.
- [ ] Add daemon middleware for Bearer-token verification.
- [ ] Expose a minimal authenticated-user/health endpoint without leaking
  secrets.
- [ ] Preserve local desktop and explicitly scoped tool-token paths.

## Phase 3 — Postgres persistence

- [ ] Create versioned Supabase SQL migrations.
- [ ] Port project metadata and ownership first.
- [ ] Port conversations, messages, tabs, and required run metadata.
- [ ] Add ownership-aware queries and indexes.
- [ ] Add RLS policies for direct Supabase access where applicable.
- [ ] Add import/export tooling for existing SQLite data.
- [ ] Keep a local SQLite adapter behind the same logical interface during the
  migration window.

## Phase 4 — project file storage

- [ ] Implement `SupabaseProjectStorage` against the private bucket.
- [ ] Store file metadata and content hashes in `project_files`.
- [ ] Make writes idempotent and deletes explicit.
- [ ] Enforce path, project ownership, file-size, and content-type limits.
- [ ] Wire every project file route through the selected storage adapter.
- [ ] Add migration support for existing local project files.

## Phase 5 — durable hosted Bash

- [ ] Add a filesystem hydration layer for one project.
- [ ] Add file enumeration, hashing, delta upload, and deletion detection.
- [ ] Flush changes after successful and non-zero command exits.
- [ ] Keep the per-project execution queue.
- [ ] Handle persistence failure as a visible command failure with retry-safe
  state, not as a successful invisible write.
- [ ] Restore the last known working directory where supported.
- [ ] Keep temporary/interpreter-only state ephemeral.

## Phase 6 — route authorization and compatibility

- [ ] Require hosted identity on hosted project routes.
- [ ] Resolve ownership from the server-side project row, never request input.
- [ ] Apply the same ownership gate to chat, files, exports, deployments,
  previews, terminal/Bash, runs, and conversations.
- [ ] Verify team/workspace routes retain their existing authority semantics.
- [ ] Verify tool tokens remain project-scoped and cannot bypass ownership.
- [ ] Return stable `401`, `403`, and `404` API errors.

## Phase 7 — verification and deployment

- [ ] Unit-test token verification, path validation, ownership, manifest
  revisions, and storage error mapping.
- [ ] Integration-test create → write → restart → read.
- [ ] Integration-test Bash create/delete → project file listing.
- [ ] Test missing and malformed Supabase configuration.
- [ ] Run package typechecks and tests.
- [ ] Run daemon and web production builds.
- [ ] Build the deployment image with hosted mode configured only through
  Render secrets.
- [ ] Commit implementation in reviewable slices and push each verified
  slice to the feature branch.

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
