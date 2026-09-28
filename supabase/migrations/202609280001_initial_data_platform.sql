create table public.data_sources (
  id text primary key,
  name text not null,
  url text not null,
  scope text not null,
  limitations text not null default '',
  reliability numeric(4, 3) check (reliability between 0 and 1),
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.data_sources (id, name, url, scope, limitations)
values (
  'pokeapi',
  'PokéAPI',
  'https://pokeapi.co/',
  'Dados gerais da franquia Pokémon',
  'Não fornece stats de combate, eventos, raids ou rankings específicos de Pokémon GO.'
);

create table public.pokemon_types (
  id text primary key,
  names jsonb not null check (jsonb_typeof(names) = 'object')
);

insert into public.pokemon_types (id, names) values
  ('bug', '{"en":"Bug","pt-BR":"Inseto"}'),
  ('dark', '{"en":"Dark","pt-BR":"Sombrio"}'),
  ('dragon', '{"en":"Dragon","pt-BR":"Dragão"}'),
  ('electric', '{"en":"Electric","pt-BR":"Elétrico"}'),
  ('fairy', '{"en":"Fairy","pt-BR":"Fada"}'),
  ('fighting', '{"en":"Fighting","pt-BR":"Lutador"}'),
  ('fire', '{"en":"Fire","pt-BR":"Fogo"}'),
  ('flying', '{"en":"Flying","pt-BR":"Voador"}'),
  ('ghost', '{"en":"Ghost","pt-BR":"Fantasma"}'),
  ('grass', '{"en":"Grass","pt-BR":"Planta"}'),
  ('ground', '{"en":"Ground","pt-BR":"Terrestre"}'),
  ('ice', '{"en":"Ice","pt-BR":"Gelo"}'),
  ('normal', '{"en":"Normal","pt-BR":"Normal"}'),
  ('poison', '{"en":"Poison","pt-BR":"Veneno"}'),
  ('psychic', '{"en":"Psychic","pt-BR":"Psíquico"}'),
  ('rock', '{"en":"Rock","pt-BR":"Pedra"}'),
  ('steel', '{"en":"Steel","pt-BR":"Aço"}'),
  ('water', '{"en":"Water","pt-BR":"Água"}');

create table public.pokemon_species (
  id text primary key,
  dex_number integer not null unique check (dex_number > 0),
  slug text not null unique,
  names jsonb not null check (jsonb_typeof(names) = 'object'),
  generation smallint check (generation > 0),
  region text,
  category jsonb check (category is null or jsonb_typeof(category) = 'object'),
  description jsonb check (description is null or jsonb_typeof(description) = 'object'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pokemon_forms (
  id text primary key,
  species_id text not null references public.pokemon_species(id) on delete cascade,
  slug text not null unique,
  names jsonb not null check (jsonb_typeof(names) = 'object'),
  variant text not null check (variant in ('standard', 'regional', 'costume', 'shadow', 'purified', 'mega', 'primal', 'other')),
  is_default boolean not null default false,
  availability text not null default 'unknown' check (availability in ('available', 'unavailable', 'unknown')),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pokemon_forms_species_id_idx on public.pokemon_forms(species_id);

create unique index pokemon_forms_one_default_per_species_idx
  on public.pokemon_forms(species_id) where is_default;

create table public.pokemon_form_types (
  form_id text not null references public.pokemon_forms(id) on delete cascade,
  type_id text not null references public.pokemon_types(id),
  slot smallint not null check (slot in (1, 2)),
  primary key (form_id, slot),
  unique (form_id, type_id)
);

create table public.pokemon_go_stats (
  form_id text primary key references public.pokemon_forms(id) on delete cascade,
  attack integer not null check (attack >= 0),
  defense integer not null check (defense >= 0),
  stamina integer not null check (stamina >= 0),
  max_cp integer check (max_cp > 0),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1)
);

create table public.moves (
  id text primary key,
  slug text not null unique,
  names jsonb not null check (jsonb_typeof(names) = 'object'),
  type_id text not null references public.pokemon_types(id),
  category text not null check (category in ('fast', 'charged')),
  pve_damage integer check (pve_damage >= 0),
  pve_energy_delta integer,
  pve_duration_ms integer check (pve_duration_ms > 0),
  pvp_damage integer check (pvp_damage >= 0),
  pvp_energy_delta integer,
  pvp_duration_turns integer check (pvp_duration_turns > 0),
  pvp_effects jsonb check (pvp_effects is null or jsonb_typeof(pvp_effects) = 'object'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pokemon_moves (
  form_id text not null references public.pokemon_forms(id) on delete cascade,
  move_id text not null references public.moves(id) on delete cascade,
  learn_method text,
  event_limited boolean not null default false,
  primary key (form_id, move_id, event_limited)
);

create table public.evolutions (
  from_form_id text not null references public.pokemon_forms(id) on delete cascade,
  to_form_id text not null references public.pokemon_forms(id) on delete cascade,
  candy_cost integer check (candy_cost >= 0),
  item_id text,
  conditions jsonb not null default '[]' check (jsonb_typeof(conditions) = 'array'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  primary key (from_form_id, to_form_id)
);

create table public.seasons (
  id text primary key,
  slug text not null unique,
  names jsonb not null check (jsonb_typeof(names) = 'object'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text,
  bonuses jsonb not null default '[]' check (jsonb_typeof(bonuses) = 'array'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  check (ends_at > starts_at)
);

create table public.events (
  id text primary key,
  slug text not null unique,
  names jsonb not null check (jsonb_typeof(names) = 'object'),
  description jsonb check (description is null or jsonb_typeof(description) = 'object'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text,
  bonuses jsonb not null default '[]' check (jsonb_typeof(bonuses) = 'array'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  check (ends_at > starts_at)
);

create table public.event_forms (
  event_id text not null references public.events(id) on delete cascade,
  form_id text not null references public.pokemon_forms(id),
  appearance text not null,
  primary key (event_id, form_id, appearance)
);

create table public.raid_rotations (
  id text primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  source_updated_at timestamptz,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  check (ends_at > starts_at)
);

create table public.raid_rotation_bosses (
  rotation_id text not null references public.raid_rotations(id) on delete cascade,
  form_id text not null references public.pokemon_forms(id),
  tier text not null,
  primary key (rotation_id, form_id)
);

create table public.battle_rankings (
  id bigint generated always as identity primary key,
  form_id text not null references public.pokemon_forms(id),
  mode text not null check (mode in ('pvp', 'pve')),
  league text,
  rank integer not null check (rank > 0),
  rating numeric,
  source_id text not null references public.data_sources(id),
  source_url text not null,
  collected_at timestamptz not null,
  data_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  check ((mode = 'pvp' and league is not null) or (mode = 'pve' and league is null))
);

create table public.battle_ranking_moves (
  ranking_id bigint not null references public.battle_rankings(id) on delete cascade,
  move_id text not null references public.moves(id),
  slot smallint not null check (slot > 0),
  primary key (ranking_id, slot),
  unique (ranking_id, move_id)
);

create table public.data_snapshots (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  version text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  source_id text not null references public.data_sources(id),
  source_url text not null,
  captured_at timestamptz not null,
  unique (entity_type, entity_id, version)
);

create table public.data_changes (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  field text not null,
  before_value jsonb,
  after_value jsonb,
  detected_at timestamptz not null,
  source_id text not null references public.data_sources(id),
  source_url text not null,
  data_version text
);

create index data_changes_detected_at_idx on public.data_changes(detected_at desc);

create table public.sync_runs (
  id bigint generated always as identity primary key,
  provider_id text not null references public.data_sources(id),
  domain text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  records_read integer not null default 0 check (records_read >= 0),
  records_written integer not null default 0 check (records_written >= 0),
  error text,
  check (finished_at is null or finished_at >= started_at)
);

create table public.saved_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  pokemon_ids bigint[] not null check (cardinality(pokemon_ids) between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_teams_user_updated_idx on public.saved_teams(user_id, updated_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'data_sources',
    'pokemon_types',
    'pokemon_species',
    'pokemon_forms',
    'pokemon_form_types',
    'pokemon_go_stats',
    'moves',
    'pokemon_moves',
    'evolutions',
    'seasons',
    'events',
    'event_forms',
    'raid_rotations',
    'raid_rotation_bosses',
    'battle_rankings',
    'battle_ranking_moves',
    'data_snapshots',
    'data_changes',
    'sync_runs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    if table_name <> 'sync_runs' then
      execute format(
        'create policy "Public read access" on public.%I for select to anon, authenticated using (true)',
        table_name
      );
    end if;
  end loop;
end
$$;

alter table public.saved_teams enable row level security;

create policy "Users can read their teams"
  on public.saved_teams for select to authenticated using (auth.uid() = user_id);

create policy "Users can create their teams"
  on public.saved_teams for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their teams"
  on public.saved_teams for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their teams"
  on public.saved_teams for delete to authenticated using (auth.uid() = user_id);

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;