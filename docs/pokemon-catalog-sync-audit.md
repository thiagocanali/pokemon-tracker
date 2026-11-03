# Auditoria da sincronização do catálogo PokéAPI

**Revisado em:** 2026-11-03  
**Escopo:** função `supabase/functions/sync-pokemon-catalog/index.ts`, migrations da plataforma de dados e leitura de saúde das fontes.  
**Status:** diagnóstico estático do código versionado. Não houve execução contra o projeto Supabase, consulta ao banco de produção ou aplicação de migrations.

## Resumo executivo

A função atual é adequada como primeira carga em lotes pequenos, mas ainda não oferece garantias suficientes para ser considerada um pipeline robusto de sincronização. O maior risco não é a leitura da PokéAPI: é a consistência entre as quatro gravações por registro e a atualização dos metadados de execução.

A integração permanece corretamente limitada ao catálogo geral da franquia. Os registros de PokéAPI não devem ser interpretados como dados específicos de Pokémon GO.

## Fluxo observado

1. Aceita apenas POST e exige o segredo `x-sync-secret`.
2. Lê `offset` e `limit`; limita o lote a 25 recursos.
3. Cria um registro `sync_runs` com estado `running`.
4. Consulta a página `/pokemon` da PokéAPI.
5. Para cada item, consulta o recurso Pokémon e sua espécie.
6. Faz upsert em `pokemon_species`, `pokemon_forms`, `pokemon_form_types` e `data_snapshots`.
7. Marca a execução como concluída e a fonte como atualizada; em exceção, marca a execução como falha e a fonte como offline.

## Achados

### Alta prioridade

#### 1. Gravações por Pokémon não são atômicas

As quatro gravações são requisições independentes. Uma falha em `pokemon_form_types` ou `data_snapshots`, por exemplo, pode deixar espécie e forma persistidas sem o snapshot correspondente. O contador `records_written` só aumenta após as quatro operações, mas não desfaz as gravações parciais.

**Impacto:** estado parcialmente sincronizado e difícil de distinguir de um registro completo.

**Recomendação:** mover a persistência de cada registro (ou do lote) para uma função PostgreSQL/RPC transacional, ou introduzir uma estratégia explícita de staging e promoção. Não tratar apenas o contador como garantia de atomicidade.

#### 2. Erros ao atualizar o estado final são ignorados

Os resultados das operações de update em `sync_runs` e `data_sources` não são verificados, tanto no caminho de sucesso quanto no de falha. A função pode responder `succeeded` mesmo que o registro de execução não tenha sido finalizado ou que a fonte não tenha recebido o novo status.

**Impacto:** painel de saúde pode divergir do resultado real da sincronização; execução pode ficar presa em `running`.

**Recomendação:** verificar os dois retornos e registrar claramente falha de finalização. Considerar uma rotina de reconciliação para execuções antigas em `running`.

### Média prioridade

#### 3. Tipos da forma não são reconciliados

O `upsert` em `pokemon_form_types` insere/atualiza os tipos recebidos, mas não remove slots que tenham deixado de existir. Uma alteração de dois tipos para um pode deixar um tipo secundário antigo no banco.

**Impacto:** composição de tipos persistida pode não refletir o payload mais recente.

**Recomendação:** substituir o conjunto de tipos da forma em operação transacional (delete + insert), ou reconciliar explicitamente os slots ausentes.

#### 4. Ausência de retry/backoff para falhas transitórias

A função interrompe o lote no primeiro HTTP não-2xx ou exceção de rede. Não há retry para 429, 5xx ou falhas transitórias, nem tratamento explícito de `Retry-After`.

**Impacto:** um problema temporário pode interromper um lote e exigir nova chamada manual.

**Recomendação:** implementar retry limitado com backoff exponencial e jitter, respeitando `Retry-After`; não repetir erros permanentes 4xx (exceto 429).

#### 5. Lote sequencial e potencialmente lento

Cada Pokémon requer três leituras HTTP (listagem, recurso e espécie) e quatro gravações, executadas sequencialmente. Um lote de 25 pode gerar muitas chamadas em série.

**Impacto:** maior latência e maior exposição a timeout/limites da função.

**Recomendação:** medir duração real antes de paralelizar. Se necessário, usar concorrência limitada para leituras e persistência transacional, preservando limites do provedor.

#### 6. Validação de entrada e resposta da fonte é mínima

