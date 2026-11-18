---
issue: 4
titulo: "Agendar serviço pelo cliente no portal"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC06, RF019, RF020, RF021, RF022, RF023, RF024, RF025, RF026, RF027, RN003, RN004, RN005, RN006, RN009, RN010, RN011, RN013, RN014, RN015, RN016, RN034, RN037, RNF002, RNF010, RS009]
status: em_execucao
aprovado_por: yvan
aprovado_em: 18/11/2026
---

# Plano: Agendar serviço pelo cliente no portal

## Objetivo

Ligar `/booking` ao banco: o cliente autenticado escolhe o veículo, os serviços (com os adicionais), a data, o horário e a forma de pagamento, confere o resumo com o total e a previsão de conclusão e confirma o agendamento (UC06, RF019 a RF027), por três rotas em `/api/me`, todas com `requireClient` e só sobre o cliente da sessão (RS009):

- `GET /api/me/bookable-services`: os serviços para agendar com os valores do porte do veículo (RN009) e os adicionais vinculados (RN006), 12 por página;
- `POST /api/me/appointments/preview`: subtotal, percentual da forma de pagamento, total, duração e previsão de conclusão, sem gravar (RN010, RN012, RN014, RN034);
- `POST /api/me/appointments`: confere o veículo (RN003), a composição (RN005, RN006) e a data (RN013, RN015) e grava o agendamento `scheduled`, a cópia dos dados e os serviços numa transação, pela função `create_appointment` (RN037, RNF010), sem controle de capacidade (RN016).

