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
    <img :src="pokemon.sprites.front_default" :alt="pokemon.name" />
    <h3>{{ pokemon.name }}</h3>
    <button @click="emit('toggleFavorite', pokemon.id)">
      {{ isFavorite() ? "★ Favorito" : "☆ Favoritar" }}
    </button>
  </div>
</template>
