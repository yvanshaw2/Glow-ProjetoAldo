---
issue: 50
pull_request: 128 e 129
---

# Relatório: Status, conclusão, cancelamento, edição e reagendamento no painel

Entregue em dois pull requests (L1): a parte 1 (#128) traz avanço, conclusão e cancelamento; a parte 2 (#129, empilhada na parte 1) traz edição e reagendamento, com a migration.

## O que foi feito

O funcionário com a permissão `appointments` avança, conclui, cancela, edita e reagenda agendamentos em `/admin/appointments` com dados reais (UC12, UC25 FA01, UC26 FA01; RF052 a RF056; RN005, RN006, RN008, RN010, RN012 a RN015, RN017 a RN020, RN032 a RN034, RN037; RS008, RNF010, RNF011).

- **Avançar, concluir e cancelar** (parte 1): Agendado a Finalizado sem confirmação; a conclusão grava a forma de pagamento usada (a forma do agendamento mantém o percentual e o total gravados, outra usa o percentual vigente); o cancelamento vale para Agendado e Em espera. A recusa responde 409 `INVALID_STATUS` com o status atual na mensagem (UC12 FE01).
- **Editar** (parte 2): em qualquer status, sem mudar o status. A troca de veículo ou de serviços recalcula todos os itens pelo catálogo atual e refaz a cópia do veículo; a troca da forma aplica o percentual vigente; o que não mudou fica como gravado (L2). A data e o horário só são conferidos quando mudam (RN033). `updatedAt` e 409 `VERSION_CONFLICT` (RNF011).
- **Reagendar** (parte 2): o Concluído gera um novo Agendado, com o mesmo cliente e veículo e os serviços que o catálogo atual ainda oferece, valores e previsão recalculados; o original vai a Reagendado e mantém `completed_at`.
- As cinco rotas e o `PATCH` saíram da lista de demonstração, e o aviso de demonstração saiu do detalhe, do "Editar", do "Reagendar" e do "Concluir" (decisão 0055). Lacunas L1 a L5 decididas com a opção 1.

## Arquivos alterados

Parte 1:

- `src/app/api/admin/appointments/[id]/advance/route.ts`, `complete/route.ts`, `cancel/route.ts`; `services/appointments.ts` (`advanceAppointment`, `completeAppointment`, `cancelAppointment`); `repositories/appointments.ts` (`changeAppointmentStatus`); `rules/appointment-editing.ts` (`describeInvalidStatus`); `shared/validation/appointments.ts` (`appointmentCompleteSchema`); `complete-appointment-dialog.tsx`.

Parte 2:

- `supabase/migrations/20261027190000_update_appointment_functions.sql` — `update_appointment` (confere a versão, refaz a cópia do veículo e troca os serviços numa transação) e `reschedule_appointment` (trava o original, cria o novo por `create_appointment` e passa o original a `rescheduled`), com `revoke` de `public`, `anon` e `authenticated` e `grant` só a `service_role`.
- `src/app/api/admin/appointments/[id]/route.ts` (`PATCH`) e `[id]/reschedule/route.ts`.
- `src/server/services/appointments.ts` (`editAppointment`, `rescheduleAppointment`); `repositories/appointments.ts` (`updateAppointment`, `insertRescheduledAppointment`).
- `src/server/rules/appointment-editing.ts` (`findEditChanges`, `findEditErrors`); `appointment-booking.ts` (as três mensagens passam a ser exportadas).
- `src/shared/validation/appointments.ts` — `appointmentEditSchema` e `appointmentRescheduleSchema`.
- `src/lib/demo/routes.ts`; `appointment-details-dialog.tsx`, `appointment-wizard.tsx`, `reschedule-appointment-dialog.tsx` e `src/app/(admin)/admin/appointments/page.tsx` (sem o aviso e sem os comentários de demonstração).
- Testes: `tests/rules/appointment-editing.test.ts`, `tests/validation/appointments.test.ts`.
- `docs/agendamento/rotas.md`, `dados.md`, `calculos.md`, `agendamentos-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md`, `docs/padroes/api.md` e `docs/plataforma/openapi.yaml`.

## Testes executados

- `npm run check`: formatação, tipos, lint e 760 testes passando (36 arquivos).
- Banco local descartável (`db reset` aplicando a migration, `seed-demo.sql`, `next start` do build de produção) e roteiros de API com a conta de administrador, de funcionário com e sem `appointments` e de cliente. Parte 1: 401 e 403 nas três rotas; quatro avanços, o quarto 409 com "Finalizado" na mensagem; conclusão trocando a forma (total, percentual e `completed_at` no banco), mesma forma mantendo o gravado; cancelamento de Agendado e Em espera, 409 em Em execução, Cancelado e Reagendado; dois avanços simultâneos. Parte 2: 401 e 403 no `PATCH` e no `reschedule`; `updatedAt` ausente e corpo sem campo 400; edição só da data mantém preços, total e cópias (mesmo com o catálogo mudado) e recalcula a previsão; versão antiga 409 sem gravar; data no passado, domingo, pausa e fora da meia hora 400 em `scheduledAt`; forma trocada com o percentual vigente; serviços trocados com os preços do catálogo e do porte do veículo, subtotal, total, duração e linhas de `appointment_services` conferidos; adicional sozinho, serviço inativo e repetido 400 em `serviceIds`; serviço inativo mantido não impede editar a data; veículo de outro cliente 400 e troca de veículo com a cópia e o preço do novo porte; Em espera com data depois de agora 400 e antes de agora 200, mantendo o status; Cancelado com qualquer horário aberto 200; Concluído mantém status e `completed_at`; reagendamento no passado 400 sem gravar, com serviço inativo de fora, preços e percentual de hoje, `rescheduled_from_id`, `created_by_staff_id`, original `rescheduled` com `completed_at` intacto, segundo reagendamento 409, Agendado 409, nenhum serviço restante 400, duas chamadas simultâneas (um 201 e um 409, um filho) e cliente excluído 404 com o original ainda concluído; `update_appointment` com versão antiga devolve `null`; só o `service_role` executa as funções. Todas passaram.
- Navegador a 360 e 1440 px: conclusão, cancelamento, edição de horário (janela sem aviso, fecha, status mantido), conflito de versão (aviso no topo, janela aberta) e reagendamento pelo histórico (original `rescheduled`, novo `scheduled`); sem transbordo horizontal nem erro de página.
- Não rodados: Lighthouse, teclado completo e LCP (a acessibilidade será ajustada no fim).

## Documentação atualizada

- Módulos: `rotas.md`, `dados.md`, `calculos.md`, `agendamentos-do-painel.md`, `mensagens-de-validacao.md`, `docs/padroes/api.md` e `openapi.yaml`.
- Lacunas resolvidas: L1 (dois PRs) → plano; L2 (o que a edição recalcula; status na mensagem do `INVALID_STATUS`) → `calculos.md`, `rotas.md`, `api.md`; L3 (campos e mensagens do `PATCH`) → `rotas.md`, `mensagens-de-validacao.md`; L4 (prévia ignora `appointmentId`) → `rotas.md`; L5 (reagendamento com serviço de fora e composição) → `rotas.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- **A migration precisa ser aplicada pelo Yvan (`supabase db push`) antes de testar a edição e o reagendamento na pré-visualização**; as ações de status não dependem dela.
- A parte 2 passa de 400 linhas fora dos testes (a migration, o serviço e as regras de edição são o grosso); fica para o revisor decidir.
- Desvio da lista do plano: `src/server/rules/appointment-booking.ts` passou a exportar as três mensagens que a edição reaproveita (a confirmar).
- `src/lib/demo/`, `NOT_IMPLEMENTED` e `DemoNotice` ficam: as rotas `/api/me/*` e a análise do dashboard ainda os usam.
