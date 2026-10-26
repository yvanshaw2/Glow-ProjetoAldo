---
issue: 46
titulo: "Consulta de agendamentos no painel"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC10, RF044, RF045, RF046, RF047, RF048, RF049, RN017, RN037, RS008, RNF005, RNF008]
status: concluido
aprovado_por: yvan
aprovado_em: 12:44
---

# Plano: Consulta de agendamentos no painel

## Objetivo

Entregar o UC10 de ponta a ponta: o funcionário com a permissão `appointments` vê os agendamentos de hoje, os futuros e o histórico em `/admin/appointments`, com filtro por status, busca, ordenação, atualização e o detalhe de cada agendamento, pelas duas rotas de `docs/agendamento/rotas.md`, ambas com `requirePermission("appointments")` (RS008):

- `GET /api/admin/appointments`: página (20 por página, RNF008) da visão `today`, `future` ou `history`, com `status`, `search` e `sort` (`time` ou `status`); só lê a cópia dos dados gravada no agendamento (RN037);
- `GET /api/admin/appointments/:id`: o detalhe, com `paymentOptions` no status `awaiting_payment` e `null` nos outros.

**A listagem e o detalhe deixam de ser demonstração** (orientação do Yvan e decisão 0055): saem de `src/lib/demo/routes.ts` as entradas de `GET /api/admin/appointments` e de `GET /api/admin/appointments/:id`; saem de `src/lib/demo/admin-appointments.ts` os 50 agendamentos fixos, as funções de listagem e de detalhe e o que só elas usavam; sai o `DemoNotice` da página. A demonstração vem do banco: o `supabase/seed-demo.sql` já cria os agendamentos (de 90 dias atrás a 14 dias à frente, com serviços e cópias, RN037), então **não muda**.

