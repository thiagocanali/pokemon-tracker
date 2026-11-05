# Auditoria de cobertura dos dados de Pokémon GO

**Revisado em:** 2026-11-05  
**Escopo:** migrations versionadas, adaptadores de ingestão, serviços de leitura/cache e páginas de consulta.  
**Método:** inspeção estática do branch `main` após a integração do PR #43.  
**Limitação:** não houve conexão ao Supabase remoto, consulta às tabelas de produção ou execução de sincronização. A existência de uma tabela ou serviço de leitura não prova que existam registros nela.

## Resumo executivo

A infraestrutura de armazenamento e leitura está parcialmente preparada, mas a ingestão de dados específicos de Pokémon GO ainda não está implementada no repositório. O único pipeline de ingestão encontrado é `sync-pokemon-catalog`, que consome PokéAPI para catálogo geral da franquia.

Os serviços `moves.ts`, `rankings.ts` e `goCatalog.ts` consultam tabelas Supabase e mantêm cache IndexedDB, mas não importam dados de provedores externos. Portanto, são camadas de leitura/cache, não pipelines de atualização.

**Conclusão:** não habilitar nem anunciar dados GO como atualizados até implementar e validar adaptadores de ingestão apropriados.

## Matriz de cobertura observada

| Domínio | Estrutura no banco | Leitura no frontend | Ingestão no repositório | Situação |
|---|---|---|---|---|
| Catálogo geral / espécies / formas | `pokemon_species`, `pokemon_forms`, `pokemon_form_types`, `data_snapshots` | `service.ts` com Supabase, PokéAPI e cache local | `sync-pokemon-catalog` via PokéAPI | Implementado para catálogo geral; não é catálogo GO |
| Stats de Pokémon GO | `pokemon_go_stats` | Nenhum serviço de leitura GO identificado nesta auditoria | Nenhum adaptador identificado | Estrutura sem pipeline comprovado |
| Movimentos GO | `moves`, `pokemon_moves` | `moves.ts` e `MovesPage.vue` | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Rankings PvE/PvP | `battle_rankings`, `battle_ranking_moves` | `rankings.ts` e `CountersPage.vue` | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Eventos e temporadas | `events`, `seasons`, `event_forms` | `goCatalog.ts` e página de eventos | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Rotações de raids | `raid_rotations`, `raid_rotation_bosses` | `goCatalog.ts` e página de raids | Nenhum adaptador identificado | Leitura/cache; ingestão ausente |
| Evoluções | `evolutions` | Nenhum serviço GO identificado nesta auditoria | Nenhum adaptador identificado | Estrutura sem pipeline comprovado |
| Alterações de catálogo | `data_changes` | Não foi identificada interface de histórico | RPC acionada pelo sync da PokéAPI | Implementado somente no fluxo do catálogo geral |

## Fontes cadastradas

As migrations registram PokéMiners, Pokébattler, PvPoke, Leek Duck, Pokémon GO Hub e Pokémon GO API (community) como candidatas. As migrations explicitamente as deixam com `enabled = false` e `last_status = 'unavailable'`. O cadastro não é integração, e nenhuma delas deve ser apresentada como fonte sincronizada.

A PokéAPI permanece habilitada para catálogo geral, com limitação explícita no banco de que não fornece stats de combate, eventos, raids ou rankings específicos de Pokémon GO.

## Achados técnicos

### 1. Ingestão GO ausente — prioridade crítica

No código versionado, a Edge Function de ingestão encontrada é `sync-pokemon-catalog`, que chama PokéAPI e grava espécies, formas, tipos e snapshots do catálogo geral. Não foram encontrados adaptadores de ingestão para as tabelas `pokemon_go_stats`, `moves`, `pokemon_moves`, `battle_rankings`, `events`, `seasons` ou `raid_rotations`.

**Ação:** criar adaptadores separados por domínio, com contratos baseados em payloads reais e fixtures versionadas. Não ativar fontes apenas alterando `enabled`.

### 2. Serviços de movimentos e rankings são leitores — prioridade alta

`src/data/moves.ts` e `src/data/rankings.ts` consultam o Supabase, gravam resultados no IndexedDB e retornam cache vencido em caso de falha. Não fazem coleta do provedor nem validam a idade dos registros do banco antes de chamá-los de `fresh`. O TTL atual limita a idade do cache do navegador, não a idade do dado de origem.

