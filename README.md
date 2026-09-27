Pokémon GO Consultant — Redefinição completa do projeto
Quero transformar este projeto em uma plataforma completa de consulta, análise e assistência para jogadores de Pokémon GO.

O projeto atual está neste repositório:

github.com/thiagocanali/pokemon-tracker

Existe bastante coisa já desenvolvida, inclusive funcionalidades relacionadas à ideia original do projeto de batalhar/interagir/conseguir Pokémon.

IMPORTANTE: não quero simplesmente apagar o que já existe.

Quero que você primeiro analise profundamente a estrutura atual do projeto, entenda o que já foi desenvolvido e preserve o máximo possível do trabalho existente.

A funcionalidade atual deve continuar existindo, mas passar a ser uma área secundária da aplicação, enquanto o novo objetivo principal passa a ser um grande Pokémon GO Consultant / Super Database.

1. VISÃO DO PRODUTO
O objetivo principal agora é criar uma plataforma que funcione como uma espécie de:

Pokémon GO Super Database + Consultant + Tools + Assistant

A inspiração principal é:

Pokémon GO Hub Database:
https://db.pokemongohub.net/pt/

Também quero estudar como referência de funcionalidades e organização:

Pokémon GameInfo:
https://pokemon.gameinfo.io/en/pokemon/list/top-attackers

PokéBase:
https://pokebase.app/pokemon-go/moves

PvPoke:
https://pvpoke.com/moves/

GamePress Pokémon GO:
https://gamepress.gg/pokemongo/

Pokebattler:
https://www.pokebattler.com/

Esses sites são referências de produto, informação e UX, não quero copiar layout, identidade visual, código ou conteúdo protegido.

Quero criar uma experiência própria, moderna e muito mais integrada.

2. CONCEITO PRINCIPAL
A aplicação deve ser pensada como uma central para o jogador de Pokémon GO.

O usuário deve conseguir entrar no site e, a partir de um único lugar:

pesquisar qualquer Pokémon;

consultar todas as informações sobre ele;

consultar ataques e movesets;

consultar tipos;

consultar fraquezas e resistências;

consultar stats;

consultar CP;

consultar evoluções;

consultar formas;

consultar Shadow Pokémon;

consultar Mega Evolutions;

consultar variantes;

consultar disponibilidade;

consultar desempenho PvP;

consultar desempenho PvE;

consultar raids;

consultar counters;

consultar eventos;

consultar mudanças de temporada;

consultar mudanças recentes;

descobrir quais Pokémon são bons para determinado objetivo;

comparar Pokémon;

comparar movesets;

analisar times;

receber dicas;

conversar com um assistente especializado em Pokémon GO.

Quero que a sensação seja:

"Se eu tenho uma dúvida sobre Pokémon GO, eu consigo descobrir a resposta aqui."

3. ARQUITETURA DO PRODUTO
Organize o produto em grandes áreas.

Sugestão de navegação principal:

Dashboard
Página inicial com:

eventos atuais;

próximos eventos;

mudanças recentes;

Pokémon em destaque;

raids atuais;

Spotlight Hour;

Community Day;

novidades;

recomendações;

atalhos para ferramentas;

busca global.

Pokémon
O coração do sistema.

Criar uma database completa de Pokémon GO.

Deve ser possível pesquisar:

nome;

número da Pokédex;

tipo;

tipo secundário;

geração;

região;

categoria;

forma;

Shadow;

Mega;

evolução;

disponibilidade.

A página individual de cada Pokémon deve ser extremamente completa.

Exemplo de estrutura:

Informações básicas
nome;

número Pokédex;

imagem;

sprites;

tipos;

geração;

descrição;

categoria;

altura;

peso;

formas;

disponibilidade.

Stats
Mostrar informações relevantes como:

Attack;

Defense;

Stamina/HP;

CP máximo;

valores relevantes para diferentes contextos.

Evolução
Mostrar visualmente:

Pokémon A
   ↓
Pokémon B
   ↓
Pokémon C

Informar:

Candy necessário;

itens necessários;

condições;

formas alternativas;

evoluções especiais.

Tipagem
Mostrar:

tipos;

fraquezas;

resistências;

dupla resistência;

imunidades quando aplicável ao sistema de Pokémon GO.

