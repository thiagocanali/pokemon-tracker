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
};

export async function getDataSourceHealth(): Promise<DataSourceHealth[]> {
  const { data, error } = await supabase
    .from("data_sources")
    .select("id, name, url, scope, limitations, last_status, last_checked_at, last_success_at")
    .eq("enabled", true)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    scope: source.scope,
    limitations: source.limitations,
    lastStatus: source.last_status,
    lastCheckedAt: source.last_checked_at,
    lastSuccessAt: source.last_success_at,
  }));
}
