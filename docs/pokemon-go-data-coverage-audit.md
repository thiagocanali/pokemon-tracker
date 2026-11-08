# Auditoria de cobertura dos dados de Pokémon GO

**Revisado em:** 2026-11-08  
**Escopo:** migrations versionadas, Edge Functions de ingestão, serviços de leitura/cache, proveniência e páginas de consulta.  
**Método:** inspeção estática do branch `main` após os PRs #59–#66.  
**Limitação:** não houve conexão ao Supabase remoto, consulta às tabelas de produção ou execução de sincronização. A existência de tabela, serviço ou tela não prova que existam registros válidos nela.

## Resumo executivo

A infraestrutura de leitura GO evoluiu: existe agora um modelo canônico de leitura para espécies/formas/stats em `goPokemonCore.ts`; movimentos, rankings, eventos, temporadas e raids também têm serviços de leitura/cache. Os contratos de eventos/temporadas/raids já carregam metadados de proveniência, e a saúde das fontes distingue contagem disponível, não monitorada e erro.

A ingestão de dados específicos de Pokémon GO continua ausente. O único pipeline encontrado é `sync-pokemon-catalog`, que consome PokéAPI para o catálogo geral da franquia. Não há adaptadores ativos para stats GO, movimentos, rankings, eventos ou raids.

**Conclusão:** a leitura está mais estruturada, mas o banco ainda depende de ingestão externa que não foi implementada. Não habilitar provedores comunitários nem anunciar dados GO como atualizados até validar payloads, termos, proveniência e pipelines por domínio.

## Matriz de cobertura observada

| Domínio | Estrutura no banco | Leitura no frontend | Ingestão no repositório | Situação |
|---|---|---|---|---|
| Catálogo geral / espécies / formas | `pokemon_species`, `pokemon_forms`, `pokemon_form_types`, `data_snapshots` | `service.ts` com Supabase, PokéAPI e cache local | `sync-pokemon-catalog` via PokéAPI | Implementado para catálogo geral; não é catálogo GO |
| Stats de Pokémon GO | `pokemon_go_stats` | `goPokemonCore.ts` consulta stats junto das formas e mapeia ataque/defesa/stamina/CP máximo | Nenhum adaptador GO identificado | Leitura implementada; ingestão ausente; proveniência específica dos stats ainda não é exposta no modelo |
| Movimentos GO | `moves`, `pokemon_moves` | `moves.ts` e `MovesPage.vue` | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Rankings PvE/PvP | `battle_rankings`, `battle_ranking_moves` | `rankings.ts` e `CountersPage.vue` | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Eventos e temporadas | `events`, `seasons`, `event_forms` | `goCatalog.ts` e páginas de eventos | Nenhum adaptador identificado | Leitura/cache com source_id, source_url, collected_at, source_updated_at e data_version; ingestão ausente |
| Rotações de raids | `raid_rotations`, `raid_rotation_bosses` | `goCatalog.ts` e página de raids | Nenhum adaptador identificado | Leitura/cache com proveniência; ingestão ausente |
| Evoluções | `evolutions` | Nenhum serviço específico identificado nesta revisão | Nenhum adaptador identificado | Estrutura sem pipeline comprovado |
| Alterações de catálogo | `data_changes` | Não foi identificada interface de histórico | RPC acionada pelo sync da PokéAPI | Implementado somente no fluxo do catálogo geral |

## Fontes cadastradas

As migrations registram PokéMiners, Pokébattler, PvPoke, Leek Duck, Pokémon GO Hub e Pokémon GO API (community) como candidatas desabilitadas. O cadastro não é integração e não prova que exista uma ingestão ativa. A PokéAPI permanece limitada ao catálogo geral e não deve preencher stats, movimentos, raids, eventos ou rankings de Pokémon GO.

As avaliações de Pokébattler e pogo-db-api permanecem documentais. Não há fixture JSON real capturada e validada no repositório que autorize ativar esses adaptadores.

## Achados técnicos atualizados

### 1. Ingestão GO ausente — prioridade crítica

A Edge Function `sync-pokemon-catalog` grava espécies, formas, tipos e snapshots do catálogo geral. Não foram encontrados adaptadores de ingestão para `pokemon_go_stats`, `moves`, `pokemon_moves`, `battle_rankings`, `events`, `seasons` ou `raid_rotations`.

**Ação:** criar adaptadores isolados por domínio, com contratos derivados de payloads reais e fixtures versionadas. Não ativar fontes apenas alterando `enabled`.

### 2. Cache freshness não representa source freshness — prioridade alta

`moves.ts`, `rankings.ts`, `goCatalog.ts` e `goPokemonCore.ts` usam TTL de cache IndexedDB. Quando uma consulta ao Supabase é bem-sucedida, os serviços registram uma nova hora local de cache e retornam status `fresh`. Isso significa que a leitura do banco ocorreu agora; não significa que o provedor atualizou os dados recentemente.

Os serviços retornam cache vencido com status `offline` quando a consulta falha. A idade da origem precisa ser avaliada separadamente com `collected_at`, `source_updated_at`, saúde da fonte e política de validade específica do domínio.

