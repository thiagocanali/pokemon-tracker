-- Run after all versioned migrations on a disposable PostgreSQL database.
-- These tests exercise the actual migration-defined RPCs, not the remote Supabase project.
do $$
declare
  v_count integer;
  v_run_id bigint;
  v_conflict_rejected boolean := false;
  v_failure_run_id bigint;
begin
  -- Initial transactional insert.
  perform public.sync_pokemon_catalog_record(
    jsonb_build_object(
      'id','species-integration-test','dex_number',9999,'slug','integration-test-species',
      'names','{"en":"Integration Testmon"}'::jsonb,'generation',1,
      'category','{"en":"Test"}'::jsonb,'description','{"en":"Fixture"}'::jsonb,
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon-species/1/',
      'collected_at','2026-11-08T00:00:00Z','data_version','pokeapi-v2'
    ),
    jsonb_build_object(
      'id','form-integration-test','species_id','species-integration-test',
      'slug','integration-test-species','names','{"en":"Integration Testmon"}'::jsonb,
      'variant','standard','is_default',true,'availability','unknown',
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
      'collected_at','2026-11-08T00:00:00Z','data_version','pokeapi-v2'
    ),
    '[{"type_id":"grass","slot":1},{"type_id":"poison","slot":2}]'::jsonb,
    jsonb_build_object(
      'entity_type','pokemon','entity_id','integration-test-pokemon','version','v1',
      'payload','{"name":"Integration Testmon","stats":{"attack":10}}'::jsonb,
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
      'captured_at','2026-11-08T00:00:00Z','data_version','pokeapi-v2'
    )
  );

  select count(*) into v_count from public.pokemon_form_types
  where form_id = 'form-integration-test';
  if v_count <> 2 then raise exception 'Expected two initial types, received %', v_count; end if;

  -- Newer payload reconciles type slots and records a top-level change.
  perform public.sync_pokemon_catalog_record(
    jsonb_build_object(
      'id','species-integration-test','dex_number',9999,'slug','integration-test-species',
      'names','{"en":"Integration Testmon Updated"}'::jsonb,'generation',1,
      'category','{"en":"Test"}'::jsonb,'description','{"en":"Fixture"}'::jsonb,
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon-species/1/',
      'collected_at','2026-11-08T00:01:00Z','data_version','pokeapi-v2'
    ),
    jsonb_build_object(
      'id','form-integration-test','species_id','species-integration-test',
      'slug','integration-test-species','names','{"en":"Integration Testmon Updated"}'::jsonb,
      'variant','standard','is_default',true,'availability','unknown',
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
      'collected_at','2026-11-08T00:01:00Z','data_version','pokeapi-v2'
    ),
    '[{"type_id":"grass","slot":1}]'::jsonb,
    jsonb_build_object(
      'entity_type','pokemon','entity_id','integration-test-pokemon','version','v2',
      'payload','{"name":"Integration Testmon Updated","stats":{"attack":12}}'::jsonb,
      'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
      'captured_at','2026-11-08T00:01:00Z','data_version','pokeapi-v2'
    )
  );

  select count(*) into v_count from public.pokemon_form_types
  where form_id = 'form-integration-test';
  if v_count <> 1 then raise exception 'Type reconciliation left % slots instead of one', v_count; end if;

  if not exists (
    select 1 from public.data_changes
    where entity_type='pokemon' and entity_id='integration-test-pokemon' and field='name'
  ) then raise exception 'Expected top-level name change to be recorded'; end if;

  -- Older data must be rejected and must not overwrite the newer species.
  begin
    perform public.sync_pokemon_catalog_record(
      jsonb_build_object(
        'id','species-integration-test','dex_number',9999,'slug','integration-test-species',
        'names','{"en":"Stale Testmon"}'::jsonb,'generation',1,
        'category','{"en":"Test"}'::jsonb,'description','{"en":"Stale"}'::jsonb,
        'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon-species/1/',
        'collected_at','2026-11-07T23:59:00Z','data_version','pokeapi-v2'
      ),
      jsonb_build_object(
        'id','form-integration-test','species_id','species-integration-test',
        'slug','integration-test-species','names','{"en":"Stale Testmon"}'::jsonb,
        'variant','standard','is_default',true,'availability','unknown',
        'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
        'collected_at','2026-11-07T23:59:00Z','data_version','pokeapi-v2'
      ),
      '[{"type_id":"grass","slot":1}]'::jsonb,
      jsonb_build_object(
        'entity_type','pokemon','entity_id','integration-test-pokemon','version','stale',
        'payload','{"name":"Stale Testmon"}'::jsonb,
        'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/1/',
        'captured_at','2026-11-07T23:59:00Z','data_version','pokeapi-v2'
      )
    );
    raise exception 'Expected stale catalog record to be rejected';
  exception when sqlstate '22023' then
    null;
  end;

  if (select names->>'en' from public.pokemon_species where id='species-integration-test')
    <> 'Integration Testmon Updated' then
    raise exception 'Stale data overwrote the newer species record';
  end if;

  -- A foreign-key failure during type insertion must roll back species/form/snapshot writes.
  begin
    perform public.sync_pokemon_catalog_record(
      jsonb_build_object(
        'id','species-rollback-test','dex_number',9998,'slug','rollback-test-species',
        'names','{"en":"Rollback Testmon"}'::jsonb,'source_id','pokeapi',
        'source_url','https://pokeapi.co/api/v2/pokemon-species/2/',
        'collected_at','2026-11-08T00:02:00Z','data_version','pokeapi-v2'
      ),
      jsonb_build_object(
        'id','form-rollback-test','species_id','species-rollback-test',
        'slug','rollback-test-species','names','{"en":"Rollback Testmon"}'::jsonb,
        'variant','standard','is_default',true,'availability','unknown',
        'source_id','pokeapi','source_url','https://pokeapi.co/api/v2/pokemon/2/',
        'collected_at','2026-11-08T00:02:00Z','data_version','pokeapi-v2'
      ),
      '[{"type_id":"not-a-real-type","slot":1}]'::jsonb,
      jsonb_build_object(
        'entity_type','pokemon','entity_id','rollback-test-pokemon','version','v1',
        'payload','{"name":"Rollback Testmon"}'::jsonb,'source_id','pokeapi',
        'source_url','https://pokeapi.co/api/v2/pokemon/2/','captured_at','2026-11-08T00:02:00Z'
      )
    );
    raise exception 'Expected invalid type foreign key to fail';
  exception when foreign_key_violation then
    null;
  end;

  if exists (select 1 from public.pokemon_species where id='species-rollback-test')
    or exists (select 1 from public.pokemon_forms where id='form-rollback-test')
    or exists (select 1 from public.data_snapshots where entity_id='rollback-test-pokemon') then
    raise exception 'Failed record transaction left partial data behind';
  end if;

  -- Finalization is idempotent for an identical result and rejects conflicting retries.
  insert into public.sync_runs(provider_id,domain,status)
  values ('pokeapi','pokemon_catalog','running') returning id into v_run_id;

  perform public.finish_pokemon_catalog_sync(v_run_id,'succeeded',1,1,null);
  perform public.finish_pokemon_catalog_sync(v_run_id,'succeeded',1,1,null);

  begin
    perform public.finish_pokemon_catalog_sync(v_run_id,'succeeded',1,0,null);
  exception when raise_exception then
    v_conflict_rejected := true;
  end;
  if not v_conflict_rejected then raise exception 'Conflicting finalization was not rejected'; end if;

  if not exists (
    select 1 from public.sync_runs
    where id=v_run_id and status='succeeded' and records_read=1 and records_written=1
  ) then raise exception 'Successful sync finalization was not persisted'; end if;

  if (select last_status from public.data_sources where id='pokeapi') <> 'updated' then
    raise exception 'Successful finalization did not update source health';
  end if;

  insert into public.sync_runs(provider_id,domain,status)
  values ('pokeapi','pokemon_catalog','running') returning id into v_failure_run_id;
  perform public.finish_pokemon_catalog_sync(v_failure_run_id,'failed',1,0,'fixture failure');

  if (select last_status from public.data_sources where id='pokeapi') <> 'offline' then
    raise exception 'Failed finalization did not mark source offline';
  end if;
end
$$;

-- Keep the test database clean when the runner reuses the service container.
delete from public.sync_runs where provider_id='pokeapi' and domain='pokemon_catalog';
delete from public.data_snapshots where entity_id in ('integration-test-pokemon','rollback-test-pokemon');
delete from public.data_changes where entity_id in ('integration-test-pokemon','rollback-test-pokemon');
delete from public.pokemon_forms where id in ('form-integration-test','form-rollback-test');
delete from public.pokemon_species where id in ('species-integration-test','species-rollback-test');
