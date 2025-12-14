<script setup lang="ts">
import AppHeader from "./components/AppHeader.vue";
</script>

<template>
  <div>
    <AppHeader />
    <router-view />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Press Start 2P', cursive;
}
</style>
