<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { usePokemonStore } from "../store/pokemon";
import type { Pokemon } from "../store/pokemon"; // import type aqui

const route = useRoute();
const store = usePokemonStore();
const pokemon = ref<Pokemon | null>(null);

onMounted(async () => {
  const data = await store.getPokemon(route.params.id as string);
  pokemon.value = data;
});
</script>

<template>
  <div v-if="pokemon" class="details">
    <img :src="pokemon.sprites.front_default" :alt="pokemon.name" />
    <h2>{{ pokemon.name }}</h2>
    <p>Altura: {{ pokemon.height }}</p>
    <p>Peso: {{ pokemon.weight }}</p>
    <p>Tipos: {{ pokemon.types.map(t => t.type.name).join(", ") }}</p>
  </div>
</template>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem;
}
</style>
