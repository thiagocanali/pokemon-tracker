<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { usePokemonStore, type Pokemon } from "../store/pokemon";

const store = usePokemonStore();
const query = ref("");
const searchedPokemon = ref<Pokemon | null>(null);
const searchLoading = ref(false);

const activeFilter = ref("Todos");
const filters = ["Todos", "5 estrelas", "Mega", "Sombrios"];
const raids = [
  { name: "Zacian", tier: "5 estrelas", type: "Fairy / Steel", window: "Até 08 out", status: "Ativo", accent: "#c79cff", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/888.gif" },
  { name: "Mega Gengar", tier: "Mega", type: "Ghost / Poison", window: "Até 15 out", status: "Ativo", accent: "#9e7bff", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/94.gif" },
  { name: "Darkrai", tier: "Sombrios", type: "Dark", window: "Começa em 09 out", status: "Em breve", accent: "#6971d6", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/491.gif" },
  { name: "Mega Blaziken", tier: "Mega", type: "Fire / Fighting", window: "Até 15 out", status: "Ativo", accent: "#ff9976", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/257.gif" },
];
const visibleRaids = computed(() => {
  const filtered = activeFilter.value === "Todos" ? raids : raids.filter(raid => raid.tier === activeFilter.value);
  if (!searchedPokemon.value) return filtered;
  const searchedName = searchedPokemon.value.name.toLowerCase();
  return filtered.filter((raid) => raid.name.toLowerCase().includes(searchedName));
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(query, (value) => {
  window.clearTimeout(searchTimer);
  searchedPokemon.value = null;
  const normalized = value.trim();
  if (!normalized) return;
  searchTimer = window.setTimeout(async () => {
    searchLoading.value = true;
    try { searchedPokemon.value = await store.getPokemon(normalized); } catch { searchedPokemon.value = null; }
    searchLoading.value = false;
  }, 300);
});
</script>

<template>
  <main class="raids-page">
    <section class="page-heading">
      <div><p class="eyebrow">INTELIGÊNCIA DE RAIDS</p><h1>Current Raids</h1><p class="lede">Acompanhe os chefes ativos, prepare seu time e entre na batalha com vantagem.</p></div>
      <div class="heading-status"><span class="live-dot"></span><span>Atualizado agora</span><small>Fonte: PokéLab database</small></div>
    </section>

    <section class="hero-raid">
      <div class="hero-copy"><span class="pill">DESTAQUE DA SEMANA</span><h2>Zacian retorna às raids</h2><p>O lendário Pokémon Guerreiro está de volta. Encontre os melhores counters e maximize seus Premier Balls.</p><RouterLink to="/pokemon/888" class="primary-action">Ver análise completa <span>→</span></RouterLink></div>
      <div class="hero-orbit"><div class="orbit-ring"></div><img :src="raids[0].sprite" alt="Zacian" /></div>
      <div class="hero-meta"><div><strong>5</strong><span>estrelas</span></div><div><strong>08</strong><span>outubro</span></div><div><strong>20</strong><span>participantes</span></div></div>
    </section>

    <section class="toolbar"><div><p class="section-label">RAID BOSS ATUAIS</p><h2>Escolha seu próximo desafio</h2></div><div class="filters" role="tablist"><button v-for="filter in filters" :key="filter" :class="{ active: activeFilter === filter }" @click="activeFilter = filter">{{ filter }}</button></div></section>
    <label class="raid-search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="Buscar um Pokémon para preparar a raid" aria-label="Buscar Pokémon para raid"/><span v-if="searchLoading" role="status">Consultando...</span></label>
    <p v-if="query && !searchLoading && !searchedPokemon" class="raid-empty">Pokémon não encontrado. Tente o nome em inglês ou o número da Pokédex.</p>
    <section v-if="visibleRaids.length" class="raid-grid"><article v-for="raid in visibleRaids" :key="raid.name" class="raid-card"><div class="card-top"><span class="raid-tier" :style="{ color: raid.accent }">{{ raid.tier }}</span><span :class="['raid-status', { upcoming: raid.status !== 'Ativo' }]">{{ raid.status }}</span></div><div class="pokemon-art" :style="{ '--raid-accent': raid.accent }"><img :src="raid.sprite" :alt="raid.name" /></div><h3>{{ raid.name }}</h3><p>{{ raid.type }}</p><div class="card-bottom"><span>{{ raid.window }}</span><RouterLink :to="`/pokemon/${raid.name === 'Zacian' ? 888 : raid.name === 'Mega Gengar' ? 94 : raid.name === 'Darkrai' ? 491 : 257}`">Counters <span>↗</span></RouterLink></div></article></section>
    <p v-else-if="searchedPokemon" class="raid-empty">{{ searchedPokemon.name }} não está entre os chefes estáticos monitorados no momento. Consulte a análise para preparar seus counters.</p>
  </main>
</template>

<style scoped>
.raids-page{max-width:1180px;margin:0 auto;padding:64px 32px 96px}.raid-search{display:flex;align-items:center;gap:10px;margin:-22px 0 28px;padding:12px 14px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-muted);color:var(--muted)}.raid-search input{flex:1;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:12px}.raid-search span:last-child{font-size:10px}.raid-empty{padding:24px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);font-size:13px}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:42px}.eyebrow,.section-label{margin:0 0 10px;color:var(--accent-bright);font-size:10px;font-weight:800;letter-spacing:.16em}.page-heading h1{margin:0;font-size:46px;letter-spacing:-.06em}.lede{max-width:530px;margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.6}.heading-status{display:grid;grid-template-columns:auto auto;gap:4px 8px;align-items:center;color:var(--text);font-size:11px}.heading-status small{grid-column:2;color:var(--muted);font-size:9px}.live-dot{width:7px;height:7px;border-radius:50%;background:#48d49b;box-shadow:0 0 0 4px #48d49b22}.hero-raid{position:relative;display:grid;grid-template-columns:1.25fr .75fr auto;align-items:center;min-height:285px;overflow:hidden;padding:40px 52px;border:1px solid #7861d655;border-radius:18px;background:linear-gradient(110deg,#1d1737,#181d3a 68%,#211e4c);box-shadow:0 22px 60px #0004}.hero-copy{position:relative;z-index:1}.pill{display:inline-block;padding:6px 10px;border-radius:5px;background:#9175ff22;color:#c2b3ff;font-size:9px;font-weight:800;letter-spacing:.12em}.hero-copy h2{max-width:420px;margin:18px 0 10px;font-size:32px;letter-spacing:-.05em}.hero-copy p{max-width:420px;margin:0 0 24px;color:#bbb9d4;font-size:13px;line-height:1.6}.primary-action{display:inline-flex;gap:18px;align-items:center;color:#fff;font-size:12px;font-weight:800;text-decoration:none}.primary-action span{font-size:18px;color:#b4a2ff}.hero-orbit{position:relative;display:grid;place-items:center;height:220px}.hero-orbit img{position:relative;width:150px;image-rendering:pixelated;filter:drop-shadow(0 12px 18px #a78bfa88)}.orbit-ring{position:absolute;width:220px;height:100px;border:1px solid #9f8cff55;border-radius:50%;transform:rotate(-20deg)}.hero-meta{display:flex;gap:24px;padding-left:32px;border-left:1px solid #ffffff20}.hero-meta div{display:grid;gap:3px}.hero-meta strong{font-size:23px;color:#fff}.hero-meta span{color:#aaa9c5;font-size:10px}.toolbar{display:flex;justify-content:space-between;align-items:end;margin:64px 0 24px}.toolbar h2{margin:0;font-size:22px;letter-spacing:-.04em}.filters{display:flex;gap:6px}.filters button{padding:9px 13px;border:1px solid var(--line-strong);border-radius:7px;background:transparent;color:var(--muted);font-size:10px;cursor:pointer}.filters button.active,.filters button:hover{border-color:#8870ff;background:#8065ff18;color:var(--text)}.raid-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.raid-card{padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:transform .2s,border-color .2s}.raid-card:hover{transform:translateY(-4px);border-color:#8370e980}.card-top,.card-bottom{display:flex;justify-content:space-between;align-items:center}.raid-tier{font-size:10px;font-weight:800}.raid-status{padding:4px 7px;border-radius:4px;background:#44d89a18;color:#55dba5;font-size:9px}.raid-status.upcoming{background:#ffffff0d;color:var(--muted)}.pokemon-art{display:grid;place-items:center;height:150px;margin:12px -2px;background:radial-gradient(circle,var(--raid-accent)22 0,transparent 62%)}.pokemon-art img{width:105px;height:105px;image-rendering:pixelated;filter:drop-shadow(0 8px 9px #0007)}.raid-card h3{margin:0;font-size:17px}.raid-card>p{margin:6px 0 20px;color:var(--muted);font-size:11px}.card-bottom{padding-top:13px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}.card-bottom a{color:var(--accent-bright);font-weight:800;text-decoration:none}.card-bottom a span{font-size:14px}@media(max-width:850px){.hero-raid{grid-template-columns:1fr .6fr;padding:30px}.hero-meta{display:none}.raid-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.raids-page{padding:40px 18px}.page-heading,.toolbar{display:block}.heading-status{margin-top:20px}.filters{margin-top:18px;overflow:auto}.hero-raid{display:block}.hero-orbit{position:absolute;right:-25px;top:28px;opacity:.7}.hero-copy{max-width:80%}.raid-grid{grid-template-columns:1fr}.page-heading h1{font-size:38px}}
</style>

<style>
:global(.dark) .raids-page{}
</style> 
