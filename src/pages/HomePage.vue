<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const randomPokemons = ref(store.list.slice(0, 10)); // 10 Pokémon aleatórios
const capturingId = ref<number | null>(null);
const captureProgress = ref(0);

// Função para tentar capturar
const tryCapture = async (pokemonId: number) => {
  if (capturingId.value) return; // já capturando outro
  capturingId.value = pokemonId;
  captureProgress.value = 0;

  const interval = setInterval(() => {
    captureProgress.value += Math.random() * 25;
    if (captureProgress.value >= 100) {
      captureProgress.value = 100;
      clearInterval(interval);
      store.toggleFavorite(pokemonId);
      capturingId.value = null;
      captureProgress.value = 0;
      alert("🎉 Pokémon capturado!");
      const audio = new Audio("/capture-sound.mp3");
      audio.play();
    }
  }, 500);
};

// Função para pegar Pokémons aleatórios da lista
const shufflePokemons = () => {
  randomPokemons.value = store.list
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
};

onMounted(async () => {
  if (store.list.length === 0) await store.init();
  await store.loadList(1);
  shufflePokemons();
});
</script>

<template>
  <div>
    <h2>🎮 Mini-Jogo Pokémon</h2>
    <button @click="shufflePokemons">🔄 Nova rodada</button>

    <div class="grid">
      <div
        v-for="p in randomPokemons"
        :key="p.id"
        class="shaking-card"
        :class="{ shaking: capturingId === p.id }"
      >
        <PokemonCard
          :pokemon="p"
          :favorites="store.favorites"
          @toggleFavorite="() => tryCapture(p.id)"
        />

        <div v-if="capturingId === p.id" class="capture-bar">
          <div class="progress" :style="{ width: captureProgress + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.shaking-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s;
}
.shaking-card.shaking {
  animation: shake 0.5s infinite;
}

.capture-bar {
  width: 100%;
  height: 10px;
  background: #ddd;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 0.5rem;
}
.capture-bar .progress {
  height: 100%;
  background: #4dd0e1;
  width: 0%;
  transition: width 0.3s ease;
}

@keyframes shake {
  0% { transform: translate(1px, 0) rotate(1deg); }
  25% { transform: translate(-1px, 0) rotate(-1deg); }
  50% { transform: translate(1px, 0) rotate(1deg); }
  75% { transform: translate(-1px, 0) rotate(-1deg); }
  100% { transform: translate(1px, 0) rotate(1deg); }
}
</style>
