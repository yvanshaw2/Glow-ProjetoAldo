---
issue: 5
pull_request:
---

# Relatório: Acompanhar, editar, cancelar e reagendar agendamentos do cliente

## O que foi feito

`/appointments` lê e grava de verdade: o cliente autenticado vê os agendamentos atuais e o histórico, abre o detalhe, edita e cancela o que está "Agendado" e reagenda o que está "Concluído" (UC07, UC25, UC26, RF028 a RF032). As cinco rotas de `/api/me/appointments` usam `requireClient` e só alcançam os agendamentos do cliente da sessão: o de outro cliente responde 404 (RS009, L1). O cancelamento e a edição só valem no status "Agendado" (RN019, RN032), a nova data não pode ser anterior à marcada (RN033), o reagendamento usa o catálogo atual e passa o original a "Reagendado" (RN020) e a edição concorrente responde 409 `VERSION_CONFLICT` (RNF011). As cinco entradas saíram da lista de demonstração e o aviso saiu da página (decisão 0055). As lacunas L1 a L3 foram decididas com a opção 1.

## Arquivos alterados

- `src/app/api/me/appointments/route.ts` (`GET`), `[id]/route.ts` (`GET` e `PATCH`), `[id]/cancel/route.ts` e `[id]/reschedule/route.ts` — rotas do cliente; `README.md` da pasta.
- `src/server/services/appointments.ts` — `listMyAppointments`, `getMyAppointment`, `editMyAppointment`, `cancelMyAppointment` e `rescheduleMyAppointment`; `changeStatus`, a edição e o reagendamento do painel passam a receber o chamador (cliente ou funcionário) e conferem a posse.
- `src/server/repositories/appointments.ts` — `listClientAppointments`.
- `src/server/rules/appointment-editing.ts` — `findEditErrors` recebe o ator; `describeClientInvalidStatus`.
- `src/shared/constants/appointment-views.ts` e `src/shared/validation/appointments.ts` — escopos e `myAppointmentListQuerySchema`.
- `src/app/(portal)/appointments/page.tsx` — sem o aviso de demonstração.
- `src/lib/demo/routes.ts`, `src/lib/demo/appointments.ts` (removido) e `README.md` da pasta.
- `tests/validation/appointments.test.ts` e `tests/rules/appointment-editing.test.ts`.

## Testes executados

- `npm run check`: formatação, tipos, lint e 788 testes passando (37 arquivos).
- Testes novos escritos antes do código e vistos falhar (8): `myAppointmentListQuerySchema`, `findEditErrors` com o ator `client` e `describeClientInvalidStatus`.
- **Não executados:** o roteiro de API no banco local (listagem e ordem dos dois escopos, cancelamento, edição com recálculo, `VERSION_CONFLICT`, reagendamento, 404 com agendamento e veículo de outra conta, 403 e 401, e o mesmo roteiro no painel para ver que a refatoração do serviço não regrediu), os passos manuais em `/appointments` (detalhe, "Editar", "Reagendar", "Cancelar agendamento", vazio) e o Lighthouse. O agente não lê o `.env.local`, necessário para subir a aplicação. Os critérios de aceitação de rota e de tela dependem dessa conferência, a fazer na pré-visualização ou no banco local, com duas contas de cliente e agendamentos "Agendado" e "Concluído".

## Documentação atualizada

- Módulos: `docs/agendamento/rotas.md`, `docs/agendamento/meus-agendamentos.md`, `docs/agendamento/agendar-servico.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/plataforma/openapi.yaml` (as cinco operações, `ClientAppointmentPage` e `ClientAppointmentSummary`).
- Lacunas resolvidas: L1 (404 do agendamento de outro cliente), L2 (entrada e resposta das cinco rotas) e L3 (mensagens do 409 do cliente e ordem das conferências) → `rotas.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- Verificação no banco e na tela, descrita acima.
- `POST /api/admin/dashboard/analysis` (#66) continua em demonstração, então `src/lib/demo/` (inclusive `list.ts`, usado por um teste), o `NOT_IMPLEMENTED` e o `DemoNotice` ficam.
- As migrations `create_appointment` e `update_appointment_functions` precisam estar aplicadas onde se testar; quem as aplica é o Yvan.
