<script setup lang="ts">
import { onMounted, ref } from "vue";
import { usePokemonStore, type Pokemon } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const favoritePokemon = ref<Pokemon[]>([]);
const loading = ref(true);
const toggleFavorite = async (id: number) => {
  await store.toggleFavorite(id);
  favoritePokemon.value = favoritePokemon.value.filter((pokemon) => store.favorites.includes(pokemon.id));
};

onMounted(async () => {
  await store.init();
  const results = await Promise.all(store.favorites.map((id) => store.getPokemon(String(id)).catch(() => null)));
  favoritePokemon.value = results.filter((pokemon): pokemon is Pokemon => Boolean(pokemon));
  loading.value = false;
});
</script>

<template>
  <main class="favorites-page page-shell">
    <p class="eyebrow">SUA COLEÇÃO</p>
    <h1>Favoritos</h1>
    <p v-if="loading" class="loading-state" role="status">Carregando sua coleção...</p>
    <div v-else-if="favoritePokemon.length === 0" class="empty-state">Nenhum Pokémon favoritado ainda.</div>
    <div v-else class="grid">
    <PokemonCard
      v-for="p in favoritePokemon"
      :key="p.id"
      :pokemon="p"
      :favorites="store.favorites"
      @toggleFavorite="toggleFavorite"
    />
    </div>
  </main>
</template>

<style scoped>
.favorites-page{max-width:1180px}.favorites-page h1{margin:8px 0 24px;font-size:42px;letter-spacing:-.06em}.empty-state{padding:36px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);background:var(--surface-muted)}
</style>
