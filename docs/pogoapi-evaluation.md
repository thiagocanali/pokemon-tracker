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


## Auditoria documental de mecânicas, tipagem e calculadoras (2026-11-08)

Esta revisão amplia a avaliação para `type_effectiveness.json`, `weather_boosts.json`, `cp_multiplier.json` e `pokemon_max_cp.json`. A documentação pública descreve os quatro contratos, mas a evidência de payload varia por endpoint. A leitura direta de `type_effectiveness.json` e `cp_multiplier.json` foi possível nesta rodada; `weather_boosts.json` e `pokemon_max_cp.json` não retornaram corpo acessível pela ferramenta de inspeção. Não criar fixtures a partir de exemplos da documentação nem considerar exemplos documentados como captura do payload atual.

### Efetividade de tipos — matriz direcional

O corpo de `type_effectiveness.json` foi inspecionado diretamente. O payload observado é um objeto cujo primeiro nível usa o tipo do movimento atacante; cada chave interna representa o tipo defensor e seu valor é o multiplicador numérico. A matriz observada cobre 18 tipos atacantes e 18 tipos defensores.

Valores observados incluem:
- `1.6` para dano super efetivo;
- `0.625` para dano pouco efetivo;
- `0.390625` para combinações com dupla resistência.

Regras para integração:
- A direção é atacante → defensor; não inverter a matriz para derivar fraquezas sem explicitar a perspectiva.
- A tabela observada é de interações entre tipos individuais. Para Pokémon com dois tipos defensores, o cálculo combinado deve multiplicar os dois fatores de forma explícita e cobrir casos de imunidade/resistência dupla conforme os valores da fonte.
- Não tratar valores ausentes como `1` sem validação: um tipo ausente pode indicar payload incompleto ou mudança de contrato.
- Manter o contexto Pokémon GO; não importar multiplicadores dos jogos principais.
- Antes de usar em produção, validar conjunto de tipos, completude da matriz, valores numéricos finitos e regressões conhecidas, além de hash e timestamp de coleta.

### Clima — contrato documentado, payload não inspecionado

A documentação descreve `weather_boosts.json` como objeto indexado por condição climática, com uma lista de tipos impulsionados em cada condição. O corpo atual não foi obtido nesta rodada.

Não assumir que o contrato documentado confirma a lista atual de climas ou bônus numéricos. O endpoint documenta quais tipos são impulsionados, não necessariamente o multiplicador de dano, nível de spawn ou todas as regras contextuais. Não derivar números de dano ou nível a partir da lista de tipos. Antes de integrar, capturar payload real e validar chaves de clima, arrays, tipos permitidos, duplicatas e comportamento para clima ausente/desconhecido.

### CP multiplier — payload atual inspecionado, ressalvas de precisão

O corpo de `cp_multiplier.json` foi inspecionado diretamente. É um array de registros `level` e `multiplier`, cobrindo níveis inteiros e meios níveis de 1 a 45 na resposta observada.

A documentação da fonte informa que:
- valores até nível 45 são definidos no GAME_MASTER para níveis inteiros;
- meios níveis até 40 foram calculados por observação de CPs;
- meios níveis entre 40 e 45 são aproximações por interpolação e podem não ser inteiramente corretos.

Consequências para calculadoras:
- Não apresentar todos os valores com o mesmo grau de certeza: marcar explicitamente o intervalo de meios níveis acima de 40 como aproximado.
- Validar ordenação, unicidade de níveis, faixa permitida e multiplicadores positivos/monotônicos antes de aceitar uma atualização.
- Preservar precisão decimal; não arredondar multiplicadores antes do cálculo final de CP.
- Não extrapolar acima do nível 45 nem assumir que a tabela define limites de power-up para qualquer temporada/nível de treinador.
- A fonte descreve os valores de meio nível como observacionais/aproximados; isso não substitui confirmação do GAME_MASTER atual.

### CP máximo — definição documental limitada

A documentação descreve `pokemon_max_cp.json` como array de registros com `id`, `name` e `max_cp`, e define esse CP máximo como o de um Pokémon perfeito (15/15/15) no nível 40. O corpo atual não foi inspecionado diretamente nesta rodada.

Portanto, o campo não deve ser rotulado genericamente como “CP máximo atual” sem explicitar o nível 40. Para limites de nível superiores, calcular a partir dos stats/IVs e CP multiplier apropriados, quando validados, ou obter uma fonte cuja definição de cap esteja documentada. Validar identidade por ID e forma quando aplicável; não assumir que uma linha única por espécie cobre todas as formas com stats diferentes.

