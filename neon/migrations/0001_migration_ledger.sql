-- Neon bootstrap: independent of Supabase roles, auth schema, and extensions.
-- Execute with a migration role on a new database; do not run against production.
begin;

create schema if not exists app_private;

create table if not exists app_private.schema_migrations (
  version text primary key,
  checksum text not null check (length(checksum) = 64),
  applied_at timestamptz not null default now()
);

comment on table app_private.schema_migrations is
  'Version and SHA-256 checksum of migrations applied by the trusted server-side migration runner.';

revoke all on schema app_private from public;
revoke all on all tables in schema app_private from public;

commit;