Moves
Separar:

Fast Moves;

Charged Moves.

Para cada movimento mostrar:

tipo;

categoria;

dano;

energia;

duração;

DPS;

EPS;

cooldown;

dano por energia quando aplicável;

informações específicas de PvP;

informações específicas de PvE.

PvP
Mostrar informações para:

Great League;

Ultra League;

Master League;

outras ligas relevantes.

Informar:

ranking quando houver fonte confiável;

movesets recomendados;

performance;

matchups;

pontos fortes;

pontos fracos;

recomendações.

PvE
Mostrar:

desempenho em raids;

desempenho em ginásios quando relevante;

melhores movesets;

DPS;

TDO;

DPS/TDO;

papel;

tipos de raid onde é útil.

Shadow / Mega / variantes
Quando aplicável:

Shadow;

Purified;

Mega;

formas alternativas;

variantes especiais.

4. SUPER DATABASE
Quero que a database seja projetada pensando em crescimento.

Não quero informações hardcoded espalhadas pela interface.

Criar uma arquitetura de dados bem definida.

Idealmente separar entidades como:

Pokémon;

Pokémon Forms;

Types;

Moves;

Fast Moves;

Charged Moves;

Evolutions;

Evolution Requirements;

Seasons;

Events;

Raids;

Raid Bosses;

PvP Rankings;

PvE Rankings;

Counters;

Sources;

Game Updates;

Availability;

Research;

Community Days;

Spotlight Hours;

GO Battle League;

Eggs;

Team Rocket;

Shadow Pokémon;

Mega Evolutions.

A arquitetura precisa permitir atualizações sem precisar modificar manualmente dezenas de páginas.

5. SISTEMA DE ATUALIZAÇÃO DE DADOS
Essa é uma das partes MAIS IMPORTANTES do projeto.

Eu quero que o sistema seja preparado para mudanças constantes do Pokémon GO.

Exemplos:

nova Season;

mudança de Season;

Pokémon novo;

novo move;

alteração de dano;

alteração de energia;

mudança de moveset;

novo evento;

evento encerrado;

novo Raid Boss;

mudança de Raid Boss;

novo Community Day;

novo Spotlight Hour;

mudanças de PvP;

mudanças de PvE;

novo formulário;

Mega Evolution;

Shadow Pokémon;

mudanças de disponibilidade.

A aplicação não deve depender de dados estáticos inseridos manualmente no frontend.

Criar uma camada de dados que permita:

Source/API/Data
       ↓
Data ingestion
       ↓
Validation
       ↓
Normalization
       ↓
Database
       ↓
Application

Se possível, criar jobs de sincronização/atualização.

Exemplo conceitual:

Data Sources
     ↓
Fetcher
     ↓
Parser
     ↓
Validator
     ↓
Change Detector
     ↓
Database
     ↓
Cache
     ↓
Frontend

6. DETECÇÃO DE ALTERAÇÕES
Quero uma funcionalidade de Change Detection.

Quando os dados forem atualizados, o sistema deve conseguir identificar:

ANTES
Attack: 250

DEPOIS
Attack: 260

E registrar algo como:

Mewtwo teve seu Attack alterado de 250 para 260.

Ou:

A Season X foi encerrada e a Season Y começou.

Ou:

Um novo Charged Move foi adicionado.

Ou:

O movimento X teve seu dano alterado.

Criar uma espécie de histórico de alterações.

Exemplo:

Recent Changes
🔴 New Pokémon added

🟡 Move damage changed

🟢 New event added

🔵 New season started

🟣 PvP ranking updated

Cada alteração deve possuir:

data;

entidade afetada;

valor anterior;

valor novo;

fonte;

tipo de alteração.

7. SISTEMA DE FONTES
Toda informação importante deve ter origem rastreável.

Quero uma estrutura para armazenar:

source;

URL;

data de coleta;

data de atualização;

confiabilidade;

versão dos dados quando aplicável.

Na interface, quando apropriado, mostrar:

Source / Fonte

Isso é importante porque Pokémon GO muda constantemente e quero evitar apresentar informação desatualizada como se fosse atual.

8. EVENTOS
Criar uma área completa de eventos.

Exemplos:

Community Day;

Spotlight Hour;

Raid Day;

Research Day;

