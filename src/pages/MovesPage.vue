<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const API_BASE = "https://pogoapi.net/api/v1";
const SOURCE_URL = "https://pogoapi.net/documentation/";

interface PokemonTypeRecord {
  pokemon_id: number;
  pokemon_name: string;
  form?: string;
  type: string[];
}

interface PokemonLearnset {
  pokemon_id: number;
  pokemon_name: string;
  form?: string;
  fast_moves: string[];
  charged_moves: string[];
  elite_fast_moves?: string[];
  elite_charged_moves?: string[];
}

interface GameMove {
  name: string;
  power: number;
  duration: number;
  energy_delta: number;
  type: string;
}

interface GameData {
  pokemonTypes: PokemonTypeRecord[];
  learnsets: PokemonLearnset[];
  fastMoves: GameMove[];
  chargedMoves: GameMove[];
}

interface MoveOption extends GameMove {
  legacy: boolean;
}

interface RankedMoveset {
  fast: MoveOption;
  charged: MoveOption;
  fastMovesNeeded: number;
  dps: number;
  includesLegacy: boolean;
}

let gameDataRequest: Promise<GameData> | null = null;
const gameData = ref<GameData | null>(null);
const loading = ref(false);
const error = ref("");
const query = ref("");
const selectedPokemonId = ref<number | null>(null);
const selectedForm = ref("");

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

