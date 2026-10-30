<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { supabase } from "../lib/supabase";
import { usePokemonStore, type Pokemon } from "../store/pokemon";

type Ranking = {
  id:number; mode:string; league:string|null; rank:number; rating:number|null; source_url:string; collected_at:string;
  data_sources?:{name:string}|null;
  battle_ranking_moves?:{slot:number;moves:{names:Record<string,string>;slug:string}|null}[];
};
const store=usePokemonStore();
const query=ref("");
const remoteTarget=ref<Pokemon|null>(null);
const searchLoading=ref(false);
const rankingLoading=ref(false);
const rankingError=ref("");
const rankings=ref<Ranking[]>([]);
const mode=ref<"pve"|"pvp">("pve");
const dynamicTarget=computed(()=>{
  if(!remoteTarget.value)return null;
  const typeNames=remoteTarget.value.types.map(({type})=>type.name);
  return {name:remoteTarget.value.name,id:remoteTarget.value.id,type:typeNames.map((type)=>type.replace(/^./,(letter)=>letter.toUpperCase())).join(" / ")};
});
const sprite=(id:number)=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const moveName=(move:{names:Record<string,string>;slug:string})=>move.names?.["pt-BR"]||move.names?.en||move.slug;
let searchTimer:ReturnType<typeof setTimeout>|undefined;
let searchRequestId=0;
let rankingRequestId=0;
watch(query,(value)=>{
  window.clearTimeout(searchTimer);
  const requestId=++searchRequestId;
  rankingRequestId++;
  remoteTarget.value=null;rankings.value=[];rankingError="";
  const normalized=value.trim();
  if(!normalized){searchLoading.value=false;return;}
  searchTimer=window.setTimeout(async()=>{
    searchLoading.value=true;
    try{const pokemon=await store.getPokemon(normalized);if(requestId===searchRequestId)remoteTarget.value=pokemon;}
    catch{if(requestId===searchRequestId)remoteTarget.value=null;}
    finally{if(requestId===searchRequestId)searchLoading.value=false;}
  },300);
});
watch([()=>remoteTarget.value?.id,mode],async([pokemonId])=>{
  const requestId=++rankingRequestId;
  rankings.value=[];rankingError.value="";
  if(!pokemonId||!supabase)return;
  rankingLoading.value=true;
  try{
    const {data,error}=await supabase.from("battle_rankings")
      .select("id,mode,league,rank,rating,source_url,collected_at,data_sources(name),battle_ranking_moves(slot,moves(names,slug)),pokemon_forms!inner(species_id)")
      .eq("pokemon_forms.species_id",`species-${pokemonId}`)
      .eq("mode",mode.value).order("rank").limit(10);
    if(error)throw error;
    if(requestId===rankingRequestId)rankings.value=(data??[]) as unknown as Ranking[];
  }catch{if(requestId===rankingRequestId)rankingError.value="Não foi possível consultar os rankings cadastrados.";}
  finally{if(requestId===rankingRequestId)rankingLoading.value=false;}
});
onBeforeUnmount(()=>{window.clearTimeout(searchTimer);searchRequestId++;rankingRequestId++;});
</script>

<template>
  <main class="counters-page">
    <section class="page-heading"><div><p class="eyebrow">RAID INTELLIGENCE</p><h1>Counter Finder</h1><p class="lede">Consulte rankings PvE e PvP somente quando houver dados de batalha com origem rastreável.</p></div><div class="heading-status"><span class="live-dot"></span><span>PokéAPI · dados gerais</span><small>Rankings carregados do catálogo GO</small></div></section>
    <section class="finder-panel"><div class="finder-copy"><span class="pill">CONSULTA DE BATALHA</span><h2>Pesquisar Pokémon</h2><p>Os tipos vêm da PokéAPI; rankings e movesets vêm do catálogo de Pokémon GO.</p></div><label class="search-box"><span>⌕</span><input v-model="query" type="search" placeholder="Nome ou número da Pokédex" aria-label="Buscar Pokémon"/></label><span v-if="searchLoading" class="search-feedback" role="status">Consultando a Pokédex...</span></section>
    <section v-if="dynamicTarget" class="target-grid">
      <article class="target-card"><div class="target-header"><div><span class="raid-status">POKÉDEX GERAL</span><h3>{{dynamicTarget.name}}</h3><p>{{dynamicTarget.type}}</p></div><img :src="sprite(dynamicTarget.id)" :alt="dynamicTarget.name"/></div><RouterLink class="card-link" :to="`/pokemon/${dynamicTarget.id}`">Abrir ficha <span>→</span></RouterLink></article>
      <div class="ranking-panel">
        <div class="ranking-heading"><div><span class="eyebrow">DADOS DE BATALHA</span><h2>Rankings e movesets</h2></div><div class="mode-switch"><button :class="{active:mode==='pve'}" @click="mode='pve'">PvE</button><button :class="{active:mode==='pvp'}" @click="mode='pvp'">PvP</button></div></div>
        <p v-if="rankingLoading" class="empty-state">Consultando rankings...</p><p v-else-if="rankingError" class="empty-state">{{rankingError}}</p>
        <div v-else-if="rankings.length" class="ranking-list"><article v-for="ranking in rankings" :key="ranking.id" class="ranking-row"><div><strong>#{{ranking.rank}} {{ranking.league||"PvE"}}</strong><span v-if="ranking.rating!==null">Rating {{ranking.rating}}</span><div class="move-tags"><span v-for="move in (ranking.battle_ranking_moves||[]).sort((a,b)=>a.slot-b.slot)" :key="move.slot">{{move.moves?moveName(move.moves):"Move não informado"}}</span></div></div><a :href="ranking.source_url" target="_blank" rel="noreferrer">{{ranking.data_sources?.name||"Fonte"}} ↗</a></article></div>
        <p v-else class="empty-state">Ainda não há rankings {{mode.toUpperCase()}} verificados para este Pokémon. Nenhum counter é inventado ou calculado com dados de jogos principais.</p>
      </div>
    </section>
    <section v-else class="target-grid"><div v-if="!query" class="empty-state">Pesquise um Pokémon para consultar tipos e rankings.</div><div v-else-if="searchLoading" class="empty-state">Consultando a Pokédex...</div><div v-else class="empty-state">Pokémon não encontrado. Tente um nome em inglês ou o número da Pokédex.</div></section>
  </main>
