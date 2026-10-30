import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://pokeapi.co/api/v2";
const SOURCE_ID = "pokeapi";
const MAX_BATCH_SIZE = 25;

type PokemonList = { count: number; results: { name: string; url: string }[] };
type Pokemon = {
  id: number; name: string; height: number; weight: number;
  sprites: Record<string, unknown>;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: unknown[]; moves: unknown[];
  species: { name: string; url: string };
};
type Species = {
  id: number; name: string;
  names: { language: { name: string }; name: string }[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  generation: { name: string } | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function localizedMap(items: { language: { name: string }; name: string }[]) {
  return Object.fromEntries(items.map((item) => [item.language.name, item.name]));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  const syncSecret = Deno.env.get("SYNC_SECRET");
  if (!syncSecret || request.headers.get("x-sync-secret") !== syncSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase server secrets are missing." }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let offset = 0;
  let limit = 20;
  try {
    const body = await request.json();
    offset = Math.max(0, Math.floor(Number(body.offset) || 0));
    limit = Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(Number(body.limit) || 20)));
  } catch {
    // Empty body uses safe defaults.
  }

  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ provider_id: SOURCE_ID, domain: "pokemon_catalog", status: "running" })
    .select("id")
    .single();

  if (runError || !run) return json({ error: "Could not start sync run.", details: runError?.message }, 500);

  let recordsRead = 0;
  let recordsWritten = 0;

  try {
    const listResponse = await fetch(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`);
    if (!listResponse.ok) throw new Error(`PokéAPI catalog returned HTTP ${listResponse.status}`);
    const catalog = (await listResponse.json()) as PokemonList;
    const collectedAt = new Date().toISOString();

    for (const entry of catalog.results) {
      const pokemonResponse = await fetch(entry.url);
      if (!pokemonResponse.ok) throw new Error(`Failed to fetch ${entry.name}`);
      const pokemon = (await pokemonResponse.json()) as Pokemon;
      const speciesResponse = await fetch(pokemon.species.url);
      if (!speciesResponse.ok) throw new Error(`Failed to fetch species for ${entry.name}`);
      const species = (await speciesResponse.json()) as Species;
      recordsRead += 1;

      const speciesId = `species-${species.id}`;
      const formId = `form-${pokemon.id}`;

      const { error: speciesError } = await supabase.from("pokemon_species").upsert({
        id: speciesId,
        dex_number: species.id,
        slug: species.name,
        names: localizedMap(species.names),
        generation: Number(species.generation?.name.match(/\d+/)?.[0]) || null,
        category: Object.fromEntries(species.genera.map((item) => [item.language.name, item.genus])),
        description: Object.fromEntries(species.flavor_text_entries
          .filter((item) => item.language.name === "en" || item.language.name === "pt-BR")
          .map((item) => [item.language.name, item.flavor_text.replace(/[\n\f]/g, " ")])),
        source_id: SOURCE_ID,
        source_url: pokemon.species.url,
        collected_at: collectedAt,
        confidence: 1,
      }, { onConflict: "id" });
      if (speciesError) throw new Error(`Species ${species.name}: ${speciesError.message}`);

      const { error: formError } = await supabase.from("pokemon_forms").upsert({
        id: formId, species_id: speciesId, slug: pokemon.name,
        names: { en: pokemon.name }, variant: "standard", is_default: true,
        availability: "unknown", source_id: SOURCE_ID, source_url: entry.url,
        collected_at: collectedAt, confidence: 1,
      }, { onConflict: "id" });
      if (formError) throw new Error(`Form ${pokemon.name}: ${formError.message}`);

      const { error: typesError } = await supabase.from("pokemon_form_types").upsert(
        pokemon.types.map((item) => ({ form_id: formId, type_id: item.type.name, slot: item.slot })),
        { onConflict: "form_id,slot" },
      );
      if (typesError) throw new Error(`Types ${pokemon.name}: ${typesError.message}`);

      const { error: snapshotError } = await supabase.from("data_snapshots").upsert({
        entity_type: "pokemon", entity_id: String(pokemon.id), version: collectedAt,
        payload: pokemon, source_id: SOURCE_ID, source_url: entry.url, captured_at: collectedAt,
      }, { onConflict: "entity_type,entity_id,version" });
      if (snapshotError) throw new Error(`Snapshot ${pokemon.name}: ${snapshotError.message}`);

      recordsWritten += 1;
    }

    const finishedAt = new Date().toISOString();
    await supabase.from("sync_runs").update({
      finished_at: finishedAt, status: "succeeded",
      records_read: recordsRead, records_written: recordsWritten,
    }).eq("id", run.id);
    await supabase.from("data_sources").update({
      last_status: "updated", last_checked_at: finishedAt, last_success_at: finishedAt,
    }).eq("id", SOURCE_ID);

    return json({ status: "succeeded", offset, limit, totalAvailable: catalog.count,
      nextOffset: offset + catalog.results.length < catalog.count ? offset + catalog.results.length : null,
      recordsRead, recordsWritten, runId: run.id });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await supabase.from("sync_runs").update({
      finished_at: finishedAt, status: "failed",
      records_read: recordsRead, records_written: recordsWritten, error: message.slice(0, 2000),
    }).eq("id", run.id);
    await supabase.from("data_sources").update({
      last_status: "offline", last_checked_at: finishedAt,
    }).eq("id", SOURCE_ID);
    return json({ status: "failed", recordsRead, recordsWritten, error: message, runId: run.id }, 502);
  }
});
