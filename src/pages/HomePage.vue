<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";
import GameButton from "../components/GameButton.vue";
import PokemonFilters from "../components/PokemonFilters.vue";

const store = usePokemonStore();
const page = ref(1);

onMounted(async () => {
  await store.init();
  await store.loadList(page.value);
});

const nextPage = async () => {
  page.value++;
  await store.loadList(page.value);
};

const prevPage = async () => {
  if (page.value === 1) return;
  page.value--;
  await store.loadList(page.value);
};

const toggleFavorite = (id: number) => store.toggleFavorite(id);
</script>

<template>
  <PokemonFilters />

  <div v-if="store.loading">Carregando...</div>
  <div v-if="store.error" class="error">{{ store.error }}</div>

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
    <GameButton label="⬅" :disabled="page===1" :onClick="prevPage" />
    <span>Página {{ page }}</span>
    <GameButton label="➡" :onClick="nextPage" />
  </footer>
</template>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}
.error {
  color: red;
  text-align: center;
}
</style>
