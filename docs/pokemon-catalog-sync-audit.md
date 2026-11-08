# Auditoria da sincronização do catálogo PokéAPI

**Revisado em:** 2026-11-07  
**Escopo:** função `supabase/functions/sync-pokemon-catalog/index.ts`, validação de entrada, migrations de sincronização, testes versionados e leitura de saúde das fontes.  
**Status:** diagnóstico estático do código versionado. Não houve execução contra o projeto Supabase, consulta ao banco de produção, aplicação de migrations ou sincronização real.

## Resumo executivo

A sincronização do catálogo geral da PokéAPI evoluiu desde a auditoria anterior. As gravações de cada Pokémon agora são transacionais via RPC; a finalização de execução/fonte também é atômica e idempotente; tipos são reconciliados; gravações concorrentes antigas são rejeitadas; e a função aplica retry limitado para falhas transitórias.

A integração continua restrita ao catálogo geral da franquia. Ela não fornece stats, movimentos, raids, eventos ou rankings específicos de Pokémon GO.

**Conclusão:** os principais riscos de consistência apontados na auditoria anterior foram corrigidos no código versionado. Ainda faltam validação runtime completa das respostas upstream, tratamento de `Retry-After`/jitter, testes de integração reais com PostgreSQL/Supabase e uma estratégia de versão que represente alterações upstream — não apenas a versão estática da API.

## Fluxo atual observado

1. Aceita apenas POST e exige o segredo `x-sync-secret`.
2. Valida JSON e paginação por `parseSyncPagination`; o lote padrão é 20 e o máximo é 25.
3. Cria um registro `sync_runs` com estado `running`.
4. Consulta a página `/pokemon` da PokéAPI e, sequencialmente, cada recurso Pokémon e sua espécie.
5. Persiste espécie, forma, tipos e snapshot por meio da RPC transacional `sync_pokemon_catalog_record`.
6. A RPC reconcilia o conjunto de tipos, serializa atualizações por espécie/snapshot e rejeita dados mais antigos que os já persistidos.
7. Finaliza execução e estado da fonte pela RPC `finish_pokemon_catalog_sync`.
8. Em falha, tenta registrar estado `failed` e retorna a mensagem de erro e eventual erro de finalização.

## Estado dos achados anteriores

| Achado anterior | Estado atual | Evidência no repositório |
|---|---|---|
| Gravações por Pokémon não atômicas | Corrigido no código | `202611040001_atomic_pokemon_catalog_sync.sql`: uma RPC transacional grava espécie, forma, tipos e snapshot |
| Finalização ignorava erros | Corrigido no código | A Edge Function verifica o erro da RPC de finalização; a RPC atualiza `sync_runs` e `data_sources` na mesma transação |
| Tipos antigos permaneciam | Corrigido no código | A RPC apaga os tipos da forma e insere o conjunto recebido na mesma transação |
| Ausência de retry | Parcialmente corrigido | Retry exponencial limitado para HTTP transitório e erros RPC transitórios; ainda não interpreta `Retry-After` nem adiciona jitter |
| Entrada/paginação pouco validada | Corrigido para o request | `validation.ts` rejeita JSON não-objeto, offset inválido e limite fora de 1–25 |
| Concorrência poderia sobrescrever dados novos | Corrigido no código | Migration `202611050002` usa advisory locks e rejeita timestamps anteriores |
| Confiança numérica arbitrária | Corrigido no payload atual | A Edge Function não envia `confidence: 1`; o banco recebe NULL quando ausente |
| Versão e proveniência upstream incompletas | Ainda pendente | `data_version` recebe o identificador estático `pokeapi-v2`; `source_updated_at` não é fornecido pela função |
| Histórico de alterações limitado | Parcialmente implementado | A RPC registra diferenças de primeiro nível no payload de Pokémon; não cobre outros domínios nem diffs aninhados |
| Contagem de saúde confundia erro com zero | Corrigido no contrato do frontend | `health.ts` distingue `available`, `not-tracked` e `error`; a contagem continua implementada apenas para PokéAPI |

## Achados técnicos remanescentes

### 1. Respostas upstream sem schema runtime completo — prioridade alta

A Edge Function tipa respostas da PokéAPI com interfaces TypeScript, mas faz cast do JSON sem validar em runtime campos obrigatórios, tipos, URLs ou relações. TypeScript não valida payload externo.

**Risco:** payload incompatível pode falhar no meio do lote ou persistir dados semanticamente incorretos.

**Próxima ação:** definir validadores pequenos e explícitos para listagem, Pokémon e espécie; rejeitar payload incompleto antes de chamar a RPC. Adicionar fixtures versionadas com casos válidos e inválidos.

