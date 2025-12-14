<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { usePokemonStore } from "../store/pokemon";
import type { Pokemon } from "../store/pokemon";

const route = useRoute();
const store = usePokemonStore();
const pokemon = ref<Pokemon | null>(null);
const hp = ref(100); // barra de vida simulada
const captureProgress = ref(0); // barra de captura

onMounted(async () => {
  const data = await store.getPokemon(route.params.id as string);
  pokemon.value = data;
  hp.value = Math.floor(Math.random() * 100) + 50; // vida aleatória
});

const capture = () => {
  captureProgress.value = 0;
  const interval = setInterval(() => {
    if (captureProgress.value >= 100) {
      clearInterval(interval);
      alert(`${pokemon.value?.name} capturado com sucesso!`);
    } else {
      captureProgress.value += Math.floor(Math.random() * 10) + 5;
    }
  }, 200);
};
</script>

<template>
  <div v-if="pokemon" class="details">
    <img :src="pokemon.sprites.front_default" :alt="pokemon.name" class="pokemon-img" />
    <h2>{{ pokemon.name }}</h2>

    <p>Altura: {{ pokemon.height }} | Peso: {{ pokemon.weight }}</p>

    <p>Tipos:</p>
    <div>
      <span v-for="t in pokemon.types" :key="t.type.name" :class="['type-badge', t.type.name]">
        {{ t.type.name }}
      </span>
    </div>

    <p>Stats:</p>
    <ul>
      <li v-for="s in pokemon.stats" :key="s.stat.name">
        {{ s.stat.name }}: {{ s.base_stat }}
      </li>
    </ul>

    <p>Habilidades:</p>
    <ul>
      <li v-for="a in pokemon.abilities" :key="a.ability.name">{{ a.ability.name }}</li>
    </ul>

    <div class="hp-bar-container">
      <p>HP</p>
      <div class="hp-bar">
        <div class="hp-bar-fill" :style="{ width: hp + '%' }"></div>
      </div>
    </div>

    <div class="capture-container">
      <button @click="capture">Capturar Pokémon!</button>
      <div class="capture-bar">
        <div class="capture-bar-fill" :style="{ width: captureProgress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem;
}

.pokemon-img {
  width: 200px;
  transition: transform 0.3s;
}
.pokemon-img:hover {
  transform: scale(1.2) rotate(10deg);
}

.type-badge {
  display: inline-block;
  margin: 0 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  color: white;
  text-transform: capitalize;
  font-size: 0.8rem;
}

/* HP barra */
.hp-bar-container {
  width: 80%;
}
.hp-bar {
  width: 100%;
  height: 20px;
  background: #ddd;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 0.3rem;
}
.hp-bar-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.5s;
}

/* Captura barra */
.capture-container {
  margin-top: 1rem;
  width: 80%;
}
.capture-bar {
  width: 100%;
  height: 20px;
  background: #ccc;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 0.3rem;
}
.capture-bar-fill {
  height: 100%;
  background: #2196f3;
  transition: width 0.2s;
}

/* Tipos */
.type-badge.fire { background: #f08030; }
.type-badge.water { background: #6890f0; }
.type-badge.grass { background: #78c850; }
.type-badge.electric { background: #f8d030; color: #222; }
.type-badge.ice { background: #98d8d8; color: #222; }
.type-badge.fighting { background: #c03028; }
.type-badge.poison { background: #a040a0; }
.type-badge.ground { background: #e0c068; color: #222; }
.type-badge.flying { background: #a890f0; }
.type-badge.psychic { background: #f85888; }
.type-badge.bug { background: #a8b820; }
.type-badge.rock { background: #b8a038; }
.type-badge.ghost { background: #705898; }
.type-badge.dark { background: #705848; }
.type-badge.dragon { background: #7038f8; }
.type-badge.steel { background: #b8b8d0; color: #222; }
.type-badge.fairy { background: #ee99ac; color: #222; }
</style>
