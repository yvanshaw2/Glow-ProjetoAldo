---
issue: 51
pull_request:
---

# Relatório: Dashboard do painel

Em um PR só (`Closes #51`), como aprovado em P1: a migration `dashboard_figures` vai nele, e o Yvan a aplica antes da incorporação.

## O que foi feito

- **Função SQL** `dashboard_figures(p_from, p_to, p_time_zone)` (migration `20261027010500_dashboard_figures_function.sql`, só leitura, `set search_path = ''`, `revoke` de `public`, `anon` e `authenticated`, `grant` ao `service_role`): os agendamentos do período por status (`scheduled_at`) e a receita e a quantidade dos pagos por dia de conclusão no fuso da empresa (L1).
- **Rota** `GET /api/admin/dashboard` com `requirePermission("dashboard")` (UC09, RF040 a RF043, RN021, RN035, RS008): `from` e `to` (padrão: o mês atual no fuso da empresa; até 366 dias); `revenue`, `appointmentCount`, `averageTicket`, `cancellationRate` (duas casas, meio centavo para cima, L3), `revenueByDay` (todos os dias, com 0), `appointmentsByStatus` (os sete, na ordem de RN017, pela data marcada, L2) e `agenda` (os agendamentos de hoje, de qualquer status, por horário e `id`, com a cópia de RN037); 400 com `fields` (L4).
- **Serviço** `dashboard`: `calculateIndicators(period)` (a função que a análise da #66 chama para o período e o anterior) e `getDashboard(query, now)`. Funções puras: `buildIndicators` (`rules/dashboard-indicators.ts`, L5), `dashboardPeriodQuerySchema` e, em `shared/format/date.ts`, `addCalendarDays`, `listCalendarDays`, `countCalendarDays`, `findMonthPeriod`, `companyDayRange` e `isCalendarDay`. Repositórios `dashboard.ts` (novo) e `appointments.ts` (`listAppointmentsBetween`); especificação OpenAPI.
- **Tela ligada à rota**: sai a entrada do `GET` de `src/lib/demo/routes.ts`, sai o aviso da página, e `src/lib/demo/dashboard.ts` encolheu para só a análise. O `dashboard-period.ts` da tela passou a usar as funções de `date.ts`.
- **O que continua em demonstração** (L6): só a análise do período (`POST /api/admin/dashboard/analysis`, #66). O aviso passou para o alto do cartão "Análise do período". `src/lib/demo/dashboard.ts` e o aviso saem na #66.

## Arquivos alterados

- Banco: `supabase/migrations/20261027010500_dashboard_figures_function.sql`.
- Backend: `src/shared/validation/dashboard.ts` e `README.md`; `src/shared/format/date.ts`; `src/server/rules/dashboard-indicators.ts` e `README.md`; `src/server/repositories/dashboard.ts` (novo) e `appointments.ts`; `src/server/services/dashboard.ts` (novo); `src/app/api/admin/dashboard/route.ts` (novo).
- Tela: `src/app/(admin)/admin/page.tsx`; `src/components/admin/dashboard/dashboard-analysis-card.tsx` e `dashboard-period.ts`; `src/lib/demo/routes.ts` e `dashboard.ts`.
- Testes: `tests/validation/dashboard.test.ts` e `tests/rules/dashboard-indicators.test.ts` (novos); `tests/format/date.test.ts`.
- Docs: `docs/plataforma/openapi.yaml`, `docs/agendamento/rotas.md`, `calculos.md`, `dados.md` e `dashboard-do-painel.md`, `docs/plataforma/mensagens-de-validacao.md`, `docs/padroes/backend.md` e `testes.md`.

Sem desvio da lista do plano (ver `notas.md`).

## Testes executados

- `npm run check`: sem erros nem avisos (653 testes, 26 novos, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, em `fast-uri`, dependência indireta que esta tarefa não alterou.
- **Rota**, no banco local (`db reset` com as seis migrations, `seed-demo.sql` com 256 agendamentos, admin, dois funcionários e um cliente, `next start` na porta 3051), pelo roteiro `verify-dashboard-api.mjs`, 38 conferências, todas certas:
  - 401 sem sessão, 403 para o funcionário sem `dashboard` e para o cliente, 200 para o funcionário com a permissão e para o admin; a retirada da permissão do cargo vale na requisição seguinte;
  - critério 1: sem parâmetros, o período é o mês atual, e a quantidade, a receita, o ticket médio e a taxa são iguais aos de consultas SQL escritas de outro modo (pelo dia de calendário de cada data); a soma dos dias é a receita, e a dos status é a quantidade;
  - critério 2: com agendamentos de borda criados por SQL (concluído às 23h59 de 30/09, reagendado às 23h59 de 31/10, com o UTC já em 01/11, e um de outubro concluído às 00h00 de 01/11), a receita de outubro é a do SQL, o de 23h59 de 31/10 cai no dia 31, o de 30/09 no dia 30/09 e o de 01/11 no dia 01/11;
  - critério 3: período de 2020 → zeros, 31 itens em `revenueByDay`, sete status com 0; um dia → 1 item; 366 dias → 200 e 366 itens;
  - critério 4: data invertida e 367 dias → 400 em `to` com a mensagem da L4; uma data só → 400 "Preencha este campo." na que falta; `2026-02-30` e `01/10/2026` → 400 "Informe uma data válida."; parâmetro desconhecido descartado;
  - critério 5: a agenda é todos os agendamentos de hoje, de todos os status, por horário e `id` (igual ao SQL); o das 23h30 de hoje entra e o das 00h00 de amanhã não; trocados por SQL o nome do cliente e a placa, a agenda continua com a cópia (RN037);
  - a função: `anon`, `authenticated` e `public` sem `execute`; `service_role` com `execute`.
- **Tela** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 e 1440 × 900, nos temas claro e escuro, pelo roteiro `ui-dashboard.mjs`, tudo certo nas quatro combinações:
  - sem aviso na página e um só aviso, no cartão da análise; receita, ticket médio e quantidade iguais aos da API; a agenda com os agendamentos da API; sem transbordo horizontal; o código dos gráficos só é pedido depois da primeira resposta de `GET /api/admin/dashboard`;
  - atalhos "Hoje", "7 dias", "30 dias" e "Este mês" e os campos "De" e "Até" (01/10 a 31/10): receita igual à da API; período sem dados com "Não há dados a apresentar neste período." e os dois gráficos vazios; período invertido e de mais de 12 meses com a mensagem junto ao campo e "Informe um período válido para ver o dashboard."; falha da leitura com "Tentar novamente" e o seletor mantido, e a nova leitura traz o dashboard; carregamento com os lugares reservados e, numa nova leitura, o conteúdo anterior com `aria-busy`;
  - a agenda com um agendamento de cada um dos sete status (criados por SQL), nas quatro combinações, sem transbordo;
  - **teclado** (`ui-keyboard-dashboard.mjs`, nos dois tamanhos): Tab até os atalhos, Enter e Espaço aplicam o período e o foco fica no atalho; a data digitada nos campos vale depois da espera, com o foco no campo; "Gerar análise" por Enter, com o foco no botão e "Análise gerada."; "Tentar novamente" por Enter;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin` (navegação) e 1,0 nas 32 capturas de estado (sucesso, "Hoje", "30 dias", vazio, período invertido, período longo, falha e análise gerada, nas quatro combinações), e de novo nos estados com a agenda de sete status;
  - **Desempenho (navegação, `next start` local):** computador LCP 0,9 s, CLS 0, desempenho 0,99; celular LCP 4,0 s, CLS 0, TBT 270 a 310 ms, desempenho 0,80 a 0,82. O LCP do celular fica acima dos 2,5 s de RNF006. O elemento é o valor da "Receita" (`dd.text-h3`), que só aparece depois de o navegador baixar o código da página, hidratar e ler `GET /api/admin/dashboard` (tempo até o primeiro byte de 72 ms e 267 ms de atraso de renderização no breakdown; o resto é a simulação de rede e de CPU do Lighthouse). Reduzi-lo exigiria entregar os números já no HTML (leitura no servidor da página), o que muda a arquitetura da tela da #60 e não está no plano. A conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (a rota e o esquema `Dashboard`), `docs/agendamento/rotas.md`, `calculos.md` (seção 5 e "Persistência"), `dados.md` (a função), `dashboard-do-painel.md` (o aviso), `docs/plataforma/mensagens-de-validacao.md` (as três mensagens), `docs/padroes/backend.md` e `testes.md`; READMEs de `rules/` e de `validation/`.
- Lacunas resolvidas, todas na opção 1: L1 (função `dashboard_figures`), L2 (data marcada também no gráfico de status), L3 (duas casas, meio centavo para cima), L4 (400 com `fields` e as mensagens), L5 (`rules/dashboard-indicators.ts`), L6 (o aviso no cartão da análise).
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`GET /api/admin/dashboard`: o 400 do período, os números por data marcada e por conclusão, o arredondamento) e a menção à função de leitura `dashboard_figures`; Análise do Sistema, RN021 (a agenda e o status pela data marcada).

## Pendências

- **Do Yvan:**
  1. Aplicar a migration com `npx supabase db push`, a partir da ramificação do PR (não da `main`), antes da incorporação, e comentar no PR. Ela só acrescenta uma função; nada a usa até o código ser publicado.
  2. Conferir logado, na pré-visualização da Vercel ou em produção, `/admin` com os agendamentos do `seed-demo.sql`: os indicadores, o período, os gráficos, a agenda e o LCP do celular.
- **Observação para o ajuste de acessibilidade do fim:** depois de "Tentar novamente" (falha da leitura) o foco vai para o corpo da página, porque o botão sai da tela com o aviso; a documentação da tela (#60) não define para onde o foco vai. Fora do escopo desta tarefa.
- Em demonstração: a análise do período (#66), com o aviso no cartão; a #66 tira `src/lib/demo/dashboard.ts` e o aviso.
- Etapa 04: comentário na issue #66 com o que a tarefa deixou.
