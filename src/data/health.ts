import { supabase } from "../lib/supabase";

export type DataSourceHealth = {
  id: string;
  name: string;
  url: string;
  scope: string;
  limitations: string | null;
  lastStatus: "unknown" | "updated" | "stale" | "offline" | "unavailable";
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  recordCount: number | null;
  recordCountStatus: "available" | "not-tracked" | "error";
};

export function formatSourceDate(value: string | null) {
  if (!value) return "Ainda não verificada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function getDataSourceHealth(): Promise<DataSourceHealth[]> {
  const client = supabase;
  if (!client) throw new Error("Supabase indisponível para consultar a saúde das fontes.");

  const { data, error } = await client
    .from("data_sources")
    .select("id, name, url, scope, limitations, last_status, last_checked_at, last_success_at")
    .eq("enabled", true)
    .order("name");

  if (error) throw error;

  const counts: Array<[string, { value: number | null; status: DataSourceHealth["recordCountStatus"] }]> = await Promise.all((data ?? []).map(async (source) => {
    if (source.id !== "pokeapi") {
      return [source.id, { value: null, status: "not-tracked" }];
    }

    const { count, error: countError } = await client
      .from("pokemon_species")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id);

    if (countError) {
      return [source.id, { value: null, status: "error" }];
    }

    return [source.id, { value: count ?? 0, status: "available" }];
  }));

  const recordCounts = new Map(counts);

  return (data ?? []).map((source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    scope: source.scope,
    limitations: source.limitations,
    lastStatus: source.last_status,
    lastCheckedAt: source.last_checked_at,
    lastSuccessAt: source.last_success_at,
    recordCount: recordCounts.get(source.id)?.value ?? null,
    recordCountStatus: recordCounts.get(source.id)?.status ?? "not-tracked",
  }));
}

export function formatSourceRecordCount(source: DataSourceHealth) {
  if (source.recordCountStatus === "not-tracked") return "contagem não monitorada";
  if (source.recordCountStatus === "error") return "falha ao consultar contagem";
  return `${source.recordCount ?? 0} registros`;
}
