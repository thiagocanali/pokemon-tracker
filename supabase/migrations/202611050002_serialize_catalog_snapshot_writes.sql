-- Serialize writes for each catalog entity and reject older snapshots.
-- This prevents overlapping sync runs from recording misleading diffs or
-- overwriting a newer canonical Pokémon record with an older response.
create or replace function public.sync_pokemon_catalog_record(
  p_species jsonb, p_form jsonb, p_types jsonb, p_snapshot jsonb
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_previous_payload jsonb;
  v_previous_captured_at timestamptz;
  v_previous_species_collected_at timestamptz;
  v_previous_form_collected_at timestamptz;
  v_captured_at timestamptz;
  v_species_collected_at timestamptz;
  v_form_collected_at timestamptz;
  v_field record;
begin
  if jsonb_typeof(p_species) is distinct from 'object'
    or jsonb_typeof(p_form) is distinct from 'object'
    or jsonb_typeof(p_types) is distinct from 'array'
    or jsonb_typeof(p_snapshot) is distinct from 'object'
    or jsonb_typeof(p_snapshot->'payload') is distinct from 'object'
    or nullif(p_snapshot->>'entity_type', '') is null
    or nullif(p_snapshot->>'entity_id', '') is null
    or nullif(p_snapshot->>'captured_at', '') is null
    or nullif(p_snapshot->>'version', '') is null
    or nullif(p_snapshot->>'source_id', '') is null
    or nullif(p_snapshot->>'source_url', '') is null
    or nullif(p_species->>'id', '') is null
    or nullif(p_species->>'collected_at', '') is null
    or nullif(p_species->>'source_id', '') is null
    or nullif(p_species->>'source_url', '') is null
    or nullif(p_form->>'id', '') is null
    or nullif(p_form->>'species_id', '') is null
    or nullif(p_form->>'collected_at', '') is null
    or nullif(p_form->>'source_id', '') is null
    or nullif(p_form->>'source_url', '') is null
    or p_form->>'species_id' is distinct from p_species->>'id'
    or p_species->>'source_id' is distinct from p_form->>'source_id'
    or p_species->>'source_id' is distinct from p_snapshot->>'source_id' then
    raise exception 'Invalid Pokémon catalog record payload';
  end if;

  begin
    v_captured_at := (p_snapshot->>'captured_at')::timestamptz;
    v_species_collected_at := (p_species->>'collected_at')::timestamptz;
    v_form_collected_at := (p_form->>'collected_at')::timestamptz;
  exception when others then
    raise exception 'Invalid Pokémon catalog timestamp';
  end;

  -- Lock the shared species row first, then the individual snapshot entity.
  -- Different species remain concurrent; forms of one species cannot race while
  -- updating the shared species row or its single-default-form constraint.
  perform pg_advisory_xact_lock(
    hashtextextended('species:' || (p_species->>'id'), 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(
      'snapshot:' || (p_snapshot->>'entity_type') || ':' || (p_snapshot->>'entity_id'),
      0
    )
  );

  select species.collected_at
    into v_previous_species_collected_at
  from public.pokemon_species as species
  where species.id = p_species->>'id';

  if v_previous_species_collected_at is not null
    and v_species_collected_at < v_previous_species_collected_at then
    raise exception 'Stale Pokémon species data rejected for %', p_species->>'id'
      using errcode = '22023';
  end if;

  select form.collected_at
    into v_previous_form_collected_at
  from public.pokemon_forms as form
  where form.id = p_form->>'id';

  if v_previous_form_collected_at is not null
    and v_form_collected_at < v_previous_form_collected_at then
    raise exception 'Stale Pokémon form data rejected for %', p_form->>'id'
      using errcode = '22023';
  end if;

  select snapshot.payload, snapshot.captured_at
    into v_previous_payload, v_previous_captured_at
  from public.data_snapshots as snapshot
  where snapshot.entity_type = p_snapshot->>'entity_type'
    and snapshot.entity_id = p_snapshot->>'entity_id'
  order by snapshot.captured_at desc, snapshot.id desc
  limit 1;

  if v_previous_captured_at is not null and v_captured_at < v_previous_captured_at then
    raise exception 'Stale Pokémon catalog snapshot rejected for %:%',
      p_snapshot->>'entity_type', p_snapshot->>'entity_id'
      using errcode = '22023';
  end if;

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
        v_captured_at,
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
    v_captured_at
  )
  on conflict (entity_type, entity_id, version) do update set
    payload=excluded.payload, source_id=excluded.source_id,
    source_url=excluded.source_url, captured_at=excluded.captured_at;
end;
$$;

revoke all on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.sync_pokemon_catalog_record(jsonb,jsonb,jsonb,jsonb) to service_role;
