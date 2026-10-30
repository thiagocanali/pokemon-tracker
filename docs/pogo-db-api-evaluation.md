# Avaliação técnica — pogo-db-api

**Estado: candidato não integrado.** Esta avaliação é documental; não habilita sincronização, não importa dados e não declara os resultados como validados pelo Pokémon GO.

## Identificação

- Projeto: [S-Tier-Devs/pogo-db-api](https://github.com/S-Tier-Devs/pogo-db-api)
- API publicada: [GitHub Pages](https://s-tier-devs.github.io/pogo-db-api/)
- Repositório consultado: branch `main`; última atividade observada em 2026-08-03.
- Descrição: API JSON estática, com arquivos individuais por Pokémon, rankings por tipo, counters por chefe, raids e eventos.
- Licença: o `package.json` declara MIT e o README também declara MIT; a listagem consultada do GitHub não identificou uma licença no campo do repositório. Antes de reutilizar código, confirmar a presença e o escopo do arquivo de licença no commit efetivamente utilizado. A licença do código não concede automaticamente direitos sobre dados de terceiros.

## Origem e atualização declaradas

O README declara que os dados iniciais foram obtidos de [pokemon-go-api](https://github.com/pokemon-go-api/pokemon-go-api), que interpreta Game Master do PokeMiners. O projeto mantém os arquivos de Pokémon localmente e gera a API no build. Raids e eventos são extraídos de páginas do Leek Duck.

O workflow consultado agenda o build/deploy diariamente às 12:00 UTC e também executa em push/manual. Portanto, não devemos repetir a afirmação de atualização a cada seis horas sem evidência adicional. O README descreve raids e eventos como atualizados diariamente.

## O que os números representam

O projeto calcula seus próprios indicadores; não são resultados de simulação do Pokébattler:

- DPS por movimento: `power / duration`, com STAB aplicado em campo separado.
- DPS abrangente de moveset: fórmula atribuída ao GamePress, com hipóteses de inimigo neutro.
- TDO: `DPS × HP_real × DEF_real / 900`.
- ER: `DPS^0.75 × TDO^0.25`.
- Stats reais documentados: nível 50 e IV 15/15/15.
- Counters: combinações de movimentos são avaliadas contra efetividade de tipo e ordenadas por ER; a API publica até 40 entradas por chefe.

Esses valores são estimativas teóricas baseadas nas fórmulas e hipóteses descritas pelo próprio projeto. Não equivalem a DPS observado em batalha, simulação completa de raid, tempo de vitória garantido ou ranking do Pokébattler. Não usar ER como sinônimo de DPS.

## Limitações relevantes para nosso produto

1. O ranking usa hipóteses teóricas de nível 50 e IV perfeito; não responde diretamente à pergunta “qual é meu melhor Pokémon com meus IVs, nível e recursos?”.
2. A fórmula documentada para counters usa efetividade de tipo e pressupostos simplificados; não há evidência, nesta avaliação, de simulação integral de raid com janelas, energia, esquiva, clima, amizade, Party Power, Mega boosts ou duração real.
3. O conjunto de movimentos vem de Game Master; disponibilidade, legado, exclusividade de evento e mudanças temporárias precisam ser conferidas por versão.
4. Raids/eventos vêm de extração HTML do Leek Duck; falhas de parsing ou mudanças de página podem deixar o dado ausente/desatualizado. O código possui testes, mas isso não substitui monitoramento de frescor em produção.
5. O projeto publica rankings e counters estáticos. Precisamos confirmar a data efetiva de geração de cada arquivo e a cobertura de formas/variantes antes de exibir qualquer resultado como atual.
6. O repositório declara MIT, mas a origem dos dados inclui Game Master, PokeMiners e Leek Duck; direitos e condições dos dados upstream devem ser avaliados separadamente.

## Possível uso

Pode ser avaliado como fonte secundária de descoberta de:
- catálogo de movimentos e atributos derivados de Game Master;
- lista inicial de counters PvE por chefe;
- raids/eventos extraídos do Leek Duck.

Não deve ser a única fonte de verdade nem substituir Pokébattler para simulações completas. Para uso no produto, exigir:
- fixture JSON real versionada e testes de contrato;
- registro de URL exata, horário de coleta e data de geração;
- validação independente de amostras de DPS/TDO/ER e counters;
- aviso explícito de que são estimativas teóricas;
- verificação de licença, atribuição e permissões dos dados upstream;
- cache, detecção de dados vencidos e estado de indisponibilidade;
- adaptador isolado, com o provedor inicialmente desabilitado.

## Decisão

**Manter como candidato desabilitado.** É útil para comparação metodológica e possível fallback informativo, mas a avaliação não justifica ingestão automática nem publicação de rankings no app. Priorizar primeiro fixtures reais, validação de cálculos e proveniência por registro.
