<script setup lang="ts">
import type { Pokemon } from "../store/pokemon";

const props = defineProps<{
  pokemon: Pokemon;
  favorites: number[];
}>();

const emit = defineEmits<{
  (e: "toggleFavorite", id: number): void;
}>();

const isFavorite = () => props.favorites.includes(props.pokemon.id);
</script>

<template>
  <div class="card">
    <img :src="props.pokemon.sprites.front_default" :alt="props.pokemon.name" />
    <h3>{{ props.pokemon.name }}</h3>
    <button @click="emit('toggleFavorite', props.pokemon.id)">
      {{ isFavorite() ? "★ Favorito" : "☆ Favoritar" }}
    </button>
  </div>
</template>
