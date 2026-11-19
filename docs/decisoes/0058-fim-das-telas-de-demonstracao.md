---
id: 0058
titulo: Telas só com as rotas reais, sem o mecanismo de demonstração
status: aceita
data: 2026-11-19
origem: issue #1, plano memoria/tarefas/1-analise-por-ia/01_plano.md (L1, L16 e Decisões técnicas)
relacionados: [RNF004, 0052, 0055]
substitui: 0055
---

# 0058 – Telas só com as rotas reais, sem o mecanismo de demonstração

## Decisão

As telas usam só as rotas reais. `src/lib/demo/`, o código `NOT_IMPLEMENTED` e o `DemoNotice` foram removidos com a última rota de demonstração, `POST /api/admin/dashboard/analysis` (issue #1), e o cliente da API volta a falar só com a rede. Uma tela nova nasce junto com a rota dela.

## Alternativa descartada

Manter o mecanismo para telas futuras.

## Justificativa

A 0055 previa a remoção com a última rota: o mecanismo serviu para construir as telas antes das rotas, e todas já estão ligadas ao sistema. Mantê-lo sem uso deixaria código morto no cliente da API, um código de erro que nenhuma rota produz e textos de `docs/` sobre algo que não existe. Os dados fictícios das telas continuam vindo do banco, pelo `supabase/seed-demo.sql`.