eventos sazonais;

eventos temáticos;

eventos especiais;

GO Fest;

GO Tour;

Team GO Rocket;

eventos relacionados à GO Battle League;

eventos de lançamento.

Cada evento deve possuir:

nome;

descrição;

data inicial;

data final;

horário;

timezone;

bônus;

Pokémon disponíveis;

raids;

research;

rewards;

shiny availability;

informações relevantes;

fonte.

Criar:

Eventos acontecendo agora
Próximos eventos
Eventos encerrados
Calendário
Quero uma visualização de calendário quando fizer sentido.

9. SEASONS
Criar uma área específica para Seasons.

Mostrar:

Season atual;

data inicial;

data final;

bônus;

mudanças;

Pokémon relevantes;

eventos;

raids;

features;

informações da temporada.

Quando uma nova season entrar, o sistema deve conseguir atualizar a Season atual sem precisar reconstruir a aplicação.

10. RAIDS
Criar uma seção de Raids.

Mostrar:

Raid Boss atual;

Tier;

CP;

tipos;

fraquezas;

counters;

melhores Pokémon;

melhores movesets;

quantidade recomendada de jogadores quando houver dados confiáveis;

shiny availability;

período disponível.

Exemplo:

Raid Boss
    ↓
Type
    ↓
Weaknesses
    ↓
Recommended Counters
    ↓
Best Moves
    ↓
Team Suggestions

11. COUNTERS
Criar um sistema de counters.

Exemplo:

Usuário pesquisa:

"Counters para Rayquaza"

O sistema deve apresentar:

melhores counters;

Shadow counters;

Mega counters;

movesets;

quantidade recomendada;

desempenho;

alternativas;

explicação do porquê.

Também quero:

"Qual é o melhor Pokémon contra X?"

E:

"Tenho estes Pokémon. Quais posso usar contra X?"

12. PVP
Criar uma área de PvP bastante completa.

Ligas:

Great League;

Ultra League;

Master League;

Cups quando houver dados.

Possibilitar:

rankings;

movesets;

análise de Pokémon;

comparação;

matchups;

counters;

composição de times.

Criar uma ferramenta:

Team Builder
Usuário escolhe:

Pokémon 1
Pokémon 2
Pokémon 3

O sistema analisa:

cobertura;

fraquezas;

resistências;

matchups;

tipos;

possíveis problemas;

sugestões de substituição.

13. COMPARADOR
Criar uma ferramenta para comparar Pokémon.

Exemplo:

Charizard vs Blaziken

Mostrar lado a lado:

stats;

tipos;

CP;

moves;

PvP;

PvE;

fraquezas;

resistências;

evolução;

disponibilidade;

Shadow;

Mega;

performance.

Também permitir comparar:

Pokémon A
Pokémon B
Pokémon C

14. MOVE DATABASE
Criar uma database completa de moves.

Para cada move:

nome;

tipo;

categoria;

dano;

energia;

duração;

DPS;

EPS;

PvP damage;

PvP energy;

efeitos;

Pokémon que aprendem;

Fast/Charged;

disponibilidade.

Criar filtros.

Exemplo:

Fire moves

Charged moves

Highest DPS

Lowest energy

PvP moves

15. SEARCH GLOBAL
A busca é extremamente importante.

Criar uma busca global inteligente.

O usuário pode escrever:

Mewtwo

ou:

best fire attacker

ou:

counters for Lugia

ou:

Great League Pokémon

ou:

Pokémon with dragon type

ou:

events this week

ou:

best moves for Metagross

A busca deve entender diferentes intenções quando possível.

16. ASSISTENTE / CHATBOT
Quero implementar um assistente dentro do site.

Nome provisório:

PokéAdvisor

ou simplesmente:

Pokémon GO Assistant

O usuário poderá perguntar:

Qual o melhor moveset para Mewtwo?

Vale a pena evoluir esse Pokémon?

Quais Pokémon devo usar contra Tyranitar?

O que está acontecendo essa semana?

Quais raids estão acontecendo?

Qual Pokémon devo usar na Great League?

Como funciona essa evolução?

Qual Pokémon é melhor para atacar ginásios?

Tenho esses Pokémon, qual time posso montar?

O chatbot deve responder com base nos dados disponíveis na própria plataforma.

