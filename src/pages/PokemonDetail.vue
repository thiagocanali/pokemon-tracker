<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { usePokemonStore } from "../store/pokemon";
import type { Pokemon } from "../store/pokemon";

const route = useRoute();
const store = usePokemonStore();
const pokemon = ref<Pokemon | null>(null);
const captureProgress = ref(0);
const capturing = ref(false);
const captureMessage = ref("");
const detailError = ref("");

const totalStats = computed(() => pokemon.value?.stats?.reduce((total, stat) => total + stat.base_stat, 0) ?? 0);
const isFavorite = computed(() => pokemon.value ? store.favorites.includes(pokemon.value.id) : false);

const tryCapture = () => {
  if (!pokemon.value || capturing.value) return;
  capturing.value = true;
  captureMessage.value = "Preparando captura...";
  captureProgress.value = 0;
  const interval = window.setInterval(() => {
    captureProgress.value += Math.random() * 20;
    if (captureProgress.value >= 100) {
      captureProgress.value = 100;
      window.clearInterval(interval);
      capturing.value = false;
      captureMessage.value = `${pokemon.value?.name} foi adicionado à sua coleção.`;
      if (!isFavorite.value) store.toggleFavorite(pokemon.value!.id);
    }
  }, 350);
};

const loadPokemon = async (id: string) => {
  pokemon.value = null;
  detailError.value = "";
  try {
    pokemon.value = await store.getPokemon(id);
  } catch {
    detailError.value = "Não encontramos esse Pokémon na Pokédex. Confira o nome ou número e tente novamente.";
  }
};

onMounted(() => loadPokemon(route.params.id as string));
watch(() => route.params.id, (id) => loadPokemon(id as string));
</script>

<template>
  <main v-if="pokemon" class="detail-page page-shell">
    <RouterLink class="back-link" to="/pokemon">← Voltar para a database</RouterLink>
    <section class="detail-hero">
      <div class="identity">
        <span class="eyebrow">Pokédex #{{ String(pokemon.id).padStart(3, "0") }}</span>
        <h1>{{ pokemon.name }}</h1>
        <div class="type-list">
          <span v-for="type in pokemon.types" :key="type.type.name" :class="['type-badge', type.type.name]">{{ type.type.name }}</span>
        </div>
        <p class="summary">Uma leitura rápida para entender o potencial deste Pokémon antes de investir recursos ou levá-lo para uma batalha.</p>
        <div class="hero-actions">
          <button class="button button-primary" type="button" @click="tryCapture" :disabled="capturing">{{ capturing ? "Capturando..." : isFavorite ? "Na sua coleção" : "Adicionar à coleção" }}</button>
          <button class="button button-ghost" type="button" @click="store.toggleFavorite(pokemon!.id)">{{ isFavorite ? "Remover favorito" : "Salvar favorito" }}</button>
        </div>
      </div>
      <div class="artwork"><div class="artwork-glow"></div><img :src="pokemon.sprites.front_default" :alt="`Ilustração de ${pokemon.name}`" /></div>
    </section>

    <div v-if="capturing || captureMessage" class="capture-feedback" role="status">
      <div class="capture-feedback-top"><span>{{ captureMessage || "Capturando..." }}</span><strong>{{ Math.round(captureProgress) }}%</strong></div>
      <div class="capture-bar"><div class="progress" :style="{ width: `${captureProgress}%` }"></div></div>
    </div>

    <section class="metrics-grid">
      <article><span class="metric-label">Altura</span><strong>{{ (pokemon.height! / 10).toFixed(1) }} m</strong><small>Medida base</small></article>
      <article><span class="metric-label">Peso</span><strong>{{ (pokemon.weight! / 10).toFixed(1) }} kg</strong><small>Medida base</small></article>
      <article><span class="metric-label">Total de stats</span><strong>{{ totalStats }}</strong><small>Potencial combinado</small></article>
      <article><span class="metric-label">Habilidades</span><strong>{{ pokemon.abilities?.length ?? 0 }}</strong><small>Habilidades conhecidas</small></article>
    </section>

    <section class="data-section">
      <div class="section-heading"><div><span class="eyebrow">Leitura de combate</span><h2>Stats base</h2></div><span class="section-note">Comparação inicial</span></div>
      <div class="stats-list"><div v-for="stat in pokemon.stats" :key="stat.stat.name" class="stat-row"><div class="stat-name"><span>{{ stat.stat.name.replace('-', ' ') }}</span><strong>{{ stat.base_stat }}</strong></div><div class="stat-track"><span :style="{ width: `${Math.min(stat.base_stat / 2.55, 100)}%` }"></span></div></div></div>
    </section>

    <section class="data-section abilities-section"><div class="section-heading"><div><span class="eyebrow">Características</span><h2>Habilidades</h2></div></div><div class="ability-list"><span v-for="ability in pokemon.abilities" :key="ability.ability.name">{{ ability.ability.name.replace('-', ' ') }}</span></div></section>

    <section class="data-section moves-section"><div class="section-heading"><div><span class="eyebrow">Recomendação de combate</span><h2>Moves disponíveis</h2></div><RouterLink class="section-link" to="/moves">Ver database de moves →</RouterLink></div><div class="move-list"><span v-for="move in pokemon.moves?.slice(0, 12)" :key="move.move.name">{{ move.move.name.replace('-', ' ') }}</span></div><p v-if="!pokemon.moves?.length" class="empty-note">Nenhum move foi encontrado para este Pokémon.</p></section>
  </main>
  <main v-else class="loading-state page-shell">
    <span class="eyebrow">Consultando database</span>
    <h1>{{ detailError ? "Pokémon não encontrado" : "Carregando Pokémon..." }}</h1>
    <p v-if="detailError" class="detail-error">{{ detailError }}</p>
    <RouterLink v-if="detailError" class="button button-primary" to="/pokemon">Voltar para a database</RouterLink>
  </main>
