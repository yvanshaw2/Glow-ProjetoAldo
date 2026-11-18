# `/api/admin/dashboard/analysis`

Guard: `requirePermission('dashboard')`. Serviço: `src/server/services/dashboard.ts` (`generateDashboardAnalysis`).

| Método | Finalidade |
|---|---|
| `POST` | Gera a análise do período por inteligência artificial (UC27); nada é gravado. |

Entrada, resposta e erros: `docs/agendamento/rotas.md`. O serviço de IA e as falhas: `docs/plataforma/servico-de-ia.md`.

## Vai aqui

- `route.ts`, exportando só `POST`
- guard, validação com `dashboardAnalysisSchema`, chamada ao serviço e resposta pelo `src/server/http/`

## Não vai aqui

- a chamada ao serviço de IA (→ `src/server/ai/`) ou as regras da análise (→ `src/server/rules/dashboard-analysis.ts`)
- registro próprio da chamada: o serviço registra o motivo da falha e os tokens, nunca a chave, as mensagens nem a resposta (RS018)
- tratamento de erro próprio: o `handler.ts` responde todos os erros

## Referências

- `docs/agendamento/rotas.md`
- `docs/plataforma/servico-de-ia.md`
- `docs/padroes/api.md`
