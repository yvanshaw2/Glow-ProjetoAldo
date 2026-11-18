---
titulo: Telas e rotas – Agendamento
assunto: agendamento
origem: Documentação de Arquitetura de Software, seção 3.2 (Quadros 3 e 4) e Apêndice A
---

# Telas e rotas: Agendamento

Valem para todas as rotas, sem repetição abaixo ([../padroes/api.md](../padroes/api.md)): erros comuns 400, 401, 403 e 404 no formato Problem Details; parâmetros `page` e `pageSize` em toda listagem; `updatedAt` obrigatório em `PATCH` e `PUT`, com 409 `VERSION_CONFLICT`. Campos com `*` são obrigatórios.

## Telas

| Rota | Tela | Acesso | Casos de uso |
|---|---|---|---|
| `/booking` | Agendar serviço | Cliente | UC06 |
| `/appointments` | Agendamentos atuais e histórico, com edição, cancelamento e reagendamento | Cliente | UC07, UC25, UC26 |
| `/admin` | Dashboard, com a análise do período por IA | permissão `dashboard` | UC09, UC27 |
| `/admin/appointments` | Gerenciamento de agendamentos | permissão `appointments` | UC10, UC11, UC12, UC25, UC26 |

Proteção das páginas: [../acesso/autenticacao.md](../acesso/autenticacao.md).

## API

### Rotas do cliente: agendamentos

Acesso: Perfil `client`; opera só sobre os dados do cliente da sessão (RS009).

#### `GET /api/me/bookable-services`

Serviços disponíveis para o veículo, com valores e adicionais vinculados.

- Entrada: `vehicleId*`
- Resposta: **200** lista paginada dos serviços principais e complementares ativos de categorias ativas (RN008, RN031), na ordem do catálogo público, com `id`, `name`, `description`, `type`, `category` (`id` e `name`), `price` (o do porte do veículo ou o valor fixo, RN009), `durationMinutes` e `additionals`: `id`, `name`, `price` e `durationMinutes` dos adicionais ativos vinculados ao principal (RN006); lista vazia no complementar.

#### `POST /api/me/appointments/preview`

Calcula os valores do carrinho ou da edição de um agendamento, sem gravar.

- Entrada: `vehicleId*, serviceIds*, paymentMethod, scheduledAt`; `appointmentId`, na edição.
- Resposta: **200** `services` (`id`, `name`, `type`, `price` e `durationMinutes` de cada serviço pedido que pode ser agendado, pelo catálogo atual; o serviço inativo ou de categoria inativa fica de fora, RN008, RN031), `subtotal`, `feePercent` (o percentual da forma de pagamento, RN012, ou `null` sem `paymentMethod`), `total` (RN010; sem `paymentMethod`, igual ao subtotal), `estimatedDurationMinutes` (RN014) e `estimatedEndAt` (RN034, ou `null` sem `scheduledAt`).

#### `POST /api/me/appointments`

Registra o agendamento (UC06).

- Entrada: `vehicleId*, serviceIds*, paymentMethod*, scheduledAt*`
- Resposta: **201** agendamento com o status `scheduled`; 400 data ou horário fora do funcionamento ou no passado; adicional sem o serviço principal.

#### `GET /api/me/appointments`

Lista os agendamentos (UC07).

- Entrada: `scope*`: `current` (Agendado, Em espera, Em execução e Finalizado, da data mais próxima à mais distante) ou `history` (Concluído, Cancelado e Reagendado, da data mais recente à mais antiga).
- Resposta: **200** lista paginada de `id`, `status`, `scheduledAt`, `estimatedEndAt`, `vehicle` (`plate`, `brand`, `model` e `color`), `services` (`id` e `name`) e `total`, com os dados copiados no agendamento (RN037).

#### `GET /api/me/appointments/:id`

Detalha um agendamento do cliente.

