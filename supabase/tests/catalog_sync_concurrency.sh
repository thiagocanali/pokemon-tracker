#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the disposable PostgreSQL test database}"

READY_FILE="$(mktemp)"
A_LOG="$(mktemp)"
B_LOG="$(mktemp)"
A_PID=""

cleanup() {
  if [[ -n "$A_PID" ]] && kill -0 "$A_PID" 2>/dev/null; then
    wait "$A_PID" || true
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || true
DROP FUNCTION IF EXISTS public.test_catalog_sync_concurrency_record(timestamptz, text);
DELETE FROM public.data_changes WHERE entity_id = 'catalog-concurrency-test-pokemon';
DELETE FROM public.data_snapshots WHERE entity_id = 'catalog-concurrency-test-pokemon';
DELETE FROM public.pokemon_forms WHERE id = 'form-catalog-concurrency-test';
DELETE FROM public.pokemon_species WHERE id = 'species-catalog-concurrency-test';
SQL
  rm -f "$READY_FILE" "$A_LOG" "$B_LOG"
}
trap cleanup EXIT

# Test-only helper keeps both sessions on the exact same RPC payload contract.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION public.test_catalog_sync_concurrency_record(
  p_collected_at timestamptz,
  p_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sync_pokemon_catalog_record(
    jsonb_build_object(
      'id', 'species-catalog-concurrency-test',
      'dex_number', 9997,
      'slug', 'catalog-concurrency-test',
      'names', jsonb_build_object('en', p_name),
      'generation', 1,
      'category', jsonb_build_object('en', 'Test'),
      'description', jsonb_build_object('en', 'Concurrency fixture'),
      'source_id', 'pokeapi',
      'source_url', 'https://pokeapi.co/api/v2/pokemon-species/3/',
      'collected_at', p_collected_at,
      'data_version', 'pokeapi-v2'
    ),
    jsonb_build_object(
      'id', 'form-catalog-concurrency-test',
      'species_id', 'species-catalog-concurrency-test',
      'slug', 'catalog-concurrency-test',
      'names', jsonb_build_object('en', p_name),
      'variant', 'standard',
      'is_default', true,
      'availability', 'unknown',
      'source_id', 'pokeapi',
      'source_url', 'https://pokeapi.co/api/v2/pokemon/3/',
      'collected_at', p_collected_at,
      'data_version', 'pokeapi-v2'
    ),
    '[{"type_id":"grass","slot":1}]'::jsonb,
    jsonb_build_object(
      'entity_type', 'pokemon',
      'entity_id', 'catalog-concurrency-test-pokemon',
      'version', 'concurrency-v1',
      'payload', jsonb_build_object('name', p_name),
      'source_id', 'pokeapi',
      'source_url', 'https://pokeapi.co/api/v2/pokemon/3/',
      'captured_at', p_collected_at,
      'data_version', 'pokeapi-v2'
    )
  );
END;
$$;
SQL

# Session A takes the same species advisory lock as the RPC, writes a newer
# record, signals readiness, and deliberately holds its transaction open.
(
  export READY_FILE
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$A_LOG" 2>&1 <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('species:' || 'species-catalog-concurrency-test', 0));
SELECT public.test_catalog_sync_concurrency_record(clock_timestamp() + interval '1 minute', 'Newer concurrency fixture');
\! touch "$READY_FILE"
SELECT pg_sleep(3);
COMMIT;
SQL
) &
A_PID=$!

for _ in $(seq 1 100); do
  if [[ -f "$READY_FILE" ]]; then
    break
  fi
  if ! kill -0 "$A_PID" 2>/dev/null; then
    cat "$A_LOG"
    echo "Session A exited before acquiring the lock and writing its record." >&2
    exit 1
  fi
  sleep 0.1
done

if [[ ! -f "$READY_FILE" ]]; then
  cat "$A_LOG"
  echo "Timed out waiting for session A to hold the species lock." >&2
  exit 1
fi

# Session B starts only after A has written while retaining the lock. Its
# older timestamp must wait, then be rejected after A commits.
if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$B_LOG" 2>&1 <<'SQL'
SELECT public.test_catalog_sync_concurrency_record(clock_timestamp(), 'Stale concurrency fixture');
SQL
then
  echo "Session B unexpectedly accepted a stale concurrent record." >&2
  cat "$B_LOG"
  exit 1
fi

if ! grep -q "Stale Pokémon species data rejected" "$B_LOG"; then
  echo "Session B failed for an unexpected reason:" >&2
  cat "$B_LOG"
  exit 1
fi

wait "$A_PID"
A_PID=""

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF (SELECT names->>'en' FROM public.pokemon_species
      WHERE id = 'species-catalog-concurrency-test')
    IS DISTINCT FROM 'Newer concurrency fixture' THEN
    RAISE EXCEPTION 'The older concurrent write replaced the newer species record';
  END IF;
  IF (SELECT payload->>'name' FROM public.data_snapshots
      WHERE entity_type = 'pokemon'
        AND entity_id = 'catalog-concurrency-test-pokemon'
        AND version = 'concurrency-v1')
    IS DISTINCT FROM 'Newer concurrency fixture' THEN
    RAISE EXCEPTION 'The older concurrent write replaced the newer snapshot';
  END IF;
END
$$;
SQL

echo "PostgreSQL multi-session catalog concurrency test passed."
