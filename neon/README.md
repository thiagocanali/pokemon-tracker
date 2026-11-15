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
