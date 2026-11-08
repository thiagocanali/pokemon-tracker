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