- Entrada: Nenhuma.
- Resposta: **200** `id`, `status`, `scheduledAt`, `estimatedEndAt`, `estimatedDurationMinutes`, `paymentMethod`, `subtotal`, `feePercent`, `total`, `vehicle` (`id`, `plate`, `type`, `size`, `brand`, `model`, `color` e `year`), `services` (`id`, `name`, `type`, `price` e `durationMinutes`) e `updatedAt`, com os dados copiados no agendamento (RN037).

#### `PATCH /api/me/appointments/:id`

Edita um agendamento com o status `scheduled` (UC26).

- Entrada: `vehicleId, serviceIds, paymentMethod, scheduledAt`
- Resposta: **200** agendamento atualizado, com os valores e a previsão de conclusão recalculados; 400 data, horário ou serviços inválidos, ou nova data anterior à marcada; 409 `INVALID_STATUS` se não estiver agendado.

#### `POST /api/me/appointments/:id/cancel`

Cancela um agendamento.

- Entrada: Nenhuma.
- Resposta: **200** agendamento cancelado; 409 `INVALID_STATUS` se não estiver agendado.

#### `POST /api/me/appointments/:id/reschedule`

Reagenda um serviço concluído (UC25).

- Entrada: `paymentMethod*, scheduledAt*`
- Resposta: **201** novo agendamento, com valores e duração calculados pelo catálogo atual; o original passa a `rescheduled`; 409 `INVALID_STATUS` se não estiver concluído.

### Rotas do painel: dashboard

Acesso: Perfis `staff` ou `admin` com a permissão `dashboard`.

#### `GET /api/admin/dashboard`

Indicadores e agenda do dia (UC09).

- Entrada: `from, to` (datas `aaaa-mm-dd`; padrão: o mês atual inteiro, no fuso da empresa).
- Resposta: **200** `from` e `to` (o período aplicado), `revenue`, `appointmentCount`, `averageTicket`, `cancellationRate` (percentual, de 0 a 100, com duas casas), `revenueByDay` (`date` e `revenue` de cada dia do período, com 0 nos dias sem receita), `appointmentsByStatus` (`status` e `count` dos sete status, na ordem de RN017, dos agendamentos com a data marcada no período) e `agenda` (os agendamentos do dia corrente, por horário: `id`, `status`, `scheduledAt`, `estimatedEndAt`, `clientName`, `vehicle` com `plate`, `brand` e `model`, `services` com `id` e `name`, e `total`, com os dados copiados no agendamento, RN037); 400 com o campo em `fields` quando só uma das datas vem, quando uma data não existe, quando `from` é depois de `to` ou quando o intervalo passa de 366 dias contando as duas datas (RN035).

#### `POST /api/admin/dashboard/analysis`

Gera a análise do período por inteligência artificial (UC27); nada é gravado.

- Entrada: `from*, to*` (datas do período exibido; até 12 meses).
- Resposta: **200** `from`, `to`, `previousFrom`, `previousTo`, `hasComparison`, `summary`, `highlights` (até quatro, cada um com `indicator` e `comment`) e `generatedAt`; 400 período inválido ou maior que 12 meses; 409 `INSUFFICIENT_DATA`, período sem agendamentos, sem chamar a IA; 503 `AI_UNAVAILABLE`, serviço de IA sem configuração, sem resposta em 15 segundos, com o limite atingido ou com resposta fora de RN039 (`docs/plataforma/servico-de-ia.md`).

### Rotas do painel: agendamentos

Acesso: Perfis `staff` ou `admin` com a permissão `appointments`.

#### `GET /api/admin/appointments`

Lista os agendamentos (UC10).

