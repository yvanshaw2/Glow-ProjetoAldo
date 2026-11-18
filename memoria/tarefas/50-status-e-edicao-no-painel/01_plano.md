---
issue: 50
titulo: "Status, conclusão, cancelamento, edição e reagendamento no painel"
areas: [backend, banco, frontend, testes]
tipo: funcionalidade
requisitos: [UC12, UC25, UC26, RF052, RF053, RF054, RF055, RF056, RN005, RN006, RN008, RN010, RN012, RN013, RN014, RN015, RN017, RN018, RN019, RN020, RN032, RN033, RN034, RN037, RS008, RNF010, RNF011]
status: em_execucao
aprovado_por: yvan
aprovado_em: 19:00 - 27/10/2026
---

# Plano: Status, conclusão, cancelamento, edição e reagendamento no painel

## Objetivo

Ligar ao banco as ações que as telas da #61 e da #62 ainda fazem com dados de demonstração. O funcionário com a permissão `appointments` (RS008), em `/admin/appointments`:

- **avança** o status (`POST …/:id/advance`: Agendado → Em espera → Em execução → Finalizado), sem confirmação;
- **conclui** o Finalizado, confirmando ou trocando a forma de pagamento (`POST …/:id/complete`);
- **cancela** o Agendado ou o Em espera (`POST …/:id/cancel`);
- **edita** em qualquer status, sem mudar o status (`PATCH …/:id`, com `updatedAt`);
- **reagenda** o Concluído (`POST …/:id/reschedule`): cria um novo Agendado e passa o original a Reagendado.