### Matriz de evidência

| Endpoint | Evidência em 2026-11-08 | Uso nesta etapa |
|---|---|---|
| `type_effectiveness.json` | Corpo atual inspecionado; matriz numérica direcional 18 × 18 | Contrato pode orientar fixtures; ainda exige revisão de direitos e validação automatizada |
| `weather_boosts.json` | Contrato documental; corpo não acessível nesta rodada | Não criar fixture nem publicar lista como atual |
| `cp_multiplier.json` | Corpo atual inspecionado; níveis 1–45 em passos de 0,5 | Planejar calculadora com ressalva explícita para meios níveis 40,5–45 |
| `pokemon_max_cp.json` | Contrato documental; corpo não acessível nesta rodada | Não publicar como CP máximo atual; definição documentada é nível 40 |

Próxima condição técnica: obter payloads completos com SHA-256 e horário de coleta para os endpoints ainda não inspecionados; produzir fixtures pequenas somente a partir de respostas reais capturadas; criar testes de completude e propriedades matemáticas para a matriz de tipos e multiplicadores; e testar calculadoras contra casos conhecidos. Nenhuma fixture de dados de jogo, parser, integração, ingestão, migration ou operação Supabase foi criada nesta revisão.

A PoGoAPI permanece desabilitada. A auditoria técnica não resolve direitos de persistência, redistribuição ou uso comercial; a revisão de licença/atribuição continua bloqueadora antes de qualquer armazenamento ou publicação dos dados.


## Auditoria documental de evolução, Mega e progressão (2026-11-08)

Esta seção registra a leitura direta dos endpoints `pokemon_evolutions.json` e `pokemon_buddy_distances.json`, além dos contratos documentados para Mega Evolução e custos de progressão. Os corpos de `mega_pokemon.json`, `mega_evolution_settings.json` e `pokemon_powerup_requirements.json` não foram inspecionados nesta rodada. Não transformar exemplos documentados em fixtures de payload atual.

### Evoluções — grafo por espécie e forma, com requisitos opcionais

O corpo atual de `pokemon_evolutions.json` foi inspecionado diretamente. O payload é um array de nós de origem; cada nó possui `pokemon_id`, `pokemon_name`, forma opcional e uma lista `evolutions` com destinos. A amostra contém tanto evoluções simples quanto ramificadas, múltiplas formas e requisitos condicionais.

Campos observados/documentados incluem:
- `candy_required`, `item_required`, `lure_required`;
- `no_candy_cost_if_traded` e `priority`;
- `only_evolves_in_daytime`, `only_evolves_in_nighttime`;
- `must_be_buddy_to_evolve`, `buddy_distance_required`;
- `gender_required`;
- forma no nó de origem e no destino.

Exemplos encontrados no payload atual:
- Eevee possui múltiplos destinos; Espeon/Umbreon têm distância de buddy, exigência de buddy ativo e condição de dia/noite, enquanto outras evoluções usam prioridade e/ou lure.
- Evoluções com itens como Sinnoh Stone, Dragon Scale, Metal Coat, Sun Stone e Unova Stone.
- Burmy tem destinos diferentes por forma e gênero; Combee → Vespiquen exige Female.
- Phantump/Pumpkaboo possuem a condição `no_candy_cost_if_traded`.
- Dunsparce pode resultar em formas distintas de Dudunsparce.

Regras de modelagem:
- A identidade da aresta deve incluir origem (ID + forma) e destino (ID + forma); não deduplicar apenas por espécie/ID.
- Preservar requisitos opcionais como campos independentes. Campo ausente não significa requisito falso/zero sem uma regra de normalização validada.
- `priority` influencia seleção quando múltiplas evoluções são elegíveis; não ordenar opções alfabeticamente e assumir que isso representa a escolha do jogo.
- Não reduzir a evolução a custo de candy: requisitos de item, lure, buddy, distância, gênero, horário, troca e forma são parte do contrato.
- O payload documenta condições, mas não substitui validação do comportamento atual do cliente do jogo nem cobre necessariamente todos os requisitos contextuais/temporários.
- Criar testes para ramificações, formas, requisitos opcionais, listas vazias, IDs repetidos com formas diferentes e referências de destino ausentes.

### Buddy distance — agrupamento por distância, identidade por forma

