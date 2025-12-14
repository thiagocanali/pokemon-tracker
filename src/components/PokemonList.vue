<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore, type Pokemon } from "../store/pokemon";
import PokemonCard from "./PokemonCard.vue";

const store = usePokemonStore();
const page = ref(1);

const toggleFavorite = (id: number) => {
  store.toggleFavorite(id);
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
  store.loadList(page.value);
});
</script>

<template>
  <div>
    <div v-if="store.loading">Carregando...</div>

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
  </div>
</template>

<style scoped>
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
</style>
