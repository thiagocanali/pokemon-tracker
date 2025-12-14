<script setup lang="ts">
import type { Pokemon } from "../store/pokemon";
import PokemonCard from "./PokemonCard.vue";

const props = defineProps<{
  list: Pokemon[];
  favorites: number[];
}>();

const emit = defineEmits<{
  (e: "toggleFavorite", id: number): void;
}>();
</script>

<template>
  <div class="grid">
    <PokemonCard
      v-for="p in list"
      :key="p.id"
      :pokemon="p"
      :favorites="favorites"
      @toggleFavorite="id => emit('toggleFavorite', id)"
    />
  </div>
</template>
