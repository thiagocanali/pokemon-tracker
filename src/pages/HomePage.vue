<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const randomPokemons = ref(store.list.slice(0, 10));
const capturingId = ref<number | null>(null);
const captureProgress = ref(0);
const hpMap = ref<Record<number, number>>({});
const escapedPokemons = ref<number[]>([]); // Pokémons que escaparam

// Inicializa HP de cada Pokémon
const initHP = () => {
  randomPokemons.value.forEach(p => {
    hpMap.value[p.id] = Math.floor(Math.random() * 50) + 50; // HP entre 50 e 100
  });
  escapedPokemons.value = [];
};

// Função de captura
const tryCapture = async (pokemonId: number) => {
  if (capturingId.value) return;
  capturingId.value = pokemonId;
  captureProgress.value = 0;

  const suspenseAudio = new Audio("/suspense.mp3");
  suspenseAudio.loop = true;
  suspenseAudio.play();

  const interval = setInterval(() => {
    captureProgress.value += Math.random() * 20;

    // HP seguro
    hpMap.value[pokemonId] = (hpMap.value[pokemonId] ?? 100) - Math.floor(Math.random() * 10 + 5);
    if (hpMap.value[pokemonId] < 0) hpMap.value[pokemonId] = 0;

    if (captureProgress.value >= 100) {
      clearInterval(interval);
      capturingId.value = null;
      suspenseAudio.pause();
      suspenseAudio.currentTime = 0;

      const success = Math.random() < 0.7; // 70% chance
      if (success) {
        alert("🎉 Pokémon capturado!");
        store.toggleFavorite(pokemonId);
        new Audio("/capture-sound.mp3").play();
      } else {
        alert("💨 O Pokémon escapou!");
        escapedPokemons.value.push(pokemonId);
        new Audio("/fail-sound.mp3").play();
      }

      captureProgress.value = 0;
    }
  }, 500);
};

// Embaralha a lista para novo mini-RPG
const shufflePokemons = () => {
  randomPokemons.value = store.list
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  initHP();
};

// Ao montar o componente
onMounted(async () => {
  if (store.list.length === 0) await store.init();
  await store.loadList(1);
  shufflePokemons();
});
</script>

<template>
  <div>
    <h2>🎮 Mini-RPG Pokémon</h2>
    <button @click="shufflePokemons">🔄 Nova rodada</button>

    <div class="grid">
      <div
        v-for="p in randomPokemons"
        :key="p.id"
        class="shaking-card"
        :class="{
          shaking: capturingId === p.id,
          escaped: escapedPokemons.includes(p.id)
        }"
      >
        <PokemonCard
          :pokemon="p"
          :favorites="store.favorites"
          @toggleFavorite="() => tryCapture(p.id)"
        />

        <div class="hp-bar">
          <div class="hp-progress" :style="{ width: hpMap[p.id] + '%' }"></div>
        </div>

        <div v-if="capturingId === p.id" class="capture-bar">
          <div class="progress" :style="{ width: captureProgress + '%' }"></div>
        </div>

        <div v-if="escapedPokemons.includes(p.id)" class="escape-effect"></div>
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
  position: relative;
  transition: transform 0.3s;
}
.shaking-card.shaking {
  animation: shake 0.5s infinite;
}
.shaking-card.escaped {
  animation: escape 1s forwards;
}

.hp-bar {
  width: 100%;
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}
.hp-progress {
  height: 100%;
  background: #4caf50; /* verde pastel */
  width: 100%;
  transition: width 0.3s ease;
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
  background: #42a5f5; /* azul pastel */
  width: 0%;
  transition: width 0.3s ease;
}

.escape-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
  border-radius: 12px;
  animation: fadeEscape 1s forwards;
  pointer-events: none;
}

@keyframes shake {
  0% { transform: translate(1px, 0) rotate(1deg); }
  25% { transform: translate(-1px, 0) rotate(-1deg); }
  50% { transform: translate(1px, 0) rotate(1deg); }
  75% { transform: translate(-1px, 0) rotate(-1deg); }
  100% { transform: translate(1px, 0) rotate(1deg); }
}

@keyframes fadeEscape {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.5); }
}

@keyframes escape {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-50px) scale(0.5); opacity: 0; }
}
</style>
