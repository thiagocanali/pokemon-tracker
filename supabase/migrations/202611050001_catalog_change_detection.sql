-- Record top-level payload changes whenever the catalog ingestion replaces a previous snapshot.
create or replace function public.sync_pokemon_catalog_record(
  p_species jsonb, p_form jsonb, p_types jsonb, p_snapshot jsonb
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_previous_payload jsonb;
  v_field record;
begin
  if jsonb_typeof(p_species) <> 'object' or jsonb_typeof(p_form) <> 'object'
    or jsonb_typeof(p_types) <> 'array' or jsonb_typeof(p_snapshot) <> 'object'
    or jsonb_typeof(p_snapshot->'payload') <> 'object' then
    raise exception 'Invalid Pokémon catalog record payload';
  end if;

  select snapshot.payload
    into v_previous_payload
  from public.data_snapshots as snapshot
  where snapshot.entity_type = p_snapshot->>'entity_type'
    and snapshot.entity_id = p_snapshot->>'entity_id'
  order by snapshot.captured_at desc, snapshot.id desc
  limit 1;

  if v_previous_payload is not null then
    for v_field in
      select
        coalesce(previous_field.key, current_field.key) as field,
        previous_field.value as before_value,
        current_field.value as after_value
      from jsonb_each(v_previous_payload) as previous_field
      full outer join jsonb_each(p_snapshot->'payload') as current_field
        on previous_field.key = current_field.key
      where previous_field.value is distinct from current_field.value
    loop
      insert into public.data_changes (
        entity_type,
        entity_id,
        field,
        before_value,
        after_value,
        detected_at,
        source_id,
        source_url,
        data_version
      ) values (
        p_snapshot->>'entity_type',
        p_snapshot->>'entity_id',
        v_field.field,
        v_field.before_value,
        v_field.after_value,
        (p_snapshot->>'captured_at')::timestamptz,
        p_snapshot->>'source_id',
        p_snapshot->>'source_url',
        p_snapshot->>'data_version'
      );
    end loop;
  end if;

  insert into public.pokemon_species (
    id, dex_number, slug, names, generation, category, description,
    source_id, source_url, collected_at, source_updated_at, data_version, confidence
  ) values (
    p_species->>'id', (p_species->>'dex_number')::integer, p_species->>'slug',
    p_species->'names', nullif(p_species->>'generation', '')::smallint,
    p_species->'category', p_species->'description', p_species->>'source_id',
    p_species->>'source_url', (p_species->>'collected_at')::timestamptz,
    nullif(p_species->>'source_updated_at', '')::timestamptz, p_species->>'data_version',
    nullif(p_species->>'confidence', '')::numeric
  )
  on conflict (id) do update set
    dex_number=excluded.dex_number, slug=excluded.slug, names=excluded.names,
    generation=excluded.generation, category=excluded.category, description=excluded.description,
    source_id=excluded.source_id, source_url=excluded.source_url,
    collected_at=excluded.collected_at, source_updated_at=excluded.source_updated_at,
    data_version=excluded.data_version, confidence=excluded.confidence, updated_at=now();

  insert into public.pokemon_forms (
    id, species_id, slug, names, variant, is_default, availability,
    source_id, source_url, collected_at, source_updated_at, data_version, confidence
  ) values (
    p_form->>'id', p_form->>'species_id', p_form->>'slug', p_form->'names',
    p_form->>'variant', (p_form->>'is_default')::boolean, p_form->>'availability',
    p_form->>'source_id', p_form->>'source_url', (p_form->>'collected_at')::timestamptz,
    nullif(p_form->>'source_updated_at', '')::timestamptz, p_form->>'data_version',
    nullif(p_form->>'confidence', '')::numeric
  )
  on conflict (id) do update set
    species_id=excluded.species_id, slug=excluded.slug, names=excluded.names,
    variant=excluded.variant, is_default=excluded.is_default, availability=excluded.availability,
    source_id=excluded.source_id, source_url=excluded.source_url,
    collected_at=excluded.collected_at, source_updated_at=excluded.source_updated_at,
    data_version=excluded.data_version, confidence=excluded.confidence, updated_at=now();

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

revoke all on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) to service_role;
