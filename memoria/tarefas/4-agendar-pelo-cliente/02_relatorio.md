---
issue: 4
pull_request:
---

# Relatório: Agendar serviço pelo cliente no portal

## O que foi feito

`/booking` grava de verdade: o cliente autenticado escolhe o veículo, os serviços (com os adicionais), a data, o horário e a forma de pagamento, confere o resumo e confirma (UC06, RF019 a RF027). As três rotas de `/api/me` usam `requireClient` e só o cliente da sessão (RS009): o veículo que não está na conta responde 404 (L1). O servidor calcula os valores pelo catálogo vigente e pelo porte (RN009, RN010, RN012, RN014, RN034), confere a composição e a data (RN005, RN006, RN013, RN015) e grava o agendamento `scheduled`, a cópia dos dados e os serviços pela função `create_appointment`, sem funcionário (RN003, RN037, RNF010, RN016). As três entradas saíram da lista de demonstração e o aviso saiu de `/booking` (decisão 0055). As lacunas L1 a L3 foram decididas com a opção 1.

## Arquivos alterados

- `src/app/api/me/bookable-services/route.ts`, `src/app/api/me/appointments/route.ts` (só `POST`) e `preview/route.ts` — novos.
- `src/server/services/appointments.ts` — `registerOrder` (corpo do registro, usado pelo painel e pelo cliente), `lookUpMyServices`, `previewMyAppointment` e `createMyAppointment`; `repositories/appointments.ts`: `staffId` aceita `null`.
- `src/shared/validation/appointments.ts` — `myAppointmentInputSchema` e `portalBookingFormSchema`.
- `src/components/portal/appointments/booking-wizard.tsx` — resolvedor do Zod e campos da API levados às etapas; `src/app/(portal)/booking/page.tsx` — sem o aviso.
- `src/lib/demo/routes.ts` e `src/lib/demo/appointments.ts` — saem as três entradas, as respostas delas e o catálogo, a prévia e os serviços que só elas usavam.
- `src/app/api/me/appointments/README.md`, `docs/agendamento/rotas.md`, `docs/agendamento/agendar-servico.md` e `docs/plataforma/openapi.yaml`.
- `tests/validation/appointments.test.ts`.

## Testes executados

- `npm run check`: formatação, tipos, lint e 776 testes passando (37 arquivos).
- Testes novos escritos antes do código e vistos falhar (7): `myAppointmentInputSchema` e `portalBookingFormSchema`.
- **Não executados:** o roteiro de API no banco local (as três rotas, o 404 do veículo de outra conta, o mesmo horário duas vezes, o preço mudado depois, o serviço inativo), o passo manual no `/booking` e o Lighthouse. O agente não lê o `.env.local`, necessário para subir a aplicação, e o `next build` local não terminou (parou numa verificação de segurança da versão do Next.js, antes de compilar). Os critérios de aceitação de rota e de tela dependem dessa conferência, a fazer na pré-visualização ou no banco local, com a migration `create_appointment` aplicada.

## Documentação atualizada

- Módulos: `docs/agendamento/rotas.md`, `docs/agendamento/agendar-servico.md` e `docs/plataforma/openapi.yaml` (as três operações, `ClientAppointment` e `MyAppointmentInput`).
- Lacunas resolvidas: L1 (404 do veículo que não é do cliente), L2 (paginação, limites, resposta e `fields` das três rotas) e L3 (janelas de edição e reagendamento recebem 404 da prévia real até a #108) → `rotas.md` e `agendar-servico.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- Verificação no banco e na tela, descrita acima.
- `GET /api/me/appointments`, o detalhe, a edição, o cancelamento e o reagendamento do cliente seguem em demonstração (#108).
- A migration `create_appointment` precisa estar aplicada onde se testar; quem a aplica é o Yvan.
