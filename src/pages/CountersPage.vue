<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { usePokemonStore, type Pokemon } from "../store/pokemon";

const store = usePokemonStore();
const query = ref("");
const remoteTarget = ref<Pokemon | null>(null);
const searchLoading = ref(false);
const selectedType = ref("Todos");
const types = ["Todos", "Dragon", "Flying", "Water", "Fire", "Dark"];
const targets = [
  { name: "Rayquaza", id: 384, type: "Dragon / Flying", weakness: "Ice · Rock · Dragon", accent: "#6d9cff", counters: [{ name: "Mamoswine", id: 473, role: "Shadow · Ice", score: "98%" }, { name: "Galarian Darmanitan", id: 555, role: "Ice", score: "94%" }, { name: "Mega Glalie", id: 362, role: "Mega · Ice", score: "91%" }] },
  { name: "Groudon", id: 383, type: "Ground", weakness: "Water · Grass · Ice", accent: "#e08c66", counters: [{ name: "Primal Kyogre", id: 382, role: "Primal · Water", score: "99%" }, { name: "Mega Sceptile", id: 254, role: "Mega · Grass", score: "93%" }, { name: "Kyogre", id: 382, role: "Water", score: "90%" }] },
  { name: "Yveltal", id: 717, type: "Dark / Flying", weakness: "Fairy · Ice · Rock", accent: "#bb79e7", counters: [{ name: "Xerneas", id: 716, role: "Fairy", score: "97%" }, { name: "Mega Diancie", id: 719, role: "Mega · Rock", score: "92%" }, { name: "Gardevoir", id: 282, role: "Fairy", score: "88%" }] },
];
const typeWeaknesses: Record<string, string[]> = { normal: ["Fighting"], fire: ["Water", "Ground", "Rock"], water: ["Electric", "Grass"], electric: ["Ground"], grass: ["Fire", "Ice", "Poison", "Flying", "Bug"], ice: ["Fire", "Fighting", "Rock", "Steel"], fighting: ["Flying", "Psychic", "Fairy"], poison: ["Ground", "Psychic"], ground: ["Water", "Grass", "Ice"], flying: ["Electric", "Ice", "Rock"], psychic: ["Bug", "Ghost", "Dark"], bug: ["Fire", "Flying", "Rock"], rock: ["Water", "Grass", "Fighting", "Ground", "Steel"], ghost: ["Ghost", "Dark"], dragon: ["Ice", "Dragon", "Fairy"], dark: ["Fighting", "Bug", "Fairy"], steel: ["Fire", "Fighting", "Ground"], fairy: ["Poison", "Steel"] };
const dynamicTarget = computed(() => {
  if (!remoteTarget.value) return null;
  const typeNames = remoteTarget.value.types.map(({ type }) => type.name);
  const weaknesses = [...new Set(typeNames.flatMap((type) => typeWeaknesses[type] ?? []))];
  return { name: remoteTarget.value.name, id: remoteTarget.value.id, type: typeNames.map((type) => type.replace(/^./, (letter) => letter.toUpperCase())).join(" / "), weakness: weaknesses.join(" · "), accent: "#806dff", counters: [] };
});
const visibleTargets = computed(() => dynamicTarget.value ? [dynamicTarget.value] : targets.filter(target => (!query.value || target.name.toLowerCase().includes(query.value.toLowerCase())) && (selectedType.value === "Todos" || target.type.includes(selectedType.value))));
const sprite = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(query, (value) => {
  window.clearTimeout(searchTimer);
  remoteTarget.value = null;
  const normalized = value.trim();
  if (!normalized) return;
  searchTimer = window.setTimeout(async () => {
    searchLoading.value = true;
    try {
      remoteTarget.value = await store.getPokemon(normalized);
    } catch {
      remoteTarget.value = null;
    } finally {
      searchLoading.value = false;
    }
  }, 300);
});
</script>

<template>
  <main class="counters-page">
    <section class="page-heading"><div><p class="eyebrow">RAID INTELLIGENCE</p><h1>Counter Finder</h1><p class="lede">Descubra quais Pokémon levam vantagem contra qualquer chefe e monte um time pronto para a batalha.</p></div><div class="heading-status"><span class="live-dot"></span><span>Metas atualizadas</span><small>Base de dados PokéLab</small></div></section>
    <section class="finder-panel"><div class="finder-copy"><span class="pill">CONSULTOR DE BATALHA</span><h2>Quem você precisa derrotar?</h2><p>Pesquise um chefe para ver os melhores counters, Shadow, Mega e alternativas acessíveis.</p></div><label class="search-box"><span>⌕</span><input v-model="query" type="search" placeholder="Buscar Pokémon ou chefe" aria-label="Buscar Pokémon ou chefe" /></label><span v-if="searchLoading" class="search-feedback" role="status">Consultando a Pokédex...</span></section>
    <section class="toolbar"><div><p class="section-label">RECOMENDAÇÕES</p><h2>Escolha um alvo</h2></div><div class="filters" role="tablist"><button v-for="type in types" :key="type" :class="{ active: selectedType === type }" @click="selectedType = type">{{ type }}</button></div></section>
    <section class="target-grid"><article v-for="target in visibleTargets" :key="target.name" class="target-card"><div class="target-header"><div><span class="raid-status">RAID BOSS</span><h3>{{ target.name }}</h3><p>{{ target.type }}</p></div><img :src="sprite(target.id)" :alt="target.name" /></div><div class="weakness"><span>Fraco contra</span><strong>{{ target.weakness }}</strong></div><div class="counter-list"><div v-for="counter in target.counters" :key="counter.name" class="counter-row"><img :src="sprite(counter.id)" :alt="counter.name" /><div><strong>{{ counter.name }}</strong><span>{{ counter.role }}</span></div><b>{{ counter.score }}</b></div></div><RouterLink class="card-link" :to="`/pokemon/${target.id}`">Ver análise completa <span>→</span></RouterLink></article><div v-if="!visibleTargets.length" class="empty-state">Nenhum alvo encontrado. Tente outro nome ou tipo.</div></section>
  </main>