**O que fica em demonstração, cada parte com a sua tarefa, e o aviso passa só para ela.** A prévia de valores e as três buscas do formulário (`preview`, `lookup/clients`, `lookup/vehicles`, `lookup/services`) e todas as gravações da tela: "Novo agendamento" (#49), "Editar", "Avançar", "Concluir", "Cancelar" e "Reagendar" (#50). O `DemoNotice` sai da página e passa a ficar no alto de cada janela que grava e acima dos botões do detalhe (L5). Nada mais na tela depende das duas rotas novas: o detalhe que a janela "Concluir" lê (`GET /api/admin/appointments/:id`) passa a ser o real, com os totais por forma de pagamento da L6.

**Migration: nenhuma.** As tabelas `appointments` e `appointment_services`, os índices de `scheduled_at` e a ordem do tipo `appointment_status` (a de RN017) já estão na migration inicial; o repositório só lê. Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/46-appointments-query`, criada da `origin/main` (a96efa2, com a #45: PRs #120 e #121), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/nice-goldberg-bf3500`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em a96efa2, árvore limpa.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondPage`, `requirePermission`, `getServiceClient`, `AppError` (`NOT_FOUND`), `idSchema`, `paginationSchema(ADMIN_LIST_PAGE_SIZE)`, `searchTermSchema`; tipos `AdminAppointmentSummary` e `AdminAppointment` (`src/shared/api/appointments.ts`, não mudam); `APPOINTMENT_VIEWS`, `APPOINTMENT_VIEW_STATUSES`, `APPOINTMENT_SORTS` e `APPOINTMENT_STATUSES`; `listPaymentFees` (repositório de formas de pagamento) e `calculateTotal` (`rules/pricing.ts`); `toCompanyInstant` e `formatCalendarDate` (`shared/format/date.ts`); no cliente: `usePaginatedList`, `useApiQuery`, `PaginatedList`, `AppointmentList`, `AppointmentViews`, `AppointmentDetails` (da #61).
- Moldes: `services/clients.ts` e `repositories/clients.ts` (listagem paginada com `count: "exact"`, `findAdminClient` para o 404), `client-search.ts` (filtros de busca por palavra, em arquivo sem `server-only` para ser testado), `app/api/admin/clients/route.ts` e `[id]/route.ts`.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/appointments` | `view*`, `status`, `search`, `sort`, `page`, `pageSize` | 200 página de `AdminAppointmentSummary`; 400 com `fields` |
| `GET /api/admin/appointments/:id` | nenhuma | 200 `AdminAppointment`; 404 |

- Erros comuns de `api.md`: 401, 403 `FORBIDDEN` (cliente, funcionário sem `appointments` ou conta inativa), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED` e 500. Id que não é UUID responde o 404 do recurso. Parâmetro desconhecido é descartado (RS013).
- **Visões** (UC10, RF044): `today` = Agendado, Em espera, Em execução e Finalizado com `scheduled_at` antes do início do dia seguinte, no fuso da empresa (os de hoje e os de dias anteriores); `future` = os mesmos status com `scheduled_at` a partir desse instante; `history` = Concluído, Cancelado e Reagendado, de qualquer data. Cada agendamento está em uma visão só.
- **Filtro de status** (RF046): um dos status da visão; outro → 400 (L1).
- **Busca** (RF047): L2. **Ordenação** (RF045): `time` (padrão) ou `status`; L3.
- **Cópia** (RN037): `clientName`, `vehicle.*` e `services[].name` vêm das colunas de cópia de `appointments` e `appointment_services`, nunca de `clients`, `vehicles` ou `services`.
- **Detalhe** (`AdminAppointment`): os campos de `rotas.md`; `vehicle.id` é `vehicle_id`; `updatedAt` é o `updated_at` como o banco o grava (texto, RNF011). No status `awaiting_payment`, `paymentOptions` traz as quatro formas na ordem de RN011 (L6); nos outros, `null`.

### Esquemas (`src/shared/validation/appointments.ts`, novo), TDD

| Esquema | Regras |
|---|---|
| `adminAppointmentListQuerySchema` | `view` (um de `today`, `future`, `history`; ausente ou outro → mensagem da L1); `status` opcional, um dos status da visão (vazio = sem filtro); `sort` opcional (`time` ou `status`), padrão `time`; `search` (`searchTermSchema`, vazio = sem filtro); `page` e `pageSize` (`paginationSchema(ADMIN_LIST_PAGE_SIZE)`) |

O esquema vale para a rota; a tela monta a consulta com as mesmas constantes (`APPOINTMENT_VIEW_STATUSES`) e não precisa de resolvedor, porque não há formulário.

### Backend (decisões 0003, 0005, 0006, 0008, 0025, 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/appointments/route.ts` | novo: `GET`: guard, `adminAppointmentListQuerySchema.parse`, `listAppointments`, `respondPage` |
| Rota | `app/api/admin/appointments/[id]/route.ts` | novo: `GET`: guard, `idSchema` (inválido → `NOT_FOUND`), `getAppointment`, `respondOk` |
| Serviço | `server/services/appointments.ts` | novo: `listAppointments(query, now)` e `getAppointment(id)`; calcula o início do dia seguinte e as `paymentOptions` |
| Repositório | `server/repositories/appointments.ts` | novo: `listAdminAppointments(filters, page, pageSize)` e `findAdminAppointment(id)`, com `appointment_services` na mesma consulta (sem N+1) |
| Busca | `server/repositories/appointment-search.ts` | novo, sem `server-only`: `appointmentSearchFilters(term)`, como `client-search.ts` |
| Regras | `server/rules/pricing.ts` | `listPaymentOptions(...)`, função pura sobre `calculateTotal` (L6) |
| Formato | `shared/format/date.ts` | `startOfNextCompanyDay(now)`: o instante em que começa o dia seguinte no fuso da empresa |

- **Listagem.** `appointments` com `appointment_services(service_id, service_name, service_type)`, `count: "exact"`, `range` da página. Os filtros da visão são `in("status", ...)` e, em `today` e `future`, `lt`/`gte` sobre `scheduled_at` com o instante de `startOfNextCompanyDay`. O índice `idx_appointments_scheduled_at` atende a ordem por horário.
- **Ordenação.** `time`: `scheduled_at` crescente em `today` e `future` e decrescente em `history`, depois `id`. `status`: `status` (a ordem do tipo enumerado é a de RN017) e, dentro de cada um, o horário como em `time`, depois `id`. Sem `order` fora desses (RN037: não depende de cadastros).
- **Serviços do cartão.** Ordenados na aplicação depois da leitura (L4); a função de ordem é pura e testada.
- **Detalhe.** Um agendamento pelo `id`, com os serviços (`price`, `duration_minutes`); `null` → 404. O cliente excluído (RN030) não esconde o agendamento: ele é o histórico.
- **Fuso.** O início do dia seguinte vem de `toCompanyInstant` e de `formatCalendarDate` do instante `now` recebido; a rota passa `new Date()`, a função pura nunca lê o relógio.
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: `/admin/appointments`

Conteúdo, textos e estados já definidos em `docs/agendamento/agendamentos-do-painel.md` (#61); o que muda:

- `src/app/(admin)/admin/appointments/page.tsx`: sai o `DemoNotice` (e o import) e o comentário "until the routes exist".
- `appointment-wizard.tsx`, `reschedule-appointment-dialog.tsx`, `complete-appointment-dialog.tsx` e `appointment-details-dialog.tsx`: o `DemoNotice` no alto de cada janela que grava e acima do rodapé do detalhe (L5). Nada mais muda nos componentes: a listagem, o filtro, a ordem, a busca, a atualização e o detalhe já chamam as rotas pelo `apiRequest`.
- `src/lib/demo/routes.ts`: saem as duas entradas e o comentário que cita a #46. `src/lib/demo/admin-appointments.ts`: saem os agendamentos fixos e as funções `answerAdminAppointments` e `answerAdminAppointment`; ficam a prévia e as três buscas, que a #49 e a #50 ainda usam. `src/lib/demo/README.md` é conferido.
- Foco e estados: como na #61 (foco no controle usado; agendamentos anteriores em "Carregando"). O 409 `INVALID_STATUS` e o `NOT_IMPLEMENTED` das ações seguem como estão.

### Dados de demonstração (`supabase/seed-demo.sql`)

Sem mudança: o arquivo já tem os agendamentos com a cópia dos dados (RN037) e os status coerentes com a data; hoje, no fuso da empresa, é o dia de referência. O que a tela mostra passa a ser o que o banco tem: as contagens por visão variam com o dia da carga, e os roteiros conferem a API contra consultas SQL, não contra números fixos.

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/appointments` (`listAdminAppointments`) e `/api/admin/appointments/{id}` (`getAdminAppointment`) em uma tag nova `appointments` (ou na existente, se houver), com `sessionCookie`; os esquemas `AdminAppointmentSummary`, `AdminAppointmentPage`, `AdminAppointment`, `AppointmentVehicle`, `AppointmentService` e `PaymentOption`; as respostas existentes `NotFound`, `ValidationError`, `Unauthenticated`, `PanelForbidden` e `InternalError`.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado os dados de demonstração, quando abro a página, então aparecem os agendamentos de hoje, no fuso da empresa (UC10) | Testes de `startOfNextCompanyDay` (23h30 de 25/10 em Maceió, UTC já em 26/10 → `2026-10-26T00:00:00-03:00`; meia-noite exata; virada de mês e de ano) e do esquema (`view` obrigatória). Local: `GET ?view=today` → só os quatro status em aberto com `scheduledAt` antes do início do dia seguinte; o `total` da página igual à contagem por SQL com a mesma condição; um agendamento às 23h30 de hoje em Maceió está em `today`, e o das 00h00 de amanhã, em `future` (criados por SQL no banco local). Na tela: a aba "Hoje" abre com os cartões, sem aviso de demonstração na página |
| Dado a visão "Histórico", quando a escolho, então aparecem os agendamentos passados, com cliente, veículo, serviços, total, status e previsão de conclusão (UC10) | Local: `?view=history` → só Concluído, Cancelado e Reagendado, do mais recente ao mais antigo, com `clientName`, `vehicle`, `services`, `total`, `status` e `estimatedEndAt`; `total` igual ao SQL. Na tela: a aba "Histórico" mostra a faixa "1–20 de N" e os dados dos cartões |
| Dado o filtro "Cancelado", quando o aplico, então só esses aparecem; "Limpar filtros" volta à listagem completa da visão (UC10 FA02, FA04) | Testes do esquema (status da visão aceito; status de outra visão → 400 com a mensagem da L1). Local: `?view=history&status=cancelled` → só `cancelled`, `total` igual ao SQL; `?view=today&status=cancelled` → 400. Na tela: filtro "Cancelado" no histórico, depois "Limpar filtros": volta a "Todos os status", o total da visão e o foco na busca |
| Dado o nome de um cliente ou uma placa, quando busco, então só os agendamentos correspondentes aparecem; sem resultado, aparece o estado vazio (UC10 FA03, FE01) | Testes de `appointmentSearchFilters` (uma palavra, várias, caractere especial de `like`, placa com hífen). Local: busca pelo nome de um cliente do seed, pela placa com e sem hífen, por marca e por modelo, sem diferenciar maiúsculas; texto sem resultado → página vazia com `total: 0`. Na tela: "Nenhum agendamento encontrado" e "Não há agendamentos para os critérios selecionados." |
| Dado a ordenação por status, quando a escolho, então a listagem é reordenada (UC10 FA01) | Testes do esquema (`sort` padrão `time`, `status` aceito, outro → 400). Local: `?view=today&sort=status` → os status na ordem de RN017 e, dentro de cada um, por horário; `?view=history&sort=time` → decrescente. Na tela: "Ordenar por status" reordena os cartões |
| Dado o botão de atualizar, quando o aciono, então a listagem é recarregada (UC10 FA05) | Passo manual: com a lista aberta, alterar o status de um agendamento por SQL, acionar "Atualizar" e ver a etiqueta nova, com o foco no botão; a requisição retida mostra os cartões anteriores em "Carregando" |
| Dado um agendamento cujo cliente mudou de nome depois, quando o abro, então ele mostra os dados copiados no momento do agendamento (RN037) | Local: trocar por SQL o nome do cliente, a placa do veículo e o nome de um serviço; `GET /:id` e a listagem continuam com os valores copiados (`clientName`, `vehicle.plate`, `services[].name` iguais aos de antes). Na tela: o detalhe mostra o nome antigo |
| Dado um funcionário sem a permissão `appointments`, quando chama as rotas, então recebe 403 (RS008) | Local, nas duas rotas: funcionário de cargo sem `appointments` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `appointments` → 200. Retirar `appointments` do cargo muda a resposta na requisição seguinte |

Outros casos, pelo roteiro de rotas e pelos testes: `view` ausente ou fora da lista → 400 em `view`; `sort` inválido → 400; `page=0` → 400; `pageSize=100` volta 50; `search` com 101 caracteres → 400; parâmetro desconhecido descartado; id que não é UUID e id inexistente no detalhe → 404; `paymentOptions` só no `awaiting_payment` (as quatro formas, ordem de RN011) e `null` nos outros; `GET /:id` de um agendamento cujo cliente foi excluído (RN030) → 200; agendamento de um serviço excluído depois (o seed tem a "Lavagem a seco") mostra o nome copiado; sem `Origin` em `GET` não há exigência (RS010 vale para gravação).

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin/appointments` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: o lugar reservado dos cartões e o do detalhe), vazio nas três visões (cada texto) e com busca e filtro, falha da listagem e do detalhe (rota fora do ar: aviso com "Tentar novamente", busca, filtros e abas mantidos), sucesso e falha de acesso (403: a página já responde pelo guarda de página; a rota, pelo roteiro);
- o detalhe de um agendamento de cada um dos sete status, com o "Finalizado" mostrando "Total por forma de pagamento" e a janela "Concluir" lendo a mesma rota; o `NOT_IMPLEMENTED` das ações e o aviso de demonstração no alto de cada janela que grava;
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, na página, com o detalhe aberto e com "Concluir" aberta sobre ele;
- teclado completo: abas com setas, busca, "Filtrar por status", "Ordenar por", "Limpar filtros" (o foco vai à busca), "Atualizar", "Ver detalhes", Tab no detalhe até o rodapé, Esc devolvendo o foco a "Ver detalhes" do mesmo cartão e o foco no aviso do topo na falha das ações;
- Lighthouse de acessibilidade em `/admin/appointments` (navegação) e nos estados em `snapshot` (cada visão com cartões, vazio, com a falha, detalhes de cada status, "Concluir" aberta), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop (prefixar o PATH com `C:\Users\yvans\AppData\Local\Programs\DockerDesktop\resources\bin`), `npx supabase start` e `npx supabase db reset` (aplica as cinco migrations e o `seed.sql`), depois o `seed-demo.sql` inteiro pelo ajudante `run-sql.mjs` (pacote `pg` só no scratchpad, conexão local padrão). Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois (`fresh.sh`). Os agendamentos de teste de cada status são criados por SQL no banco local, para que os sete status e um agendamento às 23h30 e às 00h00 existam.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `appointments`), funcionário B (cargo sem `appointments`) e um cliente, pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre (3046), com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #45 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs` com o cargo de `appointments`, `make-cookie.mjs`, `lh-pages.sh`, `lh-snapshots`, `lh-summary.mjs`, `local-env.sh`, `start.sh`, `restart.sh`, `fresh.sh`, `cleanup.mjs`, `run-sql.mjs`) e novos para esta tarefa: `verify-appointments-api.mjs` (visões, filtros, busca, ordem, permissões, cópia por SQL, `paymentOptions`), `ui-appointments.mjs` e `ui-keyboard-appointments.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` do Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nos roteiros com `Select` ou janela aberta sobre outra, escolhem-se só as opções visíveis e a janela de cima é a de `data-open` sem `data-nested-dialog-open`, esperando cerca de 1 s depois de abrir. Estados de falha e carregamento por interceptação de requisição do `puppeteer`, sem alterar `src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Passos do Yvan** (no relatório): conferir logado, em produção ou na pré-visualização da Vercel, `/admin/appointments` com os agendamentos do `seed-demo.sql` (já carregado), as três visões, a busca e o detalhe. Não há migration a aplicar nem carga nova do `seed-demo.sql`.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/shared/validation/appointments.ts` e `src/shared/validation/README.md` | criar / alterar: `adminAppointmentListQuerySchema` |
| `src/shared/format/date.ts` | alterar: `startOfNextCompanyDay` |
| `src/server/rules/pricing.ts` | alterar: `listPaymentOptions` |
| `src/server/rules/appointment-services.ts` e `src/server/rules/README.md` | criar / alterar: `sortAppointmentServices` (L4); fora da lista inicial, a confirmar |
| `src/server/repositories/client-search.ts` | alterar: `likePattern` exportada; fora da lista inicial, a confirmar |
| `docs/agendamento/calculos.md` | alterar: uma linha sobre o total por forma de pagamento (L6); fora da lista inicial, a confirmar |
| `src/server/repositories/appointment-search.ts` | criar: `appointmentSearchFilters` |
| `src/server/repositories/appointments.ts` | criar: `listAdminAppointments`, `findAdminAppointment` |
| `src/server/services/appointments.ts` | criar: `listAppointments`, `getAppointment` |
| `src/app/api/admin/appointments/route.ts` | criar: `GET` (a pasta já tem README) |
| `src/app/api/admin/appointments/[id]/route.ts` | criar: `GET` (a pasta já tem README) |
| `src/app/(admin)/admin/appointments/page.tsx` | alterar: sai o `DemoNotice` |
| `src/components/admin/appointments/appointment-wizard.tsx`, `appointment-details-dialog.tsx`, `reschedule-appointment-dialog.tsx`, `complete-appointment-dialog.tsx` | alterar: o `DemoNotice` onde grava (L5) |
| `src/lib/demo/routes.ts` | alterar: saem as duas entradas |
| `src/lib/demo/admin-appointments.ts` | alterar: saem os agendamentos fixos e as duas respostas |
| `src/lib/demo/README.md` | alterar, se citar a listagem do painel |
| `tests/validation/appointments.test.ts` | criar: o esquema da consulta |
| `tests/repositories/appointment-search.test.ts` | criar: os filtros de busca |
| `tests/format/date.test.ts` | alterar: `startOfNextCompanyDay` |
| `tests/rules/pricing.test.ts` | alterar: `listPaymentOptions` |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/agendamento/rotas.md` | alterar: textos de L1 a L4 e L6 |
| `docs/agendamento/agendamentos-do-painel.md` | alterar: sai o parágrafo do aviso de demonstração da página; entra o texto de L5 |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as mensagens da L1 |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita a consulta de agendamentos |
| `memoria/tarefas/46-consulta-de-agendamentos-no-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/`, `src/server/rules/` e `src/components/admin/appointments/` são conferidos na construção: se citarem listas de arquivos, entram aqui. Não há migration, tipo gerado do banco, `seed.sql` nem `seed-demo.sql` a alterar.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em a96efa2 (#45).
- **#49** (agendamento pelo painel), **#50** (status e edição) e **#51** (dashboard): o repositório e o serviço de agendamentos nascem aqui e crescem nelas; `routes.ts` e `admin-appointments.ts` são tocados por cada uma (outras entradas e outras funções, conflito só de linhas vizinhas, conferido na hora do PR). A agenda do dashboard (#51) pode reusar o mapeamento da linha para `AdminAppointmentSummary`, que fica exportado do repositório.
- Etapa 04: comentário nas issues que dependem da consulta (**#49**, **#50**, **#51**) com o que a tarefa deixou: o repositório e o serviço, `startOfNextCompanyDay`, `listPaymentOptions`, o detalhe real e as entradas de demonstração que sobram.

## Testes previstos

Valores esperados tirados de RN017, RN011, RNF008, do UC10, de `rotas.md` e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/appointments.test.ts`, `adminAppointmentListQuerySchema`:

