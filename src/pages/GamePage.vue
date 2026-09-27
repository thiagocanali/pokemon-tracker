<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePokemonStore } from "../store/pokemon";
import PokemonCard from "../components/PokemonCard.vue";

const store = usePokemonStore();
const randomPokemons = ref(store.list.slice(0, 10));
const capturingId = ref<number | null>(null);
const captureProgress = ref(0);
const hpMap = ref<Record<number, number>>({});
const escapedPokemons = ref<number[]>([]);
const capturedThisRound = ref<number[]>([]);
const feedback = ref("");

const initHP = () => {
  randomPokemons.value.forEach((pokemon) => {
    hpMap.value[pokemon.id] = Math.floor(Math.random() * 50) + 50;
  });
  escapedPokemons.value = [];
  capturedThisRound.value = [];
  feedback.value = "Escolha um Pokémon para tentar capturar.";
};

const tryCapture = async (pokemonId: number) => {
  if (capturingId.value || escapedPokemons.value.includes(pokemonId) || capturedThisRound.value.includes(pokemonId)) return;
  capturingId.value = pokemonId;
  feedback.value = "A Poké Ball está em movimento...";
  captureProgress.value = 0;
  const interval = setInterval(async () => {
    captureProgress.value += Math.random() * 20;
    hpMap.value[pokemonId] = Math.max(0, (hpMap.value[pokemonId] ?? 100) - Math.floor(Math.random() * 10 + 5));
    if (captureProgress.value >= 100) {
      clearInterval(interval);
      capturingId.value = null;
      const success = Math.random() < 0.7;
      if (success) {
        capturedThisRound.value.push(pokemonId);
        feedback.value = "Captura confirmada. O Pokémon foi adicionado aos favoritos.";
        if (!store.favorites.includes(pokemonId)) await store.toggleFavorite(pokemonId);
      } else {
        escapedPokemons.value.push(pokemonId);
        feedback.value = "O Pokémon escapou. Tente outro encontro na próxima rodada.";
      }
      captureProgress.value = 0;
    }
  }, 500);
};

const shufflePokemons = () => {
  randomPokemons.value = [...store.list].sort(() => Math.random() - 0.5).slice(0, 10);
  initHP();
};

const capturedCount = () => store.favorites.length;
const activeCount = () => randomPokemons.value.filter((pokemon) => !escapedPokemons.value.includes(pokemon.id)).length;

onMounted(async () => {
  if (store.list.length === 0) await store.init();
  if (store.list.length === 0) await store.loadList(1);
  shufflePokemons();
});
</script>

<template>
  <main class="page-shell game-page">
    <section class="page-heading">
      <div>
        <span class="eyebrow">Área clássica</span>
        <h1>Captura livre</h1>
        <p>Continue interagindo com seus Pokémon em uma rodada rápida.</p>
      </div>
      <div class="game-actions">
        <div class="game-stat"><strong>{{ activeCount() }}</strong><span>em campo</span></div>
        <div class="game-stat"><strong>{{ capturedCount() }}</strong><span>favoritos</span></div>
        <button class="button button-primary" @click="shufflePokemons">Nova rodada</button>
      </div>
    </section>
    <p v-if="feedback" class="game-feedback" role="status">{{ feedback }}</p>
    <div v-if="store.loading" class="loading-state">Preparando encontro...</div>
    <p v-else-if="!randomPokemons.length" class="empty-state">Não foi possível carregar Pokémon para esta rodada. Tente novamente.</p>
    <div v-else class="game-grid">
      <article v-for="pokemon in randomPokemons" :key="pokemon.id" class="game-card" :class="{ shaking: capturingId === pokemon.id, escaped: escapedPokemons.includes(pokemon.id) }">
        <PokemonCard :pokemon="pokemon" :favorites="store.favorites" @toggleFavorite="tryCapture(pokemon.id)" />
        <div class="meter-label"><span>Energia</span><span>{{ hpMap[pokemon.id] ?? 0 }}%</span></div>
        <div class="meter"><div class="meter-fill health" :style="{ width: `${hpMap[pokemon.id] ?? 0}%` }"></div></div>
        <div v-if="capturingId === pokemon.id" class="meter capture-meter"><div class="meter-fill capture" :style="{ width: `${captureProgress}%` }"></div></div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.game-actions { display: flex; align-items: center; gap: 12px; }
.game-stat { display: flex; flex-direction: column; min-width: 62px; gap: 2px; }
.game-stat strong { color: var(--accent-bright); font-size: 17px; }
.game-stat span { color: var(--muted); font-size: 10px; }
.game-feedback { margin: 0 0 18px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-muted); color: var(--muted); font-size: 12px; }
.game-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.game-card { position: relative; padding: 14px; border: 1px solid var(--line); border-radius: 18px; background: var(--surface); transition: transform .2s, border-color .2s; }
.game-card:hover { border-color: var(--accent); transform: translateY(-3px); }
.game-card.shaking { animation: shake .45s infinite; }
.game-card.escaped { opacity: .45; transform: translateY(-18px) scale(.96); }
.meter-label { display:flex; justify-content:space-between; margin-top: 12px; color: var(--muted); font-size: 11px; }
.meter { height: 6px; margin-top: 7px; overflow:hidden; border-radius: 10px; background: var(--surface-muted); }
.meter-fill { height:100%; border-radius:inherit; transition: width .3s ease; }
.health { background: #44d39b; } .capture-meter { margin-top: 6px; } .capture { background: var(--accent); }
@keyframes shake { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-2px) rotate(-1deg); } 75% { transform: translateX(2px) rotate(1deg); } }
</style>