**Ação:** separar `cache freshness` de `source freshness`; retornar e exibir `collected_at`, estado da fonte e validade por domínio. Uma resposta recém-consultada do banco não significa que o dado foi recentemente atualizado pelo provedor.

### 3. Eventos e raids não carregam proveniência suficiente no tipo de leitura — prioridade alta

`goCatalog.ts` seleciona `source_url`, mas os tipos de eventos, temporadas e rotações não incluem `source_id`, `collected_at`, `source_updated_at` ou `data_version`. Assim, a camada que alimenta as páginas não consegue apresentar integralmente a proveniência já prevista no schema.

**Ação:** ampliar os contratos e consultas para carregar a proveniência; mostrar fonte e momento da coleta nas telas. Manter fuso horário explícito para eventos.

### 4. Saúde da fonte pode confundir falha com zero — prioridade média

`health.ts` conta registros apenas para PokéAPI. Para outras fontes retorna zero; se a consulta de contagem falha, também retorna zero. Isso mistura “não aplicável”, “sem registros” e “falha de consulta”.

**Ação:** substituir `recordCount: number` por estado discriminado (por exemplo, contagem conhecida, não aplicável ou indisponível) e reportar erros sem convertê-los em zero.

### 5. Confiança numérica no pipeline PokéAPI — prioridade média

O pipeline envia `confidence: 1` para espécie e forma. O documento de política de fontes proíbe atribuir confiança numérica sem critérios documentados. A coleta direta da PokéAPI pode ser rastreável para identidade do catálogo, mas não equivale a confiança universal ou aplicável ao domínio GO.

**Ação:** remover o valor arbitrário ou documentar um critério específico e limitado ao domínio. Não propagar esse valor para dados de batalha.

### 6. Histórico de alterações tem escopo limitado — prioridade média

A RPC adicionada no PR #43 compara campos de primeiro nível do payload de snapshots da PokéAPI. Isso não cria histórico para movimentos, rankings, eventos ou raids, pois esses domínios ainda não possuem ingestão ligada à RPC.

**Ação:** reutilizar o mecanismo somente após definir identidade, versão e política de snapshot de cada domínio; não tratar o histórico atual como cobertura global.

### 7. Cache local não substitui carga inicial — prioridade alta

Os serviços criam cache após uma leitura bem-sucedida do Supabase. Não foi identificado bootstrap local completo dos dados GO nem fallback para um catálogo GO embarcado. Sem dados no banco e sem cache anterior, as páginas podem ficar vazias ou apresentar erro.

**Ação:** planejar carga inicial validada por domínio e testar primeiro uso, cache vencido, offline e banco vazio. Não fabricar registros para preencher a interface.

## Ordem recomendada de execução

1. Corrigir semântica de saúde/proveniência e remover confiança arbitrária do catálogo.
2. Definir contratos e fixtures reais para cada provedor GO, começando por movimentos e stats.
3. Implementar adaptador servidor para catálogo de movimentos e compatibilidade por forma, com testes e reconciliação.
4. Implementar stats GO a partir de fonte apropriada, mantendo formas e variantes com identidade inequívoca.
5. Implementar eventos/temporadas e rotações de raid com horários, origem e coleta.
6. Implementar rankings PvE e PvP como domínios distintos, registrando parâmetros, formato e versão.
7. Criar bootstrap inicial, reconciliação, monitoramento e testes de falha/offline.
8. Auditar o Game/Simulator antes de conectar dados novos; preservar suas mecânicas até que o mapeamento esteja completo.

## Critérios para ativar qualquer fonte GO

- [ ] Termos, licença, atribuição e método de acesso revisados.
- [ ] Payload real e URL específica documentados.
- [ ] Fixture versionada e schema validado.
- [ ] Testes para campos ausentes, payload inválido, resposta vazia, rate limit e indisponibilidade.
- [ ] Idempotência e reconciliação de registros removidos/alterados.
- [ ] Proveniência e semântica de versão definidas.
- [ ] Cache e validade da origem separados.
- [ ] Teste de primeira carga e fallback offline.
- [ ] Interface não apresenta dado vencido como atualizado.

**Decisão:** manter todos os provedores comunitários GO desabilitados até que os critérios acima sejam atendidos. O próximo incremento de código deve corrigir proveniência e saúde antes de iniciar ingestão de dados de combate.
