---
issue: 50
pull_request:
---

# Relatório: Status, conclusão e cancelamento no painel (parte 1 de 2 da #50)

## O que foi feito

O funcionário com a permissão `appointments` avança, conclui e cancela agendamentos em `/admin/appointments` com dados reais (UC12, RF052 a RF054, RN017 a RN019, RN012, RN018). O avanço vai de Agendado a Finalizado, a conclusão grava a forma de pagamento usada, com o total recalculado quando a forma muda, e o cancelamento vale para Agendado e Em espera. A recusa de uma transição responde 409 `INVALID_STATUS` com o status atual na mensagem (UC12 FE01). As três rotas saíram da lista de demonstração, e o aviso saiu da janela "Concluir" (decisão 0055). Edição e reagendamento seguem na parte 2. Lacunas L1 e L2 decididas com a opção 1.

## Arquivos alterados

- `src/app/api/admin/appointments/[id]/advance/route.ts`, `complete/route.ts`, `cancel/route.ts` — `POST`, com `requirePermission("appointments")`.
- `src/server/services/appointments.ts` — `advanceAppointment`, `completeAppointment`, `cancelAppointment`.
- `src/server/repositories/appointments.ts` — `changeAppointmentStatus`: um `update` só, com a condição do status lido.
- `src/server/rules/appointment-editing.ts` — `describeInvalidStatus`.
- `src/shared/validation/appointments.ts` — `appointmentCompleteSchema`.
- `src/lib/demo/routes.ts` — saem as três entradas.
- `src/components/admin/appointments/complete-appointment-dialog.tsx` — sem o aviso de demonstração.
- Testes: `tests/rules/appointment-editing.test.ts` (novo), `tests/validation/appointments.test.ts`.
- `docs/agendamento/rotas.md`, `agendamentos-do-painel.md`, `docs/padroes/api.md` e `docs/plataforma/openapi.yaml`.

## Testes executados

- `npm run check`: formatação, tipos, lint e 734 testes passando (36 arquivos).
- Banco local descartável (`fresh.sh`, `seed-demo.sql`, `next start` do build de produção) e roteiro de API: 401 e 403 nas três rotas (sem sessão, funcionário sem `appointments`, cliente) sem gravar; quatro avanços (o quarto 409 com "Finalizado" na mensagem); cancelar Finalizado 409; detalhe do Finalizado com as quatro formas; conclusão sem forma 400 e com `total`/`status` no corpo descartados; conclusão no crédito com o total do crédito, `fee_percent` e `completed_at` no banco; segunda conclusão e avanço do Concluído 409; mesma forma mantém o percentual e o total gravados mesmo com o percentual do Pix mudado; cancelamento de Agendado e de Em espera 200 com `cancelled_at`, de Em execução e de Reagendado 409, de Cancelado 409; dois avanços simultâneos sem pular status; id inválido e inexistente 404. Todas passaram.
- Navegador a 360 e 1440 px: conclusão de um Finalizado (janela sem aviso, fecha, `completed` no banco) e cancelamento de um Agendado em "Futuros" (confirmação, janelas fechadas, `cancelled` no banco); sem transbordo horizontal.
- Não rodados: Lighthouse e teclado completo (a acessibilidade será ajustada no fim); o aviso do detalhe continua, porque "Editar" e "Reagendar" ainda são demonstração.

## Documentação atualizada

- Módulos: `rotas.md`, `agendamentos-do-painel.md`, `docs/padroes/api.md` (mensagem do `INVALID_STATUS`) e `openapi.yaml` (três caminhos, `InvalidStatus` e `AppointmentCompleteInput`).
- Lacunas resolvidas: L1 (dois PRs) → plano; L2, na parte do `INVALID_STATUS` → `api.md` e `rotas.md` (o restante de L2, o que a edição recalcula, entra na parte 2).
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- Edição (`PATCH`) e reagendamento, com a migration, na parte 2 da #50; o aviso do detalhe sai lá.
