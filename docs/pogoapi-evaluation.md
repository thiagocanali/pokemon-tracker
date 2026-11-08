# Avaliação técnica — PoGoAPI (pogoapi.net)

**Estado: candidato documentado, ainda não integrado.** Esta revisão capturou respostas JSON reais dos endpoints públicos em 2026-11-08 e comparou-as com a documentação pública. Não habilita sincronização, não grava dados no Supabase e não autoriza redistribuição dos dados.

## Identificação e escopo

- Serviço: [PoGoAPI](https://pogoapi.net/)
- Documentação: [API Documentation](https://pogoapi.net/documentation/)
- Avisos legais: [Legal Notices](https://pogoapi.net/Legal/)
- Base: `https://pogoapi.net/api/v1/`
- Formato: arquivos JSON estáticos por domínio.
- A documentação recomenda cache local e fornece `api_hashes.json` para comparar versões dos arquivos sem baixar todos os datasets a cada verificação.
- A documentação consultada não declara SLA, política de rate limit, licença aberta para os datasets nem timestamp upstream por arquivo.

## Payloads reais observados

Em 2026-11-08, foram abertas respostas JSON reais, não exemplos copiados da documentação:

| Endpoint | Estrutura observada | Possível domínio |
|---|---|---|
| `pokemon_stats.json` | Array com `pokemon_id`, `pokemon_name`, `form`, `base_attack`, `base_defense`, `base_stamina` | Stats GO por espécie/forma |
| `fast_moves.json` | Array com `move_id`, `name`, `type`, `power`, `energy_delta`, `duration`, `stamina_loss_scaler` | Moves PvE |
| `charged_moves.json` | Documentado com `name`, `type`, `power`, `duration`, `energy_delta` e campos opcionais | Moves PvE |
| `pvp_fast_moves.json` | Documentado com `move_id`, `name`, `type`, `power`, `energy_delta`, `turn_duration` | Moves PvP |
| `pvp_charged_moves.json` | Documentado com `move_id`, `name`, `type`, `power`, `energy_delta`, `turn_duration` e buffs opcionais | Moves PvP |
| `current_pokemon_moves.json` | Documentado com ID/nome/forma e listas separadas de moves normais e Elite/legacy | Compatibilidade de moves por forma |
| `api_hashes.json` | Manifesto com caminho e hashes MD5, SHA-1 e SHA-256 por arquivo | Detecção de alteração do dataset |

**Limite da captura:** nesta etapa, a resposta integral de `pokemon_stats.json`, `fast_moves.json` e `api_hashes.json` foi acessível. Os endpoints de charged moves e current moves foram confirmados na documentação, mas a ferramenta de inspeção não conseguiu abrir seus corpos diretamente. Não registrar como payload real validado aquilo que só foi documentado.

### Identidade e formas

A chave de identidade observada é composta por `pokemon_id` e `form`; `pokemon_name` é rótulo, não chave. Não reduzir registros a um único registro por Pokédex nacional. A mesma espécie pode possuir múltiplas formas com stats diferentes ou repetidos. A reconciliação com `pokemon_forms` precisa de mapeamento explícito, normalização de nomes de forma e relatório de colisões/desconhecidos. Não criar slug automaticamente e assumir equivalência sem revisão.

### PvE e PvP são contratos diferentes

A API separa arquivos de movimentos PvE e PvP. Não mesclar `duration` com `turn_duration`, nem tratar `energy_delta` ou `power` como equivalentes sem preservar o domínio. A compatibilidade por Pokémon também precisa distinguir movimentos Elite/legacy dos movimentos normalmente disponíveis. Este dataset não fornece simulação completa de raid, DPS/TDO observados, ranking PvP ou rotação atual de raids por si só.

## Versão, frescor e detecção de mudanças

- `api_hashes.json` publica hashes SHA-256 de cada arquivo. O hash é uma impressão digital do conteúdo observado e pode ser registrado em `data_version` com escopo explícito, por exemplo `sha256:<hash do arquivo>`.
- Hash diferente significa que o arquivo mudou; não informa quando a mudança foi publicada nem quais registros mudaram.
- A documentação não apresenta timestamp upstream confiável para cada arquivo. Portanto, `source_updated_at` deve permanecer `NULL`; `collected_at` registra somente a coleta local.
- O manifesto permite consultar primeiro os hashes e baixar apenas os arquivos alterados, em linha com a recomendação de cache da própria fonte.
- Calcular e comparar hash do arquivo bruto, não de uma versão normalizada, e guardar o escopo do hash. Não tratar MD5/SHA-1 como versão; preferir SHA-256.
- Mudança de hash deve iniciar coleta/validação, não sobrescrever automaticamente dados de produção. Registrar contagens, falhas, diferenças e itens removidos.

## Direitos, atribuição e limitações

O aviso legal da PoGoAPI afirma que as informações são fornecidas sob uma cláusula de fair use, sem endosso da The Pokémon Company, e como estão. O rodapé declara © 2026 PoGo API. Isso **não equivale a uma licença aberta** nem esclarece de forma suficiente redistribuição comercial, persistência de cópias integrais, criação de derivados ou atribuição exigida. O conteúdo Pokémon GO também envolve direitos de terceiros.

Antes de publicar ou persistir dados derivados, pedir esclarecimento ao mantenedor sobre:
1. uso em aplicação pública e comercial;
2. armazenamento permanente de cópias e snapshots;
3. redistribuição de campos normalizados/derivados;
4. atribuição/formato de crédito exigido;
5. limites de requisição e expectativa de disponibilidade.

Não inferir autorização a partir do fato de endpoints serem públicos ou de a documentação recomendar cache.

Outras limitações:
- A documentação avisa que dados podem ficar desatualizados rapidamente.
- Alguns dados possuem limitações expressas: por exemplo, o endpoint de CP multipliers documenta valores interpolados/estimados em determinados níveis; encounter rates removidos pelo jogo são representados por valores sentinela.
- A origem de cada arquivo pode variar; confirmar metodologia e proveniência por domínio antes de atribuir todos os dados diretamente ao Game Master.
- A documentação contém descrições e exemplos que podem divergir do payload corrente; o parser deve ser baseado em amostras reais versionadas.

## Auditoria do manifesto vivo (2026-11-08)

A leitura direta de `https://pogoapi.net/api/v1/api_hashes.json` confirmou um manifesto JSON com **47 arquivos** e campos `api_filename`, `full_path`, `hash_md5`, `hash_sha1` e `hash_sha256`. O manifesto é uma fotografia do momento da consulta, não uma versão permanente da fonte.

### Inventário por domínio

- **Identidade, formas e disponibilidade:** `pokemon_names`, `pokemon_stats`, `pokemon_forms`, `pokemon_types`, `pokemon_generations`, `released_pokemon`, `alolan_pokemon`, `galarian_pokemon`, `shadow_pokemon`, `mega_pokemon`, `baby_pokemon`.
- **Movimentos e compatibilidade:** `fast_moves`, `charged_moves`, `pvp_fast_moves`, `pvp_charged_moves`, `current_pokemon_moves`.
- **PvP e recompensas:** `gobattle_league_rewards`, `gobattle_ranking_settings`, `pvp_exclusive_pokemon`.
- **Raids:** `raid_bosses`, `raid_exclusive_pokemon`, `raid_settings`.
- **Shiny e encontros:** `shiny_pokemon`, `time_limited_shiny_pokemon`, `photobomb_exclusive_pokemon`, `research_task_exclusive_pokemon`, `nesting_pokemon`, `possible_ditto_pokemon`, `pokemon_encounter_data`, `pokemon_rarity`.
- **Mecânicas e progressão:** `cp_multiplier`, `pokemon_max_cp`, `pokemon_powerup_requirements`, `pokemon_candy_to_evolve`, `pokemon_evolutions`, `pokemon_buddy_distances`, `pokemon_height_weight_scale`, `pokemon_genders`, `pokemon_language_categories`, `player_xp_requirements`, `levelup_rewards`, `friendship_level_settings`, `mega_evolution_settings`, `type_effectiveness`, `weather_boosts`, `badges`, `community_days`.

O manifesto amplia a cobertura potencial além de stats e movimentos, mas **não prova que todos os endpoints têm qualidade, atualização, licença ou semântica adequadas**. Eventos e rotações, por exemplo, precisam de validação temporal independente antes de aparecerem como atuais no app.

### Hashes observados para os primeiros domínios

| Arquivo | SHA-256 observado em 2026-11-08 |
|---|---|
| `pokemon_stats.json` | `5d5ac4679d0c9acc3d2ba0d0b520be18326ffc2bdb5fbc5dbc03848ca911ebd1` |
| `fast_moves.json` | `68c034fe21d53aad75974993623a6e943a9b975ab6d39792d07e5f66cddfc43f` |
| `charged_moves.json` | `102575f0bbb187cec9f1a8c4cd3c05995d77da90c770f0cc39af946bbfc94ffc` |
| `current_pokemon_moves.json` | `661b6a7347b5000a862379888a3750625f8430bea3be54547f06491d8f4d4462` |
| `pvp_fast_moves.json` | `0b3921f424d42adef758cfc5b249cab9f96dae420a9318cea5bdabb67d32877c` |
| `pvp_charged_moves.json` | `dde3ebc9f45389dbdc1a58533ac627845b638c897b1a214807e22b07b4d7c46a` |

Esses hashes são referências históricas da observação, não devem ser hardcoded como hashes esperados para sempre. O consumidor deverá consultar o manifesto e comparar com o hash previamente registrado.

### O que a inspeção direta confirmou

- `pokemon_stats.json` é uma lista de objetos com `pokemon_id`, `pokemon_name`, `form`, `base_attack`, `base_defense`, `base_stamina`. A amostra mostra múltiplas formas para o mesmo ID, reforçando a chave composta.
- `fast_moves.json` é uma lista com `move_id`, `name`, `type`, `power`, `energy_delta`, `duration` e `stamina_loss_scaler`.
- O manifesto enumera os arquivos de charged moves, compatibilidade e PvP, mas sua presença **não substitui a inspeção dos corpos JSON** desses endpoints.
- A captura foi leitura pública pontual pelo navegador; nenhum dado foi gravado no repositório ou no Supabase.

## Adequação ao PokéLab

| Domínio do produto | Adequação preliminar | Observação |
|---|---|---|
| Stats GO e formas | Alta, candidata | Payload real visto; exige chave composta e reconciliação de formas |
| Moves PvE | Alta, candidata | Separar fast/charged; payload real de fast moves visto |
| Moves PvP | Alta, candidata | Contratos separados; turnos e buffs específicos |
| Compatibilidade de moves | Alta, candidata | Distinguir Elite/legacy e forma |
| CP e multiplicadores | Média | Conferir regras/limitações e testar cálculos independentes |
| Evoluções, shiny e disponibilidade | Média | Conteúdo contextual e sujeito a mudanças; validar origem e atualidade |
| Eventos, raids e rankings | Não assumir cobertura | Não são substitutos de Leek Duck, fontes oficiais ou simulação Pokébattler |

## Plano de integração — somente após liberação

1. Obter resposta do mantenedor sobre os direitos de uso e as condições de acesso.
2. Capturar, com baixa frequência, amostras brutas pequenas e completas de stats, fast/charged moves e current moves; guardar URL, horário, SHA-256 e manifesto associado.
3. Confirmar o contrato real e criar fixtures versionadas sem misturar exemplos da documentação com payload observado.
4. Implementar schemas runtime estritos, permitindo campos opcionais documentados e rejeitando tipos/identidades inválidos.
5. Mapear `pokemon_id + form` para IDs canônicos internos com tabela de correspondência explícita e relatório de órfãos/colisões.
6. Implementar reconciliação idempotente e detecção de remoções; não ativar ingestão automática por mudança de hash.
7. Testar payload vazio, truncado, tipo inválido, campo opcional ausente, forma desconhecida, hash inalterado/alterado, indisponibilidade e falha parcial.
8. Manter adaptador desabilitado até concluir revisão de direitos, atribuição, testes, primeira carga e fallback offline.

## Decisão

**PoGoAPI é, tecnicamente, a candidata mais promissora encontrada até aqui para iniciar stats/forms e moves GO**, porque oferece endpoints por domínio, documentação explícita de hashes e respostas JSON reais acessíveis. Ainda assim, não é uma fonte oficial do jogo e seu aviso legal não concede uma licença aberta clara. Manter desabilitada: nenhuma fixture de dados do jogo foi adicionada, nenhuma ingestão foi criada e nenhuma operação Supabase remota foi executada.

Referências:
- [Documentação da API](https://pogoapi.net/documentation/)
- [Manifesto de hashes](https://pogoapi.net/api/v1/api_hashes.json)
- [Stats GO](https://pogoapi.net/api/v1/pokemon_stats.json)
- [Fast moves PvE](https://pogoapi.net/api/v1/fast_moves.json)
- [Avisos legais](https://pogoapi.net/Legal/)


## Segunda inspeção de contratos reais (2026-11-08)

A inspeção adicional conseguiu abrir diretamente dois endpoints que não estavam descritos como payloads observados na primeira revisão:

| Endpoint | Estrutura observada | Observações e limites |
|---|---|---|
| `shiny_pokemon.json` | Objeto JSON indexado por ID em string; cada valor inclui `id`, `name` e flags booleanas `found_egg`, `found_evolution`, `found_photobomb`, `found_raid`, `found_research`, `found_wild` | Alguns registros também incluem flags de forma, como `alolan_shiny`. Não representa calendário de liberação nem garante disponibilidade atual em todos os encontros. |
| `pokemon_evolutions.json` | Array de espécies/formas de origem; cada registro tem `pokemon_id`, `pokemon_name`, `form` e array `evolutions` | Cada evolução observada inclui `pokemon_id`, `pokemon_name`, `form` e `candy_required`. O payload visto não prova cobertura de todos os requisitos especiais, itens, condições ou caminhos alternativos. |

### Consequências para o modelo

- Shiny deve ser modelado como disponibilidade contextual por método de encontro, e não como um booleano único por espécie.
- A presença de flags como `found_wild` não prova que o Pokémon esteja atualmente disponível na natureza; é necessário separar possibilidade histórica/geral de rotação vigente.
- A identidade de evolução também inclui forma de origem e forma de destino. Não inferir que toda evolução compartilha a forma ou que o custo de Candy é o único requisito.
- Campos opcionais de forma devem ser preservados sem assumir que o conjunto de flags é exaustivo.
- Antes de transformar esses payloads em fonte canônica, validar consistência referencial, ciclos, destinos ausentes, duplicatas e requisitos especiais em relação a outra fonte confiável.

### Endpoints ainda não validados por inspeção direta

Nesta rodada, as tentativas de abrir diretamente `charged_moves.json`, `pvp_fast_moves.json`, `pvp_charged_moves.json`, `current_pokemon_moves.json`, `pokemon_forms.json` e `raid_bosses.json` não retornaram seus corpos JSON pela ferramenta de inspeção. Permanecem como contratos documentados/listados no manifesto, não como payloads reais validados. Não criar schemas de produção com base apenas nos nomes de arquivo ou em exemplos documentais.

Referências dos payloads observados:
- [Shiny Pokémon](https://pogoapi.net/api/v1/shiny_pokemon.json)
- [Evoluções](https://pogoapi.net/api/v1/pokemon_evolutions.json)


## Contratos documentados de movimentos e compatibilidade (2026-11-08)

Esta seção registra o contrato descrito na [documentação pública da PoGoAPI](https://pogoapi.net/documentation/). **Os campos abaixo são contratos documentados, não payloads integralmente inspecionados nesta auditoria.** Não usar esta descrição como substituta de fixtures capturadas e validadas antes de implementar parsers de produção.

### Moves PvE

A documentação descreve `charged_moves.json` como uma lista de movimentos carregados com campos como `name`, `type`, `power`, `duration` e `energy_delta`. Também documenta campos opcionais, incluindo `critical_chance` e `heal_scalar`. A presença, nulabilidade e semântica exata de cada campo devem ser confirmadas em amostras reais antes de fixar o schema runtime.

`fast_moves.json` já teve seu corpo inspecionado diretamente nesta avaliação; nele foram observados `move_id`, `name`, `type`, `power`, `energy_delta`, `duration` e `stamina_loss_scaler`.

### Moves PvP — domínio separado

A documentação descreve `pvp_fast_moves.json` com `move_id`, `name`, `type`, `power`, `energy_delta` e `turn_duration`.

`pvp_charged_moves.json` documenta campos básicos equivalentes e um campo opcional `buffs`. A estrutura de buffs inclui `activation_chance` e alterações opcionais de estágios de atributos, como `target_defense_stat_stage_change`, `attacker_attack_stat_stage_change`, `target_attack_stat_stage_change` e `attacker_defense_stat_stage_change`.

Não converter `turn_duration` em `duration` nem misturar esses registros com movimentos PvE. Buffs/debuffs devem permanecer estruturados e opcionais; ausência do campo não equivale a um efeito neutro explicitamente observado.

### Compatibilidade por Pokémon e formas

A documentação descreve `current_pokemon_moves.json` como registros por Pokémon com `pokemon_id`, `pokemon_name` e forma opcional (`form`), acompanhados de listas separadas de `fast_moves`, `charged_moves`, `elite_fast_moves` e `elite_charged_moves`. As listas Elite/legacy não devem ser fundidas com o conjunto normalmente disponível: preservar a distinção no modelo e na interface.

`pokemon_forms.json` é descrito como uma lista de strings de nomes de formas. Essa lista pode auxiliar a validação de rótulos, mas não constitui por si só um mapeamento canônico entre forma, espécie e variante interna. A chave composta `pokemon_id + form` observada em stats continua necessária, com tratamento explícito de forma ausente e normalização revisável.

### Estado da evidência

| Arquivo | Estado nesta auditoria |
|---|---|
| `fast_moves.json` | Corpo JSON inspecionado diretamente |
| `charged_moves.json` | Contrato documentado; corpo não validado nesta auditoria |
| `pvp_fast_moves.json` | Contrato documentado; corpo não validado nesta auditoria |
| `pvp_charged_moves.json` | Contrato documentado; corpo não validado nesta auditoria |
| `current_pokemon_moves.json` | Contrato documentado; corpo não validado nesta auditoria |
| `pokemon_forms.json` | Contrato documentado; corpo não validado nesta auditoria |

### Próxima condição técnica

Antes de ativar qualquer domínio de movimentos: capturar payloads reais com hash SHA-256 e horário de coleta; construir fixtures pequenas que cubram campos opcionais, listas vazias, movimentos Elite/legacy, formas ausentes e buffs; validar IDs e referências cruzadas; e manter PvE/PvP em schemas e serviços separados. A documentação da fonte não substitui revisão de direitos, atribuição e proveniência descrita acima.

Nenhum parser, fixture de dados do jogo, adaptador, ingestão ou alteração Supabase foi criado nesta etapa. PoGoAPI permanece desabilitada como fonte de runtime.


## Auditoria documental de raids e Community Days (2026-11-08)

Esta seção registra os contratos descritos na [documentação pública da PoGoAPI](https://pogoapi.net/documentation/). **Não representa validação integral dos payloads atuais**: a tentativa de inspeção direta de `raid_bosses.json` não retornou o corpo JSON nesta rodada, e o conteúdo acessível de `community_days.json` é histórico e não prova calendário futuro/ativo. Portanto, os campos abaixo são contratos documentados ou observações limitadas, não autorização para publicar rotações como atuais.

### Raids — separar rotação de mecânica

A documentação descreve `raid_bosses.json` como objeto com `current` e `previous`. Cada seção agrupa listas por tiers `1` a `6` e também apresenta a categoria `mega`. Os registros documentados incluem `id`, `name`, `form`, `tier`, `type`, `boosted_weather`, `possible_shiny` e CP mínimo/máximo com e sem clima (`min_boosted_cp`, `max_boosted_cp`, `min_unboosted_cp`, `max_unboosted_cp`).

Cuidados de modelagem:

- `current` e `previous` são rótulos relativos da fonte, não intervalos de vigência. Não inventar `starts_at` ou `ends_at` a partir deles.
- Tier 6 é uma categoria usada para representar bosses com parâmetros de combate ajustados, embora a documentação diga que aparecem como tier 5 no jogo. Não confundir tier de simulação com rótulo visual da raid.
- Mega raids aparecem em uma chave própria `mega`, não presumir que sempre sejam um dos arrays numéricos.
- `possible_shiny` é possibilidade de shiny associada ao boss, não taxa de shiny nem garantia de que o boss esteja atualmente ativo.
- CP e clima devem permanecer campos distintos; validar limites e tipos reais em payload antes de usar em calculadoras.
- A documentação explica que ovos já surgidos podem continuar com boss anterior após a troca de rotação. Assim, uma mudança da lista de bosses não implica que todas as raids visíveis mudem simultaneamente.

A documentação de `raid_settings.json` descreve mecânicas/configurações como cooldown e limites de convites, quantidade máxima de participantes, limites de participantes remotos, modificador de dano remoto e disponibilidade de raids remotas. Isso é um domínio de regras de raid, distinto da lista de bosses/rotação. Não misturar settings de jogo com conteúdo temporal da rotação.

### Community Days — histórico não é agenda futura

A documentação descreve `community_days.json` como array de eventos com `community_day_number`, `start_date`, `end_date`, `boosted_pokemon`, `bonuses` e `event_moves`. Cada movimento especial documenta `pokemon`, `move` e `move_type`.

A leitura disponível do endpoint apresentou registros históricos desde 2018. Isso confirma que o arquivo funciona como histórico/lista acumulada, mas não valida que contenha anúncios futuros, todos os eventos atuais ou horários locais completos. Os campos documentados são datas sem hora nem fuso; não fabricar horários de início/fim, janela de evolução ou timezone a partir de uma data.

Consequências:

- Tratar Community Days como registros históricos datados; para agenda futura, exigir confirmação por anúncio oficial/atualizado da Niantic ou fonte editorial atual com horário e fuso.
- Não inferir que a ausência de um evento futuro significa que não haverá evento anunciado.
- `event_moves` representa movimentos associados ao evento, mas não prova por si só a janela exata para evoluir, a elegibilidade de cada forma ou disponibilidade de Elite TM.
- Guardar a data original e a fonte; se não houver timestamp upstream confiável, manter `source_updated_at` nulo e usar `collected_at` apenas como horário da coleta local.

### Estado da evidência e bloqueios

| Arquivo/domínio | Evidência nesta revisão | Uso permitido nesta etapa |
|---|---|---|
| `raid_bosses.json` | Contrato documentado; corpo atual não inspecionado | Planejar schema; não anunciar rotação vigente |
| `raid_settings.json` | Contrato documentado; corpo atual não inspecionado | Planejar domínio de mecânicas; não assumir valores atuais |
| `community_days.json` | Corpo acessível com registros históricos; sem validação de agenda futura/horários | Histórico candidato, após fixture e validação temporal |
| Agenda oficial de eventos | Não coberta por esses contratos | Exigir fonte oficial/atual independente |

Antes de qualquer integração, capturar payloads reais completos com URL, horário e SHA-256; validar arrays/objetos, tiers numéricos e `mega`, formas, CPs, clima, shiny e datas; e criar fixtures que cubram rotação vazia, mudança de boss, sobreposição de ovos antigos, campos ausentes e eventos sem horário. Definir a política de expiração por domínio sem confundir cache recente com atualização da fonte.

A PoGoAPI continua desabilitada. Nenhum parser, fixture de dados do jogo, ingestão, migration ou operação Supabase foi criado nesta etapa. A revisão de direitos, atribuição e redistribuição permanece bloqueadora.
