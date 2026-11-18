# Notas: 50-status-e-edicao-no-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-27 – descoberta: dependências conferidas

`git fetch` feito: `origin/main` em 9df04e7 (PR #127, #49), com `create_appointment`, `findOrderServices`, `workOutOrder` e as buscas do assistente. O worktree (`claude/amazing-ritchie-695765`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em 9df04e7, árvore limpa.

## 2026-10-27 – descoberta: o que já existe

- As telas já chamam as cinco rotas (`advance-button`, detalhe, `complete-appointment-dialog`, `reschedule-appointment-dialog`, `appointment-wizard` com `updatedAt` e `VERSION_CONFLICT`); falta só a API e tirar o `DemoNotice` de quatro componentes.
- As funções puras (`findNextStatus`, `canEditAppointment`, `findScheduleChangeError`, `listPaymentOptions`) e os testes delas já existem (#36).
- `src/lib/demo/` continua depois da #50: `/api/me/*` e `dashboard/analysis` seguem em demonstração, então `NOT_IMPLEMENTED` e `DemoNotice` ficam.

## 2026-10-27 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L5 (divisão em dois PRs, o que a edição recalcula e a mensagem do `INVALID_STATUS`, recusas do `PATCH`, prévia e `appointmentId`, reagendamento com serviço de fora), nenhuma caixa marcada. Nada foi construído. A etapa 02 só começa quando o Yvan gravar `status: aprovado` no arquivo e eu conferir o status e as caixas.

## 2026-10-27 – decisão: plano aprovado

O Yvan gravou `status: aprovado` em 27/10/2026 (19:00), com a opção 1 em L1 a L5. Conferido no arquivo antes da etapa 02; o `status` passou a `em_execucao`. Duas ramificações empilhadas: `feat/50-appointment-status` (PR #128) e `feat/50-appointment-edit` (parte 2).

## 2026-10-27 – desvio: lista de arquivos do plano

`src/server/rules/appointment-booking.ts` não estava na lista: passou a exportar `UNAVAILABLE_SERVICE_MESSAGE`, `COMPOSITION_MESSAGES` e `START_MESSAGES`, para a edição reusar os textos do registro. **A confirmar pelo Yvan.** Nenhum outro arquivo fora da lista foi tocado; `appointment-details-dialog.tsx` perdeu o aviso na parte 2, como previsto.

## 2026-10-27 – descoberta: armadilhas da verificação

- `fresh.sh` precisa ser chamado pelo caminho absoluto (`bash "$N/fresh.sh"`); com caminho relativo falha em silêncio e o login dá 401.
- Rotas de escrita sem corpo (`advance`, `cancel`) exigem o cabeçalho `Origin` nos roteiros de API (o navegador o manda).
- A placa aparece como `GLW-3030` no detalhe e como `GLW3030` no banco.
