<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore, type Pokemon } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const search = ref("");
const page = ref(1);

const fetchPokemon = async () => {
  if (!search.value) return;
  await store.getPokemon(search.value.toLowerCase());
};

const nextPage = async () => {
  page.value++;
  await store.loadList(page.value);
};

const prevPage = async () => {
  if (page.value === 1) return;
  page.value--;
  await store.loadList(page.value);
};

onMounted(() => {
  store.loadList();
});

const toggleFavorite = (id: number) => {
  store.toggleFavorite(id);
};
</script>

<template>
  <section class="search">
    <input v-model="search" placeholder="Nome ou ID" />
    <button @click="fetchPokemon">Buscar</button>
  </section>

  <p v-if="store.loading">Carregando...</p>
  <p v-if="store.error" class="error">{{ store.error }}</p>

  <h2>Lista</h2>
  <div class="grid">
    <PokemonCard
      v-for="p in store.list"
      :key="p.id"
      :pokemon="p"
      :favorites="store.favorites"
      @toggleFavorite="toggleFavorite"
    />
  </div>

  <footer class="pagination">
    <button @click="prevPage" :disabled="page === 1">⬅</button>
    <span>Página {{ page }}</span>
    <button @click="nextPage">➡</button>
  </footer>
</template>

<style scoped>
.search {
  margin: 1rem 0;
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  padding: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.error {
  color: red;
}
</style>