</template>

<style scoped>
.counters-page{max-width:1180px;margin:0 auto;padding:64px 32px 96px}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:42px}.eyebrow,.section-label{margin:0 0 10px;color:var(--accent-bright);font-size:10px;font-weight:800;letter-spacing:.16em}.page-heading h1{margin:0;font-size:46px;letter-spacing:-.06em}.lede{max-width:540px;margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.6}.heading-status{display:grid;grid-template-columns:auto auto;gap:4px 8px;align-items:center;color:var(--text);font-size:11px}.heading-status small{grid-column:2;color:var(--muted);font-size:9px}.live-dot{width:7px;height:7px;border-radius:50%;background:#48d49b;box-shadow:0 0 0 4px #48d49b22}.finder-panel{display:flex;align-items:center;justify-content:space-between;gap:32px;padding:34px 42px;border:1px solid #7861d655;border-radius:18px;background:linear-gradient(110deg,#1d1737,#181d3a 68%,#211e4c);box-shadow:0 22px 60px #0004}.pill{display:inline-block;padding:6px 10px;border-radius:5px;background:#9175ff22;color:#c2b3ff;font-size:9px;font-weight:800;letter-spacing:.12em}.finder-copy h2{margin:16px 0 8px;font-size:28px;letter-spacing:-.05em}.finder-copy p{margin:0;color:#bbb9d4;font-size:13px}.search-box{display:flex;align-items:center;gap:12px;min-width:320px;padding:14px 16px;border:1px solid #ffffff20;border-radius:10px;background:#0c0e1a;color:var(--muted)}.search-feedback{color:#bbb9d4;font-size:11px;white-space:nowrap}.search-box span{font-size:22px}.search-box input{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:12px}.toolbar{display:flex;align-items:flex-end;justify-content:space-between;margin:54px 0 22px}.toolbar h2{margin:0;font-size:24px;letter-spacing:-.04em}.filters{display:flex;gap:8px;flex-wrap:wrap}.filters button{padding:8px 12px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);font-size:10px;cursor:pointer}.filters button.active,.filters button:hover{border-color:#806dff88;background:#806dff18;color:var(--text)}.target-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.target-card{padding:22px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:0 14px 36px #0002}.target-header{display:flex;justify-content:space-between;min-height:124px}.target-header h3{margin:12px 0 3px;font-size:23px;letter-spacing:-.05em}.target-header p,.raid-status{margin:0;color:var(--muted);font-size:10px}.target-header img{width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 12px 14px #0005)}.weakness{display:grid;gap:5px;margin:14px 0;padding:12px;border-radius:8px;background:#ffffff05}.weakness span{color:var(--muted);font-size:10px}.weakness strong{color:#c8baff;font-size:11px}.counter-list{display:grid;gap:8px}.counter-row{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}.counter-row img{width:40px;height:40px;object-fit:contain}.counter-row div{display:grid;gap:3px}.counter-row strong{font-size:11px}.counter-row span{color:var(--muted);font-size:9px}.counter-row b{color:#55d9a2;font-size:11px}.card-link{display:flex;justify-content:space-between;margin-top:18px;color:var(--accent-bright);font-size:11px;font-weight:700;text-decoration:none}.card-link span{font-size:16px}.empty-state{grid-column:1/-1;padding:42px;text-align:center;color:var(--muted);border:1px dashed var(--line)}@media(max-width:850px){.target-grid{grid-template-columns:1fr 1fr}.finder-panel{align-items:stretch;flex-direction:column}.search-box{min-width:0}.page-heading{align-items:flex-start;flex-direction:column;gap:20px}}@media(max-width:600px){.counters-page{padding:38px 18px}.page-heading h1{font-size:36px}.target-grid{grid-template-columns:1fr}.toolbar{align-items:flex-start;flex-direction:column;gap:18px}.finder-panel{padding:26px}.filters{width:100%}}
</style>

<style>
:global(.dark) .counters-page{}
</style> 
