# Política de fontes de dados — Pokémon GO Consultant

O cadastro de uma fonte **não significa** que ela já esteja integrada ou que seus dados estejam disponíveis no produto.

## Princípios obrigatórios
1. Não publicar um valor de jogo sem registrar fonte e momento da coleta.
2. Não misturar domínios: PvP, PvE/raids, eventos, Game Master e catálogo geral são conjuntos diferentes.
3. Preservar URL específica do registro/documento sempre que disponível; a página inicial do provedor não substitui a origem do dado.
4. Registrar versão, data de publicação/atualização da fonte quando disponível e data de coleta.
5. Exibir estimativas como estimativas. Simulação, ranking e dado extraído do Game Master não são equivalentes.
6. Em conflito, não escolher silenciosamente um valor. Marcar divergência e validar antes de substituir o dado anterior.
7. Não fazer scraping nem consumir endpoints privados sem verificar termos, permissões, limites e estabilidade. Preferir APIs/documentação públicas e métodos autorizados.
8. Não inventar nota numérica de confiabilidade. Confiança exige critérios documentados por domínio e evidência.

## Fontes candidatas cadastradas

| Fonte | Domínio pretendido | Uso e limitações |
|---|---|---|
| PokéAPI | Catálogo geral da franquia | Identidade, espécies e dados não específicos de Pokémon GO. Não usar como fonte de stats/movesets GO. |
| PokeMiners | Game Master e assets | Candidata para atributos, formas e movimentos presentes nos arquivos do jogo. Exigir versão/hash e data do arquivo. |
| Pokébattler | Simulações PvE e raids | Candidato para simulações/counters. Guardar parâmetros (boss, nível, clima, estratégia, moveset etc.). API comunitária sem SLA publicado. |
| PvPoke | PvP / GO Battle League | Candidato para rankings por liga/formato. Guardar regras, versão e data. Nunca reutilizar ranking PvP como PvE. |
| Leek Duck | Eventos, calendário e rotações | Candidato para eventos. Guardar URL do evento, horário/fuso e momento da verificação. Confirmar anúncios com canais oficiais quando possível. |
| Pokémon GO Hub | Database e ferramentas comunitárias | Fonte secundária/agregadora. Registrar metodologia e créditos do conjunto específico utilizado. |

## Estado da integração
- PokéAPI: integração existente para catálogo geral.
- PokeMiners, Pokébattler, PvPoke, Leek Duck e Pokémon GO Hub: registrados como candidatos e desabilitados. Não há ingestão ativa desses provedores neste momento.
- Não apresentar candidatos como fontes sincronizadas.
- Antes de habilitar um provedor, implementar adaptador isolado, validação de schema, testes com fixtures versionadas, detecção de alterações e tratamento de falhas/limites.

## Metadados mínimos por registro
- source_id e source_url;
- collected_at e, quando disponível, source_updated_at;
- data_version ou hash/identificador do arquivo de origem;
- domínio/contexto (PvE, PvP, eventos etc.);
- parâmetros de cálculo/simulação quando aplicável;
- confidence somente quando houver metodologia documentada.

## Regras de apresentação
- Mostrar Fonte com link para a origem específica e Verificado em com data/hora da coleta.
- Mostrar Estimativa em DPS/TDO e resultados simulados.
- Mostrar ranking PvP sempre com liga/formato e data de atualização.
- Se a fonte estiver indisponível ou os dados vencidos, mostrar o último dado com aviso ou estado indisponível; nunca fingir atualização.
- Se não houver fonte suficiente, informar que o dado ainda não está disponível.
