<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase";

const router = useRouter();
const email = ref("");
const loading = ref(true);
const deleting = ref(false);
const error = ref("");

onMounted(async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) { router.replace("/auth"); return; }
  email.value = data.user.email ?? "";
  loading.value = false;
});

async function signOut() {
  await supabase.auth.signOut();
  router.push("/");
}

async function deleteAccount() {
  if (!window.confirm("Excluir seu perfil e sua conta permanentemente?")) return;
  deleting.value = true;
  error.value = "";
  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) { error.value = "Não foi possível excluir o perfil agora."; deleting.value = false; return; }
  await supabase.auth.signOut();
  router.push("/");
}
</script>

<template>
  <main class="page-shell account-page">
    <section v-if="!loading" class="account-card card">
      <p class="eyebrow">CONTA DO TREINADOR</p>
      <h1>Seu perfil</h1>
      <p class="account-email">{{ email }}</p>
      <div class="account-actions"><button class="button button-primary" @click="signOut">Sair da conta</button><button class="danger-button" :disabled="deleting" @click="deleteAccount">{{ deleting ? "Excluindo..." : "Excluir perfil" }}</button></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.account-page{max-width:760px}.account-card{padding:42px}.account-card h1{margin:12px 0 8px;font-size:42px;letter-spacing:-.06em}.account-email{color:var(--muted);font-family:'DM Mono',monospace;font-size:12px}.account-actions{display:flex;gap:12px;align-items:center;margin-top:32px}.danger-button{border:1px solid rgba(255,112,126,.45);border-radius:9px;padding:12px 18px;background:transparent;color:#ff8f9d;font-size:12px;font-weight:700}.danger-button:disabled{opacity:.6}.form-error{color:#ff8f9d;font-size:12px}@media(max-width:600px){.account-card{padding:28px 22px}.account-actions{flex-direction:column;align-items:stretch}}
</style>
