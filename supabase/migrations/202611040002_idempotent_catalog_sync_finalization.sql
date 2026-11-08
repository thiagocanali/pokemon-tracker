-- Make sync finalization safe when PostgreSQL commits but the HTTP response is lost.
create or replace function public.finish_pokemon_catalog_sync(
  p_run_id bigint, p_status text, p_records_read integer,
  p_records_written integer, p_error text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_finished_at timestamptz := now();
  v_current_status text;
  v_current_records_read integer;
  v_current_records_written integer;
  v_current_error text;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'Invalid sync status: %', p_status;
  end if;

  if p_records_read < 0 or p_records_written < 0 or p_records_written > p_records_read then
    raise exception 'Invalid sync counters: read %, written %', p_records_read, p_records_written;
  end if;

  select status, records_read, records_written, error
    into v_current_status, v_current_records_read, v_current_records_written, v_current_error
  from public.sync_runs
  where id = p_run_id and provider_id = 'pokeapi' and domain = 'pokemon_catalog'
  for update;

  if not found then
    raise exception 'Sync run % was not found', p_run_id;
  end if;

  -- A retry after an ambiguous network failure is successful only when it
  -- repeats the exact same terminal result. Conflicting finalization is rejected.
  if v_current_status = p_status then
    if v_current_records_read = p_records_read
      and v_current_records_written = p_records_written
      and v_current_error is not distinct from (case when p_status = 'failed' then left(p_error, 2000) else null end)
    then
      return;
    end if;
    raise exception 'Sync run % was already finalized with different results', p_run_id;
  end if;

  if v_current_status <> 'running' then
    raise exception 'Sync run % is not running (status: %)', p_run_id, v_current_status;
  end if;

  update public.sync_runs
  set finished_at = v_finished_at,
      status = p_status,
      records_read = p_records_read,
      records_written = p_records_written,
      error = case when p_status = 'failed' then left(p_error, 2000) else null end
  where id = p_run_id;

  update public.data_sources
  set last_status = case when p_status = 'succeeded' then 'updated' else 'offline' end,
      last_checked_at = v_finished_at,
      last_success_at = case when p_status = 'succeeded' then v_finished_at else last_success_at end
  where id = 'pokeapi';

  if not found then
    raise exception 'PokéAPI data source was not found';
  end if;
end;
$$;

revoke all on function public.finish_pokemon_catalog_sync(bigint,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.finish_pokemon_catalog_sync(bigint,text,integer,integer,text) to service_role;