- accepts a view and applies the defaults: `sort` `time`, `page` 1, `pageSize` 20
- rejects an absent view and a view outside the three → "Escolha uma visão válida."
- accepts a status of the view and rejects one of another view (`completed` in `today`, `scheduled` in `history`) → "Escolha um status desta visão."
- treats an empty `status` and an empty `search` as no filter
- accepts the two sorts and rejects another → "Escolha uma ordenação válida."
- keeps the search normalized (espaços extras, até 100 caracteres) e rejects a longer one → "Use até 100 caracteres."
- caps `pageSize` at 50 and rejects `page` 0 → "Informe um número inteiro a partir de 1."
- discards the unknown parameters

`tests/repositories/appointment-search.test.ts`, `appointmentSearchFilters`:

- gives no filter for an empty term
- makes one filter per word, each in the client name, the plate, the brand and the model
- escapes `%`, `_` and the quotes of the word
- matches a plate typed with a hyphen: `glw-1a01` also looks for `glw1a01`

`tests/format/date.test.ts`, `startOfNextCompanyDay`:

- gives the midnight of the next day in Maceió: `2026-10-26T02:30:00Z` (23h30 de 25/10) → `2026-10-26T00:00:00-03:00`
- at `2026-10-26T03:00:00Z` (00h00 de 26/10) → `2026-10-27T00:00:00-03:00`
- crosses the end of the month and of the year

