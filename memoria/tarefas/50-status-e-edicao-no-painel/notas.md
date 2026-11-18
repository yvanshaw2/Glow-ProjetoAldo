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
