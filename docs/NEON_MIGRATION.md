# Neon migration — Pokémon Tracker

Status: **in progress, not cut over**. Production remains on its existing configuration.

## Provisioned database

- Neon project: `square-math-59374833` (`pokemon-tracker`)
- Region: `aws-sa-east-1`
- Database: `pokemon_tracker`
- PostgreSQL: 17
- Verified: `app_private.schema_migrations` exists and is not granted to PUBLIC.
- Never commit connection strings or database passwords.

## Confirmed Supabase coupling (main branch)

| Responsibility | Files / contracts | Migration requirement |
| --- | --- | --- |
| Browser client | `src/lib/supabase.ts`, `package.json` | Replace browser Supabase SDK with authenticated backend APIs |
| Login, reset, account, route guards | `src/pages/AuthPage.vue`, `AccountPage.vue`, `src/router/index.ts`, `src/components/AppHeader.vue` | Server-side session management, password reset, route enforcement |
| Favorites | `src/store/pokemon.ts` | Replace Supabase user metadata; preserve local fallback |
| Saved teams | `src/pages/TeamBuilderPage.vue` | User-owned CRUD and authorization |
| Catalog and GO datasets | `src/data/service.ts`, `goCatalog.ts`, `goPokemonCore.ts`, `moves.ts`, `rankings.ts`, `health.ts` | Replace PostgREST queries with typed server endpoints; preserve provenance and offline fallbacks |
| Ingestion | `supabase/functions/sync-pokemon-catalog/` and related functions | Move to authenticated server jobs; preserve transaction semantics and legal provider restrictions |
| Schema and RLS | `supabase/migrations/*.sql` | Port SQL without Supabase-specific auth roles or `auth.uid()`; test isolation |
| CI | `.github/workflows/validate.yml` and `supabase/tests/` | Continue disposable PostgreSQL tests; add Neon-specific migrations and authorization tests |

This is a **confirmed initial inventory**, not a claim that every Supabase dependency has been removed. Audit every migration and API before cutover.

## Migration safety gates

1. Inventory all existing schema objects, grants, policies, RPCs, triggers, and edge functions.
2. Choose backend deployment compatible with Vite/Vercel and implement a server-only Neon connection (SSL). Never use `VITE_DATABASE_URL`.
3. Implement independent authentication (evaluate Better Auth with a server runtime), including email verification and password reset delivery.
4. Replace Supabase `auth.uid()` policies with tested per-user authorization; prohibit cross-user reads and writes.
5. Port catalog migrations in dependency order, excluding Supabase internal roles and schemas. Maintain provenance, version, and confidence fields.
6. Replace all client PostgREST calls, user metadata, and edge functions; preserve public read-only fallback behavior.
7. Run CI: typecheck, build, integration SQL, concurrent sync, multi-user authorization, API and session tests.
8. Configure environment-specific Vercel secrets only after explicit production approval; verify real application flows before cutover.
9. Keep Supabase untouched until a tested rollback plan and cutover are approved.

## Versioned migrations

`neon/migrations/0001_migration_ledger.sql` creates the private ledger. Apply subsequent migrations with a trusted server-side runner that records a SHA-256 checksum and refuses changed historical migrations. Do not run Supabase migration files directly against Neon.

## Deployment cost

Use GitHub Actions for CI and group commits. Vercel previews are not required for migration SQL changes; do not change production deployment settings as part of this PR.
