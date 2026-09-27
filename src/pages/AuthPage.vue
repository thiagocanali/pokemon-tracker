<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase";

const router = useRouter();
const mode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
const loading = ref(false);
const message = ref("");
const error = ref("");
const title = computed(() => mode.value === "login" ? "Entrar no PokéLab" : "Criar seu perfil");

async function submit() {
  loading.value = true;
  message.value = "";
  error.value = "";
  const result = mode.value === "login"
    ? await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    : await supabase.auth.signUp({ email: email.value, password: password.value });
  loading.value = false;
  if (result.error) {
    error.value = mode.value === "login" ? "E-mail ou senha inválidos." : "Não foi possível criar a conta. Confira os dados e tente novamente.";
    return;
  }
  if (mode.value === "signup") {
    message.value = "Cadastro criado. Confira seu e-mail para confirmar a conta.";
    return;
  }
  router.push("/account");
}
</script>

<template>
  <main class="page-shell auth-page">
    <section class="auth-card card">
      <p class="eyebrow">PERFIL DO TREINADOR</p>
      <h1>{{ title }}</h1>
      <p class="auth-intro">Salve favoritos, acompanhe sua jornada e mantenha seus dados sincronizados.</p>
      <form @submit.prevent="submit">
        <label>E-mail<input v-model="email" type="email" autocomplete="email" required placeholder="treinador@email.com" /></label>
        <label>Senha<input v-model="password" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo de 6 caracteres" /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="message" class="form-message" role="status">{{ message }}</p>
        <button class="button button-primary auth-submit" :disabled="loading">{{ loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar cadastro" }}</button>
      </form>
      <button class="mode-switch" type="button" @click="mode = mode === 'login' ? 'signup' : 'login'">{{ mode === "login" ? "Ainda não tenho cadastro" : "Já tenho uma conta" }}</button>
    </section>
  </main>
</template>

<style scoped>
.auth-page{display:grid;place-items:center;min-height:calc(100vh - 72px)}.auth-card{width:min(100%,460px);padding:42px}.auth-card h1{margin:12px 0 10px;font-size:clamp(30px,5vw,44px);letter-spacing:-.06em}.auth-intro{color:var(--muted);line-height:1.7;margin:0 0 28px}.auth-card form{display:grid;gap:18px}.auth-card label{display:grid;gap:8px;color:var(--muted);font-size:12px;font-weight:700}.auth-card input{width:100%;padding:13px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-elevated);color:var(--text);outline:none}.auth-card input:focus{border-color:var(--accent-bright)}.auth-submit{width:100%;margin-top:5px}.auth-submit:disabled{opacity:.6;cursor:wait}.mode-switch{border:0;background:none;color:var(--accent-bright);font-size:12px;font-weight:700;margin:24px auto 0;display:block}.form-error{color:#ff8f9d;font-size:12px;margin:0}.form-message{color:#64d6a3;font-size:12px;margin:0}@media(max-width:600px){.auth-card{padding:28px 22px}}
</style>