- Entrada: `view*`: `today` (Agendado, Em espera, Em execução e Finalizado, marcados para o dia corrente, no fuso da empresa, ou para dias anteriores), `future` (os mesmos status, marcados para depois do dia corrente) ou `history` (Concluído, Cancelado e Reagendado, de qualquer data); `status` (um dos status da visão); `search` (o termo se separa em palavras, e cada uma precisa aparecer, sem distinção de maiúsculas, no nome do cliente, na placa, na marca ou no modelo do veículo; a placa vale com ou sem hífen); `sort`: `time` (padrão: pela data marcada, da mais próxima à mais distante e, no `history`, da mais recente à mais antiga) ou `status` (na ordem de RN017 e, dentro de cada status, por `time`); dois agendamentos no mesmo instante saem pelo identificador, e a ordem se mantém de uma página à outra; em `today`, os dias anteriores em aberto vêm antes dos de hoje; `page`, `pageSize`.
- Resposta: **200** lista paginada de `id`, `status`, `scheduledAt`, `estimatedEndAt`, `clientName`, `vehicle` (`plate`, `brand` e `model`), `services` (`id` e `name`, por tipo — principal, complementar e adicional — e, dentro do tipo, pelo nome copiado) e `total`, com os dados copiados no agendamento (RN037); 400 com o parâmetro em `fields` quando `view` falta ou não é uma das três, quando `status` não é um dos status da visão ou quando `sort` não é `time` nem `status`.

#### `GET /api/admin/appointments/:id`

Detalha um agendamento.

- Entrada: Nenhuma.
- Resposta: **200** `id`, `status`, `scheduledAt`, `estimatedEndAt`, `estimatedDurationMinutes`, `clientId`, `clientName`, `paymentMethod`, `subtotal`, `feePercent`, `total`, `vehicle` (`id`, `plate`, `type`, `size`, `brand`, `model`, `color` e `year`), `services` (`id`, `name`, `type`, `price` e `durationMinutes`, na ordem do cartão da listagem) e `updatedAt`, com os dados copiados no agendamento (RN037); no status `awaiting_payment`, também `paymentOptions`: `paymentMethod`, `feePercent` e `total` de cada uma das quatro formas, na ordem de RN011, usado no resumo de conclusão (para a forma de pagamento do agendamento, `feePercent` e `total` são os gravados nele; para as outras, o percentual vigente aplicado ao subtotal, RN012); nos outros status, `paymentOptions` é `null`. As quatro rotas de gravação abaixo respondem com este formato.

#### `POST /api/admin/appointments/preview`

Calcula os valores de um novo agendamento ou da edição de um agendamento, sem gravar.

- Entrada: `vehicleId*, serviceIds*` (de 1 a 20 ids, sem repetição), `paymentMethod, scheduledAt`; `appointmentId`, na edição.
- Resposta: **200** `AppointmentPreview`, como a prévia do cliente: os serviços que podem ser agendados, `subtotal`, `feePercent`, `total`, `estimatedDurationMinutes` e, com `scheduledAt`, `estimatedEndAt`; 404 veículo inexistente. A prévia só calcula, pelo catálogo vigente: o serviço que não pode ser agendado fica de fora, e a data, o horário e a composição são conferidos só no registro. `appointmentId` identifica a edição (UC26) e, nesta rota, não muda o cálculo nem as conferências: quem confere a data e a composição na edição é o `PATCH`.

#### `POST /api/admin/appointments`

Registra um agendamento para um cliente (UC11).

- Entrada: `clientId*, vehicleId*, serviceIds*` (de 1 a 20 ids, sem repetição), `paymentMethod*, scheduledAt*` (instante com fuso). Preço, total, porte, previsão, cópias e status são calculados pelo servidor; o `created_by_staff_id` é o funcionário da sessão.
- Resposta: **201** agendamento com o status `scheduled`, no formato do detalhe; 400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado (`scheduledAt`), serviços sem principal ou complementar, adicional sem o seu principal ou serviço que não pode ser agendado (`serviceIds`) ou veículo que não é do cliente (`vehicleId`); 404 cliente inexistente ou excluído.

#### `PATCH /api/admin/appointments/:id`

Edita um agendamento em qualquer status (UC26).