### 2. Retry sem Retry-After e jitter — prioridade média

O retry HTTP cobre 408, 425, 429 e alguns 5xx, com backoff exponencial determinístico. Não respeita o cabeçalho `Retry-After` e não adiciona jitter.

**Risco:** execuções concorrentes podem repetir chamadas em sincronia e pressionar a fonte durante rate limiting.

**Próxima ação:** interpretar `Retry-After` (segundos ou data HTTP), limitar espera máxima e adicionar jitter com função injetável/testável. Manter o número de tentativas limitado.

### 3. Lote sequencial — prioridade média

Cada item é processado sequencialmente, com duas leituras adicionais e uma gravação RPC. Isso reduz concorrência e simplifica consistência, mas pode aumentar duração do lote.

**Risco:** timeout em lotes maiores ou fonte lenta.

**Próxima ação:** medir duração real antes de otimizar. Se necessário, introduzir concorrência limitada e manter o lock/transação por registro.

### 4. Semântica de versão upstream — prioridade média

O valor `pokeapi-v2` identifica a API utilizada, não uma revisão do dataset nem uma versão individual do recurso. A coleta tem timestamp, mas a função não recebe uma data upstream de atualização.

**Risco:** consumidores podem interpretar `data_version` como versão do conteúdo.

**Próxima ação:** documentar `data_version` como versão do contrato/API enquanto não houver versão upstream real; usar hash do payload para deduplicação/comparação de conteúdo se isso for necessário. Não preencher `source_updated_at` com `collected_at`.

### 5. Histórico de alterações de primeiro nível — prioridade baixa/média

A migration `202611050001` compara propriedades de primeiro nível do snapshot anterior e atual. Não gera diff para caminhos aninhados e não representa mudanças em movimentos, eventos ou outros domínios.

**Risco:** alterações internas de objetos podem aparecer como uma única substituição do objeto, e o histórico não é global.

**Próxima ação:** manter o escopo explícito; avaliar diff por JSON path apenas se uma tela de histórico realmente precisar dessa granularidade.

### 6. Testes de integração com banco — prioridade alta

Há testes Deno para paginação, identidade, proveniência, cache e fallback, mas a inspeção estática não comprova execução real das RPCs transacionais, locks, rejeição de dados antigos ou finalização idempotente contra PostgreSQL.

**Risco:** regressões SQL podem passar pelo typecheck/build sem serem exercitadas por um banco real.

**Próxima ação:** criar testes de integração com Supabase local/PostgreSQL para:
- rollback completo quando uma gravação de tipo ou snapshot falhar;
- reconciliação de slots de tipo;
- rejeição de timestamp antigo;
- serialização de duas gravações concorrentes da mesma espécie;
- repetição idempotente da finalização;
- rejeição de finalização conflitante.

Não executar migrations no projeto remoto como parte desses testes.

## O que está correto ou foi confirmado

- A Edge Function exige segredo e usa service role apenas no servidor.
- A paginação é limitada e validada antes de iniciar a execução.
- A identidade de recurso/formulário permanece separada da identidade de espécie.
- Cada registro é persistido por RPC transacional.
- Tipos são substituídos como conjunto, evitando slots obsoletos.
- Locks e timestamps impedem que uma coleta antiga sobrescreva um registro mais novo.
- A finalização atualiza execução e saúde da fonte atomicamente e é idempotente para o mesmo resultado.
- A função não envia confiança numérica arbitrária.
- O frontend diferencia contagem disponível, não monitorada e falha de consulta.
- O schema mantém stats GO, movimentos, rankings, raids e eventos separados do catálogo geral.

## Limitações desta auditoria

- Não foi confirmada a aplicação das migrations no Supabase remoto.
- Não foram consultados dados reais, logs, secrets ou agendamentos de produção.
- Não foi executado lote de sincronização contra PokéAPI/Supabase.
- Testes unitários versionados não substituem testes de integração das RPCs PostgreSQL.

## Próxima ordem recomendada

1. Adicionar validação runtime e fixtures para as três respostas PokéAPI.
2. Cobrir RPCs transacionais e concorrência com testes de integração locais.
3. Melhorar retry com `Retry-After` e jitter.
4. Documentar formalmente o significado de `data_version`.
5. Só então avaliar otimização de concorrência do lote.

**Decisão:** manter a integração PokéAPI restrita ao catálogo geral. Não ativar fontes de Pokémon GO nem usar PokéAPI para preencher dados de batalha. A próxima implementação deve começar pelos validadores runtime e fixtures, sem tocar no Supabase remoto.
