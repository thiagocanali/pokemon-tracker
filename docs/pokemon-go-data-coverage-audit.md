# Auditoria de cobertura dos dados de Pokémon GO

**Revisado em:** 2026-11-08  
**Escopo:** migrations versionadas, Edge Functions de ingestão, serviços de leitura/cache, proveniência e páginas de consulta.  
**Método:** inspeção estática do branch `main` após os PRs #59–#69.  
**Limitação:** não houve conexão ao Supabase remoto, consulta às tabelas de produção ou execução de sincronização. A existência de tabela, serviço ou tela não prova que existam registros válidos nela.

## Resumo executivo

A infraestrutura de leitura GO evoluiu: existe agora um modelo canônico de leitura para espécies/formas/stats em `goPokemonCore.ts`; movimentos, rankings, eventos, temporadas e raids também têm serviços de leitura/cache. Os contratos de eventos/temporadas/raids já carregam metadados de proveniência, e a saúde das fontes distingue contagem disponível, não monitorada e erro.

A ingestão de dados específicos de Pokémon GO continua ausente. O único pipeline encontrado é `sync-pokemon-catalog`, que consome PokéAPI para o catálogo geral da franquia. Não há adaptadores ativos para stats GO, movimentos, rankings, eventos ou raids.

**Conclusão:** a leitura está mais estruturada, mas o banco ainda depende de ingestão externa que não foi implementada. Não habilitar provedores comunitários nem anunciar dados GO como atualizados até validar payloads, termos, proveniência e pipelines por domínio.

## Matriz de cobertura observada

| Domínio | Estrutura no banco | Leitura no frontend | Ingestão no repositório | Situação |
|---|---|---|---|---|
| Catálogo geral / espécies / formas | `pokemon_species`, `pokemon_forms`, `pokemon_form_types`, `data_snapshots` | `service.ts` com Supabase, PokéAPI e cache local | `sync-pokemon-catalog` via PokéAPI | Implementado para catálogo geral; não é catálogo GO |
| Stats de Pokémon GO | `pokemon_go_stats` | `goPokemonCore.ts` consulta stats junto das formas e mapeia ataque/defesa/stamina/CP máximo | Nenhum adaptador GO identificado | Leitura implementada; ingestão ausente; proveniência dos stats separada da forma; frescor de origem exposto separadamente do cache |
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

### 2. Cache freshness separado de source freshness — implementado

`moves.ts`, `rankings.ts`, `goCatalog.ts` e `goPokemonCore.ts` usam TTL de cache IndexedDB. Quando uma consulta ao Supabase é bem-sucedida, os serviços registram uma nova hora local de cache e retornam status `fresh`. Isso significa que a leitura do banco ocorreu agora; não significa que o provedor atualizou os dados recentemente.

`status` e `cachedAt` descrevem o transporte/cache local: `fresh` significa que a leitura do Supabase foi concluída, `cached` que o TTL local foi atendido e `offline` que foi usado o último valor local após falha. Nenhum desses estados, isoladamente, comprova atualização upstream.

O PR #69 adicionou `getSourceFreshness`, que avalia os timestamps `source_updated_at` dos registros e mantém `collected_at` apenas como horário de coleta. Os serviços expõem esse resultado separadamente. A política usa a data upstream mais antiga do conjunto para evitar que um único registro recente esconda registros antigos. Se algum registro não tiver timestamp upstream válido, se o conjunto estiver vazio ou se a data estiver no futuro, o resultado é `unknown`, nunca `fresh` por causa de uma leitura/cache recente. As janelas configuradas são 7 dias para moves/rankings, 24 horas para eventos/temporadas, 6 horas para raids e 30 dias para identidade/stats do núcleo GO. Essas janelas são políticas locais de alerta, não garantias dos provedores.

**Limitação importante:** `battle_rankings` não possui `source_updated_at`; portanto, rankings permanecem `unknown` mesmo quando consultados agora. A tabela de moves, eventos, temporadas, raids e núcleo GO possui timestamps upstream por registro, mas só poderá retornar `fresh` quando todos os registros do resultado tiverem datas válidas dentro da janela.

### 3. Proveniência dos stats GO separada da proveniência da forma — implementado

`goPokemonCore.ts` carrega a proveniência da linha `pokemon_forms` e, separadamente, a proveniência da relação `pokemon_go_stats`: `source_id`, `source_url`, `collected_at`, `source_updated_at`, `data_version` e `confidence`. O modelo canônico expõe os metadados dos stats dentro de `stats.provenance`, sem herdar os metadados da forma. O PR #68 implementou essa separação; o PR #69 também expõe `statsSourceFreshness` separadamente de `sourceFreshness` da identidade da forma.

**Limitação:** a separação de proveniência no modelo de leitura não significa que existam registros de stats no banco nem que exista ingestão GO. A carga continua ausente e não foi verificada no Supabase remoto.

### 4. Contratos de proveniência variam entre domínios — prioridade média

`moves.ts` carrega `source_id`, `source_url`, `collected_at`, `source_updated_at` e `data_version`. `goCatalog.ts` carrega esses metadados para eventos, temporadas e rotações. `goPokemonCore.ts` mantém proveniência distinta para forma e stats. `rankings.ts` carrega origem, URL, coleta e versão, mas a tabela `battle_rankings` não possui atualmente `source_updated_at`; por isso o frescor upstream de rankings não pode ser confirmado.

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

1. Definir contratos e fixtures reais para provedores GO, começando por movimentos e stats.
2. Implementar ingestão server-side de movimentos e compatibilidade por forma, com testes e reconciliação.
3. Implementar ingestão de stats GO a partir de fonte apropriada, mantendo formas e variantes com identidade inequívoca.
4. Implementar eventos/temporadas e rotações de raid com horários, origem e coleta.
5. Implementar rankings PvE e PvP como domínios distintos, registrando parâmetros, formato e versão.
6. Criar bootstrap inicial, reconciliação, monitoramento e testes de falha/offline.
7. Auditar o Game/Simulator antes de conectar dados novos; preservar suas mecânicas até que o mapeamento esteja completo.

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

**Decisão:** manter todos os provedores comunitários GO desabilitados até que os critérios acima sejam atendidos. Proveniência independente dos stats e separação entre cache/source freshness já estão implementadas. O próximo incremento deve trabalhar com payloads reais e contratos de ingestão, sem ativar fontes por configuração isolada.
