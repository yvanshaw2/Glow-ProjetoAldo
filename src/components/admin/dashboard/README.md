# `src/components/admin/dashboard/` – Painel: dashboard

Indicadores, a análise do período por IA (`dashboard-analysis-card.tsx`, resumida ou detalhada, com os valores do sistema, a comparação com o período anterior em `analysis-comparison.tsx`, as seções e as sugestões da detalhada em `analysis-sections.tsx`, copiar e imprimir), gráfico de receita por dia (Recharts, só em `dashboard-charts.tsx`, carregado sob demanda), agendamentos por status e agenda do dia, com seleção de período. Na impressão, saem a navegação, os controles e a agenda do dia (RF094).

## Vai aqui

- componentes `.tsx` deste módulo nesta interface, em `kebab-case` (ex.: `dashboard-form.tsx`)
- formulários com React Hook Form e os esquemas de `src/shared/validation/`
- funções puras só da tela do dashboard, como os atalhos do período (`dashboard-period.ts`)

## Não vai aqui

- componente usado por outro módulo ou pela outra interface (→ `src/components/shared/`)
- chamada ao Supabase ou import de `src/server/` (dados pela API)
- cálculo de regra de negócio (preço, previsão, transição de status): a API calcula

## Referências

- `docs/agendamento/UC09-visualizar-dashboard.md`
- `docs/agendamento/rotas.md`
- `docs/padroes/frontend.md`
