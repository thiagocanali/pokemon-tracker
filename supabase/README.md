# Supabase data platform

The initial migration creates normalized reference-data tables for species, forms, GO stats, moves, evolutions, events, seasons, raids, and battle rankings. Source URL, collection time, version, and confidence travel with imported records. Snapshots and `data_changes` provide a place for version history and change detection; `sync_runs` records ingestion outcomes.

No Pokémon GO records are seeded. Seed data is limited to the PokéAPI source metadata and the fixed 18-type taxonomy. Public clients can read reference data, while ingestion runs in a trusted Supabase Edge Function using the service role key. Never expose that key in the frontend.

## PokéAPI catalog synchronization

The `sync-pokemon-catalog` Edge Function imports the general Pokémon catalog into `pokemon_species`, `pokemon_forms`, `pokemon_form_types`, and `data_snapshots`. It processes a bounded batch per request (maximum 25 Pokémon) and records each attempt in `sync_runs`.

Deploy the function and configure its secret:

```sh
supabase functions deploy sync-pokemon-catalog
supabase secrets set SYNC_SECRET="use-a-long-random-secret"
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Keep the service role key server-side.

Invoke one batch:

```sh
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-pokemon-catalog" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "x-sync-secret: YOUR_SYNC_SECRET" \
  -d '{"offset":0,"limit":20}'
```

Continue with the returned `nextOffset` until it is `null`. Use a modest batch size (20 is the default) and do not run overlapping catalog syncs. The function imports default PokéAPI Pokémon entries; it does not claim to import Pokémon GO stats, movesets, raids, events, or PvP/PvE rankings.

Apply migrations before deploying:

```sh
supabase db push
```

Apply migrations to a disposable local database first when possible. Saved teams remain scoped to the authenticated user by row-level security.
