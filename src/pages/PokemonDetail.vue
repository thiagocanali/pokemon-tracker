<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { usePokemonStore } from "../store/pokemon";
import type { Pokemon } from "../store/pokemon";

const route = useRoute();
const store = usePokemonStore();
const pokemon = ref<Pokemon | null>(null);

onMounted(async () => {
  const data = await store.getPokemon(route.params.id as string);
  pokemon.value = data;
});
</script>

<template>
  <div v-if="pokemon" class="details">
    <img :src="pokemon.sprites.front_default" :alt="pokemon.name" />
    <h2>{{ pokemon.name }}</h2>
    <p>Altura: {{ pokemon.height }}</p>
    <p>Peso: {{ pokemon.weight }}</p>
    <p>Tipos: 
      <span v-for="t in pokemon.types" :key="t.type.name" :class="['type-badge', t.type.name]">
        {{ t.type.name }}
      </span>
    </p>

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

.type-badge {
  display: inline-block;
  margin: 0 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  color: white;
  text-transform: capitalize;
  font-size: 0.8rem;
}

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