IMPORTANTE:

O chatbot não deve simplesmente inventar informações.

Quando possível, ele deve consultar o database antes de responder.

Arquitetura desejada:

User
 ↓
Chat Interface
 ↓
Intent Detection
 ↓
Database / Search / Tools
 ↓
Relevant Data
 ↓
LLM
 ↓
Answer

O chatbot deve conseguir citar as informações utilizadas.

Exemplo:

Mewtwo é um atacante do tipo Psychic...

Fonte: Pokémon Database

Atualizado em: ...

Se não houver dados suficientes, deve dizer isso claramente.

17. SISTEMA DE DICAS
Criar uma área de:

Tips & Guides
Conteúdos como:

como montar times;

como escolher Pokémon;

como evoluir;

como usar Stardust;

como usar Candy;

como preparar para raids;

como melhorar no PvP;

como escolher moves;

como interpretar stats;

como escolher Pokémon para investir;

estratégias para iniciantes;

estratégias avançadas.

No futuro isso pode ser alimentado automaticamente pelo sistema/LLM, mas inicialmente pode existir uma estrutura de conteúdo.

18. FUNCIONALIDADE ANTIGA
Tudo que já existe no projeto atualmente relacionado à ideia de:

batalhar;

conseguir Pokémon;

interagir com Pokémon;

progressão;

funcionalidades experimentais;

deve ser preservado.

Porém, isso não deve mais ser o centro da aplicação.

Criar uma área específica:

Game / Simulator
ou:

My Pokémon
ou outro nome adequado após analisar o projeto atual.

A navegação deve deixar claro que é uma funcionalidade adicional.

Exemplo:

Home
Pokémon
Moves
PvP
PvE
Raids
Events
Seasons
Tools
Guides
Assistant
----------------
Game / Simulator

A parte antiga continua disponível, mas o Super Database/Consultant é o produto principal.

19. DASHBOARD
Criar uma Home extremamente útil.

Ao abrir o site:

Pokémon GO Consultant

[ Search Pokémon, Moves, Events... ]

┌─────────────────────────────┐
│ Current Season              │
│ ...                         │
└─────────────────────────────┘

Events happening now

Upcoming Events

Current Raids

Featured Pokémon

PvP Meta

PvE Meta

Recent Changes

Useful Tools

Quero uma experiência de portal.

20. TOOLS
Criar uma área de ferramentas.

Inicialmente considerar:

Pokémon Calculator;

CP Calculator;

IV Calculator;

PvP IV Calculator;

Team Builder;

Pokémon Compare;

Raid Counter Finder;

Move Explorer;

Type Effectiveness Calculator;

Evolution Calculator;

Candy Calculator;

Stardust Calculator;

Search/Filter avançado.

Não é necessário implementar tudo de uma vez.

Criar a arquitetura para permitir adicionar essas ferramentas progressivamente.

21. IV / CP / CALCULATORS
Quando houver dados suficientes, criar ferramentas para:

IV Calculator
Entrada:

CP;

HP;

Stardust;

level;

appraisal quando aplicável.

Saída:

possíveis IVs;

Attack;

Defense;

HP;

porcentagem;

PvP relevance.

CP Calculator
Permitir estimar CP conforme os parâmetros disponíveis.

Evolution Calculator
Mostrar:

Candy;

CP estimado;

evolução;

requisitos.

22. FILTROS AVANÇADOS
As listas precisam possuir filtros poderosos.

Exemplo:

Type: Fire
Generation: Any
Shadow: Yes
Mega: No
PvE Rank: Top 20
PvP: Any

Ou:

League: Great League
Type: Water
Shadow: Any

Também quero ordenação por:

CP;

Attack;

Defense;

HP;

DPS;

TDO;

PvP ranking;

name;

Pokédex number.

23. RESPONSIVIDADE
O site precisa funcionar muito bem em:

desktop;

tablet;

mobile.

A experiência mobile é particularmente importante porque jogadores de Pokémon GO utilizam o celular enquanto estão jogando.

Priorizar:

busca rápida;

cards;

filtros fáceis;

páginas leves;

navegação simples;

boa legibilidade;

botões grandes;

carregamento rápido.

24. UX / UI
Quero uma interface moderna, com inspiração em ferramentas de analytics/database.