</template>

<style scoped>
.counters-page{max-width:1180px;margin:0 auto;padding:64px 32px 96px}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:42px}.eyebrow,.section-label{margin:0 0 10px;color:var(--accent-bright);font-size:10px;font-weight:800;letter-spacing:.16em}.page-heading h1{margin:0;font-size:46px;letter-spacing:-.06em}.lede{max-width:540px;margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.6}.heading-status{display:grid;grid-template-columns:auto auto;gap:4px 8px;align-items:center;color:var(--text);font-size:11px}.heading-status small{grid-column:2;color:var(--muted);font-size:9px}.live-dot{width:7px;height:7px;border-radius:50%;background:#a68cff;box-shadow:0 0 0 4px #a68cff22}.finder-panel{display:flex;align-items:center;justify-content:space-between;gap:32px;padding:34px 42px;border:1px solid #7861d655;border-radius:18px;background:linear-gradient(110deg,#1d1737,#181d3a 68%,#211e4c);box-shadow:0 22px 60px #0004}.pill{display:inline-block;padding:6px 10px;border-radius:5px;background:#9175ff22;color:#c2b3ff;font-size:9px;font-weight:800;letter-spacing:.12em}.finder-copy h2{margin:16px 0 8px;font-size:28px;letter-spacing:-.05em}.finder-copy p{margin:0;color:#bbb9d4;font-size:13px}.search-box{display:flex;align-items:center;gap:12px;min-width:320px;padding:14px 16px;border:1px solid #ffffff20;border-radius:10px;background:#0c0e1a;color:var(--muted)}.search-feedback{color:#bbb9d4;font-size:11px;white-space:nowrap}.search-box span{font-size:22px}.search-box input{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:12px}.target-grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;margin-top:24px}.target-card,.ranking-panel{padding:22px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:0 14px 36px #0002}.target-header{display:flex;justify-content:space-between;min-height:124px}.target-header h3{margin:12px 0 3px;font-size:23px;letter-spacing:-.05em}.target-header p,.raid-status{margin:0;color:var(--muted);font-size:10px}.target-header img{width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 12px 14px #0005)}.card-link{display:flex;justify-content:space-between;margin-top:18px;color:var(--accent-bright);font-size:11px;font-weight:700;text-decoration:none}.ranking-heading{display:flex;justify-content:space-between;align-items:center;gap:16px}.ranking-heading h2{margin:0;font-size:20px}.mode-switch{display:flex;gap:5px}.mode-switch button{padding:8px 12px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);cursor:pointer}.mode-switch button.active{border-color:var(--accent);color:var(--accent-bright);background:var(--accent-soft)}.ranking-list{display:grid;gap:10px;margin-top:18px}.ranking-row{display:flex;justify-content:space-between;gap:16px;padding:14px;border:1px solid var(--line);border-radius:9px}.ranking-row>div{display:grid;gap:6px}.ranking-row strong{font-size:12px}.ranking-row span{color:var(--muted);font-size:10px}.ranking-row a{color:var(--accent-bright);font-size:10px;white-space:nowrap}.move-tags{display:flex;gap:6px;flex-wrap:wrap}.move-tags span{padding:5px 7px;border-radius:5px;background:var(--surface-strong)}.empty-state{grid-column:1/-1;padding:42px;text-align:center;color:var(--muted);border:1px dashed var(--line)}@media(max-width:850px){.target-grid{grid-template-columns:1fr}.finder-panel{align-items:stretch;flex-direction:column}.search-box{min-width:0}.page-heading{align-items:flex-start;flex-direction:column;gap:20px}}@media(max-width:600px){.counters-page{padding:38px 18px}.page-heading h1{font-size:36px}.finder-panel{padding:26px}.ranking-heading{align-items:flex-start;flex-direction:column}.ranking-row{align-items:flex-start;flex-direction:column}}
</style>
