-- Register a public Pokémon GO API as a candidate source.
-- This API aggregates Game Master data and other community feeds; it is not official.
insert into public.data_sources (id,name,url,scope,limitations,terms_url)
values (
  'pokemon-go-api',
  'Pokémon GO API (community)',
  'https://pokemon-go-api.github.io/pokemon-go-api/',
  'Pokédex, Pokémon GO forms/types and selected live rotations exposed as JSON.',
  'Unofficial community API. Pokémon catalogue is derived from Game Master data; raid bosses, Max Battles and quests can have separate upstream sources. The upstream project states educational-use-only and third-party ownership of game data. Do not assume commercial redistribution rights or source equivalence. Verify endpoint timestamp, source attribution and repository terms before production ingestion.',
  'https://github.com/pokemon-go-api/pokemon-go-api'
)
on conflict (id) do update set
 name=excluded.name,url=excluded.url,scope=excluded.scope,
 limitations=excluded.limitations,terms_url=excluded.terms_url,updated_at=now();

update public.data_sources
set enabled=false,last_status='unavailable',updated_at=now()
where id='pokemon-go-api';
