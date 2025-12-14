<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { usePokemonStore } from "../store/pokemon";

const route = useRoute();
const store = usePokemonStore();
const pokemon = ref<any>(null);

onMounted(async () => {
  pokemon.value = await store.getPokemon(route.params.id as string);
});
</script>

<template>
  <div v-if="pokemon" class="details">
    <img :src="pokemon.sprites.front_default" />
    <h2>{{ pokemon.name }}</h2>
    <p>Altura: {{ pokemon.height }}</p>
    <p>Peso: {{ pokemon.weight }}</p>
  </div>
</template>
