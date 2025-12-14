<script setup lang="ts">
import { usePokemonStore } from "../store/pokemon";
import { RouterLink } from "vue-router";

const store = usePokemonStore();
</script>

<template>
  <header class="header">
    <h1>🔥 Pokémon Tracker</h1>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/favorites">Favoritos</RouterLink>
      <button @click="store.toggleDarkMode">
        {{ store.darkMode ? "☀️" : "🌙" }}
      </button>
    </nav>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--primary);
  color: var(--button-text);
  flex-wrap: wrap;
}
nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
