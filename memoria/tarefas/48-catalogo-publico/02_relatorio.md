---
issue: 48
pull_request: 126
---

# Relatório: Página inicial e catálogo público

## O que foi feito

`GET /api/public/services` (com `categoryId`, páginas de 12, ordem por nome) e `GET /api/public/categories` leem o banco: só principais e complementares ativos, não excluídos e de categoria ativa (UC01, RN008, RN031, RN030). `/services` usa as rotas reais e perdeu o aviso de demonstração; as duas entradas e `src/lib/demo/catalog.ts` saíram da demonstração (decisão 0055). `/` já usava os dados da empresa (#37, #57) e só foi conferida. Especificação OpenAPI das duas rotas.

## Arquivos alterados

- `src/shared/validation/catalog.ts` — `publicServiceQuerySchema`
- `src/server/repositories/catalog-public.ts` — leituras públicas (novo)
- `src/server/services/catalog.ts` — `listPublicServices` e `listPublicCategories`
- `src/app/api/public/services/route.ts`, `src/app/api/public/categories/route.ts` e README — rotas (novas)
- `src/app/(portal)/services/page.tsx` — sem o aviso de demonstração
- `src/lib/demo/routes.ts`, `src/lib/demo/catalog.ts` (apagado), `src/lib/demo/appointments.ts` (comentário)
- `src/components/portal/catalog/service-catalog.tsx` — 12 cartões reservados no carregamento (fora do plano original)
- `tests/validation/catalog.test.ts` — testes do esquema

## Testes executados

- `npm run check`: sem erros nem avisos, 695 testes.
- Manual, no banco local com `seed-demo.sql` e compilação de produção: rotas (11 serviços, 3 categorias, filtro, paginação, 400, 405, categoria inexistente), RN008 e RN031 pela troca de situação, `/services` nos estados (cheio, filtrado, vazio, falha com "Tentar novamente", imagem por `/_next/image`) a 360 e 1440 px, claro e escuro, cliente autenticado em `/` e `/services`. Lighthouse: acessibilidade 100 em `/` e `/services`; LCP no celular 3,0 s no modo simulado e 1,9 s pelo DevTools; CLS 0.

## Documentação atualizada

- Módulos: `docs/catalogo/rotas.md`, `docs/catalogo/paginas-publicas.md`, `docs/plataforma/openapi.yaml`.
- Lacunas resolvidas: L1 (categoria inexistente, inativa ou sem serviço → 200 vazio) e L2 (ordem por nome) → `docs/catalogo/rotas.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar: nenhum.

## Pendências

- LCP de `/services` no celular simulado local acima de 2,5 s (lista lida depois da hidratação); o número que vale é o da pré-visualização.
