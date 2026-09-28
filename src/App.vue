<script setup lang="ts">
import { usePokemonStore } from "./store/pokemon";
import AppHeader from "./components/AppHeader.vue";

const store = usePokemonStore();
void store.init();
</script>

<template>
  <div>
    <AppHeader />
    <router-view />
  </div>
</template>

