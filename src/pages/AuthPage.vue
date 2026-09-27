<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase";

const router = useRouter();
const route = useRoute();
const mode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
const loading = ref(false);
const recovering = ref(false);
const message = ref("");
const error = ref("");
const title = computed(() => mode.value === "login" ? "Entrar no PokéLab" : "Criar seu perfil");

async function recoverAccess() {
  if (loading.value || !email.value) {
    error.value = "Informe seu e-mail para recuperar o acesso.";
    return;
  }
  recovering.value = true;
  message.value = "";
  error.value = "";
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/auth?mode=reset`,
  });
  recovering.value = false;
  if (resetError) {
    error.value = "Não foi possível enviar o e-mail de recuperação. Tente novamente.";
    return;
  }
  message.value = "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.";
}

async function submit() {
  if (loading.value) return;
  loading.value = true;
  message.value = "";
  error.value = "";
  let result;
  try {
    result = mode.value === "login"
      ? await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
      : await supabase.auth.signUp({ email: email.value, password: password.value });
  } catch {
    loading.value = false;
    error.value = "Não foi possível conectar ao serviço de autenticação.";
    return;
  }
  loading.value = false;
  if (result.error) {
    error.value = mode.value === "login" ? "E-mail ou senha inválidos." : "Não foi possível criar a conta. Confira os dados e tente novamente.";
    return;
  }
  if (mode.value === "signup") {
    message.value = "Cadastro criado. Confira seu e-mail para confirmar a conta.";
    return;
  }
  const redirect = typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
    ? route.query.redirect
    : "/account";
  router.push(redirect);
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
        <label>Senha<input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="6" required placeholder="Mínimo de 6 caracteres" /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="message" class="form-message" role="status">{{ message }}</p>
        <button class="button button-primary auth-submit" :disabled="loading">{{ loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar cadastro" }}</button>
      </form>
      <button v-if="mode === 'login'" class="recovery-link" type="button" :disabled="recovering" @click="recoverAccess">{{ recovering ? "Enviando instruções..." : "Esqueci minha senha" }}</button>
      <button class="mode-switch" type="button" @click="mode = mode === 'login' ? 'signup' : 'login'">{{ mode === "login" ? "Ainda não tenho cadastro" : "Já tenho uma conta" }}</button>
    </section>
  </main>
</template>

<style scoped>
.auth-page{display:grid;place-items:center;min-height:calc(100vh - 72px)}.auth-card{width:min(100%,460px);padding:42px}.auth-card h1{margin:12px 0 10px;font-size:clamp(30px,5vw,44px);letter-spacing:-.06em}.auth-intro{color:var(--muted);line-height:1.7;margin:0 0 28px}.auth-card form{display:grid;gap:18px}.auth-card label{display:grid;gap:8px;color:var(--muted);font-size:12px;font-weight:700}.auth-card input{width:100%;padding:13px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-elevated);color:var(--text);outline:none}.auth-card input:focus{border-color:var(--accent-bright)}.auth-submit{width:100%;margin-top:5px}.auth-submit:disabled{opacity:.6;cursor:wait}.recovery-link{border:0;background:none;color:var(--muted);font-size:12px;font-weight:700;margin:18px auto 0;display:block}.recovery-link:hover:not(:disabled){color:var(--accent-bright)}.recovery-link:disabled{opacity:.6}.mode-switch{border:0;background:none;color:var(--accent-bright);font-size:12px;font-weight:700;margin:24px auto 0;display:block}.form-error{color:#ff8f9d;font-size:12px;margin:0}.form-message{color:#64d6a3;font-size:12px;margin:0}@media(max-width:600px){.auth-card{padding:28px 22px}}
</style>