O corpo atual de `pokemon_buddy_distances.json` foi inspecionado diretamente. É um objeto cujas chaves representam distâncias em quilômetros; cada valor é uma lista de registros com `distance`, `pokemon_id`, `pokemon_name` e `form` quando aplicável. O payload contém diversas formas/costumes para um mesmo ID, o que confirma que a chave de espécie isolada não é suficiente para preservar a cobertura.

Não inferir que a distância de buddy seja sempre requisito de evolução: este endpoint descreve a distância para obter candy ao caminhar com o buddy. O requisito de distância para evoluir deve vir da aresta de evolução (`buddy_distance_required`) e manter semântica separada. Também não assumir que todo Pokémon com buddy distance de 1/3/5/20 km pode evoluir após caminhar essa distância.

### Mega Pokémon — catálogo e custo de energia

A documentação descreve `mega_pokemon.json` como uma lista de Mega Evoluções possíveis, com identidade do Pokémon, forma Mega, nome, stats base, tipos, energia exigida na primeira Mega Evolução e custo reduzido nas seguintes; `cp_multiplier_override` pode existir para cálculo de CP.

Implicações:
- Mega deve ser modelada como forma/estado temporário relacionado ao Pokémon base, não como espécie independente.
- Preservar formas Mega distintas (por exemplo, variantes X/Y quando aplicável), stats e tipos próprios.
- Custos de primeira utilização e reutilização são campos distintos; não substituir um pelo outro.
- `cp_multiplier_override`, quando presente, tem precedência específica para cálculo de CP daquela forma; não aplicar silenciosamente o multiplicador padrão.
- A documentação não fornece, nesta revisão, evidência de payload atual validado. O corpo do endpoint não foi inspecionado; não gerar fixture nem apresentar catálogo Mega como atual.

### Mega Evolution settings — mecânicas globais separadas do catálogo

A documentação descreve `mega_evolution_settings.json` com configurações globais como bônus de ataque geral e do mesmo tipo em raids, limite de Mega Energy, duração da Mega Evolução e bônus de candy ao capturar Pokémon do mesmo tipo. O corpo atual não foi inspecionado.

Essas configurações são regras globais e não devem ser duplicadas em cada registro Mega. Separar:
1. catálogo por Pokémon/forma (stats, tipos, custos, override de CP);
2. regras globais (duração, bônus, limites e recompensas);
3. estado individual do jogador (nível Mega, cooldown/energia), que não é fornecido por esses endpoints.

Os valores do exemplo documental não devem ser tratados como valores atuais sem captura de payload e verificação temporal.

### Power-up requirements — tabela de custos por nível

A documentação descreve `pokemon_powerup_requirements.json` como objeto indexado pelo nível atual, com `current_level`, `level_after_powering`, `candy_to_upgrade`, `xl_candy_to_upgrade` e `stardust_to_upgrade`. O texto da documentação descreve candy comum até nível 40 e XL acima disso, com limite máximo apresentado como nível 50. O corpo atual não foi inspecionado nesta rodada.

Para uma calculadora:
- Cada linha representa um incremento de meio nível; não tratar a chave textual como número sem validar formato e correspondência com `current_level`.
- Somar custos do intervalo solicitado por incremento, separando candy normal, XL e Stardust.
- Não assumir que o jogador pode aplicar todos os incrementos: nível do treinador, limites do jogo e estado do Pokémon podem restringir o resultado e precisam ser modelados separadamente.
- Validar sequência contínua, ausência de duplicatas, custos não negativos, `level_after_powering > current_level` e limites de nível.
- Não usar custos documentados como valores atuais até inspecionar payload e confirmar se a tabela reflete a versão vigente do jogo.

### Estado da evidência

| Endpoint | Evidência em 2026-11-08 | Uso nesta etapa |
|---|---|---|
| `pokemon_evolutions.json` | Corpo atual inspecionado; requisitos condicionais e formas presentes | Contrato apto a orientar fixtures depois da revisão de direitos |
| `pokemon_buddy_distances.json` | Corpo atual inspecionado; objeto agrupado por distância e registros com formas | Contrato apto a orientar fixtures depois da revisão de direitos |
| `mega_pokemon.json` | Contrato documental; corpo não inspecionado | Não publicar catálogo Mega como atual |
| `mega_evolution_settings.json` | Contrato documental; corpo não inspecionado | Não aplicar bônus/duração como valores atuais |
| `pokemon_powerup_requirements.json` | Contrato documental; corpo não inspecionado | Não alimentar calculadora de Stardust/candy com valores não verificados |