Não quero simplesmente copiar Pokémon GO Hub.

Criar identidade visual própria.

Pode usar uma estética inspirada ou integrações, pesquise quais fontes públicas/licenciadas existem para obter dados de no universo Pokémon, mas com aparência moderna.

Sugestão:

dark mode como opção;

cards;

badges;

cores por tipo;

gráficos;

tabelas;

filtros;

tabs;

skeleton loading;

empty states;

responsive design.

As cores dos tipos podem ajudar na identificação:

Fire → vermelho/laranja
Water → azul
Grass → verde
Electric → amarelo
Psychic → rosa
Ice → azul claro
Dragon → roxo/azul
etc.

25. PERFORMANCE
Esse projeto poderá ter uma quantidade muito grande de dados.

Portanto:

não carregar tudo no frontend;

utilizar paginação;

filtros server-side quando apropriado;

cache;

lazy loading;

índices no banco;

busca otimizada;

imagens otimizadas;

evitar requests desnecessários.

A arquitetura deve permitir escalar.

26. SEO
As páginas de Pokémon devem ser indexáveis.

Exemplo:

/pokemon/mewtwo
/pokemon/pikachu
/pokemon/charizard

Moves:

/moves/psystrike
/moves/blast-burn

Events:

/events/community-day
/events/...

Raids:

/raids/...

Criar metadata dinâmica:

title;

description;

Open Graph;

canonical;

structured data quando fizer sentido.

Quero que pesquisas como:

"Mewtwo Pokémon GO moveset"

possam encontrar a página correspondente no futuro.

27. ADMIN / DATA MANAGEMENT
Criar, se a arquitetura atual permitir, uma área administrativa.

Possibilitar:

visualizar dados;

editar dados;

sincronizar;

verificar erros;

visualizar alterações;

visualizar sources;

disparar atualização;

verificar último sync.

Exemplo:

Admin

Data Status

Pokémon
1,xxx records

Moves
xxx records

Events
xxx records

Last Sync
2026-xx-xx

Changes Detected
12

Sync Status
Healthy

28. DATA QUALITY
Criar validações para evitar dados quebrados.

Por exemplo:

Pokémon sem nome;

move sem tipo;

evento sem data;

referência inexistente;

dados duplicados;

valores inválidos.

A sincronização deve validar antes de substituir os dados atuais.

Idealmente:

New Data
   ↓
Validation
   ↓
If valid
   ↓
Update

Se houver erro:

Keep previous valid data
+
Log error

Isso é muito importante para evitar que uma fonte externa quebrada destrua o database.

29. VERSIONAMENTO
Sempre que possível, manter histórico dos dados.

Exemplo:

Pokémon
Current Version
Previous Version
Change History

Isso será importante para o sistema de "What's New".

30. WHAT'S NEW
Criar uma página:

What's New
Mostrar alterações recentes:

Today

New Pokémon added
New event added
Move damage changed
Raid rotation changed

Yesterday

Season updated
PvP data updated
...

Permitir filtros:

Pokémon;

Moves;

Events;

Raids;

PvP;

PvE;

Seasons.

31. SISTEMA DE FAVORITOS
Se houver autenticação no projeto, permitir:

favoritar Pokémon;

favoritar moves;

acompanhar eventos;

acompanhar Pokémon;

criar listas;

montar coleção pessoal.

Exemplo:

My Pokémon
O usuário pode marcar:

tenho;

não tenho;

Shadow;

shiny;

lucky;

favorite;

powered up.

Essa funcionalidade pode crescer futuramente para virar uma espécie de coleção pessoal.

32. PERSONALIZAÇÃO
No futuro o sistema poderá conhecer preferências do usuário.

Exemplo:

My Goals

PvP
Raids
Shiny hunting
Collection
XP
Candy

E então adaptar recomendações.

Mas isso deve ser arquitetado de forma modular e não precisa ser implementado completamente agora.

33. FONTES E APIs
Antes de implementar scraping ou integrações, pesquise quais fontes públicas/licenciadas existem para obter dados de Pokémon GO.

Não quero que você simplesmente faça scraping agressivo de sites de terceiros.

Priorizar:

APIs oficiais, quando existirem;

fontes públicas confiáveis;

datasets licenciados;