async function fetchDataset<T>(filename: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${filename}`);
  if (!response.ok) throw new Error("Não foi possível carregar os dados de Pokémon GO.");
  return response.json() as Promise<T>;
}

function loadGameData() {
  if (!gameDataRequest) {
    gameDataRequest = Promise.all([
      fetchDataset<PokemonTypeRecord[]>("pokemon_types.json"),
      fetchDataset<PokemonLearnset[]>("current_pokemon_moves.json"),
      fetchDataset<GameMove[]>("fast_moves.json"),
      fetchDataset<GameMove[]>("charged_moves.json"),
    ])
      .then(([pokemonTypes, learnsets, fastMoves, chargedMoves]) => ({ pokemonTypes, learnsets, fastMoves, chargedMoves }))
      .catch((reason: unknown) => {
        gameDataRequest = null;
        throw reason;
      });
  }
  return gameDataRequest;
}

async function refreshData() {
  loading.value = true;
  error.value = "";
  try {
    gameData.value = await loadGameData();
  } catch {
    error.value = "Não foi possível consultar os dados de Pokémon GO agora. Verifique sua conexão e tente novamente.";
  } finally {
    loading.value = false;
  }
}

const pokemonChoices = computed(() => {
  const search = normalize(query.value);
  if (!search || !gameData.value) return [];

  const matches = gameData.value.pokemonTypes.filter((pokemon) =>
    normalize(pokemon.pokemon_name).includes(search) || String(pokemon.pokemon_id) === search,
  );
  const uniquePokemon = new Map<number, PokemonTypeRecord>();
  matches.forEach((pokemon) => uniquePokemon.set(pokemon.pokemon_id, pokemon));
  return Array.from(uniquePokemon.values()).slice(0, 8);
});

const formOptions = computed(() => {
  if (!gameData.value || selectedPokemonId.value === null) return [];

  return gameData.value.pokemonTypes
    .filter((pokemon) => pokemon.pokemon_id === selectedPokemonId.value)
    .map((pokemon) => {
      const formName = pokemon.form ?? "Normal";
      const learnset = gameData.value!.learnsets.find((entry) =>
        entry.pokemon_id === pokemon.pokemon_id && (entry.form ?? "Normal") === formName,
      );
      return learnset ? { pokemon, learnset } : null;
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);
});

const selectedOption = computed(() => formOptions.value.find(({ pokemon }) => (pokemon.form ?? "Normal") === selectedForm.value) ?? null);

function selectPokemon(pokemon: PokemonTypeRecord) {
  selectedPokemonId.value = pokemon.pokemon_id;
  query.value = pokemon.pokemon_name;
  selectedForm.value = formOptions.value.find(({ pokemon: form }) => (form.form ?? "Normal") === "Normal")?.pokemon.form ?? formOptions.value[0]?.pokemon.form ?? "Normal";
}

watch(query, (value) => {
  const selectedName = selectedOption.value?.pokemon.pokemon_name;
  if (selectedName && normalize(value) !== normalize(selectedName)) {
    selectedPokemonId.value = null;
    selectedForm.value = "";
  }
});

function buildMoveOptions(names: string[], eliteNames: string[] | undefined, moves: GameMove[]): MoveOption[] {
  const moveIndex = new Map(moves.map((move) => [normalize(move.name), move]));
  const elite = new Set((eliteNames ?? []).map(normalize));
  return Array.from(new Set(names)).flatMap((name) => {
    const move = moveIndex.get(normalize(name));
    if (!move || !Number.isFinite(move.power) || !Number.isFinite(move.duration) || move.duration <= 0) return [];
    return [{ ...move, legacy: elite.has(normalize(name)) }];
  });
}

const rankedMovesets = computed<RankedMoveset[]>(() => {
  const option = selectedOption.value;
  const data = gameData.value;
  if (!option || !data) return [];

  const { learnset, pokemon } = option;
  const fastMoves = buildMoveOptions(
    [...learnset.fast_moves, ...(learnset.elite_fast_moves ?? [])],
    learnset.elite_fast_moves,
    data.fastMoves,
  );
  const chargedMoves = buildMoveOptions(
    [...learnset.charged_moves, ...(learnset.elite_charged_moves ?? [])],
    learnset.elite_charged_moves,
    data.chargedMoves,
  );
  const pokemonTypes = new Set(pokemon.type.map(normalize));

  return fastMoves.flatMap((fast) => chargedMoves.flatMap((charged) => {
    if (fast.energy_delta <= 0 || charged.energy_delta >= 0) return [];
    const energyCost = Math.abs(charged.energy_delta);
    const fastStab = pokemonTypes.has(normalize(fast.type)) ? 1.2 : 1;
    const chargedStab = pokemonTypes.has(normalize(charged.type)) ? 1.2 : 1;
    let energy = 0;
    let fastMoveCount = 0;
    let chargedMoveCount = 0;
    let totalDamage = 0;
    let totalDuration = 0;

    while (chargedMoveCount < 50) {
      if (energy >= energyCost) {
        energy -= energyCost;
        totalDamage += charged.power * chargedStab;
        totalDuration += charged.duration;
        chargedMoveCount += 1;
      } else {
        energy = Math.min(100, energy + fast.energy_delta);
        totalDamage += fast.power * fastStab;
        totalDuration += fast.duration;
        fastMoveCount += 1;
      }
    }

    const fastMovesNeeded = fastMoveCount / chargedMoveCount;
    const dps = totalDamage / (totalDuration / 1000);
    if (!Number.isFinite(dps)) return [];
    return [{ fast, charged, fastMovesNeeded, dps, includesLegacy: fast.legacy || charged.legacy }];
  })).sort((a, b) => b.dps - a.dps).slice(0, 10);
});

const moveCount = computed(() => (gameData.value?.fastMoves.length ?? 0) + (gameData.value?.chargedMoves.length ?? 0));
const typeNames = computed(() => selectedOption.value?.pokemon.type.join(" / ") ?? "");
const formLabel = (form?: string) => !form || form === "Normal" ? "Forma padrão" : form.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
const displayDps = (dps: number) => dps.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

onMounted(refreshData);
</script>

<template>
  <main class="moves-page page-shell">
    <section class="page-intro">
      <div>
        <p class="eyebrow">LABORATÓRIO DE BATALHA / PVE</p>
        <h1>Monte seu moveset</h1>
        <p>Encontre a combinação de golpes que causa mais dano por segundo em raids.</p>
      </div>
      <div class="result-count" aria-live="polite">
        <strong>{{ moveCount || "—" }}</strong>
        <span>golpes na fonte</span>
      </div>
    </section>

    <section class="search-panel" aria-label="Pesquisar Pokémon">
      <div class="search-copy">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <div>
          <h2>Qual Pokémon você vai usar?</h2>
          <p>Pesquise pelo nome original ou número da Pokédex.</p>
        </div>
      </div>
      <div class="search-controls">
        <label class="search-field">
          <span class="sr-only">Buscar Pokémon por nome ou número</span>
          <input v-model="query" type="search" placeholder="Ex.: Pikachu ou 25" autocomplete="off" :disabled="loading || !gameData" />
        </label>
        <label v-if="formOptions.length > 1" class="form-select">
          <span class="sr-only">Forma do Pokémon</span>
          <select v-model="selectedForm">
            <option v-for="option in formOptions" :key="option.pokemon.form ?? 'Normal'" :value="option.pokemon.form ?? 'Normal'">
              {{ formLabel(option.pokemon.form) }}
            </option>
          </select>
        </label>
        <div v-if="query.trim() && !selectedOption && !loading && !error" class="suggestions" role="listbox" aria-label="Resultados da pesquisa">
          <button v-for="pokemon in pokemonChoices" :key="pokemon.pokemon_id" type="button" role="option" @click="selectPokemon(pokemon)">
            <span>#{{ String(pokemon.pokemon_id).padStart(3, "0") }}</span>
            <strong>{{ pokemon.pokemon_name }}</strong>
            <span aria-hidden="true">→</span>
          </button>
          <p v-if="!pokemonChoices.length">Nenhum Pokémon encontrado. Confira o nome original ou o número.</p>
        </div>
      </div>
    </section>

    <p v-if="loading" class="notice" role="status">Sincronizando golpes e formas de Pokémon GO...</p>
    <div v-else-if="error" class="notice error-notice" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="refreshData">Tentar novamente</button>
    </div>

    <template v-else-if="selectedOption">
      <section class="pokemon-summary">
        <div class="pokemon-monogram" aria-hidden="true">{{ String(selectedOption.pokemon.pokemon_id).padStart(3, "0") }}</div>
        <div class="pokemon-info">
          <span class="eyebrow">POKÉMON SELECIONADO</span>
          <h2>{{ selectedOption.pokemon.pokemon_name }}</h2>
          <p>#{{ String(selectedOption.pokemon.pokemon_id).padStart(3, "0") }} <span>·</span> {{ formLabel(selectedOption.pokemon.form) }} <span>·</span> {{ typeNames }}</p>
        </div>
        <div class="ranking-tag"><span></span> Ranking PvE · Raids</div>
      </section>

      <section class="ranking-section" aria-live="polite">
        <div class="section-heading">
          <div><span class="eyebrow">COMBINAÇÕES DE MAIOR DPS</span><h2>Melhores movesets</h2></div>
          <span v-if="rankedMovesets.length" class="ranking-count">{{ rankedMovesets.length }} combinações</span>
        </div>

        <div v-if="rankedMovesets.length" class="ranking-list">
          <article v-for="(moveset, index) in rankedMovesets" :key="`${moveset.fast.name}-${moveset.charged.name}`" class="ranking-card" :class="{ featured: index === 0 }">
            <div class="rank-number">{{ String(index + 1).padStart(2, "0") }}</div>
            <div class="moveset-details">
              <div class="move-line">
                <span class="move-kind">RÁPIDO</span>
                <strong>{{ moveset.fast.name }}</strong>
                <span v-if="moveset.fast.legacy" class="legacy-tag">LEGADO</span>
                <span class="move-meta">{{ moveset.fast.power }} dano · {{ (moveset.fast.duration / 1000).toLocaleString("pt-BR") }}s</span>
              </div>
              <div class="move-line">
                <span class="move-kind charged-kind">CARREGADO</span>
                <strong>{{ moveset.charged.name }}</strong>
                <span v-if="moveset.charged.legacy" class="legacy-tag">LEGADO</span>
                <span class="move-meta">{{ moveset.charged.power }} dano · {{ Math.abs(moveset.charged.energy_delta) }} energia</span>
              </div>
            </div>
            <div class="rotation-info"><strong>{{ moveset.fastMovesNeeded.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) }}×</strong><span>golpes rápidos / carga</span></div>
            <div class="dps-value"><strong>{{ displayDps(moveset.dps) }}</strong><span>DPS estimado</span></div>
          </article>
        </div>
        <p v-else class="empty-state">Não encontramos golpes compatíveis para essa forma. Tente outra forma ou Pokémon.</p>
      </section>

      <aside class="calculation-note">
        <span class="note-icon" aria-hidden="true">i</span>
        <div><strong>Como interpretar o ranking</strong><p>DPS PvE estimado simulando 50 cargas, energia acumulada e bônus de ataque do mesmo tipo (STAB). Não inclui nível, clima, amizade, defesa ou tipo do adversário; o dano real no jogo pode variar. Golpes marcados como legado podem não estar disponíveis por MT comum — confirme a disponibilidade no app do jogo.</p></div>
      </aside>
    </template>

    <section v-else-if="!loading && !error" class="empty-prompt">
      <div class="prompt-orbit" aria-hidden="true"><span>⚡</span></div>
      <h2>Seu próximo atacante começa aqui</h2>
      <p>Escolha um Pokémon para comparar os golpes rápidos e carregados que ele pode aprender.</p>
      <div class="examples"><span>Experimente</span><button type="button" @click="query = 'Pikachu'">Pikachu</button><button type="button" @click="query = '25'">#025</button><button type="button" @click="query = 'Charizard'">Charizard</button></div>
    </section>

    <footer class="source-credit">
      Dados de golpes e formas: <a :href="SOURCE_URL" target="_blank" rel="noreferrer">PogoAPI.net</a> · Game Master atual. DPS calculado para este ranking.
    </footer>
  </main>
</template>

<style scoped>
.moves-page{max-width:1160px;margin:auto;padding:58px clamp(20px,5vw,72px) 72px}.page-intro{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:30px}.eyebrow{display:block;margin:0 0 9px;color:var(--accent-bright);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;font-weight:700}.page-intro h1{margin:0;font-size:clamp(36px,5vw,56px);letter-spacing:-.07em}.page-intro p:last-child{margin:10px 0 0;color:var(--muted);font-size:14px}.result-count{display:flex;flex-direction:column;text-align:right;color:var(--muted);font-size:11px}.result-count strong{color:var(--accent-bright);font-size:27px;line-height:1.1}.search-panel{display:grid;grid-template-columns:minmax(230px,.85fr) minmax(300px,1.15fr);gap:24px;align-items:center;padding:23px 26px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(115deg,var(--surface),var(--surface-elevated));box-shadow:0 15px 42px #0000000b}.search-copy{display:flex;align-items:center;gap:15px}.search-icon{display:grid;place-items:center;flex:0 0 46px;height:46px;border:1px solid var(--accent-soft);border-radius:13px;background:var(--accent-soft);color:var(--accent-bright);font-size:28px}.search-copy h2{margin:0 0 5px;font-size:16px;letter-spacing:-.03em}.search-copy p{margin:0;color:var(--muted);font-size:11px}.search-controls{position:relative;display:flex;gap:10px}.search-field{display:block;flex:1;min-width:0}.search-field input,.form-select select{width:100%;height:48px;padding:0 15px;border:1px solid var(--line-strong);border-radius:10px;outline:0;background:var(--surface);color:var(--text);font:inherit;font-size:13px}.search-field input:focus,.form-select select:focus{border-color:var(--accent-bright);box-shadow:0 0 0 3px var(--accent-soft)}.search-field input::placeholder{color:var(--muted)}.form-select{flex:0 0 150px}.form-select select{font-size:11px}.suggestions{position:absolute;z-index:5;top:calc(100% + 8px);right:0;left:0;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 15px 35px #0003}.suggestions button{display:flex;align-items:center;gap:12px;width:100%;padding:12px 15px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);text-align:left;cursor:pointer}.suggestions button:last-of-type{border-bottom:0}.suggestions button:hover{background:var(--accent-soft)}.suggestions button span:first-child{color:var(--muted);font-family:'DM Mono',monospace;font-size:10px}.suggestions button strong{flex:1;font-size:12px}.suggestions button span:last-child{color:var(--accent-bright)}.suggestions p{margin:0;padding:15px;color:var(--muted);font-size:12px}.notice{margin:18px 0;padding:15px 17px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--muted);font-size:12px}.error-notice{display:flex;justify-content:space-between;align-items:center;gap:16px;color:#d86c6c}.error-notice button{border:1px solid var(--line-strong);border-radius:8px;padding:8px 12px;background:var(--surface);color:var(--text);font:inherit;font-size:11px}.pokemon-summary{display:flex;align-items:center;gap:17px;margin:26px 0 34px;padding:20px 23px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.pokemon-monogram{display:grid;place-items:center;flex:0 0 56px;height:56px;border:1px solid var(--accent-soft);border-radius:16px;background:var(--accent-soft);color:var(--accent-bright);font-family:'DM Mono',monospace;font-size:13px;font-weight:700}.pokemon-info{flex:1;min-width:0}.pokemon-info .eyebrow{margin-bottom:3px;font-size:9px}.pokemon-info h2{margin:0;font-size:22px;letter-spacing:-.04em}.pokemon-info p{margin:5px 0 0;color:var(--muted);font-size:11px}.pokemon-info p span{padding:0 4px;color:var(--line-strong)}.ranking-tag{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--line);border-radius:99px;color:var(--muted);font-size:10px}.ranking-tag span{width:7px;height:7px;border-radius:50%;background:#48c891;box-shadow:0 0 0 3px #48c89120}.section-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:15px;margin-bottom:13px}.section-heading .eyebrow{margin-bottom:5px}.section-heading h2{margin:0;font-size:23px;letter-spacing:-.05em}.ranking-count{color:var(--muted);font-size:10px}.ranking-list{display:grid;gap:9px}.ranking-card{display:grid;grid-template-columns:42px minmax(190px,1fr) minmax(110px,.45fr) minmax(100px,.35fr);align-items:center;gap:16px;padding:15px 18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:border-color .18s,transform .18s}.ranking-card:hover{transform:translateY(-1px);border-color:var(--line-strong)}.ranking-card.featured{border-color:var(--accent-bright);background:linear-gradient(105deg,var(--accent-soft),var(--surface) 42%)}.rank-number{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--surface-elevated);color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;font-weight:700}.featured .rank-number{background:var(--accent);color:#fff}.moveset-details{display:grid;gap:7px;min-width:0}.move-line{display:grid;grid-template-columns:70px minmax(100px,auto) auto 1fr;align-items:center;gap:9px;min-width:0}.move-kind{color:var(--muted);font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.08em}.charged-kind{color:var(--accent-bright)}.move-line strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.move-meta{justify-self:end;color:var(--muted);font-size:9px;white-space:nowrap}.legacy-tag{padding:3px 5px;border-radius:4px;background:#f0aa3d20;color:#c7861d;font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.05em}.rotation-info,.dps-value{display:flex;flex-direction:column;gap:4px}.rotation-info strong{font-size:13px}.rotation-info span,.dps-value span{color:var(--muted);font-size:9px}.dps-value{text-align:right}.dps-value strong{color:var(--accent-bright);font-family:'DM Mono',monospace;font-size:21px;letter-spacing:-.06em}.featured .dps-value strong{font-size:24px}.calculation-note{display:flex;gap:12px;margin-top:18px;padding:15px 17px;border:1px solid var(--line);border-radius:11px;background:var(--surface-elevated)}.note-icon{display:grid;place-items:center;flex:0 0 20px;height:20px;border:1px solid var(--line-strong);border-radius:50%;color:var(--muted);font-size:11px;font-weight:700}.calculation-note strong{font-size:10px}.calculation-note p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.6}.empty-prompt{display:flex;flex-direction:column;align-items:center;margin-top:40px;padding:43px 20px 37px;border:1px dashed var(--line-strong);border-radius:16px;text-align:center}.prompt-orbit{display:grid;place-items:center;width:58px;height:58px;border:1px solid var(--accent-soft);border-radius:50%;background:var(--accent-soft);color:var(--accent-bright);font-size:23px}.empty-prompt h2{margin:17px 0 6px;font-size:18px;letter-spacing:-.04em}.empty-prompt>p{max-width:380px;margin:0;color:var(--muted);font-size:12px;line-height:1.6}.examples{display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:20px}.examples>span{margin-right:3px;color:var(--muted);font-size:10px}.examples button{padding:7px 10px;border:1px solid var(--line);border-radius:99px;background:var(--surface);color:var(--text);font-size:10px}.examples button:hover{border-color:var(--accent-bright);color:var(--accent-bright)}.empty-state{margin:0;padding:24px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--muted);font-size:12px;text-align:center}.source-credit{margin-top:25px;color:var(--muted);font-size:9px;text-align:center}.source-credit a{color:var(--accent-bright);text-decoration:none}.source-credit a:hover{text-decoration:underline}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:760px){.moves-page{padding-top:34px}.search-panel{grid-template-columns:1fr;gap:16px;padding:19px}.ranking-card{grid-template-columns:35px minmax(0,1fr) auto;gap:10px;padding:13px}.moveset-details{grid-column:2 / -1;grid-row:2}.rotation-info{grid-column:2;grid-row:1}.dps-value{grid-column:3;grid-row:1}.move-line{grid-template-columns:57px minmax(80px,auto) auto}.move-meta{display:none}.ranking-tag{padding:8px;font-size:0}.ranking-tag span{font-size:initial}.pokemon-summary{gap:12px;padding:15px}.pokemon-monogram{flex-basis:46px;height:46px}.pokemon-info h2{font-size:19px}.form-select{flex-basis:125px}}
@media(max-width:430px){.page-intro{align-items:flex-start}.result-count{padding-top:6px}.page-intro h1{font-size:35px}.page-intro p:last-child{max-width:250px;font-size:12px}.search-copy h2{font-size:14px}.search-copy p{font-size:10px}.search-controls{flex-direction:column}.form-select{flex:0 0 auto}.form-select select{height:42px}.pokemon-summary{align-items:flex-start}.pokemon-info p{line-height:1.6}.ranking-card{grid-template-columns:30px minmax(0,1fr) auto;gap:8px;padding:11px}.rank-number{width:28px;height:28px}.move-line{grid-template-columns:53px minmax(75px,auto) auto;gap:6px}.move-line strong{font-size:10px}.legacy-tag{font-size:6px}.rotation-info span,.dps-value span{font-size:8px}.dps-value strong{font-size:18px}.featured .dps-value strong{font-size:21px}}
</style>
