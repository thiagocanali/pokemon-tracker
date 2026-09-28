<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const featured = computed(() => store.list.slice(0, 4));
const searchResults = computed(() => store.searchResults.slice(0, 5));

let searchTimer: ReturnType<typeof setTimeout> | undefined;
function handleSearchShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.key === "/" && !isTyping && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    searchInput.value?.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput.value) {
    query.value = "";
    searchInput.value?.blur();
  }
}

watch(query, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!value.trim()) {
    void store.searchPokemon("");
    return;
  }
  searchTimer = setTimeout(() => store.searchPokemon(value), 250);
});

onMounted(async () => {
  window.addEventListener("keydown", handleSearchShortcut);
  if (store.list.length === 0) await store.init();
  if (store.list.length === 0) await store.loadList(1);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSearchShortcut);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <main class="dashboard page-shell">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">Pokémon GO Consultant</span>
        <h1>Decida melhor.<br /><span>Jogue mais longe.</span></h1>
        <p>Uma central inteligente para descobrir Pokémon, analisar batalhas e acompanhar tudo que importa no seu próximo encontro.</p>
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <input ref="searchInput" v-model="query" type="search" placeholder="Buscar Pokémon por nome ou número..." aria-label="Buscar Pokémon por nome ou número" />
          <kbd>/</kbd>
        </label>
        <div v-if="query" class="search-results">
          <RouterLink v-for="pokemon in searchResults" :key="pokemon.id" :to="`/pokemon/${pokemon.id}`">#{{ String(pokemon.id).padStart(3, '0') }} {{ pokemon.name }}</RouterLink>
          <span v-if="store.loading">Consultando a Pokédex...</span>
          <span v-else-if="searchResults.length === 0">Nenhum Pokémon encontrado para esta busca.</span>
        </div>
      </div>
      <div class="hero-orbit" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbital-core">GO</div></div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><span class="eyebrow">Estado das fontes</span><h2>Dados disponíveis</h2></div><span class="status-pill">PokéAPI · dados gerais</span></div>
      <div class="insight-grid">
        <article class="insight-card highlight"><div class="card-icon">◈</div><span class="card-label">Eventos e temporadas</span><h3>Fonte não conectada</h3><p>Não há calendário GO verificado disponível nesta versão.</p><RouterLink to="/events">Abrir eventos <span>→</span></RouterLink></article>
        <article class="insight-card"><div class="card-icon violet">✦</div><span class="card-label">Batalhas e rankings</span><h3>Dados GO indisponíveis</h3><p>Rankings PvP, raids e recomendações dependem de providers próprios.</p><RouterLink to="/counters">Ver análise de tipos <span>→</span></RouterLink></article>
        <article class="insight-card"><div class="card-icon blue">⌁</div><span class="card-label">Pokédex geral</span><h3>PokéAPI conectada</h3><p>Dados gerais de Pokémon, sem estatísticas específicas de Pokémon GO.</p><RouterLink to="/pokemon">Abrir database <span>→</span></RouterLink></article>
      </div>
    </section>
    <p v-if="store.error" class="error-message" role="alert">{{ store.error }}</p>

    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">Pokédex geral</span><h2>Consulta rápida</h2></div><RouterLink class="text-link" to="/pokemon">Ver todos <span>→</span></RouterLink></div><div class="featured-grid"><PokemonCard v-for="pokemon in featured" :key="pokemon.id" :pokemon="pokemon" :favorites="store.favorites" @toggleFavorite="store.toggleFavorite(pokemon.id)" /></div></section>

    <section class="tool-strip"><div><span class="eyebrow">Ferramentas para treinadores</span><h2>Tenha clareza antes da próxima batalha.</h2></div><RouterLink class="button button-primary" to="/game">Abrir área Game</RouterLink></section>
  </main>
</template>

<style scoped>
.hero-panel { min-height: 390px; position: relative; display:flex; align-items:center; overflow:hidden; padding: 64px clamp(28px, 6vw, 92px); border:1px solid var(--line); border-radius: 28px; background: radial-gradient(circle at 80% 18%, rgba(131, 96, 255, .2), transparent 32%), linear-gradient(115deg, var(--surface) 0%, #181929 100%); }
.hero-copy { max-width: 650px; position:relative; z-index:1; } .hero-copy h1 { margin: 16px 0; font-size: clamp(36px, 5vw, 68px); line-height:1.02; letter-spacing:-.06em; } .hero-copy h1 span { color: var(--accent-bright); } .hero-copy p { max-width: 540px; color: var(--muted); font-size: 15px; line-height:1.7; }
.search-box { display:flex; align-items:center; gap:12px; max-width: 590px; margin-top:30px; padding: 14px 16px; border:1px solid var(--line-strong); border-radius: 13px; background:rgba(10,11,20,.75); color:var(--muted); } .search-box input { flex:1; border:0; outline:0; background:transparent; color:var(--text); font:inherit; font-size:13px; } kbd { border:1px solid var(--line-strong); border-radius:5px; padding:3px 7px; font-size:11px; }.search-results { display:flex; flex-direction:column; gap:8px; position:absolute; z-index:3; width:min(590px, 100%); padding:12px; border:1px solid var(--line); border-radius:12px; background:var(--surface-elevated); }.search-results a,.search-results span { padding:8px; color:var(--text); font-size:12px; text-decoration:none; }.search-results a:hover { background:var(--surface-muted); border-radius:6px; }
.hero-orbit { position:absolute; right:7%; width:260px; height:260px; opacity:.8; }.orbit { position:absolute; inset:0; border:1px solid rgba(157,126,255,.25); border-radius:50%; transform:rotate(25deg) scaleY(.45); }.orbit-two { transform:rotate(-25deg) scaleY(.45); }.orbital-core { position:absolute; inset:82px; display:grid; place-items:center; border-radius:50%; background:linear-gradient(135deg,#8360ff,#36c7ff); color:#fff; font-weight:800; letter-spacing:.1em; box-shadow:0 0 70px rgba(131,96,255,.55); }
.section-block { margin-top:56px; }.section-heading { display:flex; justify-content:space-between; align-items:end; margin-bottom:20px; }.section-heading h2,.tool-strip h2 { margin:8px 0 0; font-size:24px; letter-spacing:-.03em; }.eyebrow,.card-label { color:var(--muted); font-size:10px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; }.status-pill { color:#76e2b8; font-size:11px; }.status-pill i { display:inline-block; width:7px; height:7px; margin-right:7px; border-radius:50%; background:#49d39b; box-shadow:0 0 10px #49d39b; }.insight-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }.insight-card { min-height:190px; padding:23px; border:1px solid var(--line); border-radius:16px; background:var(--surface); }.insight-card.highlight { background:linear-gradient(135deg,rgba(131,96,255,.22),var(--surface)); border-color:rgba(131,96,255,.35); }.card-icon { color:#f2bb54; font-size:22px; }.card-icon.violet { color:#a689ff; }.card-icon.blue { color:#54cbff; }.insight-card h3 { margin:13px 0 8px; font-size:16px; }.insight-card p { min-height:42px; color:var(--muted); font-size:12px; line-height:1.6; }.insight-card a,.text-link { color:var(--accent-bright); font-size:12px; text-decoration:none; }.insight-card a span,.text-link span { margin-left:6px; }.featured-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }.tool-strip { display:flex; justify-content:space-between; align-items:center; margin:56px 0 20px; padding:30px; border:1px solid var(--line); border-radius:18px; background:var(--surface); }
@media (max-width:800px) { .hero-orbit { opacity:.25; right:-50px; }.insight-grid,.featured-grid { grid-template-columns:1fr 1fr; } } @media (max-width:560px) { .hero-panel { padding:38px 22px; }.insight-grid,.featured-grid { grid-template-columns:1fr; }.section-heading,.tool-strip { align-items:flex-start; flex-direction:column; gap:18px; } }
</style>
