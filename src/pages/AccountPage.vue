<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase";
import { usePokemonStore } from "../store/pokemon";

const router = useRouter();
const pokemonStore = usePokemonStore();
const favoriteCount = computed(() => pokemonStore.favorites.length);
const favoritePokemon = ref<{ id: number; name: string; sprite: string }[]>([]);
const email = ref("");
const loading = ref(true);
const deleting = ref(false);
const error = ref("");

onMounted(async () => {
  await pokemonStore.init();
  const { data } = await supabase.auth.getUser();
  if (!data.user) { router.replace("/auth"); return; }
  email.value = data.user.email ?? "";
  if (pokemonStore.favorites.length) {
    const results = await Promise.all(
      pokemonStore.favorites.slice(0, 12).map(async (id) => {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!response.ok) return null;
        const pokemon = await response.json();
        return { id: pokemon.id, name: pokemon.name, sprite: pokemon.sprites.front_default };
      }),
    );
    favoritePokemon.value = results.filter(Boolean) as { id: number; name: string; sprite: string }[];
  }
  loading.value = false;
});

async function signOut() {
  await supabase.auth.signOut();
  pokemonStore.favorites = [];
  localStorage.removeItem("favorites");
  router.push("/");
}

async function deleteAccount() {
  if (!window.confirm("Excluir seu perfil e sua conta permanentemente?")) return;
  deleting.value = true;
  error.value = "";
  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) { error.value = "Não foi possível excluir o perfil agora."; deleting.value = false; return; }
  await supabase.auth.signOut();
  pokemonStore.favorites = [];
  localStorage.removeItem("favorites");
  router.push("/");
}
</script>

<template>
  <main class="page-shell account-page">
    <section v-if="!loading" class="account-card card">
      <p class="eyebrow">CONTA DO TREINADOR</p>
      <h1>Seu perfil</h1>
      <p class="account-email">{{ email }}</p>
      <div class="account-stats" aria-label="Resumo do perfil">
        <strong>{{ favoriteCount }}</strong>
        <span>Pokémon favoritos</span>
      </div>
      <section v-if="favoritePokemon.length" class="favorite-preview" aria-labelledby="favorite-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">SUA COLEÇÃO</p>
            <h2 id="favorite-title">Favoritos recentes</h2>
          </div>
          <RouterLink to="/favorites" class="text-link">Ver todos</RouterLink>
        </div>
        <div class="favorite-grid">
          <RouterLink v-for="pokemon in favoritePokemon" :key="pokemon.id" :to="`/pokemon/${pokemon.id}`" class="favorite-item">
            <img :src="pokemon.sprite" :alt="pokemon.name" />
            <span>#{{ String(pokemon.id).padStart(3, '0') }}</span>
            <strong>{{ pokemon.name }}</strong>
          </RouterLink>
        </div>
      </section>
      <div class="account-actions"><button class="button button-primary" @click="signOut">Sair da conta</button><button class="danger-button" :disabled="deleting" @click="deleteAccount">{{ deleting ? "Excluindo..." : "Excluir perfil" }}</button></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.account-page{max-width:760px}.account-card{padding:42px}.account-card h1{margin:12px 0 8px;font-size:42px;letter-spacing:-.06em}.account-email{color:var(--muted);font-family:'DM Mono',monospace;font-size:12px}.account-stats{display:flex;align-items:baseline;gap:10px;margin-top:28px;padding:18px 20px;border:1px solid var(--line);border-radius:12px;background:var(--surface-muted)}.account-stats strong{font-size:28px;letter-spacing:-.05em;color:var(--accent)}.account-stats span{font-size:12px;color:var(--muted)}.favorite-preview{margin-top:34px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:16px}.section-heading h2{margin:5px 0 0;font-size:21px;letter-spacing:-.04em}.text-link{color:var(--accent);font-size:12px;font-weight:700}.favorite-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.favorite-item{display:flex;min-width:0;flex-direction:column;align-items:center;padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface-muted);color:var(--text);transition:transform .2s,border-color .2s}.favorite-item:hover{transform:translateY(-2px);border-color:var(--accent)}.favorite-item img{width:68px;height:68px;image-rendering:auto}.favorite-item span{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)}.favorite-item strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize;font-size:12px}.account-actions{display:flex;gap:12px;align-items:center;margin-top:32px}.danger-button{border:1px solid rgba(255,112,126,.45);border-radius:9px;padding:12px 18px;background:transparent;color:#ff8f9d;font-size:12px;font-weight:700}.danger-button:disabled{opacity:.6}.form-error{color:#ff8f9d;font-size:12px}@media(max-width:600px){.account-card{padding:28px 22px}.account-actions{flex-direction:column;align-items:stretch}}
</style>
