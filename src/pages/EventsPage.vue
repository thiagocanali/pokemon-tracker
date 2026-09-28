<script setup lang="ts"></script>

<template>
  <main class="page-shell events-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">CENTRAL DE ATUALIZAÇÕES</p>
        <h1>Events <span>&</span> Seasons</h1>
        <p class="lede">Acompanhe o que está acontecendo agora e planeje seus próximos dias em Pokémon GO.</p>
      </div>
      <RouterLink class="outline-button" to="/">Voltar ao dashboard</RouterLink>
    </section>

    <section class="event-hero surface-card">
      <div class="hero-copy">
        <span class="live-pill">FONTE NÃO CONECTADA</span>
        <h2>Calendário Pokémon GO</h2>
        <p>Esta área só exibirá eventos quando houver uma fonte verificável conectada.</p>
      </div>
      <div class="hero-metric"><strong>—</strong><span>eventos verificados</span></div>
    </section>

    <div class="events-layout">
      <section class="event-list">
        <div class="section-title"><div><p class="eyebrow">AGENDA</p><h2>Eventos</h2></div></div>
        <p class="empty-events">Ainda não há dados de eventos conectados. Nenhuma data ou programação está sendo presumida.</p>
      </section>

      <aside class="side-column">
        <div class="surface-card quick-card"><p class="eyebrow">STATUS</p><h2>Calendário indisponível</h2><p>Providers de eventos e seasons ainda precisam ser conectados.</p></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.events-page{max-width:1180px;margin:0 auto;padding:58px 28px 80px}.page-heading{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:34px}.eyebrow{margin:0 0 10px;color:var(--accent-bright);font-size:10px;letter-spacing:.18em;font-weight:800}.page-heading h1{margin:0;color:var(--text);font-size:clamp(34px,5vw,58px);letter-spacing:-.06em;line-height:1}.page-heading h1 span{color:var(--accent-bright)}.lede{max-width:550px;margin:18px 0 0;color:var(--muted);font-size:14px;line-height:1.7}.outline-button{padding:11px 15px;border:1px solid var(--line-strong);border-radius:8px;color:var(--text);font-size:11px;text-decoration:none}.surface-card{border:1px solid var(--line);border-radius:13px;background:linear-gradient(145deg,rgba(28,29,47,.9),rgba(18,19,31,.9))}.event-hero{display:flex;justify-content:space-between;align-items:center;min-height:190px;padding:32px 38px;margin-bottom:48px;background:radial-gradient(circle at 85% 30%,rgba(112,83,255,.22),transparent 36%),linear-gradient(120deg,rgba(29,27,57,.95),rgba(18,19,31,.95))}.hero-copy{max-width:650px}.live-pill{color:#65deb1;font-size:10px;font-weight:800;letter-spacing:.13em}.live-pill i{display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;background:#65deb1;box-shadow:0 0 12px #65deb1}.hero-copy h2{margin:14px 0 9px;color:var(--text);font-size:29px;letter-spacing:-.04em}.hero-copy p,.tip-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}.hero-metric{display:flex;flex-direction:column;align-items:flex-end;color:var(--muted);font-size:11px}.hero-metric strong{color:var(--text);font-size:65px;line-height:1;letter-spacing:-.08em}.events-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:26px}.section-title{display:flex;justify-content:space-between;align-items:end;margin-bottom:17px}.event-filters{display:flex;gap:6px}.event-filters button{border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);padding:7px 10px;font:inherit;font-size:10px;cursor:pointer}.event-filters button.active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-bright)}.section-title h2,.quick-card h2{margin:0;color:var(--text);font-size:20px;letter-spacing:-.04em}.muted{color:var(--muted);font-size:11px}.event-card{display:flex;align-items:center;gap:18px;padding:22px 20px;margin-bottom:12px;transition:transform .2s,border-color .2s}.event-card:hover{transform:translateY(-2px);border-color:var(--line-strong)}.event-marker{width:4px;align-self:stretch;border-radius:4px;background:var(--accent-bright)}.accent-cyan .event-marker{background:#4fd3e8}.accent-orange .event-marker{background:#f5a04d}.event-content{flex:1}.event-meta{display:flex;gap:14px;color:var(--muted);font-size:10px}.status{color:var(--accent-bright);font-weight:800;text-transform:uppercase}.event-content h3{margin:10px 0 6px;color:var(--text);font-size:17px}.event-content p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.arrow-button{width:31px;height:31px;border:1px solid var(--line-strong);border-radius:50%;background:transparent;color:var(--text);font-size:16px}.quick-card,.tip-card{padding:23px}.quick-card{margin-bottom:14px}.quick-card button{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px;text-decoration:none}.quick-card a:last-child{border:0}.quick-card a:hover{color:var(--text)}.quick-card button span{color:var(--accent-bright)}.empty-events{padding:24px;border:1px dashed var(--line-strong);border-radius:12px;color:var(--muted);font-size:13px}.tip-card{background:rgba(48,39,91,.25)}.tip-card h3{margin:0 0 8px;color:var(--text);font-size:16px}.tip-card .eyebrow{margin-bottom:18px}@media(max-width:760px){.page-heading,.event-hero{align-items:flex-start;flex-direction:column}.event-hero{padding:25px}.hero-metric{align-items:flex-start}.events-layout{grid-template-columns:1fr}.side-column{display:grid;grid-template-columns:1fr 1fr;gap:12px}.quick-card{margin:0}}@media(max-width:500px){.events-page{padding:34px 16px 60px}.side-column{display:block}.quick-card{margin-bottom:12px}.event-card{align-items:flex-start}.arrow-button{flex:0 0 auto}}
</style>.
