export type SourceProvenance = {
  source_id?: string | null;
  source_url: string;
  collected_at: string;
  source_updated_at?: string | null;
  data_version?: string | null;
};

export function formatCollectedAt(value: string | null | undefined) {
  if (!value) return "Coleta não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data de coleta inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

export function formatSourceUpdatedAt(value: string | null | undefined) {
  if (!value) return "Atualização oficial não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data de atualização inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

export function formatDataVersion(value: string | null | undefined) {
  return value ? `Versão: ${value}` : "Versão da fonte não informada";
}
