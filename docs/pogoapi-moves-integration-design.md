# PoGoAPI — desenho de integração de moves GO

**Revisado em:** 2026-11-08  
**Escopo:** avaliação estática do schema versionado e dos contratos documentados/observados da PoGoAPI.  
**Status:** especificação técnica; nenhum fetcher, parser de produção, fixture de dados do jogo ou ingestão foi ativado.

## Objetivo e limites

Preparar a primeira integração específica de Pokémon GO para movimentos e compatibilidade por forma, sem misturar esse domínio com o catálogo geral da PokéAPI.

A primeira fatia candidata é:

1. movimentos PvE (fast e charged);
2. movimentos PvP (fast e charged), mantidos como regras distintas;
3. listas de movimentos atuais por Pokémon/forma;
4. movimentos Elite separados dos movimentos regulares;
5. proveniência, hash do arquivo bruto e reconciliação.

A PoGoAPI é comunitária e permanece desabilitada. A pendência de licença, atribuição, persistência e redistribuição continua bloqueadora. Este documento não autoriza baixar em rotina, armazenar, publicar ou redistribuir seus dados.

## Contratos de origem

Os endpoints candidatos são:

| Endpoint | Domínio | Evidência disponível | Observações |
|---|---|---|---|
| `fast_moves.json` | PvE fast moves | Corpo diretamente inspecionado | Inclui `move_id`, nome, tipo, poder, energia, duração e stamina loss scaler |
| `charged_moves.json` | PvE charged moves | Contrato documental nesta revisão | Campos opcionais como critical chance e heal scalar precisam permanecer opcionais |
| `pvp_fast_moves.json` | PvP fast moves | Contrato documental | Usa `turn_duration`; não é duração em milissegundos |
| `pvp_charged_moves.json` | PvP charged moves | Contrato documental | Pode incluir buffs e chance de ativação |
| `current_pokemon_moves.json` | Compatibilidade | Contrato documental | Separa listas regulares e Elite; identidade da forma é opcional no contrato |

A existência de um arquivo no manifesto não prova que o corpo atual foi inspecionado. Antes de escrever parser de produção, obter payload real completo de cada endpoint e registrar URL, horário de coleta e SHA-256 do conteúdo bruto.

## Mapeamento preliminar para o schema atual

### `moves`

O schema atual possui:

- identidade: `id`, `slug`, `names`, `type_id`, `category`;
- PvE: `pve_damage`, `pve_energy_delta`, `pve_duration_ms`;
- PvP: `pvp_damage`, `pvp_energy_delta`, `pvp_duration_turns`, `pvp_effects`;
- proveniência: `source_id`, `source_url`, `collected_at`, `source_updated_at`, `data_version`, `confidence`.

Mapeamento candidato:

| Origem | Destino | Regra |
|---|---|---|
| `move_id` | `moves.id` | Só quando o campo estiver presente e for estável no payload real; não derivar ID do nome |
| `name` | `moves.names` | Preservar rótulo original e idioma conhecido; não inventar tradução |
| `type` | `moves.type_id` | Validar contra os 18 tipos conhecidos; rejeitar valor desconhecido |
| categoria do endpoint | `moves.category` | Determinada pelo endpoint (fast/charged), não pelo nome |
| PvE `power` | `pve_damage` | Não copiar para PvP |
| PvE `energy_delta` | `pve_energy_delta` | Preservar sinal |
| PvE `duration` | `pve_duration_ms` | Confirmar unidade no contrato real; não converter por suposição |
| PvP `power` | `pvp_damage` | Não copiar para PvE |
| PvP `energy_delta` | `pvp_energy_delta` | Preservar sinal |
| PvP `turn_duration` | `pvp_duration_turns` | Manter em turnos; nunca tratar como milissegundos |
| PvP `buffs` | `pvp_effects` | Preservar estrutura validada, incluindo chance e estágios |

Não descartar campos específicos que ainda não têm coluna, como `stamina_loss_scaler`, `critical_chance` ou `heal_scalar`. Antes da primeira carga, decidir entre ampliar o schema de forma versionada ou manter um payload bruto auditável com contrato e retenção permitidos. Não esconder perda de informação em um parser aparentemente bem-sucedido.

### `pokemon_moves`

