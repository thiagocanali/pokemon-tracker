<script setup lang="ts">
import { ref } from "vue";

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
  };
  types: {
    slot: number;
    type: {
      name: string;
    };
  }[];
}

const search = ref<string>("");
const pokemon = ref<Pokemon | null>(null);
const loading = ref<boolean>(false);
const error = ref<string>("");

async function fetchPokemon() {
  if (!search.value) return;

  loading.value = true;
  error.value = "";
  pokemon.value = null;

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${search.value.toLowerCase()}`
    );

    if (!response.ok) {
      throw new Error("Pokémon não encontrado");
    }

    const data: Pokemon = await response.json();
    pokemon.value = data;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <h1>🔥 Pokémon Tracker</h1>

    <form @submit.prevent="fetchPokemon">
      <input
        v-model="search"
        placeholder="Nome ou número do Pokémon"
      />
      <button type="submit">Buscar</button>
    </form>

    <p v-if="loading">Carregando...</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="pokemon" class="card">
      <img :src="pokemon.sprites.front_default" alt="Pokemon" />
      <h2>{{ pokemon.name }}</h2>

      <p><strong>ID:</strong> {{ pokemon.id }}</p>
      <p><strong>Altura:</strong> {{ pokemon.height }}</p>
      <p><strong>Peso:</strong> {{ pokemon.weight }}</p>

      <div class="types">
        <span
          v-for="type in pokemon.types"
          :key="type.slot"
        >
          {{ type.type.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 420px;
  margin: auto;
  padding: 2rem;
  text-align: center;
  font-family: Arial, sans-serif;
}

input {
  padding: 0.5rem;
  width: 70%;
}

button {
  padding: 0.5rem;
  margin-left: 0.5rem;
  cursor: pointer;
}

.card {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: #f4f4f4;
}

.error {
  color: red;
}

.types span {
  display: inline-block;
  margin: 0.2rem;
  padding: 0.3rem 0.6rem;
  background: #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}
</style>
