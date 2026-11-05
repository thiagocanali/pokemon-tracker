import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseSyncPagination } from "./validation.ts";

const API_BASE = "https://pokeapi.co/api/v2";
const SOURCE_ID = "pokeapi";
const MAX_BATCH_SIZE = 25;

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 300;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!RETRYABLE_HTTP_STATUSES.has(response.status) || attempt >= MAX_RETRIES) return response;
      await response.body?.cancel();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
    }
    await wait(RETRY_BASE_DELAY_MS * 2 ** attempt);
  }
}

function isRetryableRpcError(error: { code?: string; message?: string }) {
  const code = error.code ?? '';
  const message = error.message ?? '';
  return code.startsWith('08') || code.startsWith('53') || code.startsWith('57')
    || /timeout|timed out|temporar|network|connection reset|socket|503|502|504|429/i.test(message);
}

async function rpcWithRetry<T>(
  operation: () => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
) {
  for (let attempt = 0; ; attempt += 1) {
    const result = await operation();
    if (!result.error || !isRetryableRpcError(result.error) || attempt >= MAX_RETRIES) return result;
    await wait(RETRY_BASE_DELAY_MS * 2 ** attempt);
  }
}


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

  let body: unknown = {};
  if (request.body) {
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must contain valid JSON." }, 400);
    }
  }

  const pagination = parseSyncPagination(body);
  if (!pagination.ok) return json({ error: pagination.error }, 400);
  const { offset, limit } = pagination.value;

  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ provider_id: SOURCE_ID, domain: "pokemon_catalog", status: "running" })
    .select("id")
    .single();

  if (runError || !run) return json({ error: "Could not start sync run.", details: runError?.message }, 500);

  let recordsRead = 0;
  let recordsWritten = 0;

  try {
    const listResponse = await fetchWithRetry(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`);
    if (!listResponse.ok) throw new Error(`PokéAPI catalog returned HTTP ${listResponse.status}`);
    const catalog = (await listResponse.json()) as PokemonList;
    const collectedAt = new Date().toISOString();

    for (const entry of catalog.results) {
      const pokemonResponse = await fetchWithRetry(entry.url);
      if (!pokemonResponse.ok) throw new Error(`Failed to fetch ${entry.name}: HTTP ${pokemonResponse.status}`);
      const pokemon = (await pokemonResponse.json()) as Pokemon;
      const speciesResponse = await fetchWithRetry(pokemon.species.url);
      if (!speciesResponse.ok) throw new Error(`Failed to fetch species for ${entry.name}: HTTP ${speciesResponse.status}`);
      const species = (await speciesResponse.json()) as Species;
      recordsRead += 1;

      const speciesId = `species-${species.id}`;
      const formId = `form-${pokemon.id}`;

      const { error: recordError } = await rpcWithRetry(() => supabase.rpc("sync_pokemon_catalog_record", {
        p_species: {
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
          data_version: "pokeapi-v2",
        },
        p_form: {
          id: formId,
          species_id: speciesId,
          slug: pokemon.name,
          names: { en: pokemon.name },
          variant: pokemon.name === species.name ? "standard" : "other",
          is_default: pokemon.name === species.name,
          availability: "unknown",
          source_id: SOURCE_ID,
          source_url: entry.url,
          collected_at: collectedAt,
          data_version: "pokeapi-v2",
        },
        p_types: pokemon.types.map((item) => ({ type_id: item.type.name, slot: item.slot })),
        p_snapshot: {
          entity_type: "pokemon",
          entity_id: String(pokemon.id),
          version: collectedAt,
          payload: pokemon,
          source_id: SOURCE_ID,
          source_url: entry.url,
          captured_at: collectedAt,
          data_version: "pokeapi-v2",
        },
      }));
      if (recordError) throw new Error(`Atomic save failed for ${pokemon.name}: ${recordError.message}`);

      recordsWritten += 1;
    }

    const { error: finishError } = await rpcWithRetry(() => supabase.rpc("finish_pokemon_catalog_sync", {
      p_run_id: run.id,
      p_status: "succeeded",
      p_records_read: recordsRead,
      p_records_written: recordsWritten,
      p_error: null,
    }));
    if (finishError) throw new Error(`Could not finalize successful sync: ${finishError.message}`);

    return json({
      status: "succeeded", offset, limit, totalAvailable: catalog.count,
      nextOffset: offset + catalog.results.length < catalog.count ? offset + catalog.results.length : null,
      recordsRead, recordsWritten, runId: run.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    const { error: finishError } = await rpcWithRetry(() => supabase.rpc("finish_pokemon_catalog_sync", {
      p_run_id: run.id,
      p_status: "failed",
      p_records_read: recordsRead,
      p_records_written: recordsWritten,
      p_error: message,
    }));

    return json({
      status: "failed",
      recordsRead,
      recordsWritten,
      error: message,
      finalizationError: finishError?.message ?? null,
      runId: run.id,
    }, 502);
  }
});
