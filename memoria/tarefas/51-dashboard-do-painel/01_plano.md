---
issue: 51
titulo: "Dashboard do painel"
areas: [backend, frontend, banco, testes]
tipo: funcionalidade
requisitos: [UC09, RF040, RF041, RF042, RF043, RN021, RN035, RNF006, RS008]
status: concluido
aprovado_por: yvan
aprovado_em: 01:01 - 27/10/2026
---

# Plano: Dashboard do painel

## Objetivo

Entregar o UC09 de ponta a ponta: o funcionário com a permissão `dashboard` vê em `/admin` os indicadores do período (receita, quantidade de agendamentos, ticket médio e taxa de cancelamento), a receita por dia, os agendamentos por status e a agenda do dia, por uma rota só, com `requirePermission("dashboard")` (RS008):

- `GET /api/admin/dashboard` (`from` e `to`, datas `aaaa-mm-dd`; padrão: o mês atual inteiro, no fuso da empresa; até 12 meses, RN035): 200 com `from`, `to`, `revenue`, `appointmentCount`, `averageTicket`, `cancellationRate`, `revenueByDay`, `appointmentsByStatus` e `agenda` (`DashboardAgendaItem`, de `src/shared/api/dashboard.ts`, que não muda); 400 com `fields` para o período inválido.
- O cálculo dos indicadores de um período fica numa função do serviço `dashboard` (`calculateIndicators(period)`), que a análise da #66 chama duas vezes (o período e o anterior, RN038).

**A tela deixa de ser demonstração** (orientação do Yvan e decisão 0055): sai de `src/lib/demo/routes.ts` a entrada de `GET /api/admin/dashboard`; sai o `DemoNotice` de `src/app/(admin)/admin/page.tsx`; saem de `src/lib/demo/dashboard.ts` a resposta do dashboard e a agenda fixa. A demonstração vem do banco: o `supabase/seed-demo.sql` já cria os agendamentos (de 90 dias atrás a 14 dias à frente, com concluídos, cancelados e reagendados, com `completed_at`), então **não muda**.

**O que fica em demonstração e o aviso.** Só `POST /api/admin/dashboard/analysis` (a análise por IA), da #66: o `src/lib/demo/dashboard.ts` **não sai** neste PR, porque `answerDashboardAnalysis` ainda o usa; ele encolhe (saem `answerDashboard`, a agenda e o que só elas usavam). O `DemoNotice` passa para dentro do cartão "Análise do período" (L6). O arquivo e o aviso saem na #66.

