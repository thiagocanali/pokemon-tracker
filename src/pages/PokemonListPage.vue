<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { usePokemonStore } from "../store/pokemon";

const store = usePokemonStore();
const query = ref("");
const selectedType = ref("");
const page = ref(1);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const visiblePokemon = computed(() => store.list.filter((pokemon) => {
  const matchesQuery = !query.value || pokemon.name.includes(query.value.toLowerCase()) || String(pokemon.id) === query.value;
  const matchesType = !selectedType.value || pokemon.types.some((type) => type.type.name === selectedType.value);
  return matchesQuery && matchesType;
}));

async function loadPage(nextPage: number) {
  page.value = nextPage;
  await store.loadList(nextPage, selectedType.value);
}

async function filterByType() {
  await store.loadList(page.value, selectedType.value);
}

watch(query, (value) => {
  page.value = 1;
  if (searchTimer) clearTimeout(searchTimer);

  searchTimer = setTimeout(async () => {
    if (value.trim()) {
      await store.searchPokemon(value);
    } else {
      await store.loadList(1, selectedType.value);
    }
  }, 280);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

onMounted(async () => {
  if (!store.list.length) await store.loadList();
});
</script>

<template>
  <main class="database page-shell">
    <section class="database-intro">
      <div>
        <span class="eyebrow">Super Database</span>
        <h1>Explore Pokémon</h1>
        <p>Pesquise por nome, número ou tipo e abra uma ficha completa para cada Pokémon.</p>
      </div>
      <div class="database-stat"><strong>001–1025</strong><span>Pokémon catalogados</span></div>
    </section>

    <section class="database-toolbar" aria-label="Filtros da database">
      <label class="database-search"><span aria-hidden="true">⌕</span><span class="sr-only">Buscar Pokémon</span><input v-model="query" type="search" placeholder="Buscar por nome ou número..." aria-label="Buscar por nome ou número" /></label>
      <label class="type-filter"><span>Tipo</span><select v-model="selectedType" @change="filterByType"><option value="">Todos os tipos</option><option v-for="type in store.types" :key="type" :value="type">{{ type }}</option></select></label>
    </section>

    <p v-if="store.error" class="error-message">Não foi possível carregar os dados. Tente novamente.</p>
    <div v-if="store.loading" class="loading-state">Sincronizando database...</div>
    <section v-else class="pokemon-grid" aria-live="polite">
      <RouterLink v-for="pokemon in visiblePokemon" :key="pokemon.id" class="pokemon-tile" :to="`/pokemon/${pokemon.id}`">
        <span class="pokemon-number">#{{ String(pokemon.id).padStart(3, "0") }}</span>
        <img :src="pokemon.sprites.front_default" :alt="pokemon.name" loading="lazy" />
        <strong>{{ pokemon.name }}</strong>
        <span class="type-row"><span v-for="type in pokemon.types" :key="type.type.name" class="type-badge">{{ type.type.name }}</span></span>
      </RouterLink>
      <p v-if="!visiblePokemon.length" class="empty-state">Nenhum Pokémon encontrado com esses filtros.</p>
    </section>

    <nav class="pagination" aria-label="Paginação da database"><button :disabled="page === 1 || store.loading" @click="loadPage(page - 1)">Anterior</button><span>Página {{ page }}</span><button :disabled="store.loading" @click="loadPage(page + 1)">Próxima</button></nav>
  </main>
</template>

<style scoped>
.database-intro{display:flex;justify-content:space-between;align-items:end;gap:24px;padding:38px 0 28px;border-bottom:1px solid var(--line)}h1{margin:10px 0 8px;font-size:clamp(34px,5vw,56px);letter-spacing:-.06em}.database-intro p{margin:0;color:var(--muted);font-size:14px}.database-stat{display:flex;flex-direction:column;gap:6px;text-align:right}.database-stat strong{color:var(--accent-bright);font-size:22px}.database-stat span{color:var(--muted);font-size:11px}.database-toolbar{display:flex;gap:12px;margin:28px 0}.database-search,.type-filter{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--muted)}.database-search{flex:1}.database-search input{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:13px}.type-filter span{font-size:11px}.type-filter select{border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:12px}.pokemon-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.pokemon-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:7px;padding:17px 12px 15px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text);text-decoration:none;transition:transform .2s,border-color .2s}.pokemon-tile:hover{transform:translateY(-3px);border-color:var(--accent)}.pokemon-tile img{width:110px;height:110px;image-rendering:auto}.pokemon-tile strong{text-transform:capitalize;font-size:14px}.pokemon-number{align-self:flex-start;color:var(--muted);font-size:10px}.type-row{display:flex;gap:5px}.type-badge{padding:4px 7px;border-radius:5px;background:var(--surface-muted);color:var(--muted);font-size:9px;text-transform:uppercase}.pagination{display:flex;justify-content:center;align-items:center;gap:18px;margin:30px 0}.pagination button{padding:9px 14px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer}.pagination button:disabled{cursor:not-allowed;opacity:.45}.pagination span,.loading-state,.empty-state,.error-message{color:var(--muted);font-size:12px}.error-message{color:#ff8b9e}.loading-state,.empty-state{text-align:center;grid-column:1/-1;padding:50px}.eyebrow{color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}@media(max-width:900px){.pokemon-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:650px){.database-intro{align-items:flex-start;flex-direction:column}.database-stat{text-align:left}.database-toolbar{flex-direction:column}.pokemon-grid{grid-template-columns:repeat(2,1fr)}.pokemon-tile img{width:90px;height:90px}}
</style>
