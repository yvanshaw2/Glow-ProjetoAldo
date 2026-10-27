# Notas: 51-dashboard-do-painel

Registro curto do que outra sessão precisaria saber. Uma entrada por fato, a mais recente embaixo.

## 2026-10-26 – descoberta: dependências conferidas

A #51 depende da #60 (página com demonstração e Recharts) e da #56 (etiqueta de status), incorporadas. `git fetch` feito: `origin/main` em ea87f28 (#46, PR #123), e o worktree (`claude/fervent-kepler-a80f3a`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em ea87f28, árvore limpa. Plano e notas sem commit, como nas etapas 01 anteriores; a etapa 02 cria `feat/51-dashboard` a partir da `origin/main`.

## 2026-10-26 – descoberta: o que já existe

- Não há `services/dashboard.ts`, `repositories/dashboard.ts`, `rules/dashboard-indicators.ts` nem `shared/validation/dashboard.ts`. O README de `app/api/admin/dashboard/` já existe e cita `services/dashboard.ts`; o `route.ts` não existe. `shared/api/dashboard.ts` (`Dashboard`, `DashboardAgendaItem` etc.) e `shared/constants/dashboard-indicators.ts` existem e não mudam.
- A tela (`components/admin/dashboard/`, #60) já chama `GET /api/admin/dashboard` pelo `useApiQuery`, trata o 400 com `fields` (`from`/`to`), a falha com "Tentar novamente", o vazio e o carregamento; os gráficos já são carregados sob demanda.
- `src/lib/demo/dashboard.ts` responde o `GET` e o `POST` da análise; o `POST` ainda é da #66 (plano `em_execucao`), então o arquivo encolhe e não sai. O `DemoNotice` de `/admin` passa para o cartão da análise (L6).
- A #66 (plano aprovado em 21/10) espera da #51: `services/dashboard.ts` com a função de indicadores de um período, `shared/validation/dashboard.ts` com o esquema do período e `components/admin/dashboard/`; o PR de código dela começa depois.
- O banco já tem `appointments` com `scheduled_at`, `completed_at` (preenchido só em `completed` e `rescheduled`) e os índices `idx_appointments_scheduled_at` e `idx_appointments_completed_at`. O `max_rows` do PostgREST é 1000 (`supabase/config.toml`) e o `seed-demo.sql` tem 258 agendamentos em 104 dias: base da L1.
- A documentação já decide a data de cada número (RN021 e `calculos.md`, seção 5); a issue deixava a taxa de cancelamento para o plano, e a L2 só registra que vale a data marcada e estende ao gráfico de status.
- O README de `rules/` diz que os indicadores não vão em `rules/` "como o plano decidir": L5.
- `dashboard-period.ts` (tela) repete a conta do mês e dos dias que a rota também precisa; ver riscos do plano.

## 2026-10-26 – decisão: plano gravado em aguardando_aprovacao

`01_plano.md` com as lacunas L1 a L6 e os pontos P1 a P3 (opção recomendada primeiro, nenhuma marcada, para o Yvan marcar): onde agregar (função SQL `dashboard_figures`, uma migration), a data de cada número, o arredondamento, o período recusado (campos e mensagens), o lugar do cálculo puro e o aviso de demonstração no cartão da análise; um PR só. Nenhuma dependência nem decisão técnica nova.

## 2026-10-27 – decisão: plano aprovado

O Yvan gravou `status: aprovado`, `aprovado_por: yvan` e `aprovado_em: 01:01 - 27/10/2026`, com a opção 1 marcada em L1 a L6 e em P1 a P3. O `status` passou a `em_execucao`, sem tocar em `aprovado_por` nem em `aprovado_em`. Ramificação `feat/51-dashboard`, da `origin/main` (ea87f28), sem vínculo. Testes escritos antes e vistos falhar (commit `051776c`).

## 2026-10-27 – descoberta: o que a construção encontrou

- `isCalendarDay` foi acrescentada a `shared/format/date.ts` (o esquema e a demonstração da análise precisam dela); está no arquivo da lista.
- A demonstração da análise (`src/lib/demo/dashboard.ts`) foi reescrita só com o que a análise usa: `hasComparison` passou a saber só se há dia útil do seed no período anterior (sem gerar agendamentos).
- O PostgREST devolve `jsonb` de `rpc` sem tipo: o repositório faz a conversão para `DashboardFigures` (o `returns<>` não serve para objeto).
- Depois de "Tentar novamente" o foco vai para o corpo da página (o botão sai com o aviso). Sem definição nos docs; fica para o ajuste de acessibilidade do fim, no relatório.
- LCP do celular medido: 4,0 s, elemento o valor da "Receita", que depende da leitura da API depois da hidratação. Causa e passo do Yvan no relatório.
- Nenhum arquivo fora da lista do plano foi alterado.
