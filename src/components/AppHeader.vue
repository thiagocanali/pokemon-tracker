<script setup lang="ts">
import { usePokemonStore } from "../store/pokemon";

const store = usePokemonStore();
</script>

<template>
  <header class="header">
    <h1>Pokémon Tracker</h1>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/favorites">Favoritos</RouterLink>
      <button @click="store.toggleDark">
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
}
nav {
  display: flex;
  gap: 1rem;
}
</style>
