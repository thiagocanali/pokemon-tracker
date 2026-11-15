-- Independent authentication persistence. Server-only access; never expose direct SQL to browsers.
begin;

create extension if not exists pgcrypto;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_verified_at timestamptz,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_email_not_blank check (length(btrim(email)) > 0),
  constraint app_users_email_canonical check (email = lower(btrim(email)))
);
create unique index app_users_email_unique on public.app_users (email);

create table app_private.auth_credentials (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  password_hash text not null check (length(password_hash) >= 20),
  password_changed_at timestamptz not null default now()
);

create table app_private.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64},
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);
create index auth_sessions_user_id_idx on app_private.auth_sessions(user_id);
create index auth_sessions_expires_at_idx on app_private.auth_sessions(expires_at);

create table app_private.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  purpose text not null check (purpose in ('email_verification', 'password_reset')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64},
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at)
);
create index auth_tokens_user_purpose_idx on app_private.auth_tokens(user_id, purpose);

revoke all on public.app_users from public;
revoke all on all tables in schema app_private from public;
commit;
),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);
create index auth_sessions_user_id_idx on app_private.auth_sessions(user_id);
create index auth_sessions_expires_at_idx on app_private.auth_sessions(expires_at);

create table app_private.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  purpose text not null check (purpose in ('email_verification', 'password_reset')),
  token_hash text not null unique check (length(token_hash) = 64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at)
);
create index auth_tokens_user_purpose_idx on app_private.auth_tokens(user_id, purpose);

revoke all on public.app_users from public;
revoke all on all tables in schema app_private from public;
commit;
),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at)
);
create index auth_tokens_user_purpose_idx on app_private.auth_tokens(user_id, purpose);

revoke all on public.app_users from public;
revoke all on all tables in schema app_private from public;
commit;
),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);
create index auth_sessions_user_id_idx on app_private.auth_sessions(user_id);
create index auth_sessions_expires_at_idx on app_private.auth_sessions(expires_at);

create table app_private.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  purpose text not null check (purpose in ('email_verification', 'password_reset')),
  token_hash text not null unique check (length(token_hash) = 64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at)
);
create index auth_tokens_user_purpose_idx on app_private.auth_tokens(user_id, purpose);

revoke all on public.app_users from public;
revoke all on all tables in schema app_private from public;
commit;