`tests/rules/pricing.test.ts`, `listPaymentOptions` (L6):

- gives the four methods in the order of RN011 with the percent and the total of each
- keeps the percent and the total recorded in the appointment for the method it has, and the current percent for the others
- rounds the total once, half a cent up (R$ 150,10 com 5% → R$ 157,61)
- gives zero for a 100% discount

Ordem dos serviços (L4), em `tests/rules/` no arquivo que o README de `rules/` admitir (ou em `tests/repositories/`, se a função ficar no repositório sem `server-only`): main antes de complementary e de additional, e pelo nome dentro do tipo.

Sem teste automático para rota, serviço, repositório e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Resposta ao `view`, ao `status` e ao `sort` inválidos

**Problema.** `rotas.md` diz que `view` é obrigatório e que `status` é "um dos status da visão", mas não diz o que a rota responde à visão ausente ou desconhecida, a um status de outra visão (`completed` em `today`) nem a uma ordem desconhecida. `mensagens-de-validacao.md` não tem as mensagens.

**Opções:**

- [x] **1. 400 `VALIDATION_ERROR` com `fields` do parâmetro (recomendada).** Como o `booleanQuerySchema` (`includeInactive`) e a paginação: o parâmetro errado nunca vira lista vazia nem padrão silencioso. Mensagens: "Escolha uma visão válida." (a que a demonstração já usa), "Escolha um status desta visão." e "Escolha uma ordenação válida.".
- [ ] **2. Status de outra visão devolve a página vazia.** Mais tolerante, mas esconde o erro de um cliente da API e a tela nunca o provoca.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/admin/appointments`, Resposta: acrescenta "400 com o parâmetro em `fields` quando `view` falta ou não é uma das três, quando `status` não é um dos status da visão ou quando `sort` não é `time` nem `status`."
- `docs/plataforma/mensagens-de-validacao.md`, três linhas novas: "Visão de agendamentos ausente ou desconhecida | Escolha uma visão válida."; "Status fora da visão | Escolha um status desta visão."; "Ordenação de agendamentos desconhecida | Escolha uma ordenação válida.".

### L2. O que a busca compara

**Problema.** `rotas.md` diz "parte do nome do cliente, da placa, da marca ou do modelo do veículo, sem distinção de maiúsculas", mas não diz o que fazer com um termo de várias palavras nem com a placa digitada com hífen (a tela mostra `ABC-1234`, o banco guarda `ABC1234`).

**Opções:**

- [x] **1. Cada palavra do termo precisa aparecer em um dos quatro campos; a placa vale com ou sem hífen (recomendada).** Como a busca de clientes (RF070): "ana gol" acha "Ana Souza" com um Gol. A palavra com hífen também é procurada sem ele na placa. Sem normalizar acentos, como nos outros filtros.
- [ ] **2. O termo inteiro como um trecho só.** Mais simples, mas "ana gol" não acharia nada e a placa com hífen nunca casaria.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/admin/appointments`, `search`: "o termo se separa em palavras, e cada uma precisa aparecer, sem distinção de maiúsculas, no nome do cliente, na placa, na marca ou no modelo; a placa vale com ou sem hífen."
- `docs/agendamento/agendamentos-do-painel.md`, Controles: a ajuda "Cliente, placa, marca ou modelo" continua; acrescenta "Várias palavras restringem a busca."

