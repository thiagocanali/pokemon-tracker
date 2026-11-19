-- The API server must authenticate the session and enforce user_id ownership.
-- This table is not exposed directly to the browser or an anonymous SQL role.
begin;

create table public.saved_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  pokemon_ids bigint[] not null check (cardinality(pokemon_ids) between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_teams_positive_ids check (
    array_position(pokemon_ids, null) is null
    and 0 < all(pokemon_ids)
  )
);
create index saved_teams_user_updated_idx
  on public.saved_teams(user_id, updated_at desc);

-- No PUBLIC grants: only a trusted backend role may query this table.
revoke all on public.saved_teams from public;
commit;
