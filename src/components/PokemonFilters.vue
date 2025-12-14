<script setup lang="ts">
import { ref, watch } from "vue";
import { usePokemonStore } from "../store/pokemon";

const store = usePokemonStore();
const type = ref("");

watch(type, async () => {
  await store.loadList(1, type.value); // sempre carrega a página 1 ao filtrar
});
</script>

<template>
  <select v-model="type" class="type-select">
    <option value="">Todos</option>
    <option v-for="t in store.types" :key="t" :value="t">{{ t }}</option>
  </select>
</template>

<style scoped>
.type-select {
  padding: 0.5rem;
  border-radius: 12px;
  background: var(--card-bg);
  border: 2px solid var(--primary);
  color: var(--text);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.type-select:hover {
  transform: scale(1.05);
  border-color: #81d4fa;
}
</style>