**Migration: uma**, `dashboard_figures` (função SQL só de leitura, que agrega no banco), como a L1 recomenda; o Yvan a aplica. Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/51-dashboard`, criada da `origin/main` (ea87f28, com a #46: PR #123), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/fervent-kepler-a80f3a`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em ea87f28, árvore limpa.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `requirePermission`, `getServiceClient`, `AppError`; os tipos `Dashboard`, `DashboardRevenueDay`, `DashboardStatusCount` e `DashboardAgendaItem`; `APPOINTMENT_STATUSES` (ordem de RN017); `toAdminAppointmentSummary` e as colunas de `repositories/appointments.ts` (a agenda); `startOfNextCompanyDay`, `toCompanyInstant` e `formatCalendarDate` (`shared/format/date.ts`); `COMPANY_TIME_ZONE`; no cliente: `useApiQuery`, `DashboardView` e os componentes de `components/admin/dashboard/` (da #60), que já tratam o 400 com `fields`, a falha, o vazio e o carregamento.
- Moldes: a migration `20261026121013_link_vehicle_function.sql` (`set search_path = ''`, `revoke`, `grant`) e o `rpc` de `repositories/vehicles.ts`; `services/appointments.ts` e a rota `app/api/admin/appointments/route.ts`; `shared/validation/appointments.ts`.
- A #66 (análise por IA, em execução) espera deste PR: `services/dashboard.ts` com a função de indicadores, `shared/validation/dashboard.ts` com o esquema do período e `shared/api/dashboard.ts`; o PR de código dela começa depois da incorporação desta.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/dashboard` | `from`, `to` | 200 `Dashboard`; 400 com `fields` |

- Erros comuns de `api.md`: 401, 403 `FORBIDDEN` (cliente, funcionário sem `dashboard` ou conta inativa), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED` e 500. Parâmetro desconhecido é descartado (RS013).
- **Período** (RN035, L4): sem `from` e sem `to`, o mês atual inteiro no fuso da empresa; as duas datas, `from` não depois de `to` e no máximo 366 dias contando as duas.
- **O que cada número usa** (RN021, `calculos.md`, seção 5; L2): a quantidade de agendamentos, a taxa de cancelamento e os agendamentos por status usam a data marcada (`scheduled_at`) dentro dos dias do período, no fuso da empresa; a receita, a receita por dia e o ticket médio usam só os `completed` e `rescheduled` com `completed_at` no período. A taxa é `cancelled / total * 100`; o ticket médio, a receita sobre a quantidade dos pagos, zero sem pagos.
- **Agenda** (RF043): os agendamentos de qualquer status com `scheduled_at` no dia corrente no fuso da empresa, por horário e, no mesmo instante, pelo `id`; não depende do período. A cópia dos dados vem do agendamento (RN037), pelo `toAdminAppointmentSummary` da #46.

### Esquema (`src/shared/validation/dashboard.ts`, novo), TDD

| Esquema | Regras |
|---|---|
| `dashboardPeriodQuerySchema` | `from` e `to` opcionais (vazio = ausente), dia de calendário real `aaaa-mm-dd`; só uma das duas → "Preencha este campo." na que falta; data fora do formato ou inexistente (`2026-02-30`) → "Informe uma data válida."; `from` depois de `to` → "A data final não pode ser anterior à inicial." em `to`; mais de 366 dias → "O período não pode passar de 12 meses." em `to` (L4) |

O esquema não lê o relógio: o padrão do mês atual é resolvido pelo serviço. A #66 reusa o esquema (com as duas datas obrigatórias, o `extend` é dela).

### Banco: `dashboard_figures` (migration `supabase/migrations/<data>_dashboard_figures_function.sql`)

Função só de leitura, `language sql stable`, `set search_path = ''`, com `revoke execute ... from public, anon, authenticated` e `grant execute ... to service_role` (decisão 0042). Recebe `p_from` e `p_to` (`timestamptz`, o início do primeiro dia e o início do dia seguinte ao último, no fuso da empresa) e `p_time_zone` (o fuso da empresa, vindo de `COMPANY_TIME_ZONE`, para o agrupamento por dia ficar numa fonte só). Devolve um `jsonb`:

- `statusCounts`: `[{status, count}]`, os agendamentos com `scheduled_at` em `[p_from, p_to)`, agrupados por status (só os que existem; o serviço completa os sete);
- `revenueByDay`: `[{date, revenue, paidCount}]`, os `completed` e `rescheduled` com `completed_at` em `[p_from, p_to)`, agrupados pelo dia de `completed_at` no fuso (`(completed_at at time zone p_time_zone)::date`), com a soma de `total` e a quantidade.

Usa os índices que já existem (`idx_appointments_scheduled_at` e `idx_appointments_completed_at`, `dados.md`). Conferida no banco local descartável (`db reset`) contra consultas SQL à parte, com agendamentos de borda criados por SQL (L1, L2).

### Backend (decisões 0003, 0005, 0006, 0008, 0042, 0053)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/dashboard/route.ts` | novo: `GET`: guard, `dashboardPeriodQuerySchema.parse`, `getDashboard(query, new Date())`, `respondOk` |
| Serviço | `server/services/dashboard.ts` | novo: `calculateIndicators(period)` (instantes do período, `findDashboardFigures`, `buildIndicators`) e `getDashboard(query, now)` (período padrão, indicadores e agenda em paralelo) |
| Repositório | `server/repositories/dashboard.ts` | novo: `findDashboardFigures(from, to, timeZone)` pelo `rpc` |
| Repositório | `server/repositories/appointments.ts` | alterar: `listAppointmentsBetween(from, to)` (todos os status, por horário e `id`) |
| Regras | `server/rules/dashboard-indicators.ts` | novo, puro: `buildIndicators(period, figures)` (L3, L5) |
| Formato | `shared/format/date.ts` | alterar: `addCalendarDays`, `listCalendarDays`, `countCalendarDays`, `findMonthPeriod(today)` e `companyDayRange(period)` (os instantes de início do primeiro dia e do dia seguinte ao último) |

- A função de `buildIndicators` recebe o período e os números do banco e devolve `revenue`, `appointmentCount`, `averageTicket`, `cancellationRate`, `revenueByDay` (todos os dias do período, com 0 nos sem receita) e `appointmentsByStatus` (os sete, na ordem de RN017, com 0 nos ausentes). Recebe tudo por parâmetro e não lê o relógio.
- `calculateIndicators` devolve só os seis campos, sem a agenda; a análise da #66 a chama duas vezes (RN038).
- O `now` vem da rota (`new Date()`); o dia corrente e o mês padrão saem dele pelo fuso da empresa (`formatCalendarDate`, decisão 0053). A agenda usa `[início do dia, startOfNextCompanyDay(now))`.
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: `/admin`

Conteúdo, textos e estados já definidos em `docs/agendamento/dashboard-do-painel.md` (#60); a tela já lê `GET /api/admin/dashboard` pelo `apiRequest` e carrega o código dos gráficos depois da primeira resposta. O que muda:

- `src/app/(admin)/admin/page.tsx`: sai o `DemoNotice` (e o import) e o comentário "until the route exists".
- `dashboard-analysis-card.tsx`: o `DemoNotice` no alto do cartão (L6).
- `src/lib/demo/routes.ts`: sai a entrada do `GET`, e o comentário passa a citar só a #66. `src/lib/demo/dashboard.ts`: saem `answerDashboard`, a agenda e o que só elas usavam. `src/lib/demo/README.md` é conferido.
- `components/admin/dashboard/dashboard-period.ts`: passa a usar o `findMonthPeriod` e o `addCalendarDays` de `shared/format/date.ts` em vez de repetir a conta (sem mudar o que a tela faz); se a troca ampliar demais o PR, fica só a duplicação, anotada nas notas.

### Dados de demonstração (`supabase/seed-demo.sql`)

Sem mudança. O que a tela mostra passa a ser o que o banco tem; os roteiros conferem a API contra consultas SQL, não contra números fixos.

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR da rota (`api.md`): `/api/admin/dashboard` (`getDashboard`), em uma tag nova `dashboard`, com `sessionCookie`, os parâmetros `from` e `to`, os esquemas `Dashboard`, `DashboardRevenueDay`, `DashboardStatusCount` e `DashboardAgendaItem` (reusando os esquemas de veículo e serviço do agendamento, se existirem) e as respostas `ValidationError`, `Unauthenticated`, `PanelForbidden` e `InternalError`. A análise (`/analysis`) é da #66.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado os dados de demonstração, quando abro `/admin`, então vejo a receita, a quantidade, o ticket médio e a taxa de cancelamento do mês atual (UC09, RN021) | Testes de `buildIndicators` (receita, quantidade de todos os status, ticket médio = receita sobre os pagos, taxa = cancelados sobre o total; valores tirados de RN021 e das opções da L3) e de `findMonthPeriod` (mês atual, fevereiro bissexto). Local: `GET /api/admin/dashboard` sem parâmetros → `from` e `to` o primeiro e o último dia do mês atual; `revenue`, `appointmentCount`, `averageTicket` e `cancellationRate` iguais aos de consultas SQL à parte, com as mesmas condições. Na tela: os quatro cartões com o valor da resposta, sem aviso de demonstração na página |
| Dado o período de 01/10/2026 a 31/10/2026, quando o aplico, então a receita soma só os concluídos ou reagendados com a conclusão nesse período (RN021) | Testes de `companyDayRange` (início de 01/10 e de 01/11 em Maceió) e de `buildIndicators` (receita só da lista por dia). Local, com agendamentos criados por SQL: um `completed` com `completed_at` 30/09 às 23h59 (fora), um `rescheduled` com `completed_at` 31/10 às 23h59 em Maceió, UTC já em 01/11 (dentro, no dia 31), um `cancelled` e um `completed` marcados em outubro e concluídos em novembro (contam na quantidade, não na receita); a resposta confere com o SQL. Na tela: aplicar o período pelos campos "De" e "Até" |
| Dado um período sem dados, quando o aplico, então os indicadores ficam zerados, com a mensagem de que não há dados a apresentar (UC09 FE01) | Testes de `buildIndicators` (período vazio: tudo zero, ticket médio zero, um item por dia, os sete status com 0). Local: período de 2020 → zeros. Na tela: "Não há dados a apresentar neste período." e os gráficos vazios |
| Dado a data inicial depois da final, ou um intervalo de mais de 12 meses, quando o aplico, então recebo a mensagem de período inválido (UC09 FE02, RN035) | Testes do esquema (invertido → mensagem em `to`; 366 dias aceito, 367 recusado; ano bissexto; data inexistente; só uma das datas). Local: 400 com `fields.to` nos dois casos. Na tela: a mensagem junto ao campo e "Informe um período válido para ver o dashboard." |
| Dado o dia de hoje, quando abro o dashboard, então a agenda do dia lista os agendamentos de hoje, com horário, cliente, veículo e status (UC09) | Teste de `companyDayRange` (hoje em Maceió às 23h30, UTC já no dia seguinte). Local: `agenda` só com `scheduled_at` de hoje no fuso, de todos os status, por horário e `id`; o agendamento das 23h30 de hoje entra e o de 00h00 de amanhã não (criados por SQL); `clientName`, `vehicle`, `services` e `total` iguais à cópia do agendamento (RN037, trocando o nome do cliente por SQL). Na tela: a lista da agenda com a etiqueta de status |
| Dado uma falha ao carregar os dados, quando abro a página, então aparece a mensagem de erro com "Tentar novamente" (UC09 FE03) | Passo manual: a requisição interceptada com 500 e depois liberada; o aviso, o seletor de período mantido, "Tentar novamente" recarrega e o foco é tratado como na tela |
| Dado o Lighthouse no celular, quando audito `/admin`, então o código dos gráficos só carrega depois da página, e o LCP fica em até 2,5 s (RNF006) | Passo manual: nas requisições do puppeteer, o chunk dos gráficos (Recharts) só é pedido depois da resposta de `GET /api/admin/dashboard`; Lighthouse de desempenho no celular com o LCP e o CLS medidos no `next start` local. Se o LCP local passar de 2,5 s (como nas telas anteriores), o resultado vai ao relatório com a causa, e a conferência na pré-visualização da Vercel é passo do Yvan |
| Dado um funcionário sem a permissão `dashboard`, quando chama a rota, então recebe 403 (RS008) | Local: funcionário de cargo sem `dashboard` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `dashboard` → 200; retirar `dashboard` do cargo muda a resposta na requisição seguinte |

Outros casos, pelo roteiro e pelos testes: `from` sem `to` e `to` sem `from` → 400; `from=2026-02-30` → 400; parâmetro desconhecido descartado; o período de um dia (`from=to`) com um item em `revenueByDay`; 12 meses com 366 itens; agendamento de cliente excluído (RN030) na agenda e nos números; a função SQL chamada com `anon` ou `authenticated` é recusada (grants).

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: o lugar reservado e, numa nova leitura, o conteúdo anterior com a aparência de carregando), vazio (período sem dados), período inválido, falha da leitura (rota fora do ar: aviso com "Tentar novamente", seletor mantido) e sucesso; falha de acesso (403: a página já responde pelo guarda de página; a rota, pelo roteiro);
- os quatro atalhos do período ("Este mês", "Hoje", "7 dias", "30 dias") e os campos "De" e "Até" com a espera de 300 ms, o gráfico de receita e o de status nos dois temas, e a agenda com um agendamento de cada status;
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar;
- teclado completo: atalhos, campos de data, "Tentar novamente", "Gerar análise" (demonstração) e o foco depois de cada uma;
- Lighthouse de acessibilidade em `/admin` (navegação) e nos estados em `snapshot` (sucesso, vazio, período inválido, falha), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop (prefixar o PATH com `C:\Users\yvans\AppData\Local\Programs\DockerDesktop\resources\bin`), `npx supabase start` e `npx supabase db reset` (aplica as migrations, inclusive a nova, e o `seed.sql`), depois o `seed-demo.sql` inteiro pelo ajudante `run-sql.mjs` (pacote `pg` só no scratchpad, conexão local padrão). Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois (`fresh.sh`). Os agendamentos de borda (L2) são criados por SQL.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `dashboard`), funcionário B (cargo sem `dashboard`) e um cliente; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre (3051), com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #46 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs` com o cargo de `dashboard`, `make-cookie.mjs`, `lh-pages.sh` apontando para `/admin`, `lh-snapshots`, `lh-summary.mjs`, `local-env.sh`, `start.sh`, `restart.sh`, `fresh.sh`, `cleanup.mjs`, `run-sql.mjs`) e novos: `verify-dashboard-api.mjs` (período padrão, bordas de data e de fuso, confronto com SQL, permissões, grants da função), `ui-dashboard.mjs` e `ui-keyboard-dashboard.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` do Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Estados de falha e carregamento por interceptação de requisição do `puppeteer`, sem alterar `src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Passos do Yvan** (no relatório): aplicar a migration com `npx supabase db push` a partir da ramificação do PR (não da `main`) antes da incorporação e comentar no PR; conferir logado, em produção ou na pré-visualização da Vercel, `/admin` com os agendamentos do `seed-demo.sql` (já carregado) e o LCP do celular.

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_dashboard_figures_function.sql` | criar: `dashboard_figures` |
| `src/shared/validation/dashboard.ts` e `src/shared/validation/README.md` | criar / alterar: `dashboardPeriodQuerySchema` |
| `src/shared/format/date.ts` | alterar: funções de dia de calendário e do período |
| `src/server/rules/dashboard-indicators.ts` e `src/server/rules/README.md` | criar / alterar: `buildIndicators` (L5) |
| `src/server/repositories/dashboard.ts` | criar: `findDashboardFigures` |
| `src/server/repositories/appointments.ts` | alterar: `listAppointmentsBetween` |
| `src/server/services/dashboard.ts` | criar: `calculateIndicators`, `getDashboard` |
| `src/app/api/admin/dashboard/route.ts` | criar: `GET` (a pasta já tem README) |
| `src/app/(admin)/admin/page.tsx` | alterar: sai o `DemoNotice` |
| `src/components/admin/dashboard/dashboard-analysis-card.tsx` | alterar: o `DemoNotice` no cartão (L6) |
| `src/components/admin/dashboard/dashboard-period.ts` | alterar: usa as funções de `date.ts` (se couber) |
| `src/lib/demo/routes.ts` | alterar: sai a entrada do `GET` |
| `src/lib/demo/dashboard.ts` | alterar: saem `answerDashboard`, a agenda e o que só elas usavam |
| `src/lib/demo/README.md` | alterar, se citar o dashboard |
| `tests/validation/dashboard.test.ts` | criar: o esquema do período |
| `tests/rules/dashboard-indicators.test.ts` | criar: `buildIndicators` |
| `tests/format/date.test.ts` | alterar: as funções novas de `date.ts` |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/agendamento/rotas.md` | alterar: textos de L2 e L4 |
| `docs/agendamento/calculos.md` | alterar: seção 5 (L2, L3) e "Persistência" (L1) |
| `docs/agendamento/dados.md` | alterar: a função `dashboard_figures` (L1) |
| `docs/agendamento/dashboard-do-painel.md` | alterar: o aviso de demonstração passa para o cartão da análise (L6) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as mensagens da L4 |
| `docs/padroes/backend.md` | alterar: `dashboard-indicators.ts` na árvore de `rules/` e a função de leitura (L1, L5); fora da lista inicial, a confirmar |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" e uma linha dos indicadores |
| `memoria/tarefas/51-dashboard-do-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/`, `src/server/rules/`, `src/components/admin/dashboard/` e `src/lib/demo/` são conferidos na construção: se citarem listas de arquivos, entram aqui. Não há tipo gerado do banco, `seed.sql` nem `seed-demo.sql` a alterar.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em ea87f28 (#46).
- **#66** (análise por IA, `em_execucao`): depende deste PR por `services/dashboard.ts`, `shared/validation/dashboard.ts` e `components/admin/dashboard/`; e tira o `src/lib/demo/dashboard.ts` e o aviso do cartão. O PR de código dela começa depois da incorporação desta.
- Etapa 04: comentário na **#66** com o que a tarefa deixou (`calculateIndicators`, o esquema do período, `listCalendarDays`, `buildIndicators`, o que sobra de demonstração).

## Testes previstos

Valores esperados tirados de RN021, RN035, `calculos.md` (seção 5), do UC09 e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/dashboard.test.ts`, `dashboardPeriodQuerySchema`:

- accepts no dates and keeps both absent (the service applies the current month)
- treats empty dates as absent
- accepts a period of one day and one of 366 days (`2026-01-01` a `2027-01-01` sem bissexto; `2028-01-01` a `2028-12-31` bissexto)
- rejects 367 days → "O período não pode passar de 12 meses." in `to`
- rejects `from` after `to` → "A data final não pode ser anterior à inicial." in `to`
- rejects one date alone → "Preencha este campo." in the missing one
- rejects a malformed or non-existent date (`01/10/2026`, `2026-02-30`) → "Informe uma data válida."
- discards the unknown parameters

`tests/rules/dashboard-indicators.test.ts`, `buildIndicators` (L3, L5):

- sums the revenue of the days and counts all the statuses in `appointmentCount`
- gives the average ticket as revenue over the paid appointments, rounded to cents half up (R$ 1.000,00 sobre 3 → R$ 333,33; R$ 10,00 sobre 8 → R$ 1,25; R$ 0,05 sobre 2 → R$ 0,03)
- gives the average ticket zero with no paid appointment
- gives the cancellation rate as cancelled over the total, with two decimals (1 de 3 → 33,33; 1 de 8 → 12,5)
- gives the cancellation rate zero with no appointment
- lists every day of the period, with 0 on the days without revenue, in order
- lists the seven statuses in the order of RN017, with 0 on the absent ones
- gives zeros and the full lists for an empty period
- ignores the revenue of a day outside the period

`tests/format/date.test.ts`:

- `addCalendarDays`: across the end of the month, of the year and of February in a leap year
- `listCalendarDays`: one day, a month and the leap year
- `countCalendarDays`: both dates count (01/10 a 31/10 → 31)
- `findMonthPeriod`: October (31 days), February 2028 (29), December
- `companyDayRange`: `2026-10-01` a `2026-10-31` → `2026-10-01T00:00:00-03:00` a `2026-11-01T00:00:00-03:00`; a period of one day

Sem teste automático para rota, serviço, repositório, função SQL e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Onde agregar os indicadores (a issue deixa para o plano)

**Problema.** `calculos.md` e o README de `rules/` dizem que os indicadores são "calculados no banco ou no serviço `dashboard`, como o plano da tarefa decidir". O PostgREST devolve no máximo 1000 linhas por leitura (`max_rows` do `supabase/config.toml`), e o `seed-demo.sql` já tem 258 agendamentos em 104 dias, perto de 950 por ano: agregar no serviço sobre linhas lidas truncaria, em silêncio, o período de 12 meses.

**Opções:**

- [x] **1. Função SQL de leitura `dashboard_figures`, que agrega no banco, e o serviço monta o resultado (recomendada).** Uma chamada, sem limite de linhas, com os índices de `scheduled_at` e de `completed_at` já existentes; o agrupamento por dia usa o fuso da empresa. Custa uma migration (aditiva), que o Yvan aplica, e a função de leitura é a primeira do tipo (as outras são de gravação, RNF010).
- [ ] **2. Ler as linhas e agregar no serviço, em páginas de 1000.** Sem migration, mas várias idas ao banco num período longo, o corpo de cada agendamento trafega só para ser somado, e a receita depende de a leitura em páginas ser estável.
- [ ] **3. Contagens e somas por consultas do `supabase-js`.** Sem migration, mas o `supabase-js` não agrupa por dia nem soma: a receita por dia exigiria uma consulta por dia (até 366).

**Texto proposto (opção recomendada):**

- `docs/agendamento/calculos.md`, seção 5, no começo: "Os números do período são agregados no banco pela função `dashboard_figures` (só leitura), que devolve, por status, a quantidade dos agendamentos com a data marcada no período e, por dia de conclusão no fuso da empresa, a receita e a quantidade dos pagos; o serviço `dashboard` monta com eles os indicadores, a receita de todos os dias do período e os sete status (`rules/dashboard-indicators.ts`)." Em "Persistência": "`dashboard_figures` é a única função de leitura: agrega no banco o que passaria do limite de linhas de uma consulta."
- `docs/agendamento/dados.md`, onde estão as funções: `dashboard_figures(p_from, p_to, p_time_zone)`: "agendamentos do período por status (`scheduled_at`) e receita por dia (`completed_at` no fuso `p_time_zone`); só leitura".
- `docs/padroes/backend.md`: a linha das funções SQL diz "de gravação" e passa a citar a de leitura `dashboard_figures`.

### L2. Data de cada número (a issue deixa a taxa de cancelamento para o plano)

**Problema.** RN021 e `calculos.md` (seção 5) já respondem: o agendamento pertence ao período pela data marcada (`scheduled_at`), a receita pela de conclusão (`completed_at`), a taxa de cancelamento é calculada sobre a quantidade do período, que usa a data marcada. Falta dizer qual data vale para o gráfico de agendamentos por status, que `rotas.md` descreve como a "distribuição dos agendamentos por status".

**Opções:**

- [x] **1. A taxa de cancelamento pela data marcada, como a documentação diz; o gráfico de status também (recomendada).** A soma do gráfico é igual à quantidade de agendamentos do período, e o cancelamento do gráfico é o da taxa. Sem mudança de regra: só a frase do gráfico.
- [ ] **2. A taxa pela data do cancelamento (`cancelled_at`).** Mede quando o cliente cancelou, mas contradiz RN021 e `calculos.md`, e a taxa deixaria de ser "cancelados sobre o total do período".
- [ ] **3. O gráfico por status pela data de conclusão para os pagos.** Mistura duas datas no mesmo gráfico e a soma não bate com a quantidade.

**Texto proposto (opção recomendada):**

- `docs/agendamento/calculos.md`, seção 5, na linha da quantidade e da taxa: "Quantidade de agendamentos, taxa de cancelamento e agendamentos por status: o período é o da data marcada (`scheduled_at`), e a soma dos status é a quantidade."
- `docs/agendamento/rotas.md`, `GET /api/admin/dashboard`, `appointmentsByStatus`: "dos agendamentos com a data marcada no período".

### L3. Arredondamento do ticket médio e da taxa

**Problema.** `rotas.md` diz que a taxa é "com duas casas", mas não diz o arredondamento do ticket médio nem como arredondar a taxa; a demonstração usa o arredondamento comum aos centavos. A receita é soma de valores com duas casas e não precisa de arredondar.

**Opções:**

- [x] **1. Os dois com duas casas, metade para cima, como o total do agendamento (RN012) (recomendada).** Uma regra de arredondamento só no sistema; o ticket médio é um valor em reais com centavos, e a taxa um percentual com duas casas (33,33).
- [ ] **2. O ticket médio sem arredondar na API, formatado na tela.** O valor da API teria casas demais (333,3333...) e a análise da #66 receberia um número que a tela não mostra.

**Texto proposto (opção recomendada):**

- `docs/agendamento/calculos.md`, seção 5: "O ticket médio e a taxa de cancelamento têm duas casas decimais, arredondadas com meio centavo para cima, como o total (RN012)."

### L4. Período recusado: dias fora do formato, uma data só, campo e mensagens

**Problema.** `rotas.md` diz "400 período inválido ou maior que 12 meses", mas não diz o que a rota responde à data fora do formato, à data inexistente, a só uma das duas datas, nem em que campo vão as mensagens (a tela mostra a mensagem junto ao campo, UC09 FE02). `mensagens-de-validacao.md` não tem as mensagens do período.

**Opções:**

- [x] **1. 400 `VALIDATION_ERROR` com `fields`: a ordem invertida e o intervalo longo em `to`; a data inválida e a que falta no próprio campo (recomendada).** Como as outras rotas: nunca assume um padrão silencioso para um parâmetro errado; as mensagens são as que a tela da #60 e a demonstração já usam. Sem as duas datas, vale o mês atual.
- [ ] **2. Uma data só completa a outra (o mês dela, ou o dia).** Mais tolerante, mas adivinha o que o cliente quis dizer e a análise da #66 (que exige as duas) discordaria.

**Texto proposto (opção recomendada):**

- `docs/agendamento/rotas.md`, `GET /api/admin/dashboard`, Resposta: "400 com o campo em `fields` quando só uma das datas vem, quando uma data não existe, quando `from` é depois de `to` ou quando o intervalo passa de 366 dias contando as duas datas (RN035)."
- `docs/plataforma/mensagens-de-validacao.md`, três linhas novas: "Data de calendário fora do formato aaaa-mm-dd ou inexistente | Informe uma data válida."; "Data final anterior à inicial | A data final não pode ser anterior à inicial."; "Período do dashboard de mais de 12 meses | O período não pode passar de 12 meses.".

### L5. Onde fica o cálculo puro dos indicadores

**Problema.** O README de `src/server/rules/` diz que os indicadores do dashboard "não vão" em `rules/`: "são agregações por período, calculadas no banco ou no serviço `dashboard`, como o plano decidir". Com a agregação no banco (L1), sobra montar o resultado (completar dias e status, somar, dividir e arredondar), que é função pura e precisa de TDD (decisão 0035); o arquivo de um serviço importa `server-only` e o Supabase, e não roda no Vitest.

**Opções:**

- [x] **1. `rules/dashboard-indicators.ts`, puro, com teste em `tests/rules/` (recomendada).** Segue o padrão das outras regras (recebem tudo por parâmetro). O README de `rules/` passa a citar o arquivo, e o `rules/dashboard-analysis.ts` da #66 ficará ao lado.
- [ ] **2. A montagem dentro de `services/dashboard.ts`.** Respeita o README como está, mas a lógica não teria teste automatizado ou exigiria tirar o `server-only` do serviço.

**Texto proposto (opção recomendada):**

- `src/server/rules/README.md`: a lista de arquivos ganha `dashboard-indicators.ts` (os indicadores do dashboard a partir dos números agregados) e o item de "Não vai aqui" passa a "a agregação dos agendamentos por período: é feita no banco (`dashboard_figures`, `docs/agendamento/calculos.md`)".
- `docs/padroes/backend.md`: a árvore de `rules/` ganha `dashboard-indicators.ts`.

### L6. Onde fica o aviso de demonstração depois desta tarefa

**Problema.** `dashboard-do-painel.md` diz que o aviso fica logo abaixo do título enquanto as rotas do dashboard forem de demonstração. Com `GET` real, o aviso da página mentiria; mas a análise por IA (`POST /api/admin/dashboard/analysis`) continua em demonstração até a #66. O `DemoNotice` tem um texto só ("esta parte ainda não está ligada ao sistema, e nada do que você fizer nela é gravado").

**Opções:**

- [x] **1. O aviso no alto do cartão "Análise do período" (recomendada).** Diz a verdade só da parte que é demonstração; a #66 o tira.
- [ ] **2. Manter o aviso da página.** Menos código, mas diria que os indicadores e a agenda são de demonstração, o que deixam de ser.

**Texto proposto (opção recomendada):**

- `docs/agendamento/dashboard-do-painel.md`, parágrafo "Enquanto as rotas do dashboard usarem os dados de demonstração...": passa a "Os indicadores, os gráficos e a agenda são reais. Enquanto a análise do período usar os dados de demonstração (decisão 0055), o aviso de demonstração fica no alto do cartão "Análise do período"."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js`), 0008 (validação compartilhada), 0010 e 0012 (permissões por página), 0025 (erros RFC 9457), 0035 e 0052 (testes), 0042 (grants das funções), 0043 (banco local), 0049 (shadcn sobre Base UI), 0053 (fuso da empresa), 0055 (telas de demonstração) e 0056 (Recharts), mais `backend.md`, `api.md`, `banco.md`, `componentes.md`, `frontend.md` e `testes.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Migration e produção.** Todos os ambientes usam o mesmo projeto do Supabase: a função é só aditiva e nada a usa até o código ser publicado, então aplicá-la antes da incorporação é seguro. O Yvan a aplica a partir da ramificação do PR.
- **Fuso e bordas de dia.** O agrupamento por dia da receita (no banco) e a janela do período (no serviço) usam o mesmo fuso, vindo da mesma constante; coberto pelos testes de `companyDayRange` e pelos agendamentos de 23h59 criados por SQL.
- **Status incoerente com a data no seed.** O `seed-demo.sql` escolhe o status pela data na hora da carga; um "Agendado" de ontem entra na quantidade e no gráfico, e a agenda de hoje mostra os de hoje de qualquer status. Não é defeito.
- **`dashboard-period.ts` da tela.** Hoje repete a conta do mês e dos dias; a troca para as funções de `date.ts` é opcional e só entra se não ampliar o PR.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo, com a causa, e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Agenda sem paginação.** Um dia tem poucas dezenas de agendamentos; a consulta não passa do limite de 1000 linhas.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 330 linhas adicionadas (rota 20, serviço 70, repositórios 50, regras 90, esquema 45, formato 50, avisos 5) contra cerca de 230 removidas (a resposta e a agenda fixas da demonstração), mais cerca de 250 de testes, a migration (cerca de 45 linhas) e as especificações.

### P1. Divisão em PRs

- [x] **1. Um PR só, "Closes #51" (recomendada).** A função e o código que a chama se verificam juntos; a migration é aditiva, e o Yvan a aplica da ramificação do PR antes de incorporar (passo dele no relatório). O total em `src/` fica abaixo de 400 linhas. O plano, as notas e o relatório vão nele.
- [ ] **2. Dois PRs encadeados (migration; depois serviço, rota e tela).** Como na #43 a #45: o primeiro é só a função e `dados.md`, sem como ser verificado pela tela, e o segundo repete o ambiente de verificação.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência por SQL dos números, das datas e do fuso.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível dos README das pastas tocadas.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- A análise por IA, sua rota, o serviço de IA e a remoção de `src/lib/demo/dashboard.ts` (#66).
- Exportação de relatórios.
- Saudação, "Avaliação média", "Alertas" e a variação em relação ao período anterior nos cartões (sem requisito).
- Acessibilidade (WCAG) do site inteiro, ajustada ao fim pelo Yvan; esta tarefa só mantém o que o plano promete verificar.
- Dependência nova e registro de decisão.
