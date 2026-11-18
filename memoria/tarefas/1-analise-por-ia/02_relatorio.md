---
issue: 1
pull_request: <a preencher>
---

# Relatório: Análise do período no dashboard, gerada por IA

Relatório parcial: PR 1 de 7, só de documentação (`Refs #1`). Os PRs 2 a 7, de código, completam este relatório.

## O que foi feito

- **Requisitos novos**, com os textos aprovados no plano (L2, L7, L8):
  - RF091 (escolha entre análise resumida e detalhada), RF092 (valores do sistema e comparação com o período anterior junto à análise), RF093 (copiar) e RF094 (imprimir ou salvar em PDF);
  - RN040 (indicadores da análise detalhada: serviços, categorias, complementos, veículos, pagamentos, canal, clientes novos e recorrentes, retornos, dias da semana, horários, cancelamentos por serviço e agendamentos em aberto), com as definições de cliente novo (L4) e da categoria atual do serviço (L5);
  - RN038 com a receita em blocos de sete dias acima de 62 dias (L6); RN039 com o formato da detalhada (L2);
  - UC27 com a escolha do modo, a comparação no passo 5, FA04 (copiar) e FA05 (imprimir).
- **Contrato da rota** em `rotas.md`: `detail` na entrada; `detail`, `promptVersion`, `comparison`, `revenueSeries`, `details`, `sections` e `recommendations` na resposta. A especificação OpenAPI fica para os PRs 2 e 6, com a rota.
- **Cálculos:** `calculos.md`, seção 6 (comparação, série da receita, modos e conferência) e seção 7, nova (indicadores de RN040 e a função `dashboard_details`).
- **Tela:** `dashboard-do-painel.md`, seção "Análise do período", com a escolha do modo, os números do sistema, a tabela e o gráfico dos dois períodos, as seções da detalhada, as sugestões, a cópia e a impressão.
- **Serviço de IA:** `servico-de-ia.md` com os modos, os novos tamanhos da entrada, a versão das instruções e a avaliação (L9).
- **Testes:** os casos novos em `docs/padroes/testes.md` e o roteiro "Avaliação da análise por IA" em `workflows/procedimentos/testes.md` (L9).
- **Decisão 0057** (exportação pela impressão do navegador, sem biblioteca de PDF), gravada.
- **Issue #1:** corpo atualizado com a seção "Ampliação aprovada em 18/11/2026" (ponto 6 do plano).

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
- Lacunas resolvidas: L2 → RF091, RN039, UC27; L3, L4 e L5 → RN040 e `calculos.md`, seção 7; L6 → RN038 e `calculos.md`, seção 6; L7 → RF092 e `dashboard-do-painel.md`; L8 → RF093, RF094, UC27 FA04 e FA05, decisão 0057; L9 → `servico-de-ia.md` e `workflows/procedimentos/testes.md`. L1 entra no PR 4.
- Decisões: 0057 criada.
- Documentos formais a atualizar (issue #2):
  - Análise do Sistema: quadro do dashboard (RF091 a RF094); quadro de regras (RN040; RN038 e RN039 com os textos novos); quadro do UC27 (passos 1, 2 e 5, FA04 e FA05).
  - Arquitetura de Software: árvore de `src/server/` (`rules/dashboard-details.ts`), funções puras (seção 7 de `calculos.md`), funções do banco (`dashboard_details`), quadro de decisões (0057), apêndice das rotas (entrada e resposta da análise).
  - Desenvolvimento com IA: a avaliação da análise por IA na seção de testes.

## Pendências

- PRs 2 a 7 da issue #1 (ordem em `01_plano.md`).
- Perguntas ao Yvan registradas em `notas.md`: o corte no ponto 1 (as duas opções marcadas), a decisão 0055 (antes do PR 4) e o lugar da função do texto copiado (antes do PR 3).
- Sugestão fora do plano: dividir `calculos.md`, `dashboard-do-painel.md` e `rotas.md`, acima do limite de tamanho de `docs/CONTEXT.md`.
