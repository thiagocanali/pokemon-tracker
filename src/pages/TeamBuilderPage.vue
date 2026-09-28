<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { supabase } from "../lib/supabase";
import { usePokemonStore, type Pokemon } from "../store/pokemon";

const store = usePokemonStore();
const query = ref("");
const slots = ref<(Pokemon | null)[]>([null, null, null, null, null, null]);
const loading = ref(false);
const message = ref("");
const teamName = ref("Meu time");
const savedTeams = ref<Array<{ id: string; name: string; pokemon_ids: number[] }>>([]);
const userId = ref<string | null>(null);
const saving = ref(false);

const team = computed(() => slots.value.filter((pokemon): pokemon is Pokemon => Boolean(pokemon)));
const uniqueTypes = computed(() => new Set(team.value.flatMap((pokemon) => pokemon.types.map(({ type }) => type.name))));
const averagePower = computed(() => {
  if (!team.value.length) return 0;
  const total = team.value.reduce((sum, pokemon) => sum + (pokemon.stats?.reduce((statSum, stat) => statSum + stat.base_stat, 0) ?? 0), 0);
  return Math.round(total / team.value.length);
});

async function addPokemon() {
  const normalized = query.value.trim();
  if (!normalized) return;
  loading.value = true;
  message.value = "";
  try {
    const pokemon = await store.getPokemon(normalized);
    if (team.value.some((member) => member.id === pokemon.id)) {
      message.value = "Esse Pokémon já está no time.";
    } else {
      const emptySlot = slots.value.findIndex((slot) => slot === null);
      if (emptySlot === -1) message.value = "Seu time já tem seis Pokémon.";
      else slots.value[emptySlot] = pokemon;
    }
  } catch {
    message.value = "Pokémon não encontrado. Tente um nome ou número válido.";
  } finally {
    loading.value = false;
  }
}

function removePokemon(index: number) {
  slots.value[index] = null;
}

function clearTeam() {
  slots.value = [null, null, null, null, null, null];
  message.value = "";
}

async function loadSavedTeams() {
  const { data: auth } = await supabase.auth.getUser();
  userId.value = auth.user?.id ?? null;
  if (!userId.value) return;

  const { data, error } = await supabase
    .from("saved_teams")
    .select("id, name, pokemon_ids")
    .order("updated_at", { ascending: false });
  if (!error && data) {
    savedTeams.value = data.map((saved) => ({
      id: saved.id,
      name: saved.name,
      pokemon_ids: Array.isArray(saved.pokemon_ids) ? saved.pokemon_ids.map(Number).filter(Number.isInteger) : [],
    }));
  }
}

async function saveTeam() {
  if (!userId.value) {
    message.value = "Entre na sua conta para salvar times.";
    return;
  }
  if (!team.value.length) {
    message.value = "Adicione pelo menos um Pokémon antes de salvar.";
    return;
  }
  saving.value = true;
  message.value = "";
  const payload = { name: teamName.value.trim() || "Meu time", pokemon_ids: team.value.map(({ id }) => id), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("saved_teams").insert({ ...payload, user_id: userId.value }).select("id, name, pokemon_ids").single();
  if (error) {
    message.value = "Não foi possível salvar o time agora.";
  } else if (data) {
    savedTeams.value.unshift({ id: data.id, name: data.name, pokemon_ids: data.pokemon_ids as number[] });
    message.value = "Time salvo com sucesso.";
  }
  saving.value = false;
}

async function loadTeam(saved: { name: string; pokemon_ids: number[] }) {
  const loaded = await Promise.all(saved.pokemon_ids.slice(0, 6).map((id) => store.getPokemon(id).catch(() => null)));
  slots.value = [...loaded, ...Array(6 - loaded.length).fill(null)] as (Pokemon | null)[];
  teamName.value = saved.name;
  message.value = `${saved.name} carregado.`;
}

async function deleteTeam(id: string) {
  const { error } = await supabase.from("saved_teams").delete().eq("id", id);
  if (!error) {
    savedTeams.value = savedTeams.value.filter((saved) => saved.id !== id);
    message.value = "Time excluído.";
  }
}

let authSubscription: { unsubscribe: () => void } | null = null;

onMounted(() => {
  loadSavedTeams();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    userId.value = session?.user?.id ?? null;
    if (userId.value) loadSavedTeams();
    else savedTeams.value = [];
  });
  authSubscription = data.subscription;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
});
</script>

