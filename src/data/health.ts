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
  recordCount: number;
};

export async function getDataSourceHealth(): Promise<DataSourceHealth[]> {
  const { data, error } = await supabase
    .from("data_sources")
    .select("id, name, url, scope, limitations, last_status, last_checked_at, last_success_at")
    .eq("enabled", true)
    .order("name");

  if (error) throw error;
  const counts = await Promise.all((data ?? []).map(async (source) => {
    const { count } = await supabase
      .from("pokemon_records")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id);
    return [source.id, count ?? 0] as const;
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
    recordCount: recordCounts.get(source.id) ?? 0,
  }));
}
