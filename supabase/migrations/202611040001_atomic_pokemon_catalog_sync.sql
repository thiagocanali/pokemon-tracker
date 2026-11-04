-- Keep each catalog record and its provenance consistent in one transaction.
create or replace function public.sync_pokemon_catalog_record(
  p_species jsonb, p_form jsonb, p_types jsonb, p_snapshot jsonb
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if jsonb_typeof(p_species) <> 'object' or jsonb_typeof(p_form) <> 'object'
    or jsonb_typeof(p_types) <> 'array' or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Invalid Pokémon catalog record payload';
  end if;

  insert into public.pokemon_species (
    id, dex_number, slug, names, generation, category, description,
    source_id, source_url, collected_at, confidence
  ) values (
    p_species->>'id', (p_species->>'dex_number')::integer, p_species->>'slug',
    p_species->'names', nullif(p_species->>'generation', '')::smallint,
    p_species->'category', p_species->'description', p_species->>'source_id',
    p_species->>'source_url', (p_species->>'collected_at')::timestamptz,
    nullif(p_species->>'confidence', '')::numeric
  )
  on conflict (id) do update set
    dex_number=excluded.dex_number, slug=excluded.slug, names=excluded.names,
    generation=excluded.generation, category=excluded.category, description=excluded.description,
    source_id=excluded.source_id, source_url=excluded.source_url,
    collected_at=excluded.collected_at, confidence=excluded.confidence, updated_at=now();

  insert into public.pokemon_forms (
    id, species_id, slug, names, variant, is_default, availability,
    source_id, source_url, collected_at, confidence
  ) values (
    p_form->>'id', p_form->>'species_id', p_form->>'slug', p_form->'names',
    p_form->>'variant', (p_form->>'is_default')::boolean, p_form->>'availability',
    p_form->>'source_id', p_form->>'source_url', (p_form->>'collected_at')::timestamptz,
    nullif(p_form->>'confidence', '')::numeric
  )
  on conflict (id) do update set
    species_id=excluded.species_id, slug=excluded.slug, names=excluded.names,
    variant=excluded.variant, is_default=excluded.is_default, availability=excluded.availability,
    source_id=excluded.source_id, source_url=excluded.source_url,
    collected_at=excluded.collected_at, confidence=excluded.confidence, updated_at=now();

  delete from public.pokemon_form_types where form_id = p_form->>'id';
  insert into public.pokemon_form_types (form_id, type_id, slot)
  select p_form->>'id', item.type_id, item.slot
  from jsonb_to_recordset(p_types) as item(type_id text, slot smallint);

  insert into public.data_snapshots (
    entity_type, entity_id, version, payload, source_id, source_url, captured_at
  ) values (
    p_snapshot->>'entity_type', p_snapshot->>'entity_id', p_snapshot->>'version',
    p_snapshot->'payload', p_snapshot->>'source_id', p_snapshot->>'source_url',
    (p_snapshot->>'captured_at')::timestamptz
  )
  on conflict (entity_type, entity_id, version) do update set
    payload=excluded.payload, source_id=excluded.source_id,
    source_url=excluded.source_url, captured_at=excluded.captured_at;
end;
$$;

-- Finalize run and source health atomically; a missing row is an error.
create or replace function public.finish_pokemon_catalog_sync(
  p_run_id bigint, p_status text, p_records_read integer,
  p_records_written integer, p_error text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_finished_at timestamptz := now();
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'Invalid sync status: %', p_status;
  end if;

  update public.sync_runs
  set finished_at=v_finished_at, status=p_status,
      records_read=p_records_read, records_written=p_records_written,
      error=case when p_status='failed' then left(p_error, 2000) else null end
  where id=p_run_id and provider_id='pokeapi' and domain='pokemon_catalog' and status='running';
  if not found then raise exception 'Sync run % was not found', p_run_id; end if;

  update public.data_sources
  set last_status=case when p_status='succeeded' then 'updated' else 'offline' end,
      last_checked_at=v_finished_at,
      last_success_at=case when p_status='succeeded' then v_finished_at else last_success_at end
  where id='pokeapi';
  if not found then raise exception 'PokéAPI data source was not found'; end if;
end;
$$;

revoke all on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.finish_pokemon_catalog_sync(bigint,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.finish_pokemon_catalog_sync(bigint,text,integer,integer,text) to service_role;