**Ação:** manter o status de transporte/cache separado do status de frescor da fonte. Não usar o timestamp local de cache para rotular dados upstream como atualizados.

### 3. Proveniência dos stats GO não é separada da proveniência da forma — prioridade alta

`goPokemonCore.ts` carrega a proveniência da linha `pokemon_forms`, mas a relação `pokemon_go_stats` seleciona atualmente apenas `attack`, `defense`, `stamina` e `max_cp`. O schema de `pokemon_go_stats` tem seus próprios `source_id`, `source_url`, `collected_at`, `source_updated_at`, `data_version` e `confidence`, que podem diferir da origem da identidade da forma.

**Risco:** um consumidor pode atribuir aos stats a fonte e a data da forma, mesmo que os stats tenham sido obtidos de outro provedor ou em outro momento.

**Ação:** incluir proveniência própria dentro do objeto `stats` no modelo canônico e nos consumidores que exibirem esses valores. Não herdar silenciosamente a proveniência da forma.

### 4. Contratos de proveniência variam entre domínios — prioridade média

`moves.ts` carrega `source_id`, `source_url`, `collected_at`, `source_updated_at` e `data_version`. `goCatalog.ts` carrega esses metadados para eventos, temporadas e rotações. `rankings.ts` carrega origem, URL, coleta e versão, mas a tabela `battle_rankings` não possui atualmente `source_updated_at`.

**Ação:** manter os contratos explícitos por tabela e não prometer um campo que o schema não oferece. Se uma fonte de ranking fornecer data upstream confiável e o produto precisar dela, planejar migration específica antes de mapear o campo.

### 5. Saúde da fonte — parcialmente corrigida

`health.ts` agora usa `recordCount: number | null` e `recordCountStatus` com `available`, `not-tracked` ou `error`. Fontes que não têm contagem implementada não são mais apresentadas como zero, e falhas de consulta não são convertidas em zero.

**Limitação:** a contagem continua monitorada apenas para PokéAPI; isso não confirma a presença ou frescor dos registros dos provedores GO.

### 6. Confiança numérica arbitrária — corrigida no pipeline PokéAPI

A Edge Function atual não envia `confidence: 1` para espécies ou formas. Como a coluna é opcional, a ausência resulta em `NULL`. Não propagar confiança para domínios GO sem critérios específicos e documentados.

### 7. Histórico de alterações tem escopo limitado — prioridade média

A RPC atual compara campos de primeiro nível dos snapshots do catálogo PokéAPI. Isso não cria histórico para movimentos, rankings, eventos ou raids, pois esses domínios ainda não possuem ingestão ligada ao mecanismo.

**Ação:** reutilizar o mecanismo somente após definir identidade, versão e política de snapshot de cada domínio; não tratar o histórico atual como cobertura global.

### 8. Cache local não substitui carga inicial — prioridade alta

Os serviços criam cache após uma leitura bem-sucedida do Supabase. Não foi identificado bootstrap local completo dos dados GO nem fallback para um catálogo GO embarcado. Sem dados no banco e sem cache anterior, as páginas podem ficar vazias ou apresentar erro.

**Ação:** planejar carga inicial validada por domínio e testar primeiro uso, cache vencido, offline e banco vazio. Não fabricar registros para preencher a interface.

## Ordem recomendada de execução

1. Separar proveniência dos stats GO da proveniência da forma no modelo canônico.
2. Separar explicitamente status de cache/transporte e frescor da fonte nos serviços e interfaces.
3. Definir contratos e fixtures reais para provedores GO, começando por movimentos e stats.
4. Implementar ingestão server-side de movimentos e compatibilidade por forma, com testes e reconciliação.
5. Implementar ingestão de stats GO a partir de fonte apropriada, mantendo formas e variantes com identidade inequívoca.
6. Implementar eventos/temporadas e rotações de raid com horários, origem e coleta.
7. Implementar rankings PvE e PvP como domínios distintos, registrando parâmetros, formato e versão.
8. Criar bootstrap inicial, reconciliação, monitoramento e testes de falha/offline.
9. Auditar o Game/Simulator antes de conectar dados novos; preservar suas mecânicas até que o mapeamento esteja completo.

## Critérios para ativar qualquer fonte GO

- [ ] Termos, licença, atribuição e método de acesso revisados.
- [ ] Payload real e URL específica documentados.
- [ ] Fixture versionada e schema validado.
- [ ] Testes para campos ausentes, payload inválido, resposta vazia, rate limit e indisponibilidade.
- [ ] Idempotência e reconciliação de registros removidos/alterados.
- [ ] Proveniência e semântica de versão definidas por domínio.
- [ ] Cache e validade da origem separados.
- [ ] Teste de primeira carga e fallback offline.
- [ ] Interface não apresenta dado vencido como atualizado.

**Decisão:** manter todos os provedores comunitários GO desabilitados até que os critérios acima sejam atendidos. O próximo incremento de código deve separar a proveniência dos stats GO da proveniência da forma e, em seguida, tratar frescor de origem sem confundi-lo com o TTL do cache local.