### L3. Ordem da listagem: desempate e visão "Hoje"

**Problema.** `rotas.md` dá a ordem por horário (e, no histórico, a inversa) e a ordem de RN017 para o status, mas não o desempate de dois agendamentos no mesmo instante, que a paginação precisa para não repetir nem pular itens entre páginas. Também não diz se, na visão "Hoje", os dias anteriores em aberto vêm antes (da mais próxima à mais distante é, na prática, o mais antigo primeiro).

**Opções:**

- [x] **1. Desempate pelo `id`; "Hoje" do mais antigo ao mais novo (recomendada).** A ordem fica estável entre páginas e entre execuções, e o atrasado em aberto aparece primeiro, como fila de trabalho. Sem coluna nem índice novos.
- [ ] **2. Desempate pela data de criação.** Reflete a ordem de chegada, mas o `seed-demo.sql` cria vários na mesma hora de criação, e ainda precisaria do `id` por cima.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `sort`: "Dois agendamentos no mesmo instante saem pelo identificador, e a ordem se mantém de uma página à outra. Em `today`, os dias anteriores em aberto vêm antes dos de hoje."

### L4. Ordem dos serviços no cartão e no detalhe

**Problema.** `rotas.md` lista os `services` do cartão e do detalhe sem dizer a ordem. O `seed-demo.sql` grava os serviços de um agendamento com o mesmo `created_at`, então só o tipo e o nome dão uma ordem estável.