- Entrada: `updatedAt*` (a versão lida, devolvida como veio); `vehicleId, serviceIds` (de 1 a 20 ids, sem repetição), `paymentMethod, scheduledAt` (instante com fuso), ao menos um deles; só o que vem é conferido, e o valor igual ao gravado não conta como mudança. Status, valores, cliente e datas de status não são aceitos (RS013).
- Resposta: **200** agendamento atualizado, no formato do detalhe e com o mesmo status, com os valores e a previsão de conclusão recalculados: a troca de veículo ou de serviços recalcula todos os itens pelo catálogo atual e refaz a cópia do veículo, a troca da forma aplica o percentual vigente, e o que não mudou fica como gravado (RN037); 400 com o campo em `fields`: data ou horário fora do funcionamento, no passado em um Agendado ou posterior ao momento da alteração depois da chegada do veículo (`scheduledAt`), serviços sem principal ou complementar, adicional sem o seu principal ou serviço que não pode ser agendado (`serviceIds`) ou veículo que não é do cliente (`vehicleId`); corpo sem nenhum campo além de `updatedAt`, 400; 404 agendamento inexistente; 409 `VERSION_CONFLICT` quando o agendamento mudou depois da leitura.

#### `POST /api/admin/appointments/:id/advance`

Avança para o próximo status, até `awaiting_payment` (UC12).

- Entrada: Nenhuma.
- Resposta: **200** agendamento com o novo status, no formato do detalhe; 409 `INVALID_STATUS`, com o status atual na mensagem (UC12 FE01).

#### `POST /api/admin/appointments/:id/complete`

Conclui o atendimento e registra a forma de pagamento utilizada (UC12).

- Entrada: `paymentMethod*`
- Resposta: **200** agendamento `completed`, no formato do detalhe, com o total recalculado se a forma de pagamento mudou (a forma do agendamento mantém o percentual e o total gravados; outra usa o percentual vigente); 409 `INVALID_STATUS` se não estiver em `awaiting_payment`, com o status atual na mensagem.

#### `POST /api/admin/appointments/:id/cancel`

Cancela um agendamento agendado ou em espera.

- Entrada: Nenhuma.
- Resposta: **200** agendamento cancelado, no formato do detalhe; 409 `INVALID_STATUS`, com o status atual na mensagem.

#### `POST /api/admin/appointments/:id/reschedule`

Reagenda um serviço concluído (UC25).

- Entrada: `paymentMethod*, scheduledAt*`. Os serviços são os do agendamento original que ainda podem ser agendados (RN008, RN031); os demais ficam de fora.
- Resposta: **201** novo agendamento, no formato do detalhe, com valores e duração calculados pelo catálogo atual; o original passa a `rescheduled`; 400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado (`scheduledAt`), serviços restantes sem principal ou complementar ou adicional sem o seu principal (`serviceIds`); 404 cliente excluído; 409 `INVALID_STATUS`, com o status atual na mensagem.

#### `GET /api/admin/appointments/lookup/clients`

Busca clientes para o formulário de novo agendamento.

- Entrada: `search*` (até 100 caracteres; o termo se separa em palavras, e cada uma precisa aparecer, sem distinção de maiúsculas, no nome, no sobrenome ou no e-mail, sem o telefone), `page`, `pageSize` (10 por página)
- Resposta: **200** lista paginada de `id`, `name` e `email`, em ordem alfabética do nome; só clientes ativos (RN030); 400 em `search` quando falta ou está vazio.

#### `GET /api/admin/appointments/lookup/vehicles`

Lista os veículos do cliente escolhido.

- Entrada: `clientId*`, `page`, `pageSize` (10 por página)
- Resposta: **200** lista paginada dos veículos do cliente, nos campos de `GET /api/me/vehicles`, na ordem em que foram vinculados (RN003); 404 cliente inexistente ou excluído.

#### `GET /api/admin/appointments/lookup/services`

Lista os serviços com os valores aplicáveis ao veículo.

- Entrada: `vehicleId*`, `page`, `pageSize` (12 por página)
- Resposta: **200** lista paginada nos campos e na ordem de `GET /api/me/bookable-services`, com o preço do porte do veículo (RN009); 404 veículo inexistente.
