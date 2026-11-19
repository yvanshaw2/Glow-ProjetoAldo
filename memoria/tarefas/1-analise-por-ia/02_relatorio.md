---
issue: 1
pull_request: 12
---

# Relatório: Análise do período no dashboard, gerada por IA

Relatório parcial: PRs 1 (#12), 2 (#13), 3a (#14), 3b (#15), 4 (#16), 5 (#17), 6 (#18) e 7 (#19), incorporados, e 8, com `Refs #1`. Os PRs 9 a 13 completam este relatório.

## O que foi feito

### PR 1 (#12, documentação da análise)

- **Requisitos novos**, com os textos aprovados no plano (L2, L7, L8):
  - RF091 (escolha entre análise resumida e detalhada), RF092 (valores do sistema e comparação com o período anterior junto à análise), RF093 (copiar) e RF094 (imprimir ou salvar em PDF);
  - RN040 (indicadores da análise detalhada: serviços, categorias, complementos, veículos, pagamentos, canal, clientes novos e recorrentes, retornos, dias da semana, horários, cancelamentos por serviço e agendamentos em aberto), com as definições de cliente novo (L4) e da categoria atual do serviço (L5);
  - RN038 com a receita em blocos de sete dias acima de 62 dias (L6) e o período anterior pelo calendário, com o período em andamento analisado até o dia corrente (L18); RN039 com o formato da detalhada (L2);
  - UC27 com a escolha do modo, a comparação no passo 5, FA04 (copiar) e FA05 (imprimir).
- **Contrato da rota** em `rotas.md`: `detail` na entrada; `analyzedTo`, `detail`, `promptVersion`, `comparison`, `revenueSeries`, `details`, `sections` e `recommendations` na resposta. A especificação OpenAPI fica para os PRs 2 e 6, com a rota.
- **Cálculos:** `calculos.md`, seção 6 (comparação, série da receita, modos e conferência) e seção 7, nova (indicadores de RN040 e a função `dashboard_details`).
- **Tela:** `dashboard-do-painel.md`, seção "Análise do período", com a escolha do modo, os números do sistema, a tabela e o gráfico dos dois períodos, as seções da detalhada, as sugestões, a cópia e a impressão.
- **Serviço de IA:** `servico-de-ia.md` com os modos, os novos tamanhos da entrada, a versão das instruções e a avaliação (L9).
- **Testes:** os casos novos em `docs/padroes/testes.md` e o roteiro "Avaliação da análise por IA" em `workflows/procedimentos/testes.md` (L9).
- **Decisão 0057** (exportação pela impressão do navegador, sem biblioteca de PDF), gravada.
- **Issue #1:** corpo atualizado com a seção "Ampliação aprovada em 18/11/2026" (ponto 6 do plano).

### PR 2 (#13, documentação dos dados novos)

- RF095 (motivo do cancelamento), RF096 (custo dos insumos), RF097 (avaliação do atendimento) e RF098 (atendimentos simultâneos).
- RN041 (motivo do cancelamento), RN042 (custo dos insumos e margem), RN043 (avaliação), RN044 (ocupação da agenda) e UC28 (avaliar atendimento), novos; RN019, RN037 (cópia do custo e da categoria) e RN040 (itens 13 a 17 e a categoria copiada), alterados; UC07, UC12, UC13, UC14 e UC23 com a captura dos dados novos.
- RS021 (o custo é dado interno) e o código 409 `REVIEW_NOT_ALLOWED`.
- `dados.md`, `rotas.md` e as telas dos três assuntos; `calculos.md` (o custo do item e os itens novos da seção 7); `infraestrutura.md` (o que o `seed-demo.sql` preenche); `visao-geral.md` (o custo dentro do escopo); as mensagens de validação e os casos de teste.

### PR 3a (#14, regras da análise resumida)

- `src/server/rules/dashboard-analysis.ts`: os períodos comparados pelo calendário e até o dia corrente (L18), a variação, a comparação dos quatro indicadores, a série da receita por dia ou por blocos de sete dias, a entrada do modelo só com agregados (RN038), as instruções da resumida (`resumida-1`) e a conferência da resposta (RN039).
- `dashboardAnalysisSchema`, com a resumida como padrão, e os tipos `DashboardAnalysis`, `DashboardComparison` e `DashboardRevenueSeries`.
- Testes: 29 das regras e 5 do esquema, escritos antes do código.

### PR 3b (#15, rota da análise resumida)

- `POST /api/admin/dashboard/analysis`, com `requirePermission("dashboard")`: valida o período e o tipo, compara pelo calendário até o dia corrente (L18), calcula os indicadores dos dois períodos, chama o serviço de IA e confere a resposta (RN039); 409 `INSUFFICIENT_DATA` sem chamar a IA e 503 `AI_UNAVAILABLE` nas falhas.
- `src/server/ai/chat-completion.ts`: Chat Completions com `fetch`, esquema JSON estrito, corte em 15 s, sem nova tentativa, com `AI_BASE_URL`, `AI_MODEL` e `AI_API_KEY` lidas a cada chamada.
- Registro: `dashboard_analysis_failed` com o motivo e `dashboard_analysis_generated` com o modelo, a versão das instruções, os tokens e a duração; nunca a chave, as mensagens nem a resposta.
- OpenAPI da rota; `servico-de-ia.md` com os campos do pedido ao Groq.

### PR 4 (#16, cartão ligado à rota)

- O cartão "Análise do período" chama a rota real e não mostra mais o aviso de demonstração; a lista de `src/lib/demo/routes.ts` ficou vazia.
- Cada observação de um indicador traz o valor e a variação do sistema ("Receita: R$ 12.500,00, alta de 25,0% em relação ao período anterior"), com os ícones de alta, queda ou estabilidade; a tabela "Este período × período anterior" e o gráfico da receita dos dois períodos (RF092).
- "Copiar análise" (texto simples, RF093) e "Imprimir ou salvar em PDF" (impressão do navegador, sem navegação, controles nem agenda do dia, no tema claro, RF094, decisão 0057).
- Testes: 10 do texto copiado e dos valores, escritos antes do código.

### PR 5 (#17, fim da demonstração)

- Saíram `src/lib/demo/`, o `DemoNotice` e o código `NOT_IMPLEMENTED`; o cliente da API fala só com a rede, e o teste dele perdeu a simulação da lista de demonstração.
- Decisão 0058 (L16), que substitui a 0055; os textos de demonstração saíram dos padrões, do procedimento e do modelo de PR e das páginas de tela.

### PR 6 (#18, indicadores detalhados)

- Migration com a função `dashboard_details`, só de leitura e sem privilégio para `anon` e `authenticated`: os números de RN040, itens 1 a 13, agregados no banco.
- `findDashboardDetails` no repositório do dashboard e `src/server/rules/dashboard-details.ts`, que monta os cinco maiores e "Demais", as taxas e médias e completa dias da semana, horas, tipos, portes e formas de pagamento.
- `DashboardDetails` e as cinco seções da análise detalhada (`dashboard-sections.ts`).
- Testes: 12, escritos antes do código. A migration foi aplicada sem erro no banco local; a função com dados não foi conferida pelo agente.

### PR 7 (#19, análise detalhada no servidor)

- `POST /api/admin/dashboard/analysis` aceita `detail: "detailed"` (RF091): lê os indicadores de RN040 dos dois períodos, manda-os ao modelo com as instruções `detalhada-1` e confere as cinco seções e as sugestões (RN039); a resposta traz `details`, `sections` e `recommendations`.
- OpenAPI com `DashboardDetails` e a resposta da detalhada.
- Testes: 9 das regras e 1 do esquema, escritos antes do código.

### PR 8 (análise detalhada na tela)

- A escolha "Resumida" ou "Detalhada" antes de gerar (RF091); na detalhada, as cinco seções com as observações da IA e os "Números da seção" do sistema, e as sugestões com o aviso "Sugestões geradas por IA: avalie antes de colocar em prática.".
- O texto copiado e a impressão levam as seções e as sugestões.
- Testes: 8 dos números das seções e do texto copiado, escritos antes do código.

## Arquivos alterados

- `docs/agendamento/`: `RN040-indicadores-da-analise-detalhada.md` criado; `requisitos.md`, `RN038-dados-da-analise-do-dashboard.md`, `RN039-conteudo-da-analise-do-dashboard.md`, `UC27-gerar-analise-do-dashboard.md`, `calculos.md`, `rotas.md`, `dashboard-do-painel.md` e `CONTEXT.md` alterados.
- `docs/plataforma/`: `servico-de-ia.md` e `mensagens-de-validacao.md` alterados.
- `docs/padroes/testes.md` e `workflows/procedimentos/testes.md` alterados.
- `docs/decisoes/0057-exportacao-pela-impressao-do-navegador.md` criado; `docs/decisoes/CONTEXT.md` alterado.
- `memoria/tarefas/1-analise-por-ia/`: `01_plano.md`, `notas.md` e este relatório.

## Testes executados

- `npm run check`: aprovado (formatação, tipos, lint e 788 testes em 37 arquivos), sem erros nem avisos; nenhum código mudou.
- Links relativos dos arquivos alterados apontam para arquivos que existem; RF091 a RF094 e RN040 estão definidos uma vez cada.

## Documentação atualizada

- Módulos: os de "Arquivos alterados".
- Lacunas resolvidas: L2 → RF091, RN039, UC27; L3, L4 e L5 → RN040 e `calculos.md`, seção 7; L6 → RN038 e `calculos.md`, seção 6; L7 → RF092 e `dashboard-do-painel.md`; L8 → RF093, RF094, UC27 FA04 e FA05, decisão 0057; L9 → `servico-de-ia.md` e `workflows/procedimentos/testes.md`; L18 → RN038, `calculos.md`, seção 6, `rotas.md` e `dashboard-do-painel.md`. L1 e L16 entram no PR 5; L10 a L15, no PR 2.
- Decisões: 0057 criada; 0058 criada, que substitui a 0055.
- Documentos formais a atualizar (issue #2):
  - Análise do Sistema: quadro do dashboard (RF091 a RF094); quadro de regras (RN040; RN038 e RN039 com os textos novos); quadro do UC27 (passos 1, 2 e 5, FA04 e FA05).
  - Arquitetura de Software: árvore de `src/server/` (`rules/dashboard-details.ts`), funções puras (seção 7 de `calculos.md`), funções do banco (`dashboard_details`), quadro de decisões (0057), apêndice das rotas (entrada e resposta da análise).
  - Desenvolvimento com IA: a avaliação da análise por IA na seção de testes.
  - Do PR 5: na Arquitetura, o quadro de decisões com a 0058 e a 0055 substituída, o quadro de erros sem o `NOT_IMPLEMENTED` e a árvore de `src/lib/` sem `demo/`; onde os documentos citarem as telas de demonstração, o texto da 0058.

## Pendências

- PRs 9 a 13 da issue #1 (ordem em `01_plano.md`).
- A migration do PR 6 é aplicada pelo Yvan (`npx supabase db push`) antes da incorporação.
- O corpo da issue #1 não recebeu a segunda ampliação (caixa do ponto 6 vazia), e o exemplo do critério de aceitação de lá difere da L18.
- Sugestão fora do plano: dividir `calculos.md`, `dashboard-do-painel.md` e `rotas.md`, acima do limite de tamanho de `docs/CONTEXT.md`.
