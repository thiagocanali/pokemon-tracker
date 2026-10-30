<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "../lib/supabase";
import { formatSourceDate, getDataSourceHealth, type DataSourceHealth } from "../data/health";

type MoveRow = {
  id: string; slug: string; names: Record<string, string>; type_id: string; category: string;
  pve_damage: number | null; pve_energy_delta: number | null; pve_duration_ms: number | null;
  pvp_damage: number | null; pvp_energy_delta: number | null; pvp_duration_turns: number | null;
  source_url: string; collected_at: string;
  pokemon_types?: { names: Record<string, string> } | null;
  data_sources?: { name: string } | null;
};
const moves = ref<MoveRow[]>([]);
const sources = ref<DataSourceHealth[]>([]);
const loading = ref(true);
const error = ref("");
const query = ref("");
const category = ref("all");
const filteredMoves = computed(() => moves.value.filter((move) => {
  const label = move.names?.["pt-BR"] || move.names?.en || move.slug;
  const matchesQuery = `${label} ${move.slug} ${move.type_id}`.toLowerCase().includes(query.value.trim().toLowerCase());
  return matchesQuery && (category.value === "all" || move.category === category.value);
}));
const moveName = (move: MoveRow) => move.names?.["pt-BR"] || move.names?.en || move.slug;
const typeName = (move: MoveRow) => move.pokemon_types?.names?.["pt-BR"] || move.pokemon_types?.names?.en || move.type_id;

async function loadData() {
  if (!supabase) { error.value = "Configure o Supabase para consultar o catálogo."; loading.value = false; return; }
  try {
    const [moveResult, sourceResult] = await Promise.all([
      supabase.from("moves").select("id,slug,names,type_id,category,pve_damage,pve_energy_delta,pve_duration_ms,pvp_damage,pvp_energy_delta,pvp_duration_turns,source_url,collected_at,pokemon_types(names),data_sources(name)").order("slug"),
      getDataSourceHealth(),
    ]);
    if (moveResult.error) throw moveResult.error;
    moves.value = (moveResult.data ?? []) as unknown as MoveRow[];
    sources.value = sourceResult;
  } catch {
    error.value = "Não foi possível consultar o catálogo de moves.";
  } finally { loading.value = false; }
}
onMounted(loadData);
</script>

<template>
  <main class="moves-page page-shell">
    <section class="page-intro"><div><p class="eyebrow">DATABASE / MOVES</p><h1>Moves de Pokémon GO</h1><p>Dano, energia e duração são exibidos somente quando registrados por uma fonte rastreável.</p></div><div class="result-count"><strong>{{ moves.length }}</strong><span>moves catalogados</span></div></section>
    <section class="tool-panel"><label class="search-field"><span>⌕</span><input v-model="query" type="search" placeholder="Buscar move ou tipo" aria-label="Buscar move" /></label><select v-model="category" aria-label="Filtrar categoria"><option value="all">Todas as categorias</option><option value="fast">Rápidos</option><option value="charged">Carregados</option></select></section>
    <section class="source-panel" aria-labelledby="sources-title"><div><p class="eyebrow">PROVENIÊNCIA</p><h2 id="sources-title">Fontes conectadas</h2></div><div v-if="sources.length" class="source-list"><article v-for="source in sources" :key="source.id" class="source-item"><div><strong>{{ source.name }}</strong><span>{{ source.scope }}</span></div><span class="source-status" :class="source.lastStatus">{{ source.recordCount }} registros · {{ source.lastStatus === "unknown" ? "sem sincronização" : source.lastStatus }}</span><p>Última verificação: {{ formatSourceDate(source.lastCheckedAt) }}</p><p v-if="source.limitations">{{ source.limitations }}</p></article></div><p v-else class="source-empty">Nenhuma fonte catalogada.</p></section>
    <section class="moves-table" aria-label="Catálogo de moves">
      <p v-if="loading" class="empty-state">Carregando catálogo...</p>
      <p v-else-if="error" class="empty-state">{{ error }}</p>
      <p v-else-if="!filteredMoves.length" class="empty-state">{{ moves.length ? "Nenhum move corresponde ao filtro." : "Ainda não há moves de Pokémon GO catalogados. A PokéAPI não fornece os dados de batalha deste jogo." }}</p>
      <template v-else>
        <div class="table-head"><span>Move</span><span>Tipo</span><span>Categoria</span><span>Dano PvE</span><span>Energia PvE</span><span>Dano PvP</span><span>Fonte</span></div>
        <article v-for="move in filteredMoves" :key="move.id" class="move-row">
          <div class="move-name"><span class="move-icon" :class="move.type_id"></span><strong>{{ moveName(move) }}</strong></div>
          <span class="type-pill">{{ typeName(move) }}</span><span class="class-label">{{ move.category === "fast" ? "Rápido" : "Carregado" }}</span>
          <span>{{ move.pve_damage ?? "—" }}</span><span>{{ move.pve_energy_delta ?? "—" }}</span><span>{{ move.pvp_damage ?? "—" }}</span>
          <a :href="move.source_url" target="_blank" rel="noreferrer">{{ move.data_sources?.name || "Fonte" }}</a>
        </article>
      </template>
    </section>
  </main>
