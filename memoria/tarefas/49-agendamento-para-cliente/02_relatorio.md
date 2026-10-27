---
issue: 49
pull_request:
---

# Relatório: Registrar agendamento para cliente no painel

## O que foi feito

O UC11 funciona de ponta a ponta com dados reais: o funcionário com a permissão `appointments` abre "Novo agendamento" em `/admin/appointments`, busca o cliente, escolhe o veículo, os serviços (com os adicionais do principal), a data, o horário e a forma de pagamento, confere o resumo e confirma. O servidor calcula os valores pelo catálogo vigente e pelo porte do veículo (RN009, RN010, RN012, RN014, RN034), confere a composição e a data (RN005, RN006, RN013, RN015) e grava o agendamento `scheduled`, a cópia dos dados e os serviços numa transação, pela função `create_appointment` (RN003, RN037, RNF010). Não há controle de capacidade (RN016). As cinco rotas saíram da lista de demonstração, e o aviso de demonstração saiu do "Novo agendamento" (decisão 0055); o "Editar" mantém o aviso, porque o `PATCH` é da #50. As lacunas L1 a L4 foram decididas com a opção 1.

## Arquivos alterados

- `supabase/migrations/20261027160000_create_appointment_function.sql` — função `create_appointment`, com `revoke` de `public`, `anon` e `authenticated` e `grant` só a `service_role`; faz a cópia do cliente, do veículo e dos serviços dentro da transação e devolve `null` sem gravar quando o cliente foi excluído ou o veículo não é dele.
- `src/app/api/admin/appointments/route.ts` — `POST`; `preview/route.ts` e `lookup/{clients,vehicles,services}/route.ts` novos.
- `src/server/services/appointments.ts` — `lookUpClients`, `lookUpVehicles`, `lookUpServices`, `previewAppointment` e `createAppointment`.
- `src/server/rules/appointment-booking.ts` — campos e mensagens das recusas (L1), sobre `findCompositionError` e `findStartError`.
- `src/server/repositories/bookable-services.ts` — serviços que podem ser agendados, com os adicionais e os preços do porte; `appointments.ts` (`insertAppointment`), `clients.ts` (`listClientOptions`), `client-search.ts` (opção `withPhone`) e `vehicles.ts` (`isVehicleOfClient`).
- `src/shared/validation/appointments.ts` — esquemas das buscas, da prévia, do registro e do formulário em etapas (`bookingFormSchema`).
- `src/components/admin/appointments/appointment-wizard.tsx` e `booking-client-step.tsx` — resolvedor do Zod no lugar do `rules:` da etapa do cliente, campos do servidor levados às etapas e aviso só na edição.
- `src/lib/demo/routes.ts`, `src/lib/demo/appointments.ts`; `src/lib/demo/admin-appointments.ts` excluído.
- `docs/agendamento/rotas.md`, `dados.md`, `agendamentos-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md` e `docs/plataforma/openapi.yaml`.
- Testes: `tests/rules/appointment-booking.test.ts` (novo), `tests/validation/appointments.test.ts`, `tests/repositories/client-search.test.ts`.

## Testes executados

- `npm run check`: formatação, tipos, lint e 724 testes passando (35 arquivos).
- Banco local descartável (`db reset`, `seed-demo.sql`, `next start` do build de produção) e roteiro de API com a conta de administrador, de funcionário com `appointments`, de funcionário sem ela e de cliente: 401 e 403 nas cinco rotas, sem gravar; busca de clientes (nome, sobrenome e e-mail em palavras, telefone fora, excluído fora, `search` ausente ou vazio 400); veículos de Ana Souza na ordem dos vínculos, cliente sem veículo com lista vazia, inexistente 404; serviços do SUV com o preço do porte G, sem inativo, de categoria inativa nem adicional na lista, adicionais ativos por nome, 11 itens na primeira página (12 por página); prévia com 5% no Pix (subtotal R$ 95,00, total R$ 99,75), sem forma e data, com serviço indisponível de fora e veículo inexistente 404; registro 201 com `created_by_staff_id`, cópias, serviços, previsão igual à da prévia, outro no mesmo horário aceito (RN016), administrador também registra, campos calculados no corpo descartados (RS013), preço e nome do serviço mudados depois sem alterar o agendamento (RN037); recusas 400 com a mensagem no campo e nada gravado (dia fechado, antes da abertura, encerramento, pausa, fora da meia hora, passado, sem fuso, só adicional, adicional sem o principal, serviço inativo e de categoria inativa, repetido, veículo de outro cliente, sem forma e forma desconhecida), cliente inexistente e excluído 404; a função devolve `null` com vínculo ou cliente ausente, desfaz tudo com serviço inexistente e só o `service_role` a executa. Todas as conferências passaram.
- Navegador, a 360 e 1440 px, nos temas claro e escuro: as cinco etapas com as mensagens de cada uma e a mensagem que sai ao escolher; adicionais do principal; resumo com os preços do porte G e a previsão; recusa do servidor (dia que fechou) com a mensagem na etapa da data, aviso no topo e a janela aberta, sem gravar; novo envio, janela fechada, agendamento gravado em duas linhas de serviço e visível em "Futuros", foco devolvido a "Novo agendamento"; sem transbordo horizontal. Os únicos registros do console foram o 404 de `favicon.ico`, o 401 de `/api/auth/me` antes do login e o 400 da recusa provocada.
- Não rodados: Lighthouse de acessibilidade, teclado completo e desempenho do celular do assistente. A marcação das etapas não mudou em relação à #62, e a acessibilidade do site inteiro será ajustada pelo Yvan no fim.

## Documentação atualizada

- Módulos: `docs/agendamento/rotas.md` (campos, paginação e erros das cinco rotas), `dados.md` (parâmetros de `create_appointment`), `agendamentos-do-painel.md` (aviso só nas janelas ainda em demonstração e a recusa na etapa), `docs/plataforma/mensagens-de-validacao.md` (mensagens do agendamento) e `docs/plataforma/openapi.yaml` (cinco caminhos e os esquemas novos).
- Lacunas resolvidas: L1 (erros por `fields`, 404 de cliente inexistente) e L2 (1 a 20 serviços sem repetição) → `mensagens-de-validacao.md` e `rotas.md`; L3 (a prévia só calcula, `appointmentId` não muda o cálculo) e L4 (busca por palavras sem telefone, `search` obrigatório) → `rotas.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- **A migration precisa ser aplicada pelo Yvan (`supabase db push`) antes de testar o registro na pré-visualização** e antes da incorporação; a leitura e a prévia funcionam sem ela.
- Edição, avanço, conclusão, cancelamento e reagendamento do painel seguem em demonstração (#50); `/api/me/bookable-services` e a prévia e as gravações do cliente também (outras tarefas), e `listBookableServices` do repositório pode servir à rota do cliente.
- O PR passa de 400 linhas fora dos testes (a função SQL, o repositório dos serviços para agendar e a especificação OpenAPI são o grosso); fica para o revisor decidir se divide.
- Desvios da lista do plano: o resolvedor do Zod está só no assistente do painel, porque as etapas de veículo, serviços, data e pagamento são compartilhadas com o portal e continuam com a validação delas (o resolvedor tem precedência e usa as mesmas mensagens); `tests/lib/api-client.test.ts` não mudou, porque o teste usa uma lista de demonstração simulada.
