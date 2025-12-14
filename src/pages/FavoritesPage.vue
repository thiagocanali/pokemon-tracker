<script setup lang="ts">
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();

const toggleFavorite = (id: number) => store.toggleFavorite(id);

const favoriteList = () =>
  store.list.filter(p => store.favorites.includes(p.id));
</script>

<template>
  <h2>Favoritos</h2>
  <div v-if="favoriteList().length === 0" class="empty">Nenhum Pokémon favoritado</div>
  <div class="grid">
    <PokemonCard
      v-for="p in favoriteList()"
      :key="p.id"
      :pokemon="p"
      :favorites="store.favorites"
      @toggleFavorite="toggleFavorite"
    />
  </div>
</template>

<style scoped>
.empty {
  text-align: center;
  font-weight: bold;
  margin: 1rem 0;
}
</style>
