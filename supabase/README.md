# Supabase data platform

The initial migration creates normalized reference-data tables for species, forms, GO stats, moves, evolutions, events, seasons, raids, and battle rankings. Source URL, collection time, version, and confidence travel with imported records. Snapshots and `data_changes` provide a place for version history and change detection; `sync_runs` records ingestion outcomes.

No Pokémon GO records are seeded. Seed data is limited to the PokéAPI source metadata and the fixed 18-type taxonomy. Public clients can read reference data, while ingestion is expected to run in a trusted server or job using the service role key. Never expose that key in the frontend.

Saved teams are scoped to the authenticated user by row-level security. The existing client reads, inserts, and deletes rows in this table.

To apply the migration, install the Supabase CLI, link this project to its Supabase project, then run `supabase db push`. Apply it to a disposable local database first; this environment does not have PostgreSQL or the Supabase CLI installed.