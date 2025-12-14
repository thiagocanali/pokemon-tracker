<script setup lang="ts">
import { ref } from "vue";
import { usePokemonStore } from "../store/pokemon";

const store = usePokemonStore();
const type = ref("");
</script>

<template>
  <select v-model="type" @change="store.loadList(1, type)" class="type-select">
    <option value="">Todos</option>
    <option v-for="t in store.types" :key="t">{{ t }}</option>
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
  text-transform: capitalize;
  cursor: pointer;
  transition: all 0.2s;
}

.type-select:hover {
  transform: scale(1.05);
  border-color: gold;
}
</style>
