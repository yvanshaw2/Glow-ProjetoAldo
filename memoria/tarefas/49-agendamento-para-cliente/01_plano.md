---
issue: 49
titulo: "Registrar agendamento para cliente no painel"
areas: [backend, banco, frontend, testes]
tipo: funcionalidade
requisitos: [UC11, RF050, RF051, RN003, RN004, RN005, RN006, RN008, RN009, RN010, RN011, RN012, RN013, RN014, RN015, RN016, RN030, RN031, RN034, RN035, RN037, RS008, RNF010]
status: concluido
aprovado_por: yvan
aprovado_em: 27/10/2026 - 16:09
---

# Plano: Registrar agendamento para cliente no painel

## Objetivo

Entregar o UC11 de ponta a ponta: o funcionário com a permissão `appointments` registra um agendamento para um cliente em `/admin/appointments`, pelo assistente "Novo agendamento" (#62), agora ligado ao banco. Cinco rotas, todas com `requirePermission("appointments")` (RS008):

- `GET /api/admin/appointments/lookup/clients`: busca de clientes ativos por nome ou e-mail, 10 por página;
- `GET /api/admin/appointments/lookup/vehicles`: veículos do cliente (reuso de `listClientVehicles`, #45);
- `GET /api/admin/appointments/lookup/services`: serviços para agendar, com o preço do porte do veículo e os adicionais vinculados, 12 por página;
- `POST /api/admin/appointments/preview`: valores, duração e previsão, sem gravar;
- `POST /api/admin/appointments`: registra o agendamento `scheduled` e responde 201 com o formato do detalhe (`AdminAppointment`).

O serviço `appointments` (`src/server/services/appointments.ts`, que já tem a listagem e o detalhe da #46) ganha a leitura do catálogo vigente, da disponibilidade e dos percentuais, a chamada das funções puras da #36 (`priceServices`, `findCompositionError`, `findStartError`, `calculateEstimatedDuration`, `calculateEstimatedEnd`) e a gravação por **`create_appointment`**, função SQL em migration própria (RNF010): o agendamento, a cópia dos dados (RN037) e os serviços numa transação. O valor, a duração e a previsão nunca vêm do navegador (`api.md`, Validação).

**As cinco entradas deixam de ser demonstração** (decisão 0055): saem de `src/lib/demo/routes.ts` as de `preview`, das três buscas e de `POST /api/admin/appointments`, e sai `src/lib/demo/admin-appointments.ts` inteiro (a #62 o deixou só com a prévia e as buscas). O aviso de demonstração sai do "Novo agendamento"; no "Editar" ele continua, porque `PATCH` segue em demonstração até a #50. A prévia do assistente de edição já usa a rota real.

**Migration: uma**, `create_appointment`. Pelo procedimento, o agente só a escreve e a confere no banco local (`db reset`); **quem a aplica é o Yvan, antes de testar a pré-visualização** (`supabase db push`, `setup/questionario.md`). Sem dependência nova.

## Base da construção

- Ramificação `feat/49-staff-appointment`, criada da `origin/main` (2884400, com a #48, PR #126). O worktree (`claude/vibrant-curie-e67316`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em 2884400, árvore limpa, sem vínculo com a `main`.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondPage`, `requirePermission` (devolve a conta; `account.id` vai a `created_by_staff_id`, e o administrador tem linha em `staff`), `getServiceClient`, `AppError`, `idSchema`, `paginationSchema`, `searchTermSchema`; `listPaymentFees` e `listBusinessHours` (lidos na hora, sem guardar em memória, como a #41 pediu); `findAdminAppointment` (a resposta do 201); `listClientVehicles` e `getClient` (veículos e 404 do cliente); `COMPANY_TIME_ZONE`.
- Tipos que já existem e não mudam: `AdminAppointment`, `AdminClientOption`, `BookableService`, `BookableAdditional`, `AppointmentPreview`, `ClientVehicle` (`src/shared/api/`).
- Moldes: `services/vehicles.ts` e `repositories/vehicles.ts` (`link_vehicle`, a função SQL mais recente e o seu `rpc`), `20261026121013_link_vehicle_function.sql` (revoke e grant), `repositories/catalog-public.ts` (leitura de serviço ativo de categoria ativa), `client-search.ts` (filtro por palavra).

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET …/lookup/clients` | `search*`, `page`, `pageSize` | 200 página de `{ id, name, email }`; 400 sem `search` |
| `GET …/lookup/vehicles` | `clientId*`, `page`, `pageSize` | 200 página de `ClientVehicle`; 404 cliente inexistente ou excluído |
| `GET …/lookup/services` | `vehicleId*`, `page`, `pageSize` | 200 página de `BookableService`; 404 veículo inexistente |
| `POST …/preview` | `vehicleId*`, `serviceIds*`, `paymentMethod`, `scheduledAt`, `appointmentId` | 200 `AppointmentPreview`; 404 veículo inexistente |
| `POST …/appointments` | `clientId*`, `vehicleId*`, `serviceIds*`, `paymentMethod*`, `scheduledAt*` | 201 `AdminAppointment` com `status: scheduled`; 400 com `fields` (L1); 404 cliente inexistente ou excluído |

- Erros comuns de `api.md`: 401, 403 (`FORBIDDEN` para cliente, funcionário sem `appointments` ou conta inativa), `PASSWORD_CHANGE_REQUIRED`, 415 e 500. Campo desconhecido é descartado; valor calculado (preço, total, porte, previsão, cópias, status) nunca é aceito (RS013).
- **Buscas** (UC11 passos 2 a 4):
  - Clientes: ativos (sem `deleted_at`, RN030), em ordem de nome e sobrenome e de id; busca por palavras como a de `Clientes`, em nome, sobrenome e e-mail, sem o telefone (L4).
  - Veículos: os do cliente, na ordem em que foram vinculados (RN003).
  - Serviços: principal e complementar ativos, não excluídos, de categoria ativa (RN008, RN030, RN031), por nome e id, com o preço do porte do veículo (`service_prices`) ou o `fixed_price` (RN009) e, no principal, os adicionais ativos e não excluídos vinculados, por nome, com o preço fixo (RN006). O vínculo continua na tabela quando um lado é inativo ou excluído, então a leitura filtra os dois lados. A leitura fica em função de repositório própria (`listBookableServices`), que a rota do cliente (`/api/me/bookable-services`) poderá reusar.
- **Prévia**: os serviços pedidos que podem ser agendados, na ordem do pedido, com o preço do porte e a duração do catálogo vigente (RN020, decisão 0021); `subtotal`; `feePercent` (o da forma, ou `null` sem `paymentMethod`); `total` (igual ao subtotal sem forma); `estimatedDurationMinutes` (RN014); `estimatedEndAt` (RN034, ou `null` sem `scheduledAt`). A prévia só calcula: quem recusa data e composição é o `POST` (L3).
- **Registro** (UC11 passo 8), nesta ordem:
  1. cliente ativo existe (404) e o veículo é do cliente (400 em `vehicleId`);
  2. todos os `serviceIds` podem ser agendados, com o adicional ligado a um principal escolhido (RN005, RN006, RN008, RN031);
  3. `scheduledAt` dentro do funcionamento, em meia hora e não anterior a agora (RN013, RN015); sem limite de capacidade (RN016);
  4. valores pelo catálogo vigente, forma e percentual vigentes (RN009 a RN012), duração e previsão (RN014, RN034);
  5. `create_appointment`, que grava com `created_by_staff_id` da conta e devolve o id; o serviço lê o detalhe com `findAdminAppointment` e responde 201.
- **Função `create_appointment`** (parâmetros definidos pelo serviço, `banco.md`): `p_client_id`, `p_vehicle_id`, `p_staff_id`, `p_scheduled_at`, `p_payment_method`, `p_fee_percent`, `p_subtotal`, `p_total`, `p_estimated_duration_minutes`, `p_estimated_end_at` e `p_items jsonb` (`serviceId`, `price`, `durationMinutes`). Dentro da transação, ela lê o nome do cliente, os dados do veículo e o nome e o tipo de cada serviço e os grava como cópia (RN037, decisão 0011), de modo que a cópia nunca diverge do que o banco tinha no instante da gravação. Devolve `null`, sem gravar, quando o cliente foi excluído ou o veículo não está vinculado a ele; as restrições do banco (`ck_appointments_*`, `fk_appointments_client_id_vehicle_id`) decidem o resto e desfazem tudo. `revoke` de `public`, `anon` e `authenticated`; `grant` só a `service_role` (decisão 0042).

### Esquemas (`src/shared/validation/appointments.ts`, já existe), TDD

| Esquema | Regras |
|---|---|
| `clientLookupQuerySchema` | `search` obrigatório e não vazio depois da normalização, até 100 caracteres (L4); `page`, `pageSize` (`SHORT_LIST_PAGE_SIZE`) |
| `vehicleLookupQuerySchema` | `clientId` (UUID); `page`, `pageSize` (`SHORT_LIST_PAGE_SIZE`) |
| `serviceLookupQuerySchema` | `vehicleId` (UUID); `page`, `pageSize` (`CATALOG_PAGE_SIZE`) |
| `appointmentPreviewSchema` | `vehicleId`; `serviceIds` de 1 a 20 UUID, sem repetição (L2); `paymentMethod` e `scheduledAt` opcionais; `appointmentId` opcional (L3) |
| `appointmentInputSchema` | `clientId`, `vehicleId`, `serviceIds` (como acima), `paymentMethod` (`PAYMENT_METHODS`) e `scheduledAt` (instante ISO 8601 com deslocamento), todos obrigatórios |

Os esquemas das etapas do assistente vêm do mesmo arquivo (`bookingStepSchemas`: cliente, veículo, serviços, data e horário, pagamento, com as mensagens que hoje estão em `rules:` de cada etapa), para o formulário e a rota usarem a mesma regra (`api.md`: "os mesmos esquemas servem aos formulários").

### Backend (decisões 0003, 0005, 0006, 0008, 0025, 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `src/app/api/admin/appointments/route.ts` (acrescenta `POST`), `preview/route.ts`, `lookup/clients/route.ts`, `lookup/vehicles/route.ts`, `lookup/services/route.ts` | `requirePermission`, esquema, serviço, resposta |
| Serviço | `src/server/services/appointments.ts` | `lookUpClients`, `lookUpVehicles`, `lookUpServices`, `previewAppointment`, `createAppointment` |
| Regra pura | `src/server/rules/appointment-booking.ts` (novo) | junta os resultados de `findCompositionError` e `findStartError` nos campos e nas mensagens de L1 |
| Repositório | `repositories/appointments.ts` (`insertAppointment` via `rpc`), `repositories/services.ts` ou `repositories/bookable-services.ts` (novo: `listBookableServices`, `findBookableServicesByIds`), `repositories/clients.ts` (`listClientOptions`), `repositories/client-search.ts` (filtro sem telefone), `repositories/vehicles.ts` (`isVehicleOfClient`) | acesso às tabelas |
| Banco | `supabase/migrations/<data>_create_appointment_function.sql` | `create_appointment` |

### Frontend (decisão 0055; `docs/padroes/componentes.md`)

- `appointment-wizard.tsx`: `DemoNotice` só quando `isEditing`; o formulário passa a usar o resolvedor do Zod com os esquemas das etapas, no lugar do `rules:` de cada etapa (as cinco `booking-*-step.tsx`), mantendo as mensagens e o comportamento de "Próximo". O envio manda `clientId`, `vehicleId`, `serviceIds`, `paymentMethod` e `scheduledAt`, como já faz.
- A falha do servidor (400 com `fields`, 404) aparece no topo, com a janela aberta (`useFormFailure`, que já leva `fields` ao campo da etapa quando há um); o sucesso fecha a janela e lê a listagem de novo.
- `docs/agendamento/agendamentos-do-painel.md`: o aviso fica só no "Editar", no "Reagendar" e no "Concluir".

### Especificação

`docs/plataforma/openapi.yaml`: os cinco caminhos novos e os esquemas que faltarem (`AdminClientOption`, `BookableService`, `AppointmentPreview`, `AppointmentInput`); `docs/agendamento/rotas.md`: campos, paginação e erros das cinco (L1, L2, L4); `docs/agendamento/dados.md`: parâmetros de `create_appointment`.

## Critérios de aceitação e verificação

Os oito critérios da issue (Dado, Quando, Então), na ordem dela, mais os de segurança e de dados que o plano acrescenta.

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um cliente com um SUV, quando escolho um serviço por porte e um adicional vinculado, a data, o horário e o Pix, então o resumo mostra os valores do porte G, o total com o percentual do Pix e a previsão de conclusão (UC11, RN009, RN010, RN034) | testes de regra (`pricing`, `scheduling`); roteiro de API e de tela com o veículo de porte G do `seed-demo.sql` e o percentual do Pix alterado |
| Dado o resumo, quando confirmo, então o agendamento aparece na visão do dia ou nas futuras, com o status "Agendado" (UC11) | roteiro de tela; linhas conferidas no banco local |
| Dado um principal com adicionais vinculados, quando o escolho, então o assistente oferece os adicionais (UC11 FA02, RN006) | roteiro de API (`lookup/services` com adicional ativo, inativo e excluído) e de tela |
| Dado um horário fora do expediente, na pausa ou no passado, quando avanço, então recebo a mensagem e escolho outro (UC11 FE03, RN013, RN015) | teste `tests/rules/appointment-booking.test.ts`; roteiro de API (400 em `scheduledAt`, nada gravado) e de tela |
| Dado o resumo, quando volto à etapa de serviços e troco um serviço, então os dados das outras etapas continuam, e o resumo é recalculado (UC11 FA01, RNF002) | roteiro de tela (a prévia é lida de novo a cada troca) |
| Dado um cliente sem veículo, quando chego à etapa do veículo, então o assistente indica cadastrar o veículo nos detalhes do cliente (UC11 FE02) | roteiro de tela com Natália Pires, do `seed-demo.sql` |
| Dado outro agendamento no mesmo horário, quando registro o segundo, então ele é aceito (RN016) | roteiro de API: dois `POST` iguais, dois 201 |
| Dado um serviço que muda de preço depois do agendamento, quando abro o agendamento, então ele mantém o valor da época (RN037) | roteiro de API: `save_service` altera o preço, e o detalhe e as linhas `appointment_services` continuam iguais |
| Dado um funcionário sem `appointments` ou um cliente, quando chama qualquer das cinco rotas, então 403 (RS008) | roteiro de API com a conta de cada tipo |
| Dado um valor, um total ou um status no corpo, quando registro, então ele é descartado (RS013) | teste `tests/validation/appointments.test.ts` |
| Dado o cliente excluído ou o veículo desvinculado entre a leitura e a gravação, quando registro, então nada é gravado | roteiro de API chamando a função com o vínculo ausente |

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_create_appointment_function.sql` | criar |
| `src/server/rules/appointment-booking.ts` | criar |
| `src/server/services/appointments.ts` | alterar |
| `src/server/repositories/appointments.ts` | alterar |
| `src/server/repositories/bookable-services.ts` | criar |
| `src/server/repositories/clients.ts` | alterar |
| `src/server/repositories/client-search.ts` | alterar |
| `src/server/repositories/vehicles.ts` | alterar |
| `src/shared/validation/appointments.ts` | alterar |
| `src/app/api/admin/appointments/route.ts` | alterar (`POST`) |
| `src/app/api/admin/appointments/preview/route.ts` | criar |
| `src/app/api/admin/appointments/lookup/clients/route.ts` | criar |
| `src/app/api/admin/appointments/lookup/vehicles/route.ts` | criar |
| `src/app/api/admin/appointments/lookup/services/route.ts` | criar |
| `src/lib/demo/routes.ts` | alterar (tira cinco entradas) |
| `src/lib/demo/admin-appointments.ts` | excluir |
| `src/lib/demo/README.md`, `src/lib/demo/appointments.ts` | alterar (referências ao arquivo excluído) |
| `src/components/admin/appointments/appointment-wizard.tsx` | alterar |
| `src/components/admin/appointments/booking-client-step.tsx` | alterar (esquema) |
| `src/components/shared/booking-vehicle-step.tsx`, `booking-services-step.tsx`, `booking-schedule-step.tsx`, `booking-payment-step.tsx` | sem mudança (compartilhados com o portal; o resolvedor do painel os cobre) |
| `tests/rules/appointment-booking.test.ts` | criar |
| `tests/validation/appointments.test.ts` | alterar |
| `tests/repositories/client-search.test.ts` | alterar |
| `tests/lib/api-client.test.ts` | sem mudança (usa uma lista de demonstração simulada) |
| `docs/agendamento/rotas.md`, `dados.md`, `agendamentos-do-painel.md` | alterar |
| `docs/plataforma/mensagens-de-validacao.md` | alterar (L1, L2, L4) |
| `docs/plataforma/openapi.yaml` | alterar |
| `memoria/tarefas/49-agendamento-para-cliente/` (`01_plano.md`, `notas.md`, `02_relatorio.md`) | criar |

Possíveis coincidências com outras tarefas: `appointment-wizard.tsx`, `appointments.ts` (serviço e repositório) e `rotas.md` do agendamento são tocados também pela #50 (edição e status), que ainda não começou.

## Testes previstos

Escritos antes do código (TDD) nas regras e nos esquemas; o que depende do banco é conferido no roteiro local.

- `rejects an order with only additional services` e `rejects an additional service whose main service was not chosen` — RN005, RN006, vindo de `findCompositionError`.
- `maps each availability error to the message of the scheduledAt field` (dia fechado, fora do funcionamento, pausa, fora da meia hora, passado) — L1 e RN013, RN015.
- `accepts the first start, the last half hour and the end of the break` e `rejects the closing time and the break` — exemplos de `calculos.md` (8h, 13h, 17h30 aceitos; 12h, 12h30, 18h recusados).
- `works out the estimated end across the break` e `across the next open day` — exemplo de `calculos.md` (16h, 4 horas, previsão às 10h do dia seguinte aberto).
- `keeps the half cent up in the total` — R$ 150,10 com 5% dá R$ 157,61 (já em `pricing.test.ts`; só confirmado com a entrada do serviço).
- `requires clientId, vehicleId, serviceIds, paymentMethod and scheduledAt` — e a mensagem de cada um.
- `discards price, total, status and the copies sent in the body` — RS013.
- `rejects an empty list of services, a repeated id and more than 20` — L2.
- `rejects a scheduledAt without an offset or that is not an instant` — ISO 8601 com fuso (`api.md`).
- `requires a search for the clients` e `splits the search into words without the phone` — L4.
- `accepts a preview without paymentMethod and without scheduledAt` e `accepts appointmentId` — L3.
- Etapas: `asks to choose the client`, `the vehicle`, `the services`, `the date`, `the time` e `the payment method` — as mensagens de hoje.

Roteiro local (não automatizado, por precisar do banco): banco local com `fresh.sh` e `seed-demo.sql`, `next start`, contas de administrador, de funcionário sem `appointments` e de cliente; as cinco rotas e os 400, 403 e 404 acima; conferência das linhas gravadas (cópia, `created_by_staff_id`, valores) e da cópia que não muda com a edição do serviço; assistente a 360 e 1440 px, nos dois temas, com Lighthouse de acessibilidade, teclado e LCP/CLS do celular (o LCP de página que lê a API depois da hidratação vai ao relatório com o valor do DevTools).

## Lacunas na documentação

Cada lacuna traz o problema, as opções e o texto que entra na documentação. Marque com `x` a opção escolhida; o texto proposto é o da opção recomendada, e se você escolher outra, ele é refeito antes da construção.

### L1. Erros de domínio do registro: código, campo e mensagem

**Problema.** `rotas.md` diz só "400 data ou horário inválido" (`POST /api/admin/appointments`) e, no do cliente, "adicional sem o serviço principal". Não há mensagem nem campo para cada recusa, e o catálogo de erros de `api.md` não tem código para elas. Também não diz o que acontece com cliente excluído ou veículo de outro cliente.

**Opções:**

- [x] **1. `VALIDATION_ERROR` com `fields` (recomendada).** O formato de erro que as telas já tratam: a mensagem vai ao campo e a janela fica aberta. Sem código novo no catálogo.
- [ ] **2. Código próprio por recusa (`CLOSED_DAY`, `IN_THE_PAST`…).** Mais fácil de tratar por programa, mas oito códigos novos e a tela teria de traduzir cada um.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, nova seção "Agendamento": em `scheduledAt`, dia fechado "A empresa não atende neste dia.", fora do funcionamento "Escolha um horário dentro do funcionamento da empresa.", pausa "Escolha um horário fora da pausa.", fora da meia hora "Escolha um horário em hora cheia ou meia hora." (a que já existe), passado "Escolha uma data e um horário que ainda não passaram."; em `serviceIds`, sem principal ou complementar "Escolha ao menos um serviço principal ou complementar.", adicional sem o principal "Escolha o serviço principal a que o adicional está ligado.", serviço que não pode ser agendado "Escolha serviços disponíveis para agendamento."; em `vehicleId`, veículo de outro cliente "Escolha um veículo deste cliente.".
- `docs/agendamento/rotas.md`, `POST /api/admin/appointments`: "400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado, serviços sem principal ou complementar, adicional sem o seu principal, serviço que não pode ser agendado ou veículo que não é do cliente; 404 cliente inexistente ou excluído". `lookup/vehicles` (`clientId`) e `lookup/services` e `preview` (`vehicleId`) inexistentes: 404.

### L2. Limite e repetição em `serviceIds`

**Problema.** Nem `rotas.md` nem RN035 dizem quantos serviços um pedido aceita nem o que fazer com id repetido. O cliente do assistente envia principais, complementares e adicionais juntos.

**Opções:**

- [x] **1. De 1 a 20 ids, repetição recusada (recomendada).** O catálogo é pequeno; 20 cobre qualquer escolha real e protege a consulta `in`. Repetição é erro do cliente da API (o assistente não a produz).
- [ ] **2. De 1 a 20 ids, repetição descartada em silêncio.** Aceita mais, mas esconde um defeito do chamador.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, "Agendamento": `serviceIds` fora de 1 a 20 ou com repetição: "Escolha de 1 a 20 serviços, sem repetir.".
- `docs/agendamento/rotas.md`: em `preview` e `POST`, "`serviceIds*` (de 1 a 20 ids, sem repetição)".

### L3. O que a prévia faz com `appointmentId` e com data ou composição inválidas

**Problema.** `rotas.md` descreve `appointmentId` "na edição" e a resposta da prévia, mas não diz se ela julga a data e os serviços nem o que `appointmentId` muda. A prévia do assistente de edição já a usa.

**Opções:**

- [x] **1. A prévia só calcula; `appointmentId` é validado e ignorado até a #50 (recomendada).** Os serviços que não podem ser agendados ficam de fora, como na do cliente; data e composição só são recusadas pelo `POST` (a etapa de data já só oferece horários válidos). O resumo da edição continua funcionando, e a #50 define o que `appointmentId` muda (RN033).
- [ ] **2. A prévia também recusa data e composição inválidas (400).** O resumo nunca mostra um pedido que o `POST` recusaria, mas a prévia do "Editar" falharia para a data mantida, que RN033 permite (já passada).

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `POST /api/admin/appointments/preview`: "A prévia só calcula, pelo catálogo vigente: o serviço que não pode ser agendado fica de fora, e a data, o horário e a composição são conferidos só no registro. `appointmentId` identifica a edição (UC26) e, nesta rota, não muda o cálculo."

### L4. Busca de cliente: o que a busca compara e se `search` pode ser vazio

**Problema.** `rotas.md` diz "`search*` (parte do nome ou do e-mail, sem distinção de maiúsculas)", sem dizer se "Ana Souza" (nome e sobrenome) acha o cliente nem o que ocorre com `search` vazio; a busca de `Clientes` também compara o telefone.

**Opções:**

- [x] **1. Palavras em nome, sobrenome e e-mail, sem o telefone; `search` obrigatório e não vazio (recomendada).** Como na listagem de clientes, sem a parte do telefone, que o texto da tela ("Nome ou e-mail") não promete; vazio é 400, como o `*` da rota diz.
- [ ] **2. Com o telefone, como em `Clientes`.** Um filtro só, mas uma busca por "99" traria clientes que a tela diz não procurar.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `lookup/clients`: "O termo se separa em palavras, e cada uma precisa aparecer, sem distinção de maiúsculas, no nome, no sobrenome ou no e-mail; `search` vazio responde 400 em `fields`."
- `docs/plataforma/mensagens-de-validacao.md`, "Agendamento": busca de cliente vazia "Digite o nome ou o e-mail para buscar o cliente.".

## Decisões técnicas

- Seguidas: 0011 (cópia no agendamento), 0021 (catálogo vigente), 0025 (erros RFC 9457), 0035 (TDD), 0042 (acesso ao banco só pelo servidor), 0043 (migration conferida só no banco local), 0053 (fuso da empresa), 0055 (telas de demonstração, rota a rota). As funções puras e as regras de `docs/agendamento/calculos.md` não mudam.
- Nenhuma nova. A função `create_appointment` lê as cópias do banco dentro da transação, em vez de recebê-las do serviço: é a leitura que `dados.md` já descreve ("cópia dos dados") e evita que a cópia divirja do banco.

## Riscos e dúvidas

- **A migration só vale depois de aplicada** (Yvan, `supabase db push`, antes da pré-visualização). Sem isso, o `POST` falha com 500 na produção e na Vercel; o `lookup` e a prévia funcionam antes.
- **Gravação sem controle de duplicidade**: dois registros iguais são permitidos (RN016, sem conflito de agenda).
- **Corrida entre a leitura e a gravação**: um serviço que fica inativo ou um preço que muda nesses milissegundos grava o valor lido (aceito; o registro guarda o que valia ao ler, RN037); a exclusão do cliente ou o desvínculo do veículo são pegos pela função.
- **Funcionário desativado no meio do envio**: a chave de `created_by_staff_id` nunca é violada, porque funcionários não são excluídos (#43).
- **Administrador sem linha em `staff`**: a #43 diz que tem; confiro com a conta local de administrador e, se faltar, é erro de dado, não de rota.
- **Prévia a cada mudança de escolha**: uma consulta por chamada (catálogo, percentuais e funcionamento); sem cache, para a mudança do painel valer na hora.
- Ainda em demonstração, de propósito: `GET /api/me/bookable-services`, `POST /api/me/appointments/preview` e as gravações do cliente (outras tarefas), e `PATCH`, `advance`, `complete`, `cancel` e `reschedule` do painel (#50).

## Fora do escopo

- Edição, avanço, conclusão, cancelamento e reagendamento (#50) e as rotas do cliente em `/api/me/appointments`.
- Cadastrar cliente ou veículo dentro do assistente (UC11 FE01 e FE02 mandam ir às telas de Clientes).
- Análise do dashboard por IA (#66).
- A acessibilidade (WCAG) do site inteiro, que o Yvan ajusta no fim.
