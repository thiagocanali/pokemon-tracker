<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "../lib/supabase";

type EventRow = { id:string; slug:string; names:Record<string,string>; description:Record<string,string>|null; starts_at:string; ends_at:string; timezone:string|null; source_url:string };
type SeasonRow = { id:string; names:Record<string,string>; starts_at:string; ends_at:string; source_url:string };
const events = ref<EventRow[]>([]);
const seasons = ref<SeasonRow[]>([]);
const loading = ref(true);
const error = ref("");
const now = new Date();
const upcomingEvents = computed(() => events.value.filter((event) => new Date(event.ends_at) >= now));
const eventName = (event: EventRow) => event.names?.["pt-BR"] || event.names?.en || event.slug;
const seasonName = (season: SeasonRow) => season.names?.["pt-BR"] || season.names?.en || season.id;
const dateRange = (start:string,end:string) => `${new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(start))} — ${new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(end))}`;
onMounted(async () => {
  if (!supabase) { error.value="Configure o Supabase para consultar o calendário."; loading.value=false; return; }
  try {
    const [eventResult,seasonResult] = await Promise.all([
      supabase.from("events").select("id,slug,names,description,starts_at,ends_at,timezone,source_url").gte("ends_at",now.toISOString()).order("starts_at").limit(30),
      supabase.from("seasons").select("id,names,starts_at,ends_at,source_url").gte("ends_at",now.toISOString()).order("starts_at").limit(10),
    ]);
    if(eventResult.error) throw eventResult.error;
    if(seasonResult.error) throw seasonResult.error;
    events.value=(eventResult.data??[]) as EventRow[];
    seasons.value=(seasonResult.data??[]) as SeasonRow[];
  } catch { error.value="Não foi possível consultar o calendário."; }
  finally { loading.value=false; }
});
</script>

<template>
  <main class="page-shell events-page">
    <section class="page-heading">
      <div><p class="eyebrow">CENTRAL DE ATUALIZAÇÕES</p><h1>Events <span>&</span> Seasons</h1><p class="lede">Agenda de eventos e temporadas cadastrados por fontes verificáveis de Pokémon GO.</p></div>
      <RouterLink class="outline-button" to="/">Voltar ao dashboard</RouterLink>
    </section>
    <section class="event-hero surface-card">
      <div class="hero-copy"><span class="live-pill">{{ loading ? "CONSULTANDO CALENDÁRIO" : upcomingEvents.length ? "AGENDA ATUALIZADA" : "SEM EVENTOS CADASTRADOS" }}</span><h2>Calendário Pokémon GO</h2><p>Datas e descrições vêm do catálogo conectado; nenhuma programação é presumida.</p></div>
      <div class="hero-metric"><strong>{{ upcomingEvents.length }}</strong><span>eventos catalogados</span></div>
    </section>
    <p v-if="loading" class="empty-events">Carregando calendário...</p><p v-else-if="error" class="empty-events">{{ error }}</p>
    <div v-else class="events-layout">
      <section class="event-list"><div class="section-title"><div><p class="eyebrow">AGENDA</p><h2>Eventos</h2></div></div>
        <article v-for="event in upcomingEvents" :key="event.id" class="event-card surface-card"><span class="event-marker"></span><div class="event-content"><div class="event-meta"><span>{{ dateRange(event.starts_at,event.ends_at) }}</span><span class="status">{{ new Date(event.starts_at)>now ? "Próximo" : "Em andamento" }}</span></div><h3>{{ eventName(event) }}</h3><p>{{ event.description?.["pt-BR"] || event.description?.en || "Descrição não fornecida pela fonte." }}</p><a :href="event.source_url" target="_blank" rel="noreferrer">Consultar fonte ↗</a></div></article>
        <p v-if="!upcomingEvents.length" class="empty-events">Ainda não há eventos verificados cadastrados. A PokéAPI não fornece o calendário de Pokémon GO.</p>
      </section>
      <aside class="side-column"><div class="surface-card quick-card"><p class="eyebrow">TEMPORADAS</p><h2>{{ seasons.length ? "Temporadas catalogadas" : "Sem temporadas cadastradas" }}</h2><article v-for="season in seasons" :key="season.id" class="season-item"><strong>{{ seasonName(season) }}</strong><span>{{ dateRange(season.starts_at,season.ends_at) }}</span><a :href="season.source_url" target="_blank" rel="noreferrer">Fonte ↗</a></article><p v-if="!seasons.length">Providers de seasons ainda precisam ser conectados.</p></div></aside>
    </div>
  </main>
</template>

<style scoped>
.events-page{max-width:1180px;margin:0 auto;padding:58px 28px 80px}.page-heading{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:34px}.eyebrow{margin:0 0 10px;color:var(--accent-bright);font-size:10px;letter-spacing:.18em;font-weight:800}.page-heading h1{margin:0;color:var(--text);font-size:clamp(34px,5vw,58px);letter-spacing:-.06em;line-height:1}.page-heading h1 span{color:var(--accent-bright)}.lede{max-width:550px;margin:18px 0 0;color:var(--muted);font-size:14px;line-height:1.7}.outline-button{padding:11px 15px;border:1px solid var(--line-strong);border-radius:8px;color:var(--text);font-size:11px;text-decoration:none}.surface-card{border:1px solid var(--line);border-radius:13px;background:linear-gradient(145deg,rgba(28,29,47,.9),rgba(18,19,31,.9))}.event-hero{display:flex;justify-content:space-between;align-items:center;min-height:190px;padding:32px 38px;margin-bottom:32px;background:radial-gradient(circle at 85% 30%,rgba(112,83,255,.22),transparent 36%),linear-gradient(120deg,rgba(29,27,57,.95),rgba(18,19,31,.95))}.hero-copy{max-width:650px}.live-pill{color:#65deb1;font-size:10px;font-weight:800;letter-spacing:.13em}.hero-copy h2{margin:14px 0 9px;color:var(--text);font-size:29px;letter-spacing:-.04em}.hero-copy p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}.hero-metric{display:flex;flex-direction:column;align-items:flex-end;color:var(--muted);font-size:11px}.hero-metric strong{color:var(--text);font-size:65px;line-height:1;letter-spacing:-.08em}.events-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:26px}.section-title{margin-bottom:17px}.section-title h2,.quick-card h2{margin:0;color:var(--text);font-size:20px;letter-spacing:-.04em}.event-card{display:flex;gap:18px;padding:22px 20px;margin-bottom:12px}.event-marker{width:4px;align-self:stretch;border-radius:4px;background:var(--accent-bright)}.event-content{flex:1}.event-meta{display:flex;gap:14px;color:var(--muted);font-size:10px}.status{color:var(--accent-bright);font-weight:800;text-transform:uppercase}.event-content h3{margin:10px 0 6px;color:var(--text);font-size:17px}.event-content p,.quick-card p{margin:0 0 8px;color:var(--muted);font-size:12px;line-height:1.6}.event-content a,.season-item a{color:var(--accent-bright);font-size:11px}.empty-events{padding:24px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);font-size:13px}.quick-card{padding:23px}.season-item{display:grid;gap:6px;padding:14px 0;border-bottom:1px solid var(--line)}.season-item strong{font-size:12px}.season-item span{color:var(--muted);font-size:10px}@media(max-width:760px){.page-heading,.event-hero{align-items:flex-start;flex-direction:column}.event-hero{padding:25px}.hero-metric{align-items:flex-start}.events-layout{grid-template-columns:1fr}}@media(max-width:500px){.events-page{padding:34px 16px 60px}.event-card{align-items:flex-start}}
</style>