Antes de qualquer integração, capturar os três payloads ainda não inspecionados com URL, horário e SHA-256; criar fixtures apenas a partir de respostas reais; validar a relação entre formas e IDs; e testar calculadoras em incrementos de meio nível. Evolução, buddy candy distance, Mega e power-up devem permanecer domínios distintos.

A PoGoAPI continua desabilitada. Esta auditoria não autoriza persistência, redistribuição ou uso comercial; a revisão de direitos e atribuição continua bloqueadora. Nenhum parser, fixture de dados de jogo, adaptador, ingestão, migration ou operação Supabase foi criado nesta revisão.


### Progressão do treinador — XP, recompensas e amizade

A documentação também descreve três conjuntos de progressão que devem permanecer separados dos dados de Pokémon:

- `player_xp_requirements.json`: objeto indexado pelo nível do treinador, com XP cumulativo necessário para atingir cada nível.
- `levelup_rewards.json`: estrutura de recompensas desbloqueadas ao subir de nível, incluindo itens e quantidades associados ao nível.
- `friendship_level_settings.json`: configurações de níveis de amizade entre jogadores e benefícios relacionados.

Os três corpos não foram inspecionados diretamente nesta rodada; portanto, os formatos acima são contratos documentados, não fixtures verificadas.

Regras para futura implementação:
- XP cumulativo por nível não é o mesmo que XP necessário para o próximo nível. Se a UI mostrar “faltam X XP”, calcular a diferença entre o requisito do próximo nível e o XP total atual, sem alterar o valor original da fonte.
- Validar monotonicidade dos requisitos de XP, níveis sem lacunas, valores inteiros não negativos e presença do nível inicial.
- Recompensas de nível devem ser representadas como lista de itens/quantidades, sem presumir que todos os níveis tenham recompensa ou que o conjunto documentado seja necessariamente o atual.
- Configurações de amizade são regras do jogo; progresso real de amizade, interações diárias e estado entre duas contas pertencem aos dados do jogador e não são fornecidos por uma tabela global de configurações.
- Não confundir bônus de amizade com bônus de dano em raids, desconto de troca ou Premier Balls sem modelar cada efeito explicitamente e sua condição.
- As tabelas de progressão podem mudar com atualizações do jogo. Registrar versão/hash e coleta, e não apresentar leitura recente do cache como prova de atualização upstream.

| Endpoint | Evidência em 2026-11-08 | Uso nesta etapa |
|---|---|---|
| `player_xp_requirements.json` | Contrato documental; corpo não inspecionado | Planejar calculadora de XP, sem fixture |
| `levelup_rewards.json` | Contrato documental; corpo não inspecionado | Planejar tabela de recompensas, sem afirmar conteúdo atual |
| `friendship_level_settings.json` | Contrato documental; corpo não inspecionado | Planejar referência de regras, sem inferir progresso do jogador |

Esses endpoints permanecem fora de qualquer integração nesta etapa. Antes de criar calculadoras ou páginas de progressão, obter payloads reais, verificar hashes e construir testes de consistência. Não armazenar progresso pessoal de jogador como se fosse dado público do Game Master.


## Auditoria de reconciliação com o modelo canônico existente (2026-11-09)

Esta etapa comparou os contratos já observados da PoGoAPI com a migration inicial e os serviços atuais do PokéLab. O objetivo é identificar o que pode ser conectado com segurança — sem ativar o provider nem gravar dados externos.

### Modelo canônico confirmado no repositório

A migration `202609280001_initial_data_platform.sql` define:

- `pokemon_species.id`: identidade interna da espécie; `dex_number` é único.
- `pokemon_forms.id`: identidade interna da forma, ligada a `species_id`; `slug` é único.
- `pokemon_go_stats.form_id`: chave primária e FK para a forma; stats são armazenados por forma.
- `moves.id`: chave textual interna; o registro combina campos PvE e PvP, com `category` (`fast`/`charged`) e proveniência própria.
- `pokemon_moves`: relação forma ↔ movimento, com `learn_method` e `event_limited`; a chave inclui `form_id`, `move_id` e `event_limited`.
- `data_sources`: catálogo de fontes e limitações; cadastro de fonte não equivale a provider habilitado.

Os serviços atuais confirmam que `goPokemonCore.ts` lê formas, espécies, tipos e stats; `moves.ts` lê o catálogo de movimentos. Nenhum desses serviços atualmente reconcilia IDs externos PoGoAPI ou ingere `current_pokemon_moves.json`.