A tabela atual contém `form_id`, `move_id`, `learn_method` e `event_limited`, com chave primária `(form_id, move_id, event_limited)`.

Lacunas identificadas:

- Não há proveniência por relação Pokémon–move.
- `event_limited` não equivale semanticamente a Elite/legacy.
- O contrato de origem separa movimentos regulares e Elite; o schema não possui um campo explícito para essa classificação.
- O contrato de compatibilidade pode omitir forma; não é seguro aplicar uma lista por espécie a todas as formas sem regra confirmada.
- Ainda precisa ser confirmado se os valores das listas de compatibilidade são IDs, nomes ou outro identificador no payload real.

**Decisão:** não mapear Elite para `event_limited` e não resolver nomes por fuzzy matching. Antes de persistir compatibilidade, criar uma migration versionada que modele explicitamente a classe de disponibilidade (regular, Elite/legacy e, se necessário, event-limited) e proveniência da relação, ou demonstrar por testes que o schema atual representa todos esses estados sem ambiguidade.

## Identidade e reconciliação

- Chave de Pokémon: identidade canônica de forma, nunca apenas número da Pokédex.
- Chave de move: ID estável da fonte após validação; nomes são rótulos e não chaves.
- Não assumir que a mesma grafia em PvE e PvP garante o mesmo identificador/semântica.
- Não colapsar movimentos com mesmo nome se IDs ou contratos divergirem.
- Compatibilidade deve resolver para forma exata. Forma ausente exige regra explícita de herança e relatório, não expansão automática.
- Referências não resolvidas, IDs duplicados com conteúdo conflitante e formas desconhecidas devem bloquear a carga do lote ou ir para relatório de quarentena; nunca desaparecer silenciosamente.
- Mudança de hash no manifesto inicia inspeção e validação. Não autoriza sobrescrever automaticamente os dados publicados.
- Reconciliação deve detectar inclusões, alterações e remoções, mas remoção só após snapshot completo e validado do mesmo domínio.

## Proveniência e versão

- `source_id`: identificador interno da fonte, somente depois da revisão de direitos.
- `source_url`: endpoint exato do registro/conjunto.
- `collected_at`: instante UTC da coleta feita pelo nosso processo.
- `source_updated_at`: NULL enquanto a fonte não oferecer timestamp upstream confiável.
- `data_version`: SHA-256 do arquivo bruto com escopo explícito, por exemplo `sha256:<digest>`; não usar hash normalizado.
- `confidence`: NULL até haver critérios reproduzíveis de confiança.

O hash identifica conteúdo observado; não prova quando a fonte publicou a mudança. Frescor do cache continua separado do frescor upstream.

## Critérios obrigatórios antes de implementar ingestão

- [ ] Termos/licença e atribuição esclarecidos para uso público, comercial, persistência e derivados.
- [ ] Corpos reais atuais de todos os endpoints necessários capturados com URL, horário e SHA-256.
- [ ] Schemas runtime estritos por endpoint, com campos opcionais documentados.
- [ ] IDs PvE/PvP e valores das listas de compatibilidade confirmados, sem heurística de nome.
- [ ] Identidade por forma reconciliada com catálogo canônico e relatório de órfãos/colisões.
- [ ] Schema representa explicitamente Elite/legacy sem reutilizar `event_limited`.
- [ ] Campos de origem não representados no schema têm destino deliberado; nenhuma perda silenciosa.
- [ ] Testes para payload vazio, truncado, tipo inválido, IDs duplicados, move desconhecido, forma ausente, rate limit e indisponibilidade.
- [ ] Reconciliação idempotente e remoções protegidas por snapshot completo.
- [ ] Testes PostgreSQL descartáveis para constraints, FK, rollback, idempotência e concorrência.
- [ ] Cache offline e primeira carga validados sem exigir que a API comunitária esteja disponível.
- [ ] Provedor continua desabilitado até aprovação explícita de todos os critérios.

## Próxima decisão

A primeira implementação de código deve começar somente depois de resolver a pendência de direitos e capturar os payloads reais ainda não verificados. Até lá, o próximo trabalho permitido é preparar migrations locais versionadas e testes de schema sem conectar a fonte, sem dados inventados e sem tocar no Supabase remoto.