</template>

<style scoped>
.detail-page { padding-bottom: 64px; }.back-link { display:inline-block; margin-bottom:22px; color:var(--muted); font-size:12px; text-decoration:none; }.back-link:hover { color:var(--text); }.detail-hero { display:grid; grid-template-columns:1fr 360px; min-height:350px; overflow:hidden; border:1px solid var(--line); border-radius:24px; background:radial-gradient(circle at 80% 25%,rgba(80,190,255,.16),transparent 30%),linear-gradient(125deg,var(--surface),#171827); }.identity { padding:50px clamp(26px,6vw,72px); }.identity h1 { margin:14px 0 12px; font-size:clamp(42px,6vw,76px); line-height:.95; letter-spacing:-.07em; text-transform:capitalize; }.summary { max-width:500px; margin:24px 0; color:var(--muted); font-size:14px; line-height:1.7; }.type-list { display:flex; gap:8px; }.type-badge { padding:6px 11px; border-radius:999px; color:#fff; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; background:#53657b; }.type-badge.fire{background:#e66d43}.type-badge.water{background:#4387e8}.type-badge.grass{background:#42a978}.type-badge.electric{background:#c99b22;color:#17120a}.type-badge.ice{background:#54aebe}.type-badge.fighting{background:#be4c59}.type-badge.poison{background:#9b62c5}.type-badge.ground{background:#aa7c45}.type-badge.flying{background:#7586dd}.type-badge.psychic{background:#d35c9c}.type-badge.bug{background:#7d9d3b}.type-badge.rock{background:#877866}.type-badge.ghost{background:#69588f}.type-badge.dark{background:#4f4f65}.type-badge.dragon{background:#5668cf}.type-badge.steel{background:#718296}.type-badge.fairy{background:#ce7fa5}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.button{border:0;border-radius:10px;padding:12px 16px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.button:disabled{cursor:wait;opacity:.65}.button-primary{background:var(--accent-bright);color:#14111f}.button-ghost{border:1px solid var(--line-strong);background:transparent;color:var(--text)}.artwork{position:relative;display:grid;place-items:center;background:linear-gradient(145deg,rgba(44,197,255,.08),rgba(131,96,255,.16))}.artwork img{position:relative;z-index:1;width:min(280px,75%);image-rendering:auto;filter:drop-shadow(0 22px 22px rgba(0,0,0,.35))}.artwork-glow{position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(85,204,255,.3);filter:blur(32px)}.capture-feedback{margin-top:18px;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.capture-feedback-top{display:flex;justify-content:space-between;margin-bottom:10px;color:var(--muted);font-size:12px}.capture-feedback-top strong{color:var(--text)}.capture-bar,.stat-track{height:7px;overflow:hidden;border-radius:99px;background:var(--surface-muted)}.progress{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent-bright),#4ed7ff);transition:width .3s ease}.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}.metrics-grid article{padding:20px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.metric-label,.section-note{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.12em}.metrics-grid strong{display:block;margin:10px 0 5px;font-size:24px;letter-spacing:-.04em}.metrics-grid small{color:var(--muted);font-size:11px}.data-section{margin-top:52px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:20px}.section-heading h2{margin:8px 0 0;font-size:24px;letter-spacing:-.04em}.stats-list{display:grid;gap:15px;max-width:760px}.stat-name{display:flex;justify-content:space-between;margin-bottom:7px;color:var(--muted);font-size:12px;text-transform:capitalize}.stat-name strong{color:var(--text)}.stat-track{height:8px}.stat-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8360ff,#4ec9ff)}.ability-list{display:flex;gap:10px;flex-wrap:wrap}.ability-list span{padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);font-size:12px;text-transform:capitalize}.loading-state{padding:90px 0}.loading-state h1{margin-top:12px;font-size:32px}@media (max-width:760px){.detail-hero{grid-template-columns:1fr}.artwork{min-height:250px;order:-1}.identity{padding:32px 24px}.metrics-grid{grid-template-columns:1fr 1fr}.section-heading{align-items:flex-start;flex-direction:column;gap:8px}}@media (max-width:420px){.metrics-grid{grid-template-columns:1fr}}
.moves-section { margin-top: 28px; }.section-link { color: var(--accent-bright); font-size: 12px; text-decoration: none; }.section-link:hover { text-decoration: underline; }.move-list { display: flex; flex-wrap: wrap; gap: 9px; }.move-list span { padding: 9px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface-muted); color: var(--text); font-size: 12px; text-transform: capitalize; }.empty-note { color: var(--muted); font-size: 13px; }
</style>