</template>

<style scoped>
.moves-page{max-width:1240px;margin:auto;padding:60px clamp(20px,5vw,72px) 80px}.page-intro{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px}.eyebrow{color:var(--accent-bright);font-size:10px;letter-spacing:.16em;font-weight:800}.page-intro h1{margin:9px 0 8px;font-size:clamp(34px,5vw,58px);letter-spacing:-.07em}.page-intro p:last-child{color:var(--muted);font-size:14px}.result-count{display:flex;flex-direction:column;text-align:right;color:var(--muted);font-size:11px}.result-count strong{color:var(--text);font-size:28px}.tool-panel{display:flex;gap:12px;padding:14px;margin-bottom:20px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.source-panel{display:grid;grid-template-columns:minmax(180px,.7fr) 1.3fr;gap:24px;padding:22px;margin-bottom:20px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.source-panel h2{margin:6px 0 0;font-size:20px;letter-spacing:-.04em}.source-list{display:grid;gap:10px}.source-item{padding:13px;border:1px solid var(--line);border-radius:10px;background:var(--surface-strong)}.source-item>div{display:flex;justify-content:space-between;gap:12px;align-items:center}.source-item strong{font-size:13px}.source-item span:not(.source-status){display:block;color:var(--muted);font-size:11px}.source-item p,.source-empty{margin:8px 0 0;color:var(--muted);font-size:11px}.source-status{padding:4px 7px;border-radius:5px;background:#3a321a;color:#e7c869;font-size:10px;text-transform:capitalize}.source-status.updated{background:#193a2d;color:#83d6a9}.source-status.offline,.source-status.unavailable{background:#40272b;color:#f08e99}.search-field{display:flex;align-items:center;gap:10px;flex:1;color:var(--muted)}input,select{border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-strong);color:var(--text);padding:12px 14px;font:inherit;font-size:12px}input{width:100%;border:0;background:transparent;outline:0}.search-field span{font-size:22px}.moves-table{overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.table-head,.move-row{display:grid;grid-template-columns:2fr 1fr .9fr .7fr .8fr .7fr 1fr;align-items:center;gap:14px;padding:17px 22px}.table-head{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.12em;border-bottom:1px solid var(--line)}.move-row{min-height:65px;border-bottom:1px solid var(--line);font-size:12px}.move-name{display:flex;align-items:center;gap:12px}.move-icon{width:8px;height:25px;border-radius:5px;background:var(--accent-bright)}.type-pill{width:max-content;padding:5px 9px;border-radius:6px;background:#383052;color:#c7b9ff;font-size:10px}.class-label{color:var(--muted)}.move-row a{color:var(--accent-bright);font-size:11px}.empty-state{padding:34px;text-align:center;color:var(--muted)}@media(max-width:760px){.page-intro{align-items:flex-start;gap:20px}.tool-panel{flex-wrap:wrap}.search-field{flex-basis:100%}.table-head{display:none}.move-row{grid-template-columns:1.5fr 1fr 1fr;padding:16px}.move-row>:nth-child(n+4){display:none}}@media(max-width:640px){.page-intro{display:block}.result-count{text-align:left;margin-top:18px}.moves-page{padding:36px 16px 56px}.source-panel{display:block;padding:18px}.source-list{margin-top:18px}.source-item>div{align-items:flex-start}.moves-table{overflow-x:auto}}
</style>