O serviço `appointments` da #49 e as funções puras da #36 já fazem o cálculo e a conferência; o que é novo é a entrada do cliente (o cliente vem da sessão, `created_by_staff_id` fica vazio), a regra de que o veículo é da conta (404, RS009), as três rotas, o resolvedor do esquema no assistente `/booking` e a saída dos dados de demonstração dessas três entradas e do aviso da página. Sem migration (a função aceita `p_staff_id` vazio), sem dependência nova.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um cliente com um SUV, quando escolho um serviço por porte, um adicional vinculado, o Pix, a data e o horário, então o resumo mostra os valores do porte G, o total com o percentual do Pix e a previsão de conclusão (UC06, RN009, RN010, RN034) | roteiro de API: `GET bookable-services` e `POST preview` com o SUV do `seed-demo.sql`; passo manual no `/booking`, no banco local, conferindo o resumo; as contas de preço e previsão já têm teste (`pricing`, `scheduling`) |
| Dado o resumo, quando confirmo, então o agendamento aparece com o status "Agendado" (UC06, RF027) | roteiro de API: `POST` devolve 201 `scheduled` e a linha em `appointments` tem `created_by_staff_id` nulo e as cópias (SQL); passo manual: confirmação em `/booking`. A listagem em `/appointments` é a #108 e segue em demonstração (ver L3) |
| Dado um serviço inativo ou de categoria inativa, quando abro a lista de serviços, então ele não aparece (RN008, RN031) | roteiro de API: inativar um serviço e uma categoria no banco local e ler `bookable-services` |
| Dado um horário fora do expediente, na pausa ou no passado, quando confirmo, então recebo a mensagem e escolho outro (UC06 FE03, RN013, RN015) | testes de `appointment-booking` e `scheduling` (já existem, #36 e #49); roteiro de API: `POST` com dia fechado, antes da abertura, pausa, fora da meia hora e passado dá 400 com a mensagem em `scheduledAt` e nada gravado; passo manual: a mensagem aparece na etapa e o assistente deixa escolher outro |
| Dado outro agendamento no mesmo horário, quando agendo o segundo, então ele é aceito (RN016) | roteiro de API: dois `POST` no mesmo horário dão 201 |
| Dado o veículo de outro cliente, quando o informo na rota, então recebo 403 ou 404 e nada é gravado (RS009) | roteiro de API com duas contas: `bookable-services`, `preview` e `POST` com o veículo da outra conta dão 404 (L1), nenhuma linha nova (SQL); `staff` e visitante, 403 e 401 |
| Dado um serviço que muda de preço depois do agendamento, quando abro o agendamento, então ele mantém o valor da época (RN037) | roteiro de API: mudar o preço e o nome do serviço no banco depois do `POST`; o agendamento gravado (SQL) continua com o valor e o nome da época |
| (UC06 FE02, RN004, RN005) Sem veículo, sem serviço, sem data, sem horário ou sem forma de pagamento, "Próximo" mostra a mensagem da etapa e não avança | testes do esquema do formulário; passo manual no `/booking` |
| (RNF002, mobile first) `/booking` em 360 px e em tela larga, claro e escuro, sem falha | passo manual conforme `workflows/procedimentos/testes.md` (Interface), com o Lighthouse de acessibilidade |

## Arquivos

PR único (L-risco em "Riscos e dúvidas").

| Arquivo | Ação |
|---|---|
| `src/app/api/me/bookable-services/route.ts` | criar: `GET` |
| `src/app/api/me/appointments/route.ts` | criar: `POST` (o `GET` da listagem é a #108) |
| `src/app/api/me/appointments/preview/route.ts` | criar: `POST` |
| `src/app/api/me/appointments/README.md`, `.../bookable-services/README.md` | alterar: só a tabela de métodos, se o `GET` de `appointments` seguir ausente |
| `src/server/services/appointments.ts` | alterar: `lookUpMyServices`, `previewMyAppointment` e `createMyAppointment` (o veículo é da conta, senão `NOT_FOUND`), sobre o cálculo e as conferências que já existem; o registro do painel e o do cliente passam a usar o mesmo corpo, com o funcionário vazio no do cliente |
| `src/server/repositories/appointments.ts` | alterar: `NewAppointment.staffId` passa a `string \| null` |
| `src/shared/validation/appointments.ts` | alterar: `myAppointmentInputSchema` (sem `clientId`; o que vier a mais é descartado, RS013) e `portalBookingFormSchema` (o `bookingFormSchema` sem `client`) |
| `src/components/portal/appointments/booking-wizard.tsx` | alterar: resolvedor do Zod no lugar do `rules:` das etapas; sai o comentário da demonstração |
| `src/app/(portal)/booking/page.tsx` | alterar: sai o `DemoNotice` e o comentário |
| `src/lib/demo/routes.ts` | alterar: saem as entradas `GET /api/me/bookable-services`, `POST /api/me/appointments/preview` e `POST /api/me/appointments` |
| `src/lib/demo/appointments.ts` | alterar: saem `answerBookableServices`, `answerAppointmentPreview` e o que só eles usavam |
| `docs/plataforma/openapi.yaml` | alterar: as três operações na tag dos agendamentos, com `sessionCookie`, reaproveitando `AppointmentPreview`, `BookableService` e o esquema do registro |
| `docs/agendamento/rotas.md` | alterar: o texto das lacunas L1 e L2 |
| `docs/agendamento/agendar-servico.md` | alterar: sai a frase do aviso de demonstração do `/booking` e a do `NOT_IMPLEMENTED`; fica a das janelas de edição e reagendamento (L3) |
| `tests/validation/appointments.test.ts` | alterar: `myAppointmentInputSchema` e `portalBookingFormSchema` |
| `memoria/tarefas/4-agendar-pelo-cliente/` | criar: `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Pontos de contato com outras tarefas: `src/lib/demo/routes.ts` e `src/lib/demo/appointments.ts` são editados por toda tarefa que tira rotas (#108, #5); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR.

## Testes previstos

Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/appointments.test.ts`:

- `myAppointmentInputSchema` aceita veículo, de 1 a 20 serviços, forma de pagamento e instante com fuso, e devolve só esses campos
- descarta `clientId`, `status`, `total` e `staffId` do corpo (RS009, RS013)
- recusa sem veículo, sem serviço, serviço repetido, forma de pagamento desconhecida e instante sem fuso, com as mensagens de `mensagens-de-validacao.md`
- `portalBookingFormSchema` aceita o formulário do portal sem `client` e recusa, com a mensagem de cada etapa, a falta de veículo, de serviço principal ou complementar (só adicional não vale, RN005), de data, de horário e de forma de pagamento

As conferências de data, composição e preço já têm testes (`appointment-booking`, `scheduling`, `pricing`, #36 e #49) e são reaproveitadas sem mudança. As três rotas e o serviço dependem do banco: são conferidos pelo roteiro de API no banco local (`db reset`, `seed-demo.sql`, duas contas) e pela interface, sem teste automatizado (`docs/padroes/testes.md`).

## Lacunas na documentação

Três lacunas, em `docs/agendamento/rotas.md`, `docs/agendamento/agendar-servico.md` e `docs/agendamento/meus-agendamentos.md`. Marque a opção escolhida; o texto proposto é o da recomendada.

### L1. Veículo que não é do cliente: 404 ou 400

**Problema.** O critério da issue aceita 403 ou 404 para o veículo de outro cliente, e `rotas.md` não diz qual nas três rotas do cliente. No painel, o veículo que não é do cliente escolhido é 400 em `fields.vehicleId`, porque o cliente já foi escolhido e existe; no portal o cliente é o da sessão, e o 400 confirmaria que o identificador existe.

**Opções:**

- [ x] **1. 404 (recomendada).** Igual ao 404 de um veículo que não existe e à decisão da #3 para `PATCH /api/me/vehicles/:id`; nada vaza sobre veículos de outras contas. Vale para `bookable-services`, `preview` e o registro.
- [ ] **2. 400 em `fields.vehicleId`, como o painel.** A mesma resposta nas duas áreas, mas confirma ao cliente que o identificador existe e é de outra conta.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/me/bookable-services`, Resposta: acrescenta "; 404 se o veículo não existe ou não está na conta do cliente (RS009)".
- `docs/agendamento/rotas.md`, `POST /api/me/appointments/preview`, Resposta: acrescenta "; 404 se o veículo não existe ou não está na conta do cliente (RS009)".
- `docs/agendamento/rotas.md`, `POST /api/me/appointments`, Resposta: acrescenta "; 404 se o veículo não existe ou não está na conta do cliente (RS009), sem gravar".

### L2. Entrada e resposta das três rotas do cliente

**Problema.** `rotas.md` não diz, nas rotas do cliente, a paginação de `bookable-services`, os limites de `serviceIds`, o formato da resposta do `POST`, em que campo vem cada 400 e o que `appointmentId` faz na prévia. O painel já definiu tudo isso nas rotas irmãs.

**Opções:**

- [ x] **1. Igual ao painel (recomendada).** `bookable-services` com `page` e `pageSize` (12 por página); `serviceIds` de 1 a 20 ids sem repetição; o `POST` responde no formato do detalhe do cliente (`GET /api/me/appointments/:id`, sem `clientId`, `clientName` e `paymentOptions`); os 400 trazem o campo em `fields` (`scheduledAt`, `serviceIds`); a prévia só calcula, e `appointmentId` não muda o cálculo. Reaproveita os esquemas, as mensagens e o serviço.
- [ ] **2. Resposta mínima.** O `POST` devolve só o `id` e a tela lê o agendamento depois; diverge do painel e obriga uma rota de leitura que é da #108.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/me/bookable-services`, Entrada: "`vehicleId*`" passa a "`vehicleId*`, `page`, `pageSize` (12 por página)".
- `docs/agendamento/rotas.md`, `POST /api/me/appointments/preview`, Entrada: "`vehicleId*, serviceIds*, paymentMethod, scheduledAt`; `appointmentId`, na edição." passa a "`vehicleId*, serviceIds*` (de 1 a 20 ids, sem repetição), `paymentMethod, scheduledAt` (instante com fuso); `appointmentId`, na edição, que não muda o cálculo." e a Resposta acrescenta "A prévia só calcula, pelo catálogo vigente: a data, o horário e a composição são conferidos só no registro."
- `docs/agendamento/rotas.md`, `POST /api/me/appointments`, Entrada: "`vehicleId*, serviceIds*, paymentMethod*, scheduledAt*`" passa a "`vehicleId*, serviceIds*` (de 1 a 20 ids, sem repetição), `paymentMethod*, scheduledAt*` (instante com fuso). Preço, total, porte, previsão, cópias e status são calculados pelo servidor; o cliente é o da sessão."; a Resposta "**201** agendamento com o status `scheduled`; 400 data ou horário fora do funcionamento ou no passado; adicional sem o serviço principal." passa a "**201** agendamento com o status `scheduled`, no formato de `GET /api/me/appointments/:id`; 400 com o campo em `fields`: data ou horário fora do funcionamento ou no passado (`scheduledAt`), serviços sem principal ou complementar, adicional sem o seu principal ou serviço que não pode ser agendado (`serviceIds`); 404 do veículo (L1)."

### L3. Janelas de edição e reagendamento de `/appointments` com a prévia real

**Problema.** `agendar-servico.md` diz que as janelas de edição e reagendamento de `/appointments` usam a prévia e a lista de serviços, e `/appointments` segue em demonstração até a #108, com os veículos do cliente do `seed-demo.sql` (Henrique Costa), que não têm conta. Com a prévia real, o cliente que abrir "Editar" ou "Reagendar" recebe 404 do veículo da demonstração (RS009), onde hoje a prévia de demonstração responde.

**Opções:**

- [ x] **1. Aceitar até a #108 (recomendada).** A prévia real recusa o veículo da demonstração, e a janela mostra a falha com "Tentar novamente"; o envio já só mostrava `NOT_IMPLEMENTED`. Sem código de transição para apagar na #108; o aviso de `/appointments` continua dizendo que nada é gravado.
- [ ] **2. Manter a prévia de demonstração quando vier `appointmentId`.** As janelas seguem mostrando o resumo na demonstração, mas é código de transição no `apiRequest`, a apagar na #108, e a `routes.ts` mistura rota real e de demonstração no mesmo caminho.

**Texto proposto (opção recomendada):**

- `docs/agendamento/agendar-servico.md`, Edição e reagendamento: acrescenta "Enquanto `/appointments` usar os dados de demonstração, a prévia real recusa o veículo da demonstração (404) e a janela mostra a falha com 'Tentar novamente'."
- `docs/agendamento/agendar-servico.md`, parágrafo antes de "Página": "Enquanto as rotas `/api/me/bookable-services` e `/api/me/appointments` usarem os dados de demonstração, o aviso fica logo abaixo do título da página." passa a "As rotas do assistente são reais; o aviso de demonstração fica só em `/appointments`, enquanto a listagem, o detalhe, a edição, o cancelamento e o reagendamento forem de demonstração."
- `docs/agendamento/agendar-servico.md`, Pagamento e resumo: "A falha, como o `NOT_IMPLEMENTED` da demonstração ou a data recusada (FE03), aparece no topo do formulário." passa a "A falha, como a data recusada (FE03), aparece no topo do formulário."

## Decisões técnicas

nenhuma nova.

- Seguidas: 0002 (API em rotas do Next.js), 0003 (backend em camadas: rota, serviço, repositório), 0005 e 0046 (autorização na API, sessão conferida no Supabase Auth), 0008 e 0027 (esquema compartilhado entre a tela e a rota, React Hook Form), 0014 (sem controle de capacidade), 0017 (código em inglês), 0021 (valores calculados no servidor pelo catálogo atual), 0025 (erros RFC 9457), 0035 (TDD nas regras), 0042 (banco sem privilégios públicos: a função só roda pelo `service_role`), 0055 (telas de demonstração: sai o que a rota substitui).

## Riscos e dúvidas

- **Tamanho do PR.** A estimativa fica abaixo de 400 linhas fora dos testes: três rotas curtas, três funções de serviço sobre o que já existe, dois esquemas, o resolvedor e a especificação OpenAPI (o maior bloco). Se a especificação passar do esperado, o PR se divide em API (rotas, serviço, esquemas, OpenAPI, documentação) e tela (assistente, página e demonstração), nessa ordem.
- **Banco de demonstração.** A conferência do cliente real exige uma conta de cliente com veículo no banco local (o cliente do `seed-demo.sql` não tem conta de acesso); o roteiro cria duas contas pelo cadastro, como na #3. Nada de `.env*` é lido.
- **`create_appointment`.** A migration da #49 precisa estar aplicada no banco usado na verificação; quem a aplica é o Yvan, não a IA.
- O assistente é compartilhado com a edição e o reagendamento de `/appointments`: o resolvedor entra nos três modos, com as mesmas mensagens que as etapas já mostravam, e a verificação manual confere os três.

## Fora do escopo

- Listar, detalhar, editar, cancelar e reagendar os agendamentos do cliente (#108): `GET /api/me/appointments`, `GET` e `PATCH /api/me/appointments/:id`, `cancel` e `reschedule` seguem em demonstração.
- Conta e veículos do cliente (#3, feita) e agendamento pelo painel (#49, feita).
- Migration, novas regras de cálculo e novos componentes de tela.
