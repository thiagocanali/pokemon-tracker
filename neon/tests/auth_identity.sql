\set ON_ERROR_STOP on
\i neon/migrations/0001_migration_ledger.sql
\i neon/migrations/0002_auth_identity.sql
\i neon/migrations/0003_saved_teams.sql

begin;
do $$
declare
  first_user uuid;
  second_user uuid;
begin
  insert into public.app_users(email) values ('one@example.test') returning id into first_user;
  insert into public.app_users(email) values ('two@example.test') returning id into second_user;

  insert into public.saved_teams(user_id, name, pokemon_ids)
    values (first_user, 'Team A', array[25, 149]::bigint[]);
  insert into public.saved_teams(user_id, name, pokemon_ids)
    values (second_user, 'Team B', array[1]::bigint[]);
  if (select count(*) from public.saved_teams where user_id = first_user) <> 1
    or (select count(*) from public.saved_teams where user_id = second_user) <> 1 then
    raise exception 'Team ownership mismatch';
  end if;
  begin
    insert into public.saved_teams(user_id, name, pokemon_ids)
      values (first_user, 'Invalid', array[0]::bigint[]);
    raise exception 'Invalid Pokemon ID unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.saved_teams(user_id, name, pokemon_ids)
      values (gen_random_uuid(), 'Orphan', array[25]::bigint[]);
    raise exception 'Orphan team unexpectedly accepted';
  exception when foreign_key_violation then null;
  end;

  insert into app_private.auth_credentials(user_id, password_hash)
    values (first_user, repeat('a', 60));
  insert into app_private.auth_sessions(user_id, token_hash, expires_at)
    values (first_user, repeat('b', 64), now() + interval '1 hour');
  insert into app_private.auth_tokens(user_id, purpose, token_hash, expires_at)
    values (second_user, 'password_reset', repeat('c', 64), now() + interval '1 hour');

  if (select count(*) from public.app_users) <> 2 then
    raise exception 'Expected two isolated users';
  end if;
  if (select count(*) from app_private.auth_sessions where user_id = second_user) <> 0 then
    raise exception 'Session owner mismatch';
  end if;

  begin
    insert into public.app_users(email) values ('ONE@example.test');
    raise exception 'Noncanonical email unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.app_users(email) values ('one@example.test');
    raise exception 'Duplicate email unexpectedly accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into app_private.auth_sessions(user_id, token_hash, expires_at)
      values (gen_random_uuid(), repeat('d', 64), now() + interval '1 hour');
    raise exception 'Orphan session unexpectedly accepted';
  exception when foreign_key_violation then null;
  end;

  delete from public.app_users where id = first_user;
  if exists (select 1 from public.saved_teams where user_id = first_user) then
    raise exception 'User deletion did not cascade to saved teams';
  end if;
  if exists (select 1 from app_private.auth_credentials where user_id = first_user)
    or exists (select 1 from app_private.auth_sessions where user_id = first_user) then
    raise exception 'User deletion did not cascade to private auth records';
  end if;
end $$;
rollback;
