# `src/server/rules/` – Regras puras

Funções puras das regras de negócio, desenvolvidas com TDD: `pricing.ts`, `status-transitions.ts`, `scheduling.ts`, `editing.ts`, `services.ts` (a edição parcial de um serviço) e `appointment-services.ts` (a ordem dos serviços de um agendamento na listagem do painel) e `dashboard-indicators.ts` (os indicadores do dashboard a partir dos números agregados pelo banco). Recebem tudo por parâmetro, inclusive o instante atual e a disponibilidade, e devolvem resultados; não gravam nada.

## Vai aqui

- funções puras de preço, transições de status, datas e previsão de conclusão, e edição
- um arquivo por conjunto de regras, testado em `tests/rules/` com o mesmo nome

## Não vai aqui

- imports de `repositories/`, do Supabase, de `process.env` ou leitura do relógio (`new Date()` sem parâmetro)
- a agregação dos agendamentos por período: é feita no banco (`dashboard_figures`, `docs/agendamento/calculos.md`)
- código HTTP

## Referências

- `docs/agendamento/calculos.md`
- `docs/padroes/testes.md`
- `docs/decisoes/0035-tdd-nas-regras.md`