**Opções:**

- [x] **1. Por tipo (principal, complementar, adicional) e, dentro do tipo, pelo nome (recomendada).** O que o cliente contratou de principal vem na frente, o adicional por último, e a ordem não muda entre leituras. A ordenação é feita na aplicação, em função pura testada.
- [ ] **2. Só pelo nome.** Sem regra de tipo, mas "Pretinho nos pneus" (adicional) pode vir antes de "Lavagem completa" (principal).

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/admin/appointments` e `GET /api/admin/appointments/:id`, `services`: "por tipo (principal, complementar e adicional) e, dentro do tipo, pelo nome copiado".

### L5. Onde fica o aviso de demonstração depois desta tarefa

**Problema.** `agendamentos-do-painel.md` diz que o aviso fica logo abaixo do título enquanto as rotas forem de demonstração. Com a listagem e o detalhe reais, o aviso da página mentiria; mas "Novo agendamento", "Editar", "Avançar", "Concluir", "Cancelar" e "Reagendar" (e a prévia e as buscas dos formulários) ainda são demonstração até a #49 e a #50. O `DemoNotice` tem um texto só ("esta parte ainda não está ligada ao sistema, e nada do que você fizer nela é gravado").

**Opções:**

- [x] **1. O aviso no alto de cada janela que grava e acima dos botões do detalhe (recomendada).** "Novo agendamento" e "Editar" (o assistente), "Reagendar", "Concluir" e, no detalhe, uma vez acima do rodapé (cobre "Avançar", "Cancelar" e o botão "Editar"). O texto do componente vale em cada lugar. A #49 tira o do assistente de "Novo agendamento"; a #50 tira os outros.
- [ ] **2. Um aviso só, no alto do detalhe e do "Novo agendamento".** Menos repetido, mas o aviso do detalhe fica longe das janelas abertas sobre ele, que cobrem o detalhe inteiro.
- [ ] **3. Manter o aviso da página com outro texto ("A listagem é real; as ações ainda são demonstração").** Exige um componente com texto próprio e fala de "ações" antes de o usuário chegar a elas.

**Texto proposto (opção recomendada):**

- `docs/agendamento/agendamentos-do-painel.md`, parágrafo "Enquanto as rotas `/api/admin/appointments` usarem os dados de demonstração...": passa a "A listagem e o detalhe são reais. Enquanto a gravação for de demonstração (decisão 0055), o aviso de demonstração fica no alto das janelas "Novo agendamento", "Editar", "Reagendar" e "Concluir" e acima dos botões do detalhe."

### L6. `paymentOptions` do detalhe: o percentual de cada forma

**Problema.** `rotas.md` diz que o detalhe do "Finalizado" traz `paymentMethod`, `feePercent` e `total` de cada uma das quatro formas, "usado no resumo de conclusão", e RN018 diz que a conclusão recalcula o total se a forma mudou. Não diz qual percentual vale: o do momento do agendamento (RN037 guarda "a forma de pagamento e o percentual aplicado") ou o vigente em `payment_fees`. Se a empresa mudou o percentual depois do agendamento, a forma escolhida mostraria um total diferente do `total` do agendamento.

**Opções:**

- [x] **1. A forma do agendamento usa o percentual e o total gravados; as outras três, o percentual vigente (recomendada).** O total mostrado para a forma escolhida é o do agendamento (a tela começa nela, e concluir sem trocar não altera o valor, RN018); trocar de forma aplica o percentual de hoje (`calculos.md`: "troca da forma aplica o percentual vigente"). Calculado por função pura sobre `calculateTotal`.
- [ ] **2. As quatro pelo percentual vigente.** Uma regra só, mas a forma escolhida pode mostrar um total diferente do agendamento, e o "Concluir" sem trocar a forma mudaria o valor sem o cliente ter trocado nada.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/admin/appointments/:id`: acrescenta "Para a forma de pagamento do agendamento, `feePercent` e `total` são os gravados nele; para as outras, o percentual vigente aplicado ao subtotal (RN012)."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js`), 0008 (validação compartilhada), 0010 e 0012 (permissões por página), 0025 (erros RFC 9457), 0035 e 0052 (testes), 0043 (banco local), 0049 (shadcn sobre Base UI), 0053 (fuso da empresa) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `banco.md`, `componentes.md`, `frontend.md` e `testes.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Edição de agendamento real com a prévia de demonstração.** "Editar" abre com os serviços e o veículo reais do agendamento e consulta a prévia e as buscas de demonstração, cujos ids são os do `seed-demo.sql` (md5 de `glow-demo:service:<nome>`). Um serviço excluído (a "Lavagem a seco" do seed, de agendamentos antigos) não está no catálogo da demonstração; a janela já trata o serviço fora do catálogo ("Não estão mais disponíveis…" no reagendamento) e a gravação responde `NOT_IMPLEMENTED`. Conferido nos roteiros; a #49 e a #50 trocam a prévia pela real.
- **Dia de referência.** As visões dependem da data e do fuso: a "Hoje" mudava de conteúdo à meia-noite de Maceió e agora muda de verdade. Coberto pelos testes de `startOfNextCompanyDay` e pelos agendamentos de 23h30 e 00h00 criados por SQL.
- **Status incoerente com a data no seed.** O `seed-demo.sql` escolhe o status pela data na hora da carga; com o tempo, um "Agendado" de ontem fica na visão "Hoje" (é o atrasado em aberto, previsto em `agendamentos-do-painel.md`). Não é defeito.
- **Embutir os serviços na listagem.** `count: "exact"` com `appointment_services(...)` na mesma consulta: conferido no banco local que o total não duplica linhas por serviço.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Produção.** Só leitura: nada é gravado pela tela nem pelas rotas; o `seed-demo.sql` já está carregado.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 330 linhas adicionadas (rotas 40, serviço 70, repositório 120, busca 30, esquema 45, regras e formato 40, avisos 15) contra cerca de 330 removidas (os agendamentos fixos da demonstração), mais cerca de 240 de testes e as especificações. Sem migration.

### P1. Divisão em PRs

- [x] **1. Um PR só, "Closes #46" (recomendada).** Não há migration para aplicar entre dois PRs, o total em `src/` fica abaixo de 400 linhas e a tela só deixa de ser demonstração com as rotas, que a verificação confere juntas. O plano, as notas e o relatório vão nele.
- [ ] **2. Dois PRs encadeados (API e tela).** Como na #43 a #45, mas sem a razão da migration; o primeiro não teria como ser verificado pela tela e o segundo repetiria o ambiente de verificação.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência por SQL das visões, da cópia e do fuso.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível dos README das pastas tocadas.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Novo agendamento e a prévia, as buscas do formulário (#49); mudança de status, edição, conclusão, cancelamento e reagendamento, e as rotas de gravação (#50).
- A agenda e os indicadores do dashboard (#51), e a lista de agendamentos do cliente (`/api/me/appointments`, fase 3).
- Acessibilidade (WCAG) do site inteiro, ajustada ao fim pelo Yvan; esta tarefa só mantém o que o plano promete verificar.
- Busca sem acento, exportação, filtro por data ou por cliente, e a marca de atraso do wireframe (sem requisito).
- Dependência nova e registro de decisão.
