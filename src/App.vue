<script setup lang="ts">
import { ref, onMounted, watch } from "vue";

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
}

/* STATE */
const search = ref("");
const pokemon = ref<Pokemon | null>(null);
const pokemonList = ref<Pokemon[]>([]);
const page = ref(1);
const favorites = ref<number[]>([]);
const darkMode = ref(false);
const loading = ref(false);
const error = ref("");

/* LOCAL STORAGE */
onMounted(() => {
  favorites.value = JSON.parse(localStorage.getItem("favorites") || "[]");
  darkMode.value = localStorage.getItem("dark") === "true";
  loadList();
});

watch(favorites, () => {
  localStorage.setItem("favorites", JSON.stringify(favorites.value));
}, { deep: true });

watch(darkMode, () => {
  localStorage.setItem("dark", String(darkMode.value));
});

/* API */
async function fetchPokemon() {
  if (!search.value) return;
  loading.value = true;
  error.value = "";
  pokemon.value = null;

  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${search.value.toLowerCase()}`
    );
    if (!res.ok) throw new Error("Pokémon não encontrado");
    pokemon.value = await res.json();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadList() {
  const offset = (page.value - 1) * 20;
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=20&offset=${offset}`
  );
  const data = await res.json();

  const details = await Promise.all(
    data.results.map((p: any) => fetch(p.url).then(r => r.json()))
  );

  pokemonList.value = details;
}

function toggleFavorite(id: number) {
  favorites.value.includes(id)
    ? favorites.value = favorites.value.filter(f => f !== id)
    : favorites.value.push(id);
}
</script>

<template>
  <div :class="['app', darkMode && 'dark']">
    <header>
      <h1>🔥 Pokémon Tracker</h1>
      <button @click="darkMode = !darkMode">
        {{ darkMode ? "☀️" : "🌙" }}
      </button>
    </header>

    <section class="search">
      <input v-model="search" placeholder="Nome ou ID" />
      <button @click="fetchPokemon">Buscar</button>
    </section>

    <p v-if="loading">Carregando...</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="pokemon" class="card">
      <img :src="pokemon.sprites.front_default" />
      <h2>{{ pokemon.name }}</h2>
      <button @click="toggleFavorite(pokemon.id)">
        {{ favorites.includes(pokemon.id) ? "★ Favorito" : "☆ Favoritar" }}
      </button>
    </section>

    <h2>Lista</h2>
    <section class="grid">
      <div v-for="p in pokemonList" :key="p.id" class="card">
        <img :src="p.sprites.front_default" />
        <strong>{{ p.name }}</strong>
        <button @click="toggleFavorite(p.id)">
          {{ favorites.includes(p.id) ? "★" : "☆" }}
        </button>
      </div>
    </section>

    <footer>
      <button @click="page--; loadList()" :disabled="page === 1">⬅</button>
      <span>Página {{ page }}</span>
      <button @click="page++; loadList()">➡</button>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding: 1rem;
  font-family: Arial;
  background: #f6f6f6;
}
.dark {
  background: #1e1e1e;
  color: #fff;
}
header {
  display: flex;
  justify-content: space-between;
}
.search {
  margin: 1rem 0;
}
input {
  padding: 0.5rem;
}
button {
  margin-left: 0.5rem;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}
.card {
  background: #fff;
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
}
.dark .card {
  background: #2a2a2a;
}
.error {
  color: red;
}
</style>