<template>
  <main class="page-shell team-page">
    <section class="page-intro">
      <div><p class="eyebrow">BATTLE LAB / TEAM BUILDER</p><h1>Monte seu time ideal.</h1><p class="intro-copy">Combine até seis Pokémon, confira a cobertura de tipos e prepare sua próxima batalha.</p></div>
      <RouterLink class="ghost-button" to="/pokemon">Abrir Pokédex</RouterLink>
    </section>

    <section class="builder-layout">
      <div class="team-panel panel">
        <div class="panel-heading"><div><p class="section-kicker">SEU TIME</p><h2>{{ team.length }} <span>/ 6 Pokémon</span></h2></div><button class="text-button" type="button" @click="clearTeam">Limpar time</button></div>
        <form class="search-row" @submit.prevent="addPokemon"><label class="sr-only" for="team-search">Adicionar Pokémon</label><input id="team-search" v-model="query" placeholder="Digite nome ou número do Pokémon" autocomplete="off"/><button class="primary-button" type="submit" :disabled="loading">{{ loading ? "Buscando..." : "Adicionar" }}</button></form>
        <div class="save-row"><label for="team-name">Nome do time</label><input id="team-name" v-model="teamName" maxlength="80" placeholder="Meu time"/><button class="save-button" type="button" :disabled="saving" @click="saveTeam">{{ saving ? "Salvando..." : "Salvar time" }}</button></div>
        <p v-if="message" class="feedback" role="status">{{ message }}</p>
        <div class="team-grid">
          <article v-for="(pokemon, index) in slots" :key="index" class="team-slot" :class="{ filled: pokemon }">
            <template v-if="pokemon"><button class="remove-button" type="button" :aria-label="`Remover ${pokemon.name}`" @click="removePokemon(index)">×</button><img :src="pokemon.sprites.front_default" :alt="pokemon.name"/><span class="slot-number">0{{ index + 1 }}</span><h3>{{ pokemon.name }}</h3><div class="type-row"><span v-for="entry in pokemon.types" :key="entry.type.name" class="type-pill">{{ entry.type.name }}</span></div></template>
            <template v-else><span class="empty-number">0{{ index + 1 }}</span><span class="plus">+</span><p>Adicionar Pokémon</p></template>
          </article>
        </div>
        <section class="saved-teams" aria-labelledby="saved-teams-title"><div class="saved-heading"><div><p class="section-kicker">MEUS TIMES</p><h2 id="saved-teams-title">Times salvos</h2></div><span v-if="!userId" class="muted">Entre para salvar</span></div><p v-if="userId && !savedTeams.length" class="muted">Seus times salvos aparecerão aqui.</p><div v-for="saved in savedTeams" :key="saved.id" class="saved-team"><button type="button" class="saved-name" @click="loadTeam(saved)"><strong>{{ saved.name }}</strong><span>{{ saved.pokemon_ids.length }} Pokémon</span></button><button type="button" class="delete-team" :aria-label="`Excluir ${saved.name}`" @click="deleteTeam(saved.id)">Excluir</button></div></section>
      </div>

      <aside class="side-column">
        <section class="panel summary-panel"><p class="section-kicker">ANÁLISE RÁPIDA</p><h2>Como está seu time?</h2><div class="metric"><span>Tipos cobertos</span><strong>{{ uniqueTypes.size }}</strong></div><div class="metric"><span>Força média</span><strong>{{ averagePower || "—" }}</strong></div><div class="coverage"><span v-for="type in uniqueTypes" :key="type" class="type-pill">{{ type }}</span><span v-if="!uniqueTypes.size" class="muted">Adicione Pokémon para analisar.</span></div></section>
        <section class="panel tips-panel"><p class="section-kicker">DICAS DE COMPOSIÇÃO</p><h2>Equilibre seu roster</h2><ul><li>Combine atacantes rápidos com Pokémon resistentes.</li><li>Busque variedade de tipos para cobrir mais fraquezas.</li><li>Use a página Counters para validar matchups difíceis.</li></ul></section>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.team-page{max-width:1240px;margin:0 auto;padding:58px 28px 80px}.page-intro{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:38px}.eyebrow,.section-kicker{margin:0 0 10px;color:var(--accent-bright);font-size:10px;font-weight:800;letter-spacing:.16em}.page-intro h1{margin:0;color:var(--text);font-size:clamp(34px,5vw,64px);letter-spacing:-.06em;line-height:1}.intro-copy{max-width:550px;margin:16px 0 0;color:var(--muted);font-size:14px}.ghost-button,.primary-button{display:inline-flex;align-items:center;justify-content:center;border-radius:9px;padding:12px 17px;font-size:11px;font-weight:800;text-decoration:none}.ghost-button{border:1px solid var(--line-strong);color:var(--text);background:var(--surface)}.builder-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,.8fr);gap:18px}.panel{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:24px}.panel-heading{display:flex;justify-content:space-between;align-items:start}.panel h2{margin:0;color:var(--text);font-size:22px;letter-spacing:-.04em}.panel h2 span{color:var(--muted);font-size:14px;font-weight:500}.text-button{border:0;background:none;color:var(--muted);font-size:11px;cursor:pointer}.search-row{display:flex;gap:9px;margin:24px 0 8px}.search-row input{min-width:0;flex:1;border:1px solid var(--line-strong);border-radius:9px;background:var(--background);color:var(--text);padding:13px 14px;outline:none;font:inherit;font-size:12px}.search-row input:focus{border-color:var(--accent-bright)}.save-row{display:flex;align-items:center;gap:9px;margin:12px 0 4px}.save-row label{color:var(--muted);font-size:10px;font-weight:700;white-space:nowrap}.save-row input{min-width:0;flex:1;border:1px solid var(--line-strong);border-radius:8px;background:var(--background);color:var(--text);padding:10px 12px;font:inherit;font-size:11px}.save-button{border:1px solid var(--accent);border-radius:8px;background:transparent;color:var(--accent-bright);padding:10px 13px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}.save-button:disabled{opacity:.5;cursor:wait}.primary-button{border:0;background:var(--accent);color:#fff;cursor:pointer}.primary-button:disabled{opacity:.55;cursor:wait}.feedback{margin:10px 0;color:#ff9aaf;font-size:11px}.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.team-slot{position:relative;display:flex;min-height:190px;flex-direction:column;align-items:center;justify-content:center;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);text-align:center}.team-slot.filled{border-style:solid;background:linear-gradient(145deg,rgba(131,96,255,.14),transparent)}.team-slot img{width:100px;height:100px;image-rendering:auto}.team-slot h3{margin:0;color:var(--text);font-size:13px;text-transform:capitalize}.slot-number,.empty-number{position:absolute;top:12px;left:13px;color:var(--muted);font-size:10px;font-weight:800}.plus{color:var(--accent-bright);font-size:28px;font-weight:300}.team-slot p{margin:5px 0 0;font-size:10px}.remove-button{position:absolute;top:9px;right:11px;border:0;background:none;color:var(--muted);font-size:20px;cursor:pointer}.type-row,.coverage{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.type-pill{display:inline-block;border:1px solid var(--line-strong);border-radius:5px;padding:4px 7px;color:var(--muted);font-size:9px;text-transform:uppercase}.side-column{display:grid;align-content:start;gap:18px}.summary-panel h2,.tips-panel h2{margin-bottom:22px}.metric{display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.metric strong{color:var(--text);font-size:18px}.coverage{min-height:32px}.muted{color:var(--muted);font-size:11px}.tips-panel ul{display:grid;gap:14px;margin:0;padding-left:17px;color:var(--muted);font-size:11px;line-height:1.6}.tips-panel li::marker{color:var(--accent-bright)}@media(max-width:850px){.builder-layout{grid-template-columns:1fr}.side-column{grid-template-columns:1fr 1fr}}@media(max-width:600px){.team-page{padding:35px 16px}.page-intro{align-items:start;flex-direction:column}.team-grid{grid-template-columns:repeat(2,1fr)}.side-column{grid-template-columns:1fr}.search-row{flex-direction:column}.primary-button{min-height:42px}}
</style>
