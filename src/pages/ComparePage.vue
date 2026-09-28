<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePokemonStore, type Pokemon } from "../store/pokemon";

const store = usePokemonStore();
const firstId = ref("25");
const secondId = ref("6");
const first = ref<Pokemon | null>(null);
const second = ref<Pokemon | null>(null);
const loading = ref(false);
const error = ref("");

async function loadComparison() {
  loading.value = true;
  error.value = "";
  try {
    [first.value, second.value] = await Promise.all([
      store.getPokemon(firstId.value),
      store.getPokemon(secondId.value),
    ]);
  } catch {
    first.value = null;
    second.value = null;
    error.value = "Não foi possível carregar a comparação. Confira os IDs e tente novamente.";
  } finally {
    loading.value = false;
  }
}

const rows = computed(() => [
  { label: "Ataque", key: "attack" },
  { label: "Defesa", key: "defense" },
  { label: "Vida", key: "hp" },
]);

function stat(pokemon: Pokemon | null, key: string) {
  return pokemon?.stats?.find((item) => item.stat.name === key)?.base_stat ?? 0;
}

function displayName(pokemon: Pokemon | null) {
  return pokemon?.name ? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1) : "—";
}

onMounted(loadComparison);
</script>

<template>
  <main class="compare-page">
    <section class="page-heading">
      <div><p class="eyebrow">FERRAMENTA DE ANÁLISE</p><h1>Compare Pokémon</h1><p>Comparação de stats gerais da PokéAPI; estes valores não são os atributos de combate de Pokémon GO.</p></div>
      <button class="primary" :disabled="loading" @click="loadComparison">{{ loading ? "Carregando..." : "Atualizar comparação" }}</button>
    </section>

    <section class="selectors" aria-label="Selecionar Pokémon">
      <label>Primeiro Pokémon<input v-model="firstId" inputmode="numeric" aria-label="ID do primeiro Pokémon" /></label>
      <span class="versus">VS</span>
      <label>Segundo Pokémon<input v-model="secondId" inputmode="numeric" aria-label="ID do segundo Pokémon" /></label>
    </section>
    <p v-if="error" class="comparison-error" role="alert">{{ error }}</p>

    <section v-if="first && second" class="comparison-card">
      <div class="pokemon-column"><img :src="first.sprites.front_default" :alt="displayName(first)" /><h2>{{ displayName(first) }}</h2><div class="types"><span v-for="type in first.types" :key="type.type.name">{{ type.type.name }}</span></div></div>
      <div class="stats-column"><div v-for="row in rows" :key="row.key" class="stat-row"><strong>{{ row.label }}</strong><div class="bar-wrap"><span class="value left">{{ stat(first, row.key) }}</span><div class="bar left-bar"><i :style="{ width: `${Math.min(stat(first, row.key) / 2.55, 100)}%` }"></i></div><div class="bar right-bar"><i :style="{ width: `${Math.min(stat(second, row.key) / 2.55, 100)}%` }"></i></div><span class="value right">{{ stat(second, row.key) }}</span></div></div></div>
      <div class="pokemon-column"><img :src="second.sprites.front_default" :alt="displayName(second)" /><h2>{{ displayName(second) }}</h2><div class="types"><span v-for="type in second.types" :key="type.type.name">{{ type.type.name }}</span></div></div>
    </section>
  </main>
</template>

<style scoped>
.compare-page{max-width:1180px;margin:0 auto;padding:56px clamp(20px,5vw,70px)}.page-heading{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:36px}.eyebrow{color:var(--accent-bright);font-size:10px;letter-spacing:.18em;font-weight:700}.page-heading h1{margin:8px 0;font-size:clamp(32px,5vw,56px);letter-spacing:-.06em}.page-heading p:last-child{color:var(--muted);max-width:540px}.primary{border:0;border-radius:9px;padding:12px 18px;background:var(--accent-bright);color:#10101a;font-weight:800;cursor:pointer}.primary:disabled{opacity:.6}.selectors{display:flex;align-items:end;justify-content:center;gap:24px;margin-bottom:28px}.selectors label{display:grid;gap:8px;color:var(--muted);font-size:12px}.selectors input{width:180px;padding:13px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--text);font:inherit}.versus{padding-bottom:13px;color:var(--accent-bright);font-size:11px;font-weight:800}.comparison-card{display:grid;grid-template-columns:180px 1fr 180px;gap:32px;align-items:center;padding:38px 28px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,var(--surface),rgba(48,38,84,.28))}.pokemon-column{text-align:center}.pokemon-column img{width:140px;height:140px;image-rendering:auto}.pokemon-column h2{margin:4px 0 10px;font-size:20px}.types{display:flex;justify-content:center;gap:6px}.types span{padding:4px 8px;border-radius:99px;background:var(--surface-strong);color:var(--muted);font-size:10px}.stats-column{display:grid;gap:24px}.stat-row{display:grid;gap:8px}.stat-row strong{text-align:center;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}.bar-wrap{display:grid;grid-template-columns:30px 1fr 1fr 30px;gap:8px;align-items:center}.value{font-size:12px;font-weight:700}.value.right{text-align:right}.bar{height:8px;background:var(--line-strong);overflow:hidden}.left-bar{border-radius:99px 0 0 99px;display:flex;justify-content:flex-end}.right-bar{border-radius:0 99px 99px 0}.bar i{display:block;height:100%;background:var(--accent-bright)}.right-bar i{background:#7a6bff}@media(max-width:760px){.page-heading{display:block}.primary{margin-top:20px}.selectors{gap:10px}.selectors input{width:130px}.comparison-card{grid-template-columns:1fr;gap:20px}.stats-column{order:3}.pokemon-column img{width:100px;height:100px}}
</style>
 স
