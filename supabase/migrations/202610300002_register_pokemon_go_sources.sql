-- Register candidate Pokémon GO data providers without implying that ingestion is active.
-- Providers remain disabled until an adapter, validation rules, and permitted access method exist.
insert into public.data_sources (id, name, url, scope, limitations, terms_url)
values
('pokeminers','PokeMiners','https://github.com/PokeMiners/game_masters','Referência comunitária para dados extraídos dos arquivos do jogo (Game Master/assets).','Não é uma API oficial da Niantic. A disponibilidade, formato e frequência dos arquivos podem mudar. Exigir origem e versão identificáveis.','https://github.com/PokeMiners'),
('pokebattler','Pokebattler','https://www.pokebattler.com/developers','Simulações PvE, counters de reides, rankings e dados de combate.','API comunitária não oficial, sem SLA publicado e sujeita a mudanças e limites. Resultados dependem de nível, moveset, estratégia, clima e parâmetros.','https://www.pokebattler.com/developers'),
('pvpoke','PvPoke','https://pvpoke.com/','Rankings, simulações e recomendações para GO Battle League/PvP.','Rankings são simulações e dependem de liga, formato, regras, versão dos dados e parâmetros. Não usar como ranking PvE.','https://pvpoke.com/'),
('leekduck','Leek Duck','https://leekduck.com/','Referência comunitária para eventos, calendários, raids, pesquisas e rotações.','Eventos podem ser atualizados ou corrigidos. Exigir datas, fuso horário, coleta e link direto para cada publicação.','https://leekduck.com/'),
('pokemongohub','Pokémon GO Hub','https://db.pokemongohub.net/','Database de Pokémon GO, movimentos, ferramentas e rankings PvE/PvP.','Agregador comunitário; verificar créditos e metodologia de cada conjunto. Preferir origem primária quando disponível.','https://pokemongohub.net/')
on conflict (id) do update set name=excluded.name,url=excluded.url,scope=excluded.scope,limitations=excluded.limitations,terms_url=excluded.terms_url,updated_at=now();

-- Registered for review only. No ingestion adapter is implemented yet.
update public.data_sources set enabled=false,last_status='unavailable',updated_at=now()
where id in ('pokeminers','pokebattler','pvpoke','leekduck','pokemongohub');