O código normaliza `offset` e `limit`, mas não valida explicitamente o formato do JSON, limites máximos do offset, formato dos itens retornados ou campos obrigatórios antes das gravações.

**Impacto:** payload inesperado pode provocar falha no meio do lote. A conversão numérica também aceita valores como strings numéricas.

**Recomendação:** validar request e respostas com schema runtime (por exemplo, validação manual estruturada ou biblioteca pequena), retornando erro 400 para entrada inválida.

### Baixa prioridade / melhoria de rastreabilidade

#### 7. Snapshot versionado por instante de coleta

`version` recebe `collectedAt`, gerado uma vez por lote. Assim, toda repetição do mesmo Pokémon em outro lote/execução cria uma nova versão, mesmo sem mudança no conteúdo.

**Impacto:** snapshots representam coletas, não necessariamente mudanças de conteúdo; volume cresce em cada sincronização completa.

**Recomendação:** definir formalmente se `version` significa versão da fonte, hash do payload ou identificador de coleta. Para histórico de coleta, manter `captured_at`; para deduplicação de conteúdo, usar hash/versionamento separado.

#### 8. Campos de confiança e atualização da origem

A função grava `confidence: 1` e não preenche `source_updated_at` ou `data_version`. O valor 1 pode ser interpretado como confiança absoluta, embora represente apenas ingestão direta de uma fonte para o escopo limitado dela.

**Impacto:** metadados sugerem precisão que não foi metodologicamente avaliada.

**Recomendação:** não usar confiança numérica sem critério documentado; registrar versão/hash da resposta quando viável e diferenciar data de coleta de data de atualização upstream.

#### 9. Classificação de formas

A regra atual classifica como `standard` apenas quando `pokemon.name === species.name`; as demais formas viram `other`. É conservadora e evita afirmar que uma forma é Mega, Shadow, Purified, regional ou costume sem evidência adequada.

**Impacto:** classificação é genérica, não necessariamente semanticamente completa.

**Recomendação:** manter `other` até existir fonte e regra verificável para classificar cada variante. Não inferir categorias específicas de Pokémon GO a partir da PokéAPI.

#### 10. Contagem no painel de saúde

`getDataSourceHealth` conta espécies por `source_id`, mas converte erro de contagem em zero. O zero pode ser exibido como se não houvesse registros, sem distinguir falha de consulta. As fontes que não são PokéAPI também recebem contagem zero por definição.

**Impacto:** número zero é ambíguo entre ausência de dados, fonte não aplicável e falha de leitura.

**Recomendação:** modelar contagem como desconhecida/indisponível em caso de erro e explicitar quando uma métrica não se aplica à fonte.

## O que está correto ou foi confirmado

- A função exige segredo de sincronização e usa a service role somente no ambiente da Edge Function.
- O lote é limitado a 25 recursos.
- A chave `form-{pokemon.id}` mantém a identidade do recurso/formulário da PokéAPI separada da espécie.
- A espécie usa o número e slug do recurso `pokemon-species`.
- O catálogo de tipos tem chaves compatíveis com os 18 tipos listados na migration.
- A migration impõe no máximo uma forma padrão por espécie.
- O schema separa `pokemon_go_stats`, movimentos, rankings, raids e eventos do catálogo geral.
- A política de fontes já proíbe tratar PokéAPI como fonte de stats/movesets de Pokémon GO.

## Limitações desta auditoria

- Não foi possível confirmar a aplicação das migrations no Supabase remoto.
- Não foram consultados dados reais das tabelas, logs da Edge Function, secrets ou configurações de agendamento.
- Não foi executado um lote de sincronização contra PokéAPI ou Supabase.
- O workflow de CI executa typecheck e build, mas não há script ou framework de testes automatizados no `package.json`.

## Ordem recomendada de correção

1. Garantir atomicidade das gravações por registro e validar erros de finalização.
2. Reconciliar os tipos da forma sem deixar dados obsoletos.
3. Adicionar validação de entrada/respostas e retry limitado.
4. Definir semântica de `version`, confiança e proveniência.
5. Ajustar o painel para distinguir zero, não aplicável e erro.
6. Criar testes com fixtures para mapeamento, reexecução, falha parcial e reconciliação.

**Decisão:** não habilitar novas fontes de Pokémon GO nem avançar para ingestão de rankings/raids até que os itens de alta prioridade estejam resolvidos e os testes com fixtures estejam estabelecidos.
