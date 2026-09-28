<script setup lang="ts">
import { computed, ref, watch } from "vue";

type Move = { name: string; type: string; category: "Fast" | "Charged"; power: number; energy: number; dps: string; eps: string; users: number };

const query = ref("");
const category = ref("Todos");
const type = ref("Todos");
const pokemonMoveNames = ref<string[]>([]);
const pokemonBestMoves = ref<Move[]>([]);
const pokemonSearchLoading = ref(false);
const pokemonSearchMessage = ref("");
let activeRequest: AbortController | undefined;
const moves: Move[] = [
  { name: "Shadow Claw", type: "Ghost", category: "Fast", power: 6, energy: 4, dps: "15.4", eps: "8.6", users: 48 },
  { name: "Psycho Cut", type: "Psychic", category: "Fast", power: 3, energy: 9, dps: "10.0", eps: "15.0", users: 24 },
  { name: "Dragon Breath", type: "Dragon", category: "Fast", power: 6, energy: 3, dps: "15.0", eps: "7.5", users: 31 },
  { name: "Meteor Mash", type: "Steel", category: "Charged", power: 100, energy: 50, dps: "46.2", eps: "2.0", users: 6 },
  { name: "Psychic", type: "Psychic", category: "Charged", power: 90, energy: 55, dps: "32.1", eps: "1.8", users: 18 },
  { name: "Wild Charge", type: "Electric", category: "Charged", power: 100, energy: 45, dps: "41.7", eps: "2.2", users: 22 },
];
const filteredMoves = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (pokemonMoveNames.value.length) {
    return pokemonBestMoves.value
      .filter((move) => category.value === "Todos" || move.category === category.value)
      .filter((move) => type.value === "Todos" || move.type === type.value);
  }
  return moves.filter((move) => move.name.toLowerCase().includes(normalized) && (category.value === "Todos" || move.category === category.value) && (type.value === "Todos" || move.type === type.value));
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(query, (value) => {
  window.clearTimeout(searchTimer);
  activeRequest?.abort();
  pokemonMoveNames.value = [];
  pokemonBestMoves.value = [];
  pokemonSearchMessage.value = "";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return;

  searchTimer = window.setTimeout(async () => {
    const request = new AbortController();
    activeRequest = request;
    pokemonSearchLoading.value = true;
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(normalized)}`, { signal: request.signal });
      if (!response.ok) {
        pokemonSearchMessage.value = `Pokémon “${normalized}” não encontrado. Tente o nome em inglês ou o número da Pokédex.`;
        return;
      }
      {
        const pokemon = await response.json();
        const moveEntries = pokemon.moves as Array<{ move: { name: string; url: string } }>;
        const details = await Promise.all(moveEntries.map(async ({ move }) => {
          const moveResponse = await fetch(move.url, { signal: request.signal });
          if (!moveResponse.ok) return null;
          const detail = await moveResponse.json();
          const localizedName = detail.names?.find((entry: { language: { name: string } }) => entry.language.name === "en")?.name ?? move.name.replaceAll("-", " ");
          return {
            name: localizedName,
            type: detail.type?.name ? detail.type.name.charAt(0).toUpperCase() + detail.type.name.slice(1) : "—",
            category: detail.damage_class?.name === "status" ? "Fast" : detail.power >= 80 ? "Charged" : "Fast",
            power: detail.power ?? 0,
            energy: detail.pp ?? 0,
            dps: detail.power ? String(detail.power) : "—",
            eps: detail.accuracy ? String(detail.accuracy) : "—",
            users: 0,
          } satisfies Move;
        }));
        pokemonMoveNames.value = moveEntries.map(({ move }) => move.name);
        const availableMoves = details.filter((move): move is Move => Boolean(move));
        const bestFast = availableMoves.filter((move) => move.category === "Fast").sort((a, b) => b.power - a.power).slice(0, 3);
        const bestCharged = availableMoves.filter((move) => move.category === "Charged").sort((a, b) => b.power - a.power).slice(0, 9);
        pokemonBestMoves.value = [...bestFast, ...bestCharged];
        pokemonSearchMessage.value = `Melhores moves de ${pokemon.name} por força`;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      pokemonSearchMessage.value = "Não foi possível consultar os moves agora. A busca local continua disponível.";
    } finally {
      if (activeRequest === request) {
        activeRequest = undefined;
        pokemonSearchLoading.value = false;
      }
    }
  }, 300);
});
</script>

<template>
  <main class="moves-page page-shell">
    <section class="page-intro"><div><p class="eyebrow">DATABASE / MOVES</p><h1>Move Database</h1><p>Explore ataques, eficiência e os Pokémon que podem aprendê-los.</p></div><div class="result-count"><strong>{{ filteredMoves.length }}</strong><span>moves encontrados</span></div></section>
    <section class="tool-panel"><label class="search-field"><span>⌕</span><input v-model="query" placeholder="Buscar move ou Pokémon..." aria-label="Buscar move ou Pokémon" /></label><select v-model="category" aria-label="Filtrar categoria"><option>Todos</option><option>Fast</option><option>Charged</option></select><select v-model="type" aria-label="Filtrar tipo"><option>Todos</option><option>Ghost</option><option>Psychic</option><option>Dragon</option><option>Steel</option><option>Electric</option></select></section><p v-if="pokemonSearchLoading" class="search-status">Consultando moves na Pokédex...</p><p v-else-if="pokemonSearchMessage" class="search-status">{{ pokemonSearchMessage }}</p>
    <section class="moves-table" aria-label="Lista de moves"><div class="table-head"><span>Move</span><span>Tipo</span><span>Classe</span><span>Power</span><span>Energy</span><span>DPS / EPS</span><span>Pokémon</span></div><article v-for="move in filteredMoves" :key="move.name" class="move-row"><div class="move-name"><span class="move-icon" :class="move.type.toLowerCase()"></span><strong>{{ move.name }}</strong></div><span class="type-pill" :class="move.type.toLowerCase()">{{ move.type }}</span><span class="class-label">{{ move.category }}</span><strong>{{ move.power }}</strong><span>{{ move.energy }}</span><span class="efficiency"><b>{{ move.dps }}</b> <small>/ {{ move.eps }}</small></span><span class="users">{{ move.users }} Pokémon <span>→</span></span></article><p v-if="!filteredMoves.length" class="empty-state">Nenhum move encontrado para estes filtros.</p></section>
  </main>
</template>

<style scoped>
.moves-page{max-width:1240px;margin:auto;padding:60px clamp(20px,5vw,72px) 80px}.page-intro{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px}.eyebrow{color:var(--accent-bright);font-size:10px;letter-spacing:.16em;font-weight:800}.page-intro h1{margin:9px 0 8px;font-size:clamp(34px,5vw,58px);letter-spacing:-.07em}.page-intro p:last-child{color:var(--muted);font-size:14px}.result-count{display:flex;flex-direction:column;text-align:right;color:var(--muted);font-size:11px}.result-count strong{color:var(--text);font-size:28px}.tool-panel{display:flex;gap:12px;padding:14px;margin-bottom:20px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.search-field{display:flex;align-items:center;gap:10px;flex:1;color:var(--muted)}input,select{border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-strong);color:var(--text);padding:12px 14px;font:inherit;font-size:12px}input{width:100%;border:0;background:transparent;outline:0}.search-field span{font-size:22px}.moves-table{overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.table-head,.move-row{display:grid;grid-template-columns:2.2fr 1fr 1fr .7fr .8fr 1fr 1.1fr;align-items:center;gap:14px;padding:17px 22px}.table-head{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.12em;border-bottom:1px solid var(--line)}.move-row{min-height:70px;border-bottom:1px solid var(--line);font-size:12px}.move-row:last-of-type{border:0}.move-name{display:flex;align-items:center;gap:12px}.move-icon{width:9px;height:28px;border-radius:5px;background:var(--accent-bright)}.move-icon.psychic{background:#d568c6}.move-icon.dragon{background:#6965e8}.move-icon.steel{background:#8a9cac}.move-icon.electric{background:#e6b940}.type-pill{width:max-content;padding:5px 9px;border-radius:6px;background:#383052;color:#c7b9ff;font-size:10px}.type-pill.psychic{background:#512c4f;color:#ec9fdf}.type-pill.dragon{background:#29295a;color:#aca8ff}.type-pill.steel{background:#303c48;color:#c0d2df}.type-pill.electric{background:#514522;color:#f5d666}.class-label,.users{color:var(--muted)}.efficiency b{color:#67dfb0}.efficiency small{color:var(--muted)}.users span{color:var(--accent-bright);margin-left:6px}.empty-state{padding:34px;text-align:center;color:var(--muted)}@media(max-width:760px){.page-intro{align-items:flex-start;gap:20px}.tool-panel{flex-wrap:wrap}.search-field{flex-basis:100%}.table-head{display:none}.move-row{grid-template-columns:1.7fr 1fr 1fr;padding:16px}.move-row>:nth-child(n+4){display:none}}@media(max-width:500px){.page-intro{display:block}.result-count{text-align:left;margin-top:18px}.moves-page{padding-top:36px}}
</style>
