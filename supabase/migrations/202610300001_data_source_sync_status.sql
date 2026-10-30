alter table public.data_sources
  add column if not exists enabled boolean not null default true,
  add column if not exists last_status text not null default 'unknown'
    check (last_status in ('unknown', 'updated', 'stale', 'offline', 'unavailable')),
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_success_at timestamptz;

create index if not exists pokemon_forms_source_id_idx
  on public.pokemon_forms(source_id);

create index if not exists data_snapshots_entity_lookup_idx
  on public.data_snapshots(entity_type, entity_id, captured_at desc);

comment on column public.data_sources.last_status is
  'Estado da última tentativa de sincronização da fonte.';
comment on column public.data_sources.last_checked_at is
  'Momento da última tentativa de sincronização.';
comment on column public.data_sources.last_success_at is
  'Momento da última sincronização concluída com sucesso.';
