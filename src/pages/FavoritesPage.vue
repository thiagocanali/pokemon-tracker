<script setup lang="ts">
import { onMounted } from "vue";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();

onMounted(() => {
  // Carrega apenas favoritos
  store.list = store.list.filter(p => store.favorites.includes(p.id));
});
</script>

<template>
  <h2>Favoritos</h2>
  <div v-if="store.favorites.length === 0">Nenhum Pokémon favorito 😢</div>
  <div class="grid">
    <PokemonCard
      v-for="p in store.list.filter(p => store.favorites.includes(p.id))"
      :key="p.id"
      :pokemon="p"
      :favorites="store.favorites"
      @toggleFavorite="store.toggleFavorite"
    />
  </div>
</template>