fontes comunitárias confiáveis;

scraping apenas quando permitido pelos termos da fonte.

Criar uma camada de abstração:

DataProvider

para que a fonte possa ser trocada futuramente.

Exemplo:

PokemonProvider
MoveProvider
EventProvider
RaidProvider
PvPProvider
PvEProvider

34. NÃO DEPENDER DE UMA ÚNICA FONTE
Sempre que possível, separar os dados por domínio.

Por exemplo:

Pokémon basic data
        ↓
Provider A

PvP data
        ↓
Provider B

Events
        ↓
Provider C

Depois normalizar tudo internamente.

Isso evita que o projeto fique completamente dependente de um único site.

35. AI / LLM
O sistema deve ser preparado para integração com LLM.

Mas quero evitar que a IA seja a fonte primária dos dados.

A regra deve ser:

Database first
AI second

Ou:

User Question
     ↓
Retrieve structured data
     ↓
AI interprets/explains
     ↓
Answer

A IA deve explicar os dados, não inventá-los.

36. EXEMPLOS DE PERGUNTAS DO USUÁRIO
O sistema deve futuramente conseguir responder perguntas como:

Qual o melhor Pokémon para atacar uma raid de Kyogre?

Quais são os melhores counters para Mega Charizard?

Tenho um Mewtwo com esses IVs. Vale a pena investir para PvP?

Qual o melhor moveset de Metagross?

Quais raids estão acontecendo hoje?

Qual evento começa amanhã?

O que mudou na nova season?

Qual Pokémon devo evoluir?

Quais Pokémon Shadow são bons?

Quais Pokémon são bons na Great League?

Monte um time para mim.

Quais Pokémon de água eu tenho que são bons para raids?

Qual é melhor para PvE: Pokémon A ou Pokémon B?

37. DESIGN DE COMPONENTES
Criar componentes reutilizáveis.

Exemplos:

PokemonCard;

PokemonStats;

PokemonTypeBadge;

MoveCard;

MoveTable;

EvolutionChain;

RaidCard;

EventCard;

SeasonCard;

RankingTable;

ComparisonTable;

SearchBar;

FilterPanel;

StatChart;

TypeEffectiveness;

SourceBadge;

LastUpdated;

ChangeLog;

AssistantChat.

Evitar duplicar componentes.

38. DARK MODE
Implementar dark/light mode se isso não conflitar com o projeto atual.

O dark mode deve ser muito bem tratado.

39. INTERNACIONALIZAÇÃO
O projeto deve ser preparado para múltiplos idiomas.

Inicialmente:

Português (Brasil);

Inglês.

Não precisa traduzir tudo imediatamente.

Mas a arquitetura deve evitar strings espalhadas pelo código.

40. DATA / TIMEZONE
Eventos de Pokémon GO possuem horários importantes.

Sempre armazenar timestamps de forma consistente.

A interface deve conseguir apresentar horários adequadamente para o usuário.

Quando houver timezone específico do evento, deixar isso claro.

41. MOBILE-FIRST PARA FERRAMENTAS
As ferramentas devem funcionar muito bem no celular.

Exemplo:

Um jogador pode estar em uma raid e abrir:

Pokémon GO Consultant
↓
Raid
↓
Current Boss
↓
Counters

e imediatamente descobrir o que usar.

Essa deve ser uma das experiências principais do produto.

42. PRINCÍPIO FUNDAMENTAL
O produto deve responder a três perguntas:

"O que está acontecendo?"
→ Events / Seasons / Raids / News

"O que eu devo usar?"
→ Counters / PvP / PvE / Team Builder

"O que é esse Pokémon?"
→ Database

E uma quarta:

"Me explica."
→ AI Assistant

43. ROADMAP
Não tente implementar tudo de uma vez.

Primeiro analise o projeto existente e crie um plano.

Sugestão:

Fase 1 — Foundation
analisar código atual;

identificar stack;

identificar banco;

preservar funcionalidades existentes;

organizar arquitetura;

criar nova navegação;

criar layout principal;

criar sistema de dados.

Fase 2 — Pokémon Database
Pokémon;

forms;

types;

stats;

evolution;

moves;

detail pages;

search.

Fase 3 — Events / Seasons / Raids
events;

seasons;