### Mapeamento seguro por domínio

| Dado PoGoAPI | Destino conceitual | Regra de reconciliação |
|---|---|---|
| `pokemon_stats.json` | `pokemon_go_stats` + `pokemon_forms` | A chave externa é `pokemon_id + form`; nunca usar somente o ID nacional nem o nome. Exigir crosswalk explícito para `pokemon_forms.id`. |
| `fast_moves.json` | `moves` | O `move_id` numérico externo não corresponde automaticamente ao `moves.id` textual. Exigir identidade externa persistente/crosswalk; nome não é chave suficiente. |
| `current_pokemon_moves.json` | `pokemon_moves` | Resolver espécie + forma para forma canônica e cada move para ID canônico. Preservar separadamente listas normais, Elite/legacy e limitações de evento. |
| Contratos PvP | campos PvP de `moves` ou domínio próprio | Não preencher campos PvP com valores PvE; validar `turn_duration`, buffs e efeitos como contrato separado. |
| Manifesto `api_hashes.json` | metadado de execução/versionamento | Guardar hash SHA-256 do arquivo bruto e escopo do hash; não atribuir timestamp upstream sem evidência. |

### Lacunas do schema atual que impedem integração direta

1. **Identidade de movimentos externa:** `moves.id` é textual e não há coluna de origem/ID externo dedicada. Um slug calculado do nome pode colidir ou mudar; não é uma chave substituta segura para o `move_id` do provedor.
2. **Identidade de formas externa:** `pokemon_forms` não possui crosswalk para `pokemon_id + form`. A normalização automática de rótulos pode juntar formas diferentes ou deixar variantes sem correspondência.
3. **Disponibilidade de movimentos:** `pokemon_moves.event_limited` é um booleano e `learn_method` é texto livre. Isso não representa de forma inequívoca as categorias normal, Elite fast, Elite charged, legacy e outras condições de evento. Não converter listas Elite em `event_limited=true` sem uma taxonomia formal.
4. **Domínios PvE/PvP:** a tabela `moves` mantém colunas PvE e PvP no mesmo registro. Isso só é seguro se a identidade do movimento for comprovadamente compartilhada e se os dois contratos forem reconciliados de forma independente; não assumir isso apenas porque os nomes coincidem.
5. **Versão do dataset:** o hash do arquivo pode servir como `data_version` com prefixo/escopo explícito, mas não deve ser confundido com `source_updated_at`.

### Estratégia de reconciliação proposta (não implementada)

Antes de qualquer ingestão, criar uma camada explícita de crosswalk por provider e domínio, com pelo menos:

- `provider_id` e `domain`;
- `external_id` (texto, para suportar IDs numéricos e compostos);
- `external_form_key` quando a identidade depende da forma;
- `canonical_entity_type` e `canonical_entity_id`;
- `source_url`, hash/versão observada e horário de coleta;
- estado de revisão (`matched`, `unmatched`, `ambiguous`, `rejected`) e motivo.

A camada deve rejeitar correspondências ambíguas, produzir relatório de órfãos e colisões, e nunca criar automaticamente formas/moves canônicos a partir de nomes não verificados. A chave externa de stats deve preservar o par `pokemon_id + form`; uma forma ausente no payload precisa ter regra explícita e não pode ser silenciosamente igualada à forma padrão.

Para movimentos, manter a classificação de compatibilidade como enumeração estruturada (por exemplo, normal, Elite fast, Elite charged e event-limited), após validar os significados do payload real. Não usar um campo booleano como substituto de várias condições independentes.

### Decisão desta auditoria

- O modelo atual já comporta stats por forma e relações Pokémon–moves em alto nível.
- O modelo atual **não oferece chaves externas suficientes** para uma ingestão PoGoAPI segura de stats, moves e compatibilidade sem uma camada de crosswalk.
- A primeira implementação futura deve ser a reconciliação/teste em modo dry-run, com relatório de matches/órfãos/ambiguidades; não uma carga direta nas tabelas canônicas.
- O corpo de `current_pokemon_moves.json` ainda não foi inspecionado diretamente nesta auditoria; seu parser permanece bloqueado até haver fixture real e validação dos campos.
- A revisão de direitos/licença e atribuição continua bloqueadora para persistência ou redistribuição. Nenhuma migration, provider ativo, sincronização ou operação Supabase remota foi executada.