Cinco rotas novas, todas com `requirePermission("appointments")`, no formato de `AdminAppointment` (o do detalhe, #46). O reagendamento responde 201; as outras, 200. O servidor `appointments` (`src/server/services/appointments.ts`) ganha as cinco operações, chamando as funções puras da #36 (`findNextStatus`, `canEditAppointment`, `findScheduleChangeError`, `priceServices`, `calculateTotal`, `listPaymentOptions`, `findCompositionError`, `calculateEstimatedDuration`, `calculateEstimatedEnd`) e as leituras da #49 (`findOrderServices`, `listPaymentFees`, `listBusinessHours`).

**Saem da lista de demonstração** (decisão 0055) as cinco entradas `/api/admin/appointments/:id…` de `src/lib/demo/routes.ts`, e o aviso de demonstração sai do detalhe, do "Editar", do "Reagendar" e do "Concluir". As entradas de `/api/me/*` e a de `dashboard/analysis` continuam: **esta tarefa não é a última a sair, então `src/lib/demo/`, o `NOT_IMPLEMENTED` e o `DemoNotice` ficam** (o `DemoNotice` continua em `profile-tabs`, `account-form`, nas páginas do portal e no cartão de análise do dashboard).

**Migration: uma**, `update_appointment` e `reschedule_appointment`, no mesmo arquivo (RNF010). Pelo procedimento, o agente só a escreve e a confere no banco local (`db reset`); **o Yvan a aplica antes de testar a pré-visualização**. Avançar, concluir e cancelar são um `update` só, que a API faz sem função SQL. Sem dependência nova.

## Base da construção

- `origin/main` em 9df04e7 (PR #127, #49) confirmada com `git fetch`. A ramificação de trabalho será criada dela (`feat/50-appointment-status` e, se L1 for a divisão, `feat/50-appointment-edit`).
- Já existem e não mudam de contrato: `handleRoute`, `respondOk`, `respondCreated`, `requirePermission` (devolve a conta; o `account.id` vai a `created_by_staff_id` no reagendamento), `idSchema`, `AppError`, `findAdminAppointment`/`getAppointment` (a resposta de todas as rotas, com `paymentOptions` no Finalizado), `createAppointment` (molde de verificação e de `workOutOrder`), `create_appointment` (a função que o reagendamento reaproveita), `findBookableOrderServices`, `isVehicleOfClient`, `findVehicle`, `findBookingErrors`, `APPOINTMENT_STATUS_LABELS`, `STAFF_DATE_LIMITS`.
- As telas já chamam as rotas: `advance-button.tsx`, `appointment-details-dialog.tsx` (cancelar), `complete-appointment-dialog.tsx`, `reschedule-appointment-dialog.tsx` e `appointment-wizard.tsx` (PATCH com `updatedAt` e tratamento de `VERSION_CONFLICT`). Mudam só o aviso e, onde a lacuna pedir, o texto da falha.
- A prévia (`POST /api/admin/appointments/preview`) é real; a decisão sobre `appointmentId` é L4.

## Como funciona

### Contrato da API (`docs/agendamento/rotas.md`, que já define as cinco)

| Rota | Entrada | Resposta |
|---|---|---|
| `POST …/:id/advance` | nenhuma | 200 `AdminAppointment` com o novo status; 409 `INVALID_STATUS` |
| `POST …/:id/complete` | `paymentMethod*` | 200 `completed`, com o total da forma escolhida; 409 `INVALID_STATUS` |
| `POST …/:id/cancel` | nenhuma | 200 `cancelled`; 409 `INVALID_STATUS` |
| `PATCH …/:id` | `updatedAt*`; `vehicleId`, `serviceIds`, `paymentMethod`, `scheduledAt` | 200 atualizado, mesmo status; 400 com `fields` (L3); 404; 409 `VERSION_CONFLICT` |
| `POST …/:id/reschedule` | `paymentMethod*`, `scheduledAt*` | 201 novo `scheduled`; 400 com `fields` (L3, L5); 404; 409 `INVALID_STATUS` |

Erros comuns de `api.md`: 401, 403 (cliente, funcionário sem `appointments` ou conta inativa), 404 (id que não é UUID ou agendamento inexistente), `PASSWORD_CHANGE_REQUIRED`, 415, 500. Valor, total, status, previsão e cópias nunca são aceitos do corpo (RS013).

### Status, conclusão e cancelamento (UC12)

- O serviço lê o agendamento (404), pergunta a `findNextStatus({ action, status, actor: "staff" })` e, se for `null`, responde 409 `INVALID_STATUS` com o status atual na mensagem (UC12 FE01, L2).
- A gravação é um `update … where id = :id and status = :statusLido` no repositório: se outra pessoa mudou o status no meio, nada é gravado e a resposta é 409 `INVALID_STATUS` (o serviço lê de novo o status para a mensagem). `updated_at` muda pelo gatilho.
- **Concluir** (RN018, RN012, RN010): a forma igual à do agendamento mantém o percentual e o total gravados; outra forma usa o percentual vigente sobre o subtotal (`listPaymentOptions` já faz isso, e é a mesma conta do resumo da janela). Grava `payment_method`, `fee_percent`, `total`, `status = completed` e `completed_at = agora` no mesmo `update`; o `ck_` do banco exige `completed_at` se e só se `completed` ou `rescheduled`.
- **Cancelar** (RN019): grava `status = cancelled` e `cancelled_at = agora`; só do Agendado e do Em espera. Do Em execução, 409.

### Edição (UC26 FA01, RN032, RN033, RN034, RN037)

1. O serviço lê o agendamento (404). `canEditAppointment` vale para o funcionário em qualquer status. Se `updatedAt` não é o lido, 409 `VERSION_CONFLICT` antes de calcular; a função SQL repete a conferência na gravação (RNF011).
2. **O que mudou** (L2): `vehicleId` diferente do gravado, ou o conjunto de `serviceIds` diferente do gravado, ou `paymentMethod` diferente, ou `scheduledAt` em instante diferente. Campo ausente no corpo é "sem mudança".
3. Veículo trocado: precisa ser do cliente do agendamento (`isVehicleOfClient`; 400 em `vehicleId`, "Escolha um veículo deste cliente.").
4. Veículo ou serviços trocados: todos os serviços do pedido precisam poder ser agendados e formar uma composição válida (`findOrderServices`, `findCompositionError`; 400 em `serviceIds`), e **todos os itens são recalculados pelo catálogo atual** e pelo porte do veículo novo (RN033, RN010, RN014). Sem troca de veículo nem de serviços, os itens, as cópias e a duração gravados ficam como estão: o serviço inativo que já estava no agendamento não impede uma edição de data (L2).
5. Forma trocada: percentual vigente (RN012); sem troca, o percentual gravado. Subtotal, total, duração e previsão são sempre recalculados a partir dos itens resultantes e da data resultante (`calculateTotal`, `calculateEstimatedEnd`, RN034).
6. Data ou horário trocados: `findScheduleChangeError` (RN033: disponibilidade; no Agendado nunca no passado; em Em espera, Em execução, Finalizado, Concluído e Reagendado nunca depois de agora; no Cancelado só a disponibilidade) vira o campo `scheduledAt` com a mensagem de L3. Data mantida: nenhuma conferência, mesmo passada ou fora da nova disponibilidade.
7. `update_appointment` grava numa transação: o agendamento (sem tocar em `status`, `completed_at`, `cancelled_at`, `client_id`), e, quando o veículo mudou, a cópia do veículo (RN037); quando os itens mudaram, substitui as linhas de `appointment_services` com a cópia de nome e tipo. Devolve o id, ou `null` sem gravar se o agendamento não tem mais a versão lida ou o veículo deixou de ser do cliente. O serviço lê o detalhe e responde 200.

### Reagendamento (UC25 FA01, RN020)

1. Lê o agendamento (404); só o `completed` passa (`findNextStatus` com `reschedule`; senão 409 `INVALID_STATUS`).
2. Itens: os serviços do original que ainda podem ser agendados (RN008, RN031, `findOrderServices`), pelo catálogo atual; os que ficaram de fora são simplesmente omitidos (a tela já os mostra, vindos da prévia). O porte vem do veículo cadastrado hoje (como no registro). Composição inválida do que sobrou, 400 em `serviceIds` (L5).
3. Data e horário pelo `findBookingErrors`/`findStartError` (RN013, RN015: dentro do funcionamento, meia hora, não no passado); forma e percentual vigentes; valores e previsão como no registro (`workOutOrder`, `calculateEstimatedEnd`).
4. `reschedule_appointment` grava numa transação: trava o original e confere que continua `completed` (senão `null`, e o serviço responde 409), cria o novo pelo mesmo caminho de `create_appointment` (cliente, veículo, cópias, itens, `created_by_staff_id` da conta), grava `rescheduled_from_id` e passa o original a `rescheduled`. Devolve o id do novo, ou `null` sem gravar. O `uq_` de `rescheduled_from_id` impede dois reagendamentos do mesmo original; a corrida vira 409.

### Esquemas (`src/shared/validation/appointments.ts`), TDD

| Esquema | Regras |
|---|---|
| `appointmentEditSchema` | `updatedAt` obrigatório (texto ISO com fuso, nunca convertido); `vehicleId`, `serviceIds` (1 a 20, sem repetição), `paymentMethod` e `scheduledAt` (instante com fuso), todos opcionais; ao menos um deles, senão 400; campo desconhecido, valor calculado ou `status` no corpo, descartados (RS013) |
| `appointmentCompleteSchema` | `paymentMethod` obrigatório |
| `appointmentRescheduleSchema` | `paymentMethod` e `scheduledAt` obrigatórios |

`advance` e `cancel` não leem corpo.

### Backend (decisões 0003, 0005, 0006, 0008, 0025, 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `[id]/route.ts` (acrescenta `PATCH`), `[id]/advance|complete|cancel|reschedule/route.ts` | `requirePermission`, id e esquema, serviço, resposta |
| Serviço | `services/appointments.ts` | `advanceAppointment`, `completeAppointment`, `cancelAppointment`, `editAppointment`, `rescheduleAppointment` |
| Regra pura | `rules/appointment-editing.ts` (novo) | o que mudou na edição (L2); campos e mensagens das recusas de data e de composição (L3); mensagem do `INVALID_STATUS` com o status (L2) |
| Repositório | `repositories/appointments.ts` | `changeAppointmentStatus` (o `update` com a condição de status), `updateAppointment` e `insertRescheduledAppointment` (as duas `rpc`) |
| Banco | `supabase/migrations/<data>_update_appointment_functions.sql` | `update_appointment`, `reschedule_appointment`, com `revoke` de `public`, `anon` e `authenticated` e `grant` só a `service_role` |

### Frontend (decisão 0055)

- `DemoNotice` sai de `appointment-details-dialog.tsx`, `appointment-wizard.tsx` (o `isEditing &&` inteiro), `complete-appointment-dialog.tsx` e `reschedule-appointment-dialog.tsx`; os comentários que citam a demonstração são ajustados.
- A falha do servidor (400 com `fields`, 409) já aparece no topo com a janela aberta; o 400 do `PATCH` leva o campo à etapa (`useFormFailure`, como no registro). Conferir no roteiro que `scheduledAt` e `serviceIds` do `PATCH` e do reagendamento chegam à etapa certa.
- `src/lib/demo/routes.ts`: sai o bloco `built by #50`. `src/lib/demo/appointments.ts`, `README.md` e `tests/lib/api-client.test.ts`: conferir se citam as rotas que saem (hoje o teste usa a prévia de outro caminho, a conferir).
- Documentação de tela: `agendamentos-do-painel.md` perde as frases sobre o aviso de demonstração e os `NOT_IMPLEMENTED`.

### Especificação

`docs/plataforma/openapi.yaml`: o `PATCH` em `/api/admin/appointments/{id}` e os quatro caminhos novos, com os esquemas `AppointmentEditInput`, `AppointmentCompleteInput` e `AppointmentRescheduleInput`. `rotas.md`: campos e erros de `PATCH` e `reschedule` (L3, L5). `dados.md`: parâmetros de `update_appointment` e `reschedule_appointment`.

## Divisão em dois pull requests

A issue diz que, passando de cerca de 400 linhas, a tarefa se divide. A estimativa passa (duas funções SQL, quatro regras de edição, cinco rotas, três esquemas, OpenAPI e testes), então a proposta é L1. Cada PR fecha uma parte sem deixar a tela quebrada; a issue #50 fecha no segundo.

## Critérios de aceitação e verificação

Os sete critérios da issue, na ordem dela, mais os de segurança.

| Critério (Dado, Quando, Então) | PR | Verificação |
|---|---|---|
| Dado um Agendado, quando avanço três vezes, então passa por Em espera, Em execução e Finalizado; o quarto avanço é recusado com o status atual (UC12, FE01, RN017) | 1 | `tests/rules/status-transitions.test.ts` (já cobre a tabela) e `tests/rules/appointment-editing.test.ts` (mensagem com o status); roteiro de API com quatro `POST` |
| Dado um Finalizado no Pix, quando concluo trocando para o crédito, então o total usa o percentual do crédito e o status vai a Concluído (UC12 FA01, RN012, RN018) | 1 | `tests/rules/pricing.test.ts` (`listPaymentOptions`, já cobre); roteiro de API conferindo `total`, `fee_percent`, `completed_at` no banco e a mesma forma mantendo o total gravado |
| Dado um Agendado ou Em espera, quando cancelo e confirmo, então vai a Cancelado; em Em execução a rota responde 409 `INVALID_STATUS` (UC12 FA02, RN019) | 1 | `status-transitions.test.ts`; roteiro de API (200 e 409) e de tela (o botão não aparece em Em execução, já feito na #61) |
| Dado um Cancelado ou Reagendado, quando tento qualquer mudança de status, então 409 `INVALID_STATUS` (RN017) | 1 | `status-transitions.test.ts`; roteiro de API nas quatro rotas |
| Dado um Em execução, quando edito a data para depois do momento da alteração, então recusa; dentro do permitido, grava sem mudar o status (UC26 FA01, RN032, RN033) | 2 | `tests/rules/editing.test.ts` (já cobre `findScheduleChangeError`) e `appointment-editing.test.ts` (campo e mensagem); roteiro de API: data depois de agora 400 em `scheduledAt`, data antes de agora 200 com o status igual |
| Dado a edição que troca o veículo ou os serviços, quando confirmo, então valores, duração e previsão são recalculados pelo catálogo atual (UC26, RN010, RN014, RN034, RN037) | 2 | `appointment-editing.test.ts` (o que mudou); roteiro de API: preço do catálogo alterado depois do registro, edição trocando o serviço, linhas de `appointment_services` e cópia do veículo conferidas no banco; edição só da data mantém os preços gravados (L2) |
| Dado um Concluído, quando reagendo, então um novo Agendado nasce com o mesmo veículo e os mesmos serviços pelo catálogo atual, e o original vai a Reagendado; serviço inativo é informado e deixado de fora (UC25 FA01, FE02, RN008, RN020) | 2 | roteiro de API: novo `scheduled` com `rescheduled_from_id`, original `rescheduled` com `completed_at` intacto, serviço inativado antes de fora, segundo reagendamento do mesmo original 409, dois reagendamentos simultâneos (um 201, um 409) |
| Dado um `updatedAt` antigo, quando edito, então 409 `VERSION_CONFLICT` e nada é gravado (RNF011) | 2 | roteiro de API; a função chamada com a versão antiga devolve `null` |
| Dado um cliente, um funcionário sem `appointments` ou sem sessão, quando chama qualquer das cinco rotas, então 403 ou 401 e nada é gravado (RS008) | 1 e 2 | roteiro de API com as contas de cada tipo |
| Dado `status`, `total` ou `completedAt` no corpo, quando edito, então são descartados (RS013) | 2 | `tests/validation/appointments.test.ts` |
| Dado o detalhe, quando uso cada ação na tela, então a janela fecha, a listagem muda de visão e o aviso de demonstração não aparece (decisão 0055) | 1 e 2 | roteiro de navegador a 360 e 1440 px, tema claro e escuro |

## Arquivos

| Arquivo | Ação | PR |
|---|---|---|
| `src/app/api/admin/appointments/[id]/advance/route.ts`, `complete/route.ts`, `cancel/route.ts` | criar | 1 |
| `src/app/api/admin/appointments/[id]/reschedule/route.ts` | criar | 2 |
| `src/app/api/admin/appointments/[id]/route.ts` | alterar (`PATCH`) | 2 |
| `src/server/services/appointments.ts` | alterar | 1 e 2 |
| `src/server/repositories/appointments.ts` | alterar | 1 e 2 |
| `src/server/rules/appointment-editing.ts` | criar | 1 e 2 |
| `src/shared/validation/appointments.ts` | alterar | 1 e 2 |
| `supabase/migrations/<data>_update_appointment_functions.sql` | criar | 2 |
| `src/lib/demo/routes.ts` | alterar (tira as entradas) | 1 e 2 |
| `src/lib/demo/appointments.ts`, `src/lib/demo/README.md`, `tests/lib/api-client.test.ts` | conferir; alterar se citarem as rotas que saem | 1 e 2 |
| `src/components/admin/appointments/complete-appointment-dialog.tsx` | alterar (sem `DemoNotice`) | 1 |
| `src/components/admin/appointments/appointment-details-dialog.tsx`, `appointment-wizard.tsx`, `reschedule-appointment-dialog.tsx` | alterar (sem `DemoNotice`) | 2 |
| `src/app/(admin)/admin/appointments/page.tsx` | alterar (comentário) | 2 |
| `tests/rules/appointment-editing.test.ts` | criar | 1 e 2 |
| `tests/validation/appointments.test.ts` | alterar | 1 e 2 |
| `docs/agendamento/rotas.md`, `dados.md`, `agendamentos-do-painel.md` | alterar | 1 e 2 |
| `docs/plataforma/mensagens-de-validacao.md` | alterar (L3, L5) | 2 |
| `docs/plataforma/openapi.yaml` | alterar | 1 e 2 |
| `memoria/tarefas/50-status-e-edicao-no-painel/` (`01_plano.md`, `notas.md`, `02_relatorio.md`) | criar | 1 |

Se L1 for "um PR só", a coluna some. Possíveis coincidências com outras tarefas: `appointments.ts` (serviço e repositório) e `rotas.md` do agendamento; a #66 mexe em `dashboard`, não neles.

## Testes previstos

Escritos antes do código (TDD) nas regras e nos esquemas; o que depende do banco é conferido no roteiro local.

- `names the current status when the transition is refused` — UC12 FE01: "Em execução" etc., com `APPOINTMENT_STATUS_LABELS`.
- `finds what an edit changed: the vehicle, the services as a set, the payment method and the instant` — a ordem dos serviços e o mesmo instante em outro formato não contam como mudança (L2).
- `treats a missing field as no change` e `a kept instant is not checked` — RN033.
- `maps each schedule change error to the scheduledAt field` (dia fechado, fora do funcionamento, pausa, fora da meia hora, passado, `AFTER_NOW`) — L3.
- `maps the composition errors to the serviceIds field` — RN005, RN006.
- `requires updatedAt and at least one field to edit`, `keeps updatedAt as received`, `discards the status and the calculated values`, `rejects an empty list, a repeated id and more than 20 services` — RS013, `api.md`.
- `requires paymentMethod to complete` e `requires paymentMethod and scheduledAt to reschedule`.
- Já cobertos e só reexecutados: `status-transitions.test.ts`, `editing.test.ts`, `pricing.test.ts`, `scheduling.test.ts`.

Roteiro local (banco local com `fresh.sh` e `seed-demo.sql`, `next start`, contas de administrador, de funcionário com e sem `appointments` e de cliente): as cinco rotas e os erros acima, com as linhas conferidas no banco, a corrida de dois reagendamentos, a função chamada com versão antiga, e a tela a 360 e 1440 px. Não rodados: Lighthouse e teclado completo (a acessibilidade do site será ajustada no fim); o LCP local que passar de 2,5 s vai ao relatório.

## Lacunas na documentação

Cada lacuna traz o problema, as opções e o texto que entra na documentação. Marque com `x` a opção escolhida; o texto proposto é o da opção recomendada, e se você escolher outra, ele é refeito antes da construção.

### L1. Um pull request ou dois

**Problema.** A issue manda dividir se o plano passar de cerca de 400 linhas fora dos testes. A estimativa é de uns 250 para status, conclusão e cancelamento e uns 450 para edição e reagendamento (a migration é o grosso).

**Opções:**

- [x] **1. Dois pull requests, em duas ramificações (recomendada).** O 1º traz `advance`, `complete`, `cancel`, a mensagem de `INVALID_STATUS` com o status e o aviso fora do "Concluir"; não precisa de migration, então pode ser testado na pré-visualização sem esperar nada. O 2º traz a migration, `PATCH` e `reschedule`, e fecha a issue. O aviso do detalhe e do assistente só sai no 2º, porque "Editar" e "Reagendar" continuam em demonstração até lá.
- [ ] **2. Um pull request só.** Mais simples de acompanhar, mas passa do limite e a migration atrasa a verificação das ações de status.

**Texto proposto:** nenhum arquivo de documentação muda; vale só para o plano e o relatório.

### L2. O que a edição recalcula e o texto do `INVALID_STATUS`

**Problema.** `calculos.md` (seção 4) diz que "troca de veículo ou serviços recalcula todos os itens", que "troca da forma aplica o percentual vigente" e que "subtotal, total, duração e previsão são sempre recalculados". Não diz o que acontece com os itens, as cópias e o percentual quando a edição muda só a data (ou só a forma): repreçar tudo pelo catálogo de hoje mudaria o valor de um atendimento já concluído ao corrigir um horário, e RN037 pede que a cópia só se refaça quando o próprio agendamento é editado. Também, UC12 FE01 manda "informar o status atual", e o catálogo de erros tem uma mensagem fixa para `INVALID_STATUS`.

**Opções:**

- [x] **1. Recalcular só o que mudou (recomendada).** Troca de veículo ou do conjunto de serviços: todos os itens, o porte e a cópia do veículo pelo catálogo atual; troca da forma: percentual vigente; nada disso mudou: itens, cópias e percentual gravados ficam, e só a previsão acompanha a data. Subtotal, total, duração e previsão saem sempre da soma dos itens resultantes. O `INVALID_STATUS` leva o status na mensagem: "Este agendamento está Em execução. Esta ação não está disponível para esse status." (`AppError` com `message`).
- [ ] **2. Recalcular tudo em toda edição.** Mais simples e fiel à letra de "sempre recalculados", mas uma correção de horário num Concluído reprecifica o histórico e a receita do dashboard, e um serviço inativo desde o registro impediria a edição.

**Texto proposto (opção recomendada):**

- `docs/agendamento/calculos.md`, seção 4, último item: "Troca de veículo ou serviços recalcula todos os itens pelo catálogo atual e refaz a cópia do veículo; troca da forma aplica o percentual vigente; sem troca de veículo nem de serviços, os itens e as cópias gravados ficam, e sem troca da forma o percentual gravado fica. Subtotal, total, duração e previsão saem sempre da soma dos itens resultantes e da data resultante."
- `docs/agendamento/rotas.md`, `PATCH`: a mesma frase em "Resposta", e `updatedAt*` na entrada; em `advance`, `complete` e `cancel`: "409 `INVALID_STATUS`, com o status atual na mensagem".
- `docs/plataforma/mensagens-de-validacao.md`: a mensagem de `INVALID_STATUS` do agendamento.

### L3. Recusas do `PATCH`: campo e mensagem

**Problema.** `rotas.md` diz só "400 data, horário ou serviços incompatíveis com a disponibilidade ou com o status". Faltam o campo e o texto de cada recusa de RN033 que o registro (L1 da #49) não cobre: a nova data depois de agora, em Em espera ou adiante, e a troca de veículo para um que não é do cliente.

**Opções:**

- [x] **1. `VALIDATION_ERROR` com `fields`, como no registro (recomendada).** Reusa os textos do registro e acrescenta um: em `scheduledAt`, "Escolha uma data e um horário que não sejam posteriores ao momento da alteração." (`AFTER_NOW`); a recusa por data no passado no Agendado usa o texto do registro. `vehicleId`, "Escolha um veículo deste cliente."; `serviceIds`, os textos do registro. Sem código novo.
- [ ] **2. Código próprio por recusa.** Mais fácil de tratar por programa, mas códigos novos no catálogo e a tela teria de traduzir cada um.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, seção "Agendamento": acrescenta o texto de `AFTER_NOW`.
- `docs/agendamento/rotas.md`, `PATCH`: "400 com o campo em `fields`: data ou horário fora do funcionamento, no passado em um Agendado ou posterior ao momento da alteração depois da chegada do veículo (`scheduledAt`), serviços sem principal ou complementar, adicional sem o seu principal ou serviço que não pode ser agendado (`serviceIds`) ou veículo que não é do cliente (`vehicleId`); 409 `VERSION_CONFLICT`; corpo sem nenhum campo além de `updatedAt`, 400."

### L4. A prévia na edição (`appointmentId`)

**Problema.** A #49 deixou a prévia ignorando `appointmentId`, e a #50 decide o que ele muda (RN033). A prévia só calcula; a conferência de data e de composição é do `POST` e, na edição, do `PATCH`.

**Opções:**

- [x] **1. Nada muda (recomendada).** `appointmentId` continua só validado como UUID; a data, o horário e a composição são conferidos no `PATCH`, onde há `updatedAt` e o status. A tela já orienta a data pelo status (#62) e mostra a recusa do servidor.
- [ ] **2. 404 quando o agendamento não existe.** Evita calcular para um id que não existe, mas é mais uma leitura por prévia e o resultado não muda.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `preview`: a última frase, "`appointmentId` identifica a edição (UC26) e, nesta rota, não muda o cálculo.", passa a "`appointmentId` identifica a edição (UC26) e, nesta rota, não muda o cálculo nem as conferências: quem confere a data e a composição na edição é o `PATCH`."

### L5. Reagendamento: o que fica de fora, o que recusa e quando o cliente sumiu

**Problema.** UC25 FE02 diz que o serviço inativo é informado e os demais ficam, mas a resposta é o novo agendamento, sem campo para os serviços deixados de fora; e não diz o que acontece se o que sobra fica sem principal ou complementar, ou com adicional sem o seu principal, nem se o cliente do original foi excluído (RN030).

**Opções:**

- [x] **1. Informar pela tela e recusar a composição inválida (recomendada).** A tela já mostra os serviços de fora a partir da prévia (UC25 FE02), então a resposta do 201 não ganha campo: traz os serviços gravados. Se o que sobra não é uma composição válida, 400 em `serviceIds` com os textos do registro, nada gravado; o adicional cujo principal ficou de fora é um desses casos. Cliente excluído, 404, como no registro.
- [ ] **2. Deixar de fora também o adicional sem principal.** Mais gentil, mas a prévia da tela teria de fazer o mesmo cálculo, e o resumo que o funcionário viu deixaria de ser o que o servidor grava.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `reschedule`: "Entrada: `paymentMethod*, scheduledAt*`. Os serviços são os do agendamento original que ainda podem ser agendados (RN008, RN031); os demais ficam de fora. Resposta: **201** novo agendamento, no formato do detalhe, com valores e duração calculados pelo catálogo atual; 400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado (`scheduledAt`), serviços restantes sem principal ou complementar ou adicional sem o seu principal (`serviceIds`); 404 cliente excluído; 409 `INVALID_STATUS` se não estiver concluído."

## Decisões técnicas

Nenhuma nova.

- Seguidas: 0003, 0005, 0006, 0008 (rotas, serviço, repositório e regras puras), 0009 e RNF011 (`updatedAt` e `VERSION_CONFLICT`, como `save_role` e `save_service`), 0021 (catálogo vigente no reagendamento), 0025, 0042 (funções SQL só para o `service_role`), 0043 (banco local descartável) e 0055 (saída da demonstração, rota por rota).

## Riscos e dúvidas

- **A migration só vale depois que o Yvan a aplicar** (`supabase db push`); a verificação na pré-visualização de `PATCH` e `reschedule` depende disso. As rotas de status não dependem.
- **Corrida no reagendamento:** a conferência de `completed` e o `uq_` de `rescheduled_from_id` precisam estar na mesma transação; o roteiro tem o teste de duas chamadas simultâneas.
- **Edição de Concluído muda a receita:** `total` e `completed_at` do dashboard acompanham a edição de um Concluído (RN032 permite em qualquer status). É o comportamento da regra, e o relatório o registra.
- `findOrderServices` descarta em silêncio o serviço que não pode ser agendado; na edição, o serviço cujo id foi pedido e sumiu deve virar 400 em `serviceIds`, como no registro (`findBookingErrors`). Conferir na construção.
- O PR do reagendamento e da edição pode passar de 400 linhas fora dos testes mesmo dividido (a migration); fica para o revisor decidir.

## Fora do escopo

- Edição, cancelamento e reagendamento pelo cliente (`/api/me/appointments/…`, fase 3).
- Remover `src/lib/demo/`, o `NOT_IMPLEMENTED` e o `DemoNotice`: as rotas `/api/me/*` e a análise do dashboard ainda os usam.
- Aviso de atraso, "Box" e o que o wireframe tem sem requisito (`agendamentos-do-painel.md`, "Fora da tela").
- Acessibilidade (WCAG) do site, que o Yvan ajusta no fim.