raids;

current data;

upcoming data.

Fase 4 — PvP / PvE
rankings;

movesets;

counters;

comparisons.

Fase 5 — Tools
calculators;

team builder;

comparison;

type calculator.

Fase 6 — Assistant
chat;

retrieval;

database tools;

contextual answers.

Fase 7 — Data Automation
providers;

sync;

validation;

change detection;

history.

Fase 8 — Personalization
accounts;

favorites;

collection;

personal recommendations.

44. IMPORTANTE SOBRE O CÓDIGO EXISTENTE
Antes de modificar qualquer coisa:

Analise toda a estrutura do projeto.

Identifique o framework utilizado.

Identifique o banco de dados.

Identifique as principais funcionalidades existentes.

Identifique quais partes podem ser reutilizadas.

Identifique possíveis problemas arquiteturais.

Não destrua funcionalidades existentes sem necessidade.

Faça um plano de migração/refatoração.

Só depois comece a implementar.

Se houver algo que precise ser substituído, prefira migração gradual.

45. PRIORIDADE ABSOLUTA
Não quero apenas uma landing page bonita.

Quero construir a fundação de um produto real.

Prioridades:

qualidade dos dados;

arquitetura escalável;

atualização automática;

busca;

database;

performance;

UX;

ferramentas;

AI Assistant;

visual.

A interface é importante, mas não deve mascarar uma arquitetura frágil.

46. RESULTADO ESPERADO
Ao final, quero que este projeto seja percebido como:

Uma das principais ferramentas para consultar, entender e tomar decisões dentro de Pokémon GO.

Não quero apenas um Pokédex.

Quero:

Pokédex
+
Database
+
PvP
+
PvE
+
Raid Assistant
+
Events
+
Seasons
+
Moves
+
Counters
+
Team Builder
+
Calculators
+
Change Tracking
+
Personal Collection
+
AI Assistant
+
Existing Game/Simulator

Tudo integrado em uma única plataforma.

47. PRIMEIRO PASSO AGORA
Antes de começar a implementar funcionalidades grandes:

Analise o projeto atual inteiro.

Depois me apresente:

1. Arquitetura atual
stack;

frontend;

backend;

database;

autenticação;

APIs;

estrutura de pastas.

2. O que já existe
Liste as funcionalidades atuais.

3. O que pode ser reutilizado
Identifique componentes, serviços, models e funcionalidades que podem continuar.

4. O que precisa ser refatorado
Identifique problemas que podem dificultar a nova arquitetura.

5. Proposta de arquitetura
Mostre como transformar o projeto atual na nova plataforma.

6. Data model
Proponha as principais entidades e relacionamentos.

7. Roadmap
Divida a implementação em etapas pequenas e testáveis.

8. Comece pela fundação
Depois da análise, implemente primeiro a arquitetura necessária para o novo produto, sem destruir o que já funciona.

48. REGRA DE OURO
Sempre que implementar algo novo, pense:

"Isso funciona como uma feature isolada hoje, mas pode fazer parte de uma grande plataforma de Pokémon GO amanhã?"

Quero código modular, componentes reutilizáveis, dados normalizados e arquitetura preparada para crescimento.

O projeto deve poder começar pequeno, mas ser capaz de evoluir para um super database e consultor completo de Pokémon GO.

Não implemente dados fictícios fingindo que são dados reais.

Quando uma integração ou fonte de dados ainda não estiver disponível, crie a abstração/interface necessária e deixe claramente identificado o que falta conectar.

Comece analisando o projeto atual antes de escrever código.

Esse prompt já está estruturado para o Replit entender que você não quer jogar fora o projeto antigo, mas transformar a aplicação em algo muito maior.

Eu também recomendo uma decisão arquitetural importante: não fazer o chatbot nem o frontend depender diretamente de sites como Pokémon GO Hub, PvPoke ou GamePress. O ideal é ter seu próprio modelo de dados + camada de providers/sincronização. Assim, quando uma Season mudar ou um move for alterado, você consegue atualizar o banco e o restante da aplicação continua funcionando.

E eu trataria o projeto conceitualmente como “Pokémon GO Intelligence Platform”, não como apenas “Pokédex”. Isso abre espaço para as três grandes experiências: consultar → analisar → receber orientação.