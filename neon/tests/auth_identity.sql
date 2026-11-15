\set ON_ERROR_STOP on
\i neon/migrations/0001_migration_ledger.sql
\i neon/migrations/0002_auth_identity.sql

begin;
do $$
declare
  first_user uuid;
  second_user uuid;
begin
  insert into public.app_users(email) values ('one@example.test') returning id into first_user;
  insert into public.app_users(email) values ('two@example.test') returning id into second_user;

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
  if exists (select 1 from app_private.auth_credentials where user_id = first_user)
    or exists (select 1 from app_private.auth_sessions where user_id = first_user) then
    raise exception 'User deletion did not cascade to private auth records';
  end if;
end $$;
rollback;
