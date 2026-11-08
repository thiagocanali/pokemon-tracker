# Política de fontes de dados — Pokémon GO Consultant

O cadastro de uma fonte **não significa** que ela já esteja integrada ou que seus dados estejam disponíveis no produto.

## Princípios obrigatórios
1. Não publicar um valor de jogo sem registrar fonte e momento da coleta.
2. Não misturar domínios: PvP, PvE/raids, eventos, Game Master e catálogo geral são conjuntos diferentes.
3. Preservar URL específica do registro/documento sempre que disponível; a página inicial do provedor não substitui a origem do dado.
4. Distinguir versão declarada pela fonte, atualização upstream e momento da coleta; nunca inferir uma data upstream a partir da coleta.
5. Exibir estimativas como estimativas. Simulação, ranking e dado extraído do Game Master não são equivalentes.
6. Em conflito, não escolher silenciosamente um valor. Marcar divergência e validar antes de substituir o dado anterior.
7. Não fazer scraping nem consumir endpoints privados sem verificar termos, permissões, limites e estabilidade. Preferir APIs/documentação públicas e métodos autorizados.
8. Não inventar nota numérica de confiabilidade. Confiança exige critérios documentados por domínio e evidência.

## Fontes candidatas cadastradas

| Fonte | Domínio pretendido | Uso e limitações |
|---|---|---|
| PokéAPI | Catálogo geral da franquia | Identidade, espécies e dados não específicos de Pokémon GO. Não usar como fonte de stats/movesets GO. |
| PokeMiners Game Master | Game Master e assets | Candidata para atributos, formas e movimentos presentes nos arquivos do jogo. Exigir versão/hash e data do arquivo. O próprio projeto alerta que campos ofuscados podem estar incorretamente identificados e que o conteúdo é para fins educacionais. |
| Pokébattler | Catálogo GO, movimentos, simulações PvE/raids, Rocket e rankings | API HTTP pública documentada em [Developers](https://www.pokebattler.com/developers/): `/pokemon`, `/moves`, `/raids`, `/rocket`, counters por chefe e rankings. Dados de simulação são estimativas; cache agressivo, `User-Agent` descritivo e atribuição são obrigatórios. Rankings gerais são computacionalmente caros. Manter desabilitado até validar termos, payloads reais, schema e fixtures. Plano: [integração PvE](./pve-integration-plan.md). |
| PvPoke | PvP / GO Battle League | Código aberto sob licença MIT; rankings são gerados por simulações 1 vs 1. Guardar regras, versão e data. Simulação não representa todas as decisões dinâmicas de uma batalha real. Nunca reutilizar ranking PvP como PvE. |
| Leek Duck | Eventos, calendário e rotações | Candidato para eventos. Guardar URL do evento, horário/fuso e momento da verificação. Confirmar anúncios com canais oficiais quando possível. |
| Pokémon GO Hub | Database e ferramentas comunitárias | Fonte secundária/agregadora. Registrar metodologia e créditos do conjunto específico utilizado. |
| Pokémon GO API (community) | JSON de Pokédex e algumas rotações | API agregadora baseada em Game Master e feeds comunitários. Raids/Max Battles/quests podem vir de fontes distintas; verificar origem por endpoint. O projeto declara uso educacional e direitos de terceiros sobre os dados do jogo. |
| pogo-db-api (S-Tier-Devs) | Estimativas PvE, counters, raids e eventos | Fonte comunitária derivada de Game Master e feeds como Leek Duck. DPS/TDO/ER são calculados pelo projeto sob hipóteses próprias; não equivalem a simulação completa. Avaliação: [pogo-db-api](./pogo-db-api-evaluation.md). Manter desabilitada até validar fixtures, frescor, licença e direitos dos dados upstream. |


### Avaliação técnica do Pokébattler

A referência oficial de desenvolvedor documenta a API HTTP em `https://fight.pokebattler.com`. Os endpoints públicos listados são GET/JSON e não exigem autenticação:

- `/pokemon`: Pokédex GO com stats base, tipos e movesets disponíveis (aprox. 7 MB).
- `/moves`: golpes rápidos e carregados, com poder, energia e duração.
- `/raids`: rotação atual e raids anunciadas.
- `/rocket`: lineups atuais da Equipe GO Rocket.
- `/raids/defenders/...`: counters pré-simulados para um chefe e parâmetros específicos.
- `/rankings/...`: rankings gerais calculados sob demanda; podem expirar por timeout sob carga.

A mesma referência também oferece um servidor MCP em `https://mcp.pokebattler.com/mcp` (Streamable HTTP), voltado a assistentes. Segundo a documentação, ele exige conta gratuita; ferramentas que acessam a coleção pessoal do treinador exigem assinatura. O MCP reduz respostas extensas a aproximadamente 1–5 KB, enquanto respostas HTTP brutas podem ser muito maiores. Isso é uma alternativa para consultas assistidas, não substitui automaticamente uma fonte de ingestão persistente do catálogo.

A documentação oficial informa que os resultados são simulados e mudam quando stats, movesets ou rotação mudam. O campo `Estimator` representa estimativa de treinadores necessários para vencer, não DPS nem nota percentual. Equipes de raid têm seis Pokémon; Max Battles usam três e métricas/roles distintas; Rocket usa mecânicas próprias. Não misturar esses domínios.

**Regras de consumo:** cache agressivo; não varrer combinações de atacante × defensor × moveset; enviar `User-Agent` descritivo; atribuir Pokébattler em resultados derivados publicados. A documentação alerta que carga automatizada sustentada pode sofrer rate limit e recomenda contato para uso acima de consultas ocasionais.

**Ressalva de direitos:** os Termos de Uso do app contêm restrições contra copiar, modificar ou criar versões derivadas do próprio app. A referência de desenvolvedor, por outro lado, permite consultas públicas com regras de fair use e exige atribuição para resultados derivados. Essas páginas não resolvem, por si só, todos os direitos sobre redistribuição de dados brutos ou incorporação permanente no PokéLab; tratar isso como pendência de autorização/clareza com o mantenedor antes de publicar ou persistir dados derivados. A licença do código do simulador, quando aplicável, não concede automaticamente direitos sobre dados de Pokémon/Niantic nem sobre o dataset servido. (Referências: [Developer API](https://www.pokebattler.com/developers/), [Terms](https://www.pokebattler.com/terms).)

**Estado da validação:** documentação identificada, mas nenhum payload real foi capturado e validado pelo projeto nesta etapa. Não criar fixtures a partir de exemplos textuais, não inferir schema completo e não habilitar o provedor. Antes da integração, obter autorização/clareza de uso para o caso do PokéLab, capturar respostas reais de baixa frequência para `/moves` e `/pokemon`, preservar amostras brutas versionadas e testar parsing, campos ausentes, alterações e atribuição. A API documentada não deve ser tratada como SLA nem como garantia de frescor upstream.

## Estado da integração
- PokéAPI: integração existente para catálogo geral.
- PokeMiners, Pokébattler, PvPoke, Leek Duck, Pokémon GO Hub e Pokémon GO API (community): registrados como candidatos e desabilitados. Não há ingestão ativa desses provedores neste momento.
- Não apresentar candidatos como fontes sincronizadas.
- Antes de habilitar um provedor, implementar adaptador isolado, validação de schema, testes com fixtures versionadas, detecção de alterações e tratamento de falhas/limites.

## Semântica de versão e proveniência

Os campos de versão e tempo não são intercambiáveis:

| Campo | Significado | Regra |
|---|---|---|
| `collected_at` | Momento em que o PokéLab consultou e armazenou o dado | Sempre representa a coleta local; não é data de publicação nem atualização upstream. |
| `source_updated_at` | Momento em que a própria fonte publicou ou atualizou aquele conteúdo | Preencher somente quando a fonte fornecer uma data confiável e vinculada ao registro/conjunto. Caso contrário, manter `NULL`. |
| `data_version` | Identificador declarado da versão do conjunto, arquivo, release ou contrato/API usado | Registrar o significado no adaptador/documentação. Não chamar uma versão de API de revisão do dataset. |
| `data_snapshots.version` | Identificador da captura armazenada para uma entidade | É a chave de versão do snapshot interno; não deve ser interpretada automaticamente como versão upstream. |

### Regra específica da PokéAPI

A integração atual grava `data_version = "pokeapi-v2"`. Esse valor identifica a versão da API/contrato consultado, não uma revisão do catálogo de dados nem a versão de cada recurso Pokémon. A PokéAPI não fornece, no fluxo atual, uma data confiável de última atualização para cada registro; por isso `source_updated_at` permanece ausente. O `collected_at` registra quando a função fez a coleta.

No fluxo atual, `data_snapshots.version` recebe o timestamp de captura (`collectedAt`) para distinguir capturas sucessivas do mesmo Pokémon. Ele não substitui `data_version` nem comprova que o conteúdo upstream mudou.

### Hashes e arquivos versionados

- Preferir o identificador de release/commit/data file fornecido pela fonte quando existir.
- Para arquivos imutáveis sem versão publicada, pode-se registrar hash criptográfico do conteúdo bruto e o escopo do hash (arquivo completo, endpoint ou registro).
- Hash identifica conteúdo observado; não informa quando a fonte o publicou.
- Não calcular um hash de um payload normalizado e apresentá-lo como versão oficial da fonte.
- Quando versão upstream não estiver disponível, registrar explicitamente essa limitação em vez de inventar um número ou data.

## Metadados mínimos por registro
- source_id e source_url;
- collected_at e, somente quando comprovado pela fonte, source_updated_at;
- data_version com semântica documentada, ou hash com escopo declarado;
- domínio/contexto (PvE, PvP, eventos etc.);
- parâmetros de cálculo/simulação quando aplicável;
- confidence somente quando houver metodologia documentada.

## Regras de apresentação
- Mostrar Fonte com link para a origem específica e Verificado em com data/hora da coleta.
- Mostrar Estimativa em DPS/TDO e resultados simulados.
- Mostrar ranking PvP sempre com liga/formato e data de atualização.
- Se a fonte estiver indisponível ou os dados vencidos, mostrar o último dado com aviso ou estado indisponível; nunca fingir atualização.
- Se não houver fonte suficiente, informar que o dado ainda não está disponível.
