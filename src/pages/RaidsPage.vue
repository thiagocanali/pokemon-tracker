<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "../lib/supabase";

type RaidBoss = { tier: string; pokemon_forms: { slug: string; names: Record<string,string>; pokemon_species: { names: Record<string,string>; dex_number: number } | null } | null };
type RaidRotation = { id: string; starts_at: string; ends_at: string; source_url: string; raid_rotation_bosses: RaidBoss[] };
const rotations = ref<RaidRotation[]>([]);
const loading = ref(true);
const error = ref("");
const now = new Date();
const dateLabel = (value: string) => new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(value));
const statusLabel = (rotation: RaidRotation) => new Date(rotation.starts_at) > now ? "Próxima" : "Ativa";
const bossName = (boss: RaidBoss) => boss.pokemon_forms?.names?.["pt-BR"] || boss.pokemon_forms?.names?.en || boss.pokemon_forms?.slug || "Pokémon";
const sprite = (boss: RaidBoss) => { const id=boss.pokemon_forms?.pokemon_species?.dex_number; return id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png` : ""; };
const activeRotations = computed(() => rotations.value.filter((rotation) => new Date(rotation.ends_at) >= now));
onMounted(async () => {
  if (!supabase) { error.value = "Configure o Supabase para consultar as rotações."; loading.value=false; return; }
  try {
    const { data, error: queryError } = await supabase.from("raid_rotations")
      .select("id,starts_at,ends_at,source_url,raid_rotation_bosses(tier,pokemon_forms(slug,names,pokemon_species(names,dex_number)))")
      .gte("ends_at", now.toISOString()).order("starts_at").limit(20);
    if (queryError) throw queryError;
    rotations.value = (data ?? []) as unknown as RaidRotation[];
  } catch { error.value = "Não foi possível consultar as rotações de raid."; }
  finally { loading.value=false; }
});
</script>

<template>
  <main class="raids-page">
    <section class="page-heading">
      <div><p class="eyebrow">INTELIGÊNCIA DE RAIDS</p><h1>Raids</h1><p class="lede">Rotações e chefes cadastrados por fontes verificáveis de Pokémon GO.</p></div>
      <div class="heading-status"><span class="live-dot"></span><span>{{ activeRotations.length ? "Dados catalogados" : "Sem rotação cadastrada" }}</span><small>Agenda baseada no Supabase</small></div>
    </section>
    <p v-if="loading" class="raid-empty">Carregando rotações...</p>
    <p v-else-if="error" class="raid-empty">{{ error }}</p>
    <p v-else-if="!activeRotations.length" class="raid-empty">Não há chefes ou períodos de raid verificados para exibir. A PokéAPI não fornece rotações de Pokémon GO.</p>
    <section v-else class="rotation-list">
      <article v-for="rotation in activeRotations" :key="rotation.id" class="rotation-card">
        <header><div><span class="eyebrow">ROTAÇÃO</span><h2>{{ statusLabel(rotation) }}</h2></div><a :href="rotation.source_url" target="_blank" rel="noreferrer">Ver fonte ↗</a></header>
        <p class="period">{{ dateLabel(rotation.starts_at) }} — {{ dateLabel(rotation.ends_at) }}</p>
        <div class="boss-grid">
          <article v-for="boss in rotation.raid_rotation_bosses" :key="boss.tier + bossName(boss)" class="boss-card">
            <img v-if="sprite(boss)" :src="sprite(boss)" :alt="bossName(boss)" />
            <span class="tier">{{ boss.tier }}</span><strong>{{ bossName(boss) }}</strong>
          </article>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.raids-page{max-width:1180px;margin:0 auto;padding:64px 32px 96px}.page-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:42px}.eyebrow{margin:0 0 10px;color:var(--accent-bright);font-size:10px;font-weight:800;letter-spacing:.16em}.page-heading h1{margin:0;font-size:46px;letter-spacing:-.06em}.lede{max-width:530px;margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.6}.heading-status{display:grid;grid-template-columns:auto auto;gap:4px 8px;align-items:center;color:var(--text);font-size:11px}.heading-status small{grid-column:2;color:var(--muted);font-size:9px}.live-dot{width:7px;height:7px;border-radius:50%;background:#a68cff;box-shadow:0 0 0 4px #a68cff22}.raid-empty{padding:24px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);font-size:13px}.rotation-list{display:grid;gap:18px}.rotation-card{padding:24px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.rotation-card header{display:flex;justify-content:space-between;align-items:center}.rotation-card h2{margin:0;font-size:22px}.rotation-card header a{color:var(--accent-bright);font-size:11px}.period{color:var(--muted);font-size:12px}.boss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:20px}.boss-card{display:grid;justify-items:center;gap:8px;padding:15px;border:1px solid var(--line);border-radius:10px}.boss-card img{width:90px;height:90px;object-fit:contain}.boss-card strong{font-size:12px}.tier{color:var(--accent-bright);font-size:10px;text-transform:uppercase}@media(max-width:600px){.raids-page{padding:40px 18px}.page-heading{display:block}.heading-status{margin-top:20px}.rotation-card{padding:17px}.boss-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
