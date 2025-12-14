<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import HomePage from "./pages/HomePage.vue";
import FavoritesPage from "./pages/FavoritesPage.vue";
import { usePokemonStore } from "./store/pokemon";

const page = ref<"home" | "favorites">("home");

const store = usePokemonStore();
const darkMode = ref(store.darkMode);

onMounted(async () => {
  await store.init();
  darkMode.value = store.darkMode;
});

watch(darkMode, () => {
  store.toggleDark();
});
</script>

<template>
  <div :class="['app', darkMode ? 'dark' : '']">
    <header class="header">
      <h1>🔥 Pokémon Tracker</h1>
      <nav>
        <button @click="page = 'home'">Home</button>
        <button @click="page = 'favorites'">Favoritos</button>
      </nav>
      <button @click="darkMode = !darkMode" class="toggle-dark">
        {{ darkMode ? "☀️" : "🌙" }}
      </button>
    </header>

    <HomePage v-if="page === 'home'" />
    <FavoritesPage v-else />
  </div>
</template>
