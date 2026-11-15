# Neon migration workbench

This is a **staged implementation**, not a production cutover. The current Vue app still uses Supabase; do not change Vercel environment variables until the replacement backend is implemented and tested.

## Migrations

Run in ascending order against a **disposable** PostgreSQL database:

1. `0001_migration_ledger.sql`: private migration tracking schema.
2. `0002_auth_identity.sql`: users, password hashes, session hashes and single-use token storage.
3. `0003_saved_teams.sql`: user-owned saved teams, with existing 1–6 Pokémon and name constraints.

CI executes `neon/tests/auth_identity.sql` on an ephemeral PostgreSQL service and rolls back test data. The SQL files are deliberately separate from Supabase migrations.

## Security boundary — not yet implemented

- Browser clients must **never** receive `DATABASE_URL`, privileged Postgres credentials or direct SQL access.
- Only a trusted backend may read/write `app_users`, `saved_teams` and `app_private`.
- A server must authenticate an opaque, random session token, hash it before lookup, check expiry and revocation, and enforce `saved_teams.user_id === authenticatedUser.id` on **every** read, insert, update and delete.
- Passwords require a vetted password hashing implementation (Argon2id or equivalent), rate limiting, secure `HttpOnly; Secure; SameSite` cookies, CSRF protection and a verified reset flow.
- No RLS policies are claimed here: the current migration revokes PUBLIC privileges, but that **does not substitute for per-user authorization** by the backend.
- Never trust a `user_id` supplied by a browser as the ownership authority.
- No data migration, user account migration or deletion is performed in this PR.

## Release gates

Backend authorization and integration tests for two separate users; session lifecycle tests; complete migration of client Supabase calls; schema parity and provenance checks; staging preview validation; documented rollback; explicit approval before production cutover.

## Living task tracker (2026-11-15)

| Priority | Task | Status | Evidence / dependency | Next action |
| --- | --- | --- | --- | --- |
| P0 | Neon SQL CI isolation | Validated | GitHub Actions #206 | Keep isolated database for tests |
| P0 | Auth schema, saved teams and constraints | In progress | Actions #207 passed; #210 failed due malformed SQL; commit c993328 repairs DDL | Confirm CI for c993328 |
| P0 | Authentication API with secure sessions | In progress | Server-only token hash/session lookup module added; no HTTP routes or credential login yet | Add cookie-based HTTP auth and Argon2id registration/login |
| P0 | Per-user authorization | In progress | Server-only team repository enforces user ID predicates; Node mock tests added | Add live PostgreSQL two-user integration tests and HTTP handlers |
| P1 | Port catalog and ingestion schema | Pending | Supabase-specific grants and functions | Inventory remaining migrations |
| P1 | Frontend cutover | Blocked | Depends on backend parity and staging verification | Keep current Supabase integration intact |
| P1 | Production release | Blocked | Explicit authorization required | No deploy, merge or destructive operation |

## Server-only repository modules

`server/neon/session.mjs` validates opaque session token format, hashes the token with SHA-256 and resolves only unexpired, unrevoked sessions using a parameterized query.

`server/neon/teams.mjs` accepts a **server-resolved** user object, never a client-provided ownership ID. List, update and delete queries include the user ID predicate; creation assigns the authenticated user. These are database access modules **only**, not HTTP routes or a complete authentication system. The injected `db` must be a trusted server-side PostgreSQL client with parameterized `query(sql, params)` support. The Node tests currently use a mocked database; live database authorization tests remain required.

CI runs `node --test server/neon/*.test.mjs` and the existing independent SQL migration suite. No production cutover has occurred.

## HTTP boundary prototype

`server/neon/http-auth.mjs` implements strict host-only HTTPS cookie formatting and exact HTTPS origin checks for mutating requests. `server/neon/teams-handler.mjs` is a framework-agnostic authenticated request handler for team CRUD with a 4 KiB JSON body limit, no-store response headers, and fail-closed session resolution. Tests cover anonymous access, origin rejection, and user-scoped writes.

**Not yet a deployed API:** No Vercel entrypoint, database adapter, password registration/login, logout, rate limiting or end-to-end database authorization tests exist. The handler must only be mounted behind trusted HTTPS with an explicitly configured allowed origin. No frontend or production switch is authorized.

### Next execution batch
1. Verify CI for the latest HEAD (including new Node tests).
2. Implement secure password hashing and credential authentication with dependency/lockfile consistency.
3. Implement server-side PostgreSQL adapter and deployment-independent HTTP entrypoints.
4. Add real PostgreSQL cross-user CRUD and session integration tests.
5. Implement frontend cutover behind a reversible feature flag after backend parity is proven.
