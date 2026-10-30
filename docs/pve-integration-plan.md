# Plano de integração PvE — Pokébattler

## Objetivo

Adicionar recomendações de atacantes para raids de Pokémon GO com simulações rastreáveis, sem confundir dificuldade estimada, DPS, TDO ou rankings de PvP.

## Fonte e endpoints candidatos

Documentação comunitária consultada em 2026-10-30: https://v2.pokebattler.com/developers e https://www.pokebattler.com/developers/

Base pública documentada: `https://fight.pokebattler.com`.

- `GET /raids`: rotação atual e raids anunciadas.
- `GET /pokemon`: Pokédex de combate, tipos, stats base e movesets disponíveis.
- `GET /moves`: dados de movimentos (poder, energia e duração).
- `GET /raids/defenders/{boss}/levels/{tier}/attackers/levels/{level}/strategies/{attack}/{defense}`: counters simulados para um boss específico. A documentação v2 usa esse formato e mostra, por exemplo, `RILLABOOM_GIGANTAMAX`, `RAID_LEVEL_6` e nível de atacante `40`.
- `GET /rankings/attackers/levels/{level}/defenders/levels/{level}/strategies/{attack}/{defense}`: ranking geral de atacantes; evitar como primeira integração porque rankings globais simulam o meta completo e podem expirar.
- `GET /rocket`: escalações atuais da Equipe GO Rocket. Não reutilizar os counters de raid.
- `GET /pvp/rankings/{side}/leagues/{league}/strategies/PVP/PVP`: ranking PvP por liga; domínio separado de PvE.

A documentação v2 descreve as rotas públicas como leituras GET sem autenticação. Isso não constitui SLA nem garantia de estabilidade. Limites não são publicados. A documentação recomenda cache agressivo, evitar consultas combinatórias e identificar o cliente com User-Agent descritivo. Atribuição ao Pokébattler é obrigatória ao publicar resultados derivados.

## Semântica obrigatória

- **Estimator**: na documentação v2 atual, é apresentado como estimativa de quantos treinadores seriam necessários para vencer a raid; menor é melhor. Não é DPS, TDO, porcentagem nem nota universal. Outras páginas/versões podem usar métricas como mortes por raid; nunca assumir semântica sem registrar a versão e o contexto da interface/API.
- Resultados são simulações e dependem de nível do atacante, boss/tier, clima, estratégia de ataque, estratégia de esquiva e agregação.
- A lista de counters pode apresentar o melhor moveset por espécie, enquanto o estimador pode ser agregado entre diferentes movesets do boss. Preservar essa distinção ao exibir.
- Raids usam equipe de seis Pokémon; Max Battles e Rocket têm regras próprias e não devem reutilizar automaticamente a classificação de raids.
- Nunca converter Estimator em DPS/TDO nem combinar métricas diferentes em um score inventado.

## Política de consumo

1. Usar somente endpoints públicos documentados e validar os termos aplicáveis antes de publicar dados derivados.
2. Identificar o cliente com User-Agent descritivo no servidor, quando o runtime permitir.
3. Cachear agressivamente; não varrer combinações de atacante × defensor × moveset.
4. Priorizar consulta por boss com resultados pré-simulados. Não executar rankings globais em cada abertura de tela.
5. Aplicar timeout, limite de tamanho, validação de schema e circuit breaker.
6. Em indisponibilidade, exibir último snapshot com data/hora e aviso de desatualização; nunca simular atualização bem-sucedida.
7. Atribuir Pokébattler de forma visível em qualquer resultado derivado. Rever os Termos de Serviço antes de redistribuição pública ou uso comercial.

## Modelo interno proposto

Usar as tabelas existentes, sem inventar uma tabela genérica de ranking que misture domínios:

- `data_sources`: provedor e estado da integração.
- `sync_runs`: execução, domínio, contagem e falha.
- `pokemon_forms` / `pokemon_go_stats`: identidade da forma e stats GO, somente quando a origem do dado for apropriada.
- `moves` / `pokemon_moves`: dados e compatibilidade de movimentos.
- `battle_rankings`: somente ranking PvE ou PvP com `mode` e contexto explícitos.
- `data_snapshots`: resposta bruta versionada quando útil e permitido.

Para cada snapshot de counter, persistir pelo menos: boss/form, tier, nível dos atacantes, clima, estratégia de ataque, estratégia de esquiva, agregação, ordenação, URL exata consultada, data/hora de coleta e versão/hash do payload quando disponível. Se a resposta não trouxer uma métrica, não derivá-la por suposição.

## Fases de implementação

### Fase 0 — concluída neste documento
Registrar endpoints, semântica, limites e critérios de aceitação. Nenhuma chamada automática foi ativada.

### Fase 1 — contrato e fixtures
- Obter respostas reais de `/raids`, `/moves` e uma consulta de counters em ambiente de desenvolvimento.
- Copiar a URL exata da página de desenvolvedor atual e verificar a rota/params; a documentação comunitária tem páginas/versões diferentes e não se deve inferir equivalência entre elas.
- Guardar fixtures pequenas e sanitizadas com URL, data e contexto.
- Definir tipos TypeScript a partir do payload observado, não de suposições.
- Testar campos ausentes, mudanças de formato, resposta vazia e erro HTTP.

### Fase 2 — adaptador servidor
- Criar função Edge dedicada; não chamar Pokébattler diretamente do browser.
- Exigir segredo para execução administrativa de sincronização.
- Validar payload antes de gravar e registrar `sync_runs`.
- Respeitar cache e evitar fan-out de consultas.

### Fase 3 — interface
- Exibir counters com moveset, nível, boss, tier e parâmetros da simulação.
- Separar visualmente Estimator, DPS, TDO e tempo de combate.
- Mostrar atribuição, fonte específica e horário de verificação.
- Exibir aviso explícito quando o snapshot estiver vencido ou indisponível.

### Fase 4 — ativação controlada
Habilitar `pokebattler` em `data_sources` somente após revisão dos termos, fixtures, testes, limites e validação do comportamento em produção.

## Critérios para considerar a integração pronta

- [ ] Termos e atribuição revisados.
- [ ] Payload real documentado e fixtures versionadas.
- [ ] Schema validado com testes.
- [ ] Cache, timeout e proteção contra excesso de chamadas.
- [ ] Execuções registradas em `sync_runs`.
- [ ] Fonte, parâmetros e timestamp visíveis na interface.
- [ ] Estimator nunca apresentado como DPS/TDO.
- [ ] Provedor só habilitado depois de todos os itens acima.


## Revisão de versão do contrato (2026-10-30)

A documentação v2 atual lista também `/rocket`, rankings PvP por liga e a API de counters por boss. Ela explicita parâmetros `sort`, `weatherCondition`, `dodgeStrategy` e `aggregation`, e alerta que rankings globais são caros; para consultas de baixa latência, preferir counters pré-calculados por boss. Há documentação mais antiga com nomenclatura diferente para o Estimator (por exemplo, mortes por raid). O adaptador deverá registrar a versão/contexto da fonte e nunca assumir que métricas com o mesmo rótulo têm a mesma definição entre versões.

**Bloqueio atual:** o endpoint HTTP não foi capturado neste repositório como fixture real. Portanto, nenhuma interface TypeScript nem integração de produção deve ser escrita até validar uma resposta JSON real e a URL exata usada pela versão atual.
