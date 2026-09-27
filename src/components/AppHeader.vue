<script setup lang="ts">
import { usePokemonStore } from "../store/pokemon";
import { RouterLink } from "vue-router";
import { onMounted, onUnmounted, ref } from "vue";
import { supabase } from "../lib/supabase";
const store = usePokemonStore();
const userEmail = ref("");
let authSubscription: { unsubscribe: () => void } | undefined;
onMounted(async () => {
  const { data } = await supabase.auth.getUser();
  userEmail.value = data.user?.email ?? "";
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { userEmail.value = session?.user?.email ?? ""; });
  authSubscription = listener.subscription;
});
 onUnmounted(() => authSubscription?.unsubscribe());
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" to="/"><span class="brand-mark">P</span><span>Poké<span class="brand-muted">Lab</span></span></RouterLink>
    <nav class="main-nav" aria-label="Navegação principal">
      <RouterLink to="/" exact-active-class="active">Dashboard</RouterLink>
      <RouterLink to="/pokemon">Pokémon</RouterLink>
      <RouterLink to="/compare">Comparar</RouterLink>
      <RouterLink to="/moves">Moves</RouterLink>
      <RouterLink to="/events">Events</RouterLink>
      <RouterLink to="/raids">Raids</RouterLink>
      <RouterLink to="/counters">Counters</RouterLink>
      <RouterLink to="/favorites">Favoritos <span v-if="store.favorites.length" class="count">{{ store.favorites.length }}</span></RouterLink>
      <RouterLink to="/game">Game</RouterLink>
    </nav>
    <div class="header-actions"><span class="sync-label"><i></i> API online</span><RouterLink class="account-link" :to="userEmail ? '/account' : '/auth'">{{ userEmail ? 'Perfil' : 'Entrar' }}</RouterLink><button class="theme-button" aria-label="Alternar tema" @click="store.toggleDarkMode">{{ store.darkMode ? "☼" : "◐" }}</button></div>
  </header>
</template>

<style scoped>
.app-header { display:flex; align-items:center; justify-content:space-between; height:72px; padding:0 clamp(20px,4vw,64px); border-bottom:1px solid var(--line); background:rgba(10,11,20,.82); backdrop-filter:blur(18px); position:sticky; top:0; z-index:10; }.brand { display:flex; align-items:center; gap:10px; color:var(--text); font-size:17px; font-weight:800; letter-spacing:-.04em; text-decoration:none; }.brand-mark { display:grid; place-items:center; width:29px; height:29px; border-radius:9px; background:linear-gradient(135deg,#8360ff,#36c7ff); color:#fff; font-size:14px; }.brand-muted { color:var(--muted); font-weight:500; }.main-nav { display:flex; align-items:center; gap:30px; margin-left:70px; }.main-nav a { padding:27px 0 24px; border-bottom:2px solid transparent; color:var(--muted); font-size:12px; text-decoration:none; transition:color .2s,border-color .2s; }.main-nav a:hover,.main-nav a.active { border-color:var(--accent-bright); color:var(--text); }.count { margin-left:5px; color:var(--accent-bright); }.header-actions { display:flex; align-items:center; gap:18px; }.account-link { color:var(--accent-bright); font-size:11px; font-weight:700; text-decoration:none; }.sync-label { color:var(--muted); font-size:10px; }.sync-label i { display:inline-block; width:6px; height:6px; margin-right:6px; border-radius:50%; background:#49d39b; }.theme-button { padding:7px 10px; border:1px solid var(--line-strong); border-radius:8px; background:var(--surface); color:var(--text); font-size:15px; } @media(max-width:700px){.main-nav{gap:14px;margin-left:15px}.main-nav a{font-size:10px}.sync-label{display:none}} @media(max-width:500px){.main-nav a:nth-child(3){display:none}.app-header{padding:0 14px}}
</style>
