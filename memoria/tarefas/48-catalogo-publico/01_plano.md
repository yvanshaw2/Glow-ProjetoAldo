---
issue: 48
titulo: "Página inicial e catálogo público"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC01, RF001, RF002, RF003, RF004, RF005, RF006, RN008, RN028, RN031, RNF001, RNF005, RNF006]
status: concluido
aprovado_por: yvan
aprovado_em: 14:08 - 27/10/2026
---

# Plano: Página inicial e catálogo público

## Objetivo

Ligar o catálogo público ao banco: `GET /api/public/services` (com `categoryId` opcional) devolve os serviços principais e complementares ativos, de categorias ativas e não excluídos (RN008, RN031, RN030), e `GET /api/public/categories` devolve as categorias ativas com ao menos um desses serviços, para o filtro (UC01). A tela `/services` da #57 passa a ler as rotas reais, sem o aviso de demonstração, e as duas entradas `/api/public/*` saem de `src/lib/demo/routes.ts` (decisão 0055), com o módulo de dados `src/lib/demo/catalog.ts`. A página inicial `/` já lê os dados reais da empresa (`GET /api/public/company`, #37 e #57; RN028): não muda, é só conferida. A especificação OpenAPI ganha as duas rotas. Não há migration.

## Base

- Worktree `36-regras-do-agendamento-05611e`, ramificação `claude/frosty-yonath-cad078`, igual à `origin/main` em d49c04c (PR #125, #47) depois do `git fetch`. Plano e notas sem commit, como nas etapas 01 anteriores. A etapa 02 cria `feat/48-public-catalog` a partir da `origin/main`.
- Já existe: os tipos `PublicCategory` e `PublicService` (`src/shared/api/catalog.ts`); `getImageUrl` (`src/server/supabase/storage.ts`) e o `images.remotePatterns` de `*.supabase.co` (#47); `CATALOG_PAGE_SIZE` (12); `paginationSchema`, `respondPage` e `handleRoute`; o `ServiceCatalog`, o `ServiceCard` e o `CategoryFilter` da #57, que chamam `/api/public/services` e `/api/public/categories` pelo `apiRequest` (hoje respondidos pela demonstração).
- Dos comentários da issue (#40 e #44): `src/server/repositories/categories.ts` e `services.ts` leem para o painel e incluem inativos; a leitura pública é uma consulta nova, que exclui serviço inativo, de categoria inativa ou excluído, e só traz principais e complementares. A exclusão lógica mantém os vínculos; aqui não se lê vínculo. O banco de produção não tem categorias (só o `seed-demo.sql`): o catálogo vazio (FE01) é o estado real até alguém cadastrar.
- Páginas: a imagem de destaque e a localização foram decididas na #57 e estão na `main`. O aviso de demonstração só está em `/services`; `/` não o tem.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um visitante, quando abre `/`, então vê o destaque, o institucional, a localização e os atalhos "Criar conta" e "Entrar", com os dados das configurações (UC01, RN028) | Local, com o banco e o `seed-demo.sql`: grava o endereço pelo painel, abre `/` e confere o endereço, o "Como chegar" e o horário; sem alteração de código |
| Dado um serviço inativo, de categoria inativa ou excluído, quando abro `/services`, então ele não aparece (RN008, RN031, RN030) | Local, na tela e pela rota: o seed tem a "Lavagem a seco" (inativa e excluída), a "Cristalização de vidros" (inativa) e a "Película nos vidros" (categoria inativa); a lista traz 11 serviços. Desativa uma categoria pelo painel e confere que os serviços dela somem da lista e do filtro, e voltam ao reativar |
| Dado uma categoria escolhida no filtro, quando o aplico, então só os serviços dela aparecem | Teste do esquema da consulta (`categoryId` UUID); local, na tela: Higienização 3, Lavagem 4, Polimento e proteção 4 e "Todas" 11, como na demonstração |
| Dado nenhum serviço ativo, quando abro `/services`, então vejo "Não há serviços disponíveis no momento." (UC01 FE01) | Local: desativa os serviços (ou a categoria) pelo painel e abre `/services`: lista vazia e o texto, sem paginação |
| Dado uma falha da API, quando abro as páginas, então aparece a mensagem de erro com "Tentar novamente" (UC01 FE02) | Local: interrompe a requisição das duas rotas no navegador de teste; o aviso aparece no filtro e nos cartões, e "Tentar novamente" recarrega (a página inicial já foi conferida na #57) |
| Dado um cliente autenticado, quando abre as páginas públicas, então o cabeçalho mostra também Agendar, Meus agendamentos e Minha conta (UC01 FA01) | Local: entra com uma conta de cliente de teste e abre `/` e `/services`; o cabeçalho é o do layout do portal (#57), sem alteração |
| Dado `categoryId` que não é UUID, quando chamo a rota, então recebo 400 com `fields.categoryId` (api.md) | Teste do esquema; local, pela rota |
| Dado a imagem de um serviço, quando o cartão a exibe, então ela passa por `/_next/image` com o domínio do Storage liberado (RNF006) | Local, na tela: envia uma imagem a um serviço pelo painel (#47), abre `/services` e confere o `src` servido |
| Dado o Lighthouse no celular, quando audito `/` e `/services` na pré-visualização, então a acessibilidade não reprova e o LCP fica em até 2,5 s (RNF005, RNF006) | Local, em compilação de produção: acessibilidade em `/` e `/services`, claro e escuro. O LCP local de `/services` (dados lidos depois da hidratação) passa de 2,5 s no celular simulado e vai ao relatório; o número que vale é o da pré-visualização |

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`: `/services` nos estados (carregando, com cartões com e sem imagem, vazio, falha, filtrado e paginado), a 360 × 800 primeiro e a 1440 × 900, claro e escuro, e pelo teclado. As rotas, pelo roteiro de `testes.md`: visitante sem sessão recebe 200; método não documentado, 405.

## Como funciona

### Contrato (`docs/catalogo/rotas.md`)

- `GET /api/public/categories`: sem entrada; **200** lista (não paginada) de `id` e `name`, em ordem alfabética, das categorias ativas com ao menos um serviço principal ou complementar ativo e não excluído.
- `GET /api/public/services`: `categoryId`, `page`, `pageSize` (12; máximo 50); **200** página de `id`, `name`, `description`, `imageUrl`, `category` (`id` e `name`) e `avgDurationMinutes`. Ordem e `categoryId` sem serviço: L1 e L2.

### Backend

- `src/shared/validation/catalog.ts`: `publicServiceQuerySchema` (`paginationSchema(CATALOG_PAGE_SIZE)` com `categoryId` UUID opcional).
- `src/server/repositories/catalog-public.ts` (novo, para não misturar com as leituras do painel): `listPublicServices` e `listPublicCategories` pelo cliente de serviço do Supabase. Os filtros ficam na própria consulta: `is_active = true`, `deleted_at is null`, `type in (main, complementary)` e a categoria ativa por junção interna (`categories!inner`); a de categorias usa `services!inner` com os mesmos filtros, para só trazer a que tem serviço. `image_path` vira `imageUrl` por `getImageUrl`.
- `src/server/services/catalog.ts`: `listPublicServices` e `listPublicCategories`, que só repassam (a regra está nos filtros da consulta).
- `src/app/api/public/services/route.ts` e `src/app/api/public/categories/route.ts`: `handleRoute`, sem guard, esquema, serviço e `respondPage` / `respondOk`. Dados de resposta só os do contrato, sem `isActive` nem `type`.

### Frontend

- `src/app/(portal)/services/page.tsx`: tira o `DemoNotice` e o comentário de demonstração.
- `src/lib/demo/routes.ts`: sai o bloco das duas rotas; `src/lib/demo/catalog.ts` é apagado (`appointments.ts` só cita o arquivo num comentário, que passa a dizer "como no `seed-demo.sql`").
- `ServiceCatalog`, `ServiceCard` e `CategoryFilter` não mudam (já tratam carregamento, vazio, falha e paginação); só se a verificação mostrar necessidade.

### OpenAPI (`docs/plataforma/openapi.yaml`)

`/api/public/categories` e `/api/public/services` com a tag `public`, `security: []`, parâmetros `categoryId`, `page` e `pageSize`, e os esquemas `PublicCategory` e `PublicServicePage`, no padrão de `ServicePage`; respostas 200, 400 e 500.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/shared/validation/catalog.ts` | alterar (`publicServiceQuerySchema`) |
| `src/server/repositories/catalog-public.ts` | criar |
| `src/server/services/catalog.ts` | alterar |
| `src/app/api/public/services/route.ts` | criar |
| `src/app/api/public/categories/route.ts` | criar |
| `src/app/api/public/categories/README.md` | criar |
| `src/app/api/public/README.md` | alterar (subpastas) |
| `src/app/(portal)/services/page.tsx` | alterar (tira o aviso) |
| `src/lib/demo/routes.ts` | alterar (tira as duas entradas) |
| `src/lib/demo/catalog.ts` | apagar |
| `src/lib/demo/appointments.ts` | alterar (comentário) |
| `src/lib/demo/README.md` | não precisou (não cita o módulo) |
| `src/server/repositories/README.md` | não precisou (não lista arquivos) |
| `src/components/portal/catalog/service-catalog.tsx` | alterar (ajuste da etapa 02, abaixo) |
| `tests/validation/catalog.test.ts` | alterar |
| `docs/catalogo/rotas.md` | alterar (L1, L2) |
| `docs/catalogo/paginas-publicas.md` | alterar (tira a menção ao aviso de demonstração) |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/padroes/testes.md` | alterar, se o roteiro das rotas públicas pedir |
| `memoria/tarefas/48-catalogo-publico/` | plano, notas e relatório |

Tamanho previsto: abaixo de 400 linhas de `src/` além dos dados de demonstração apagados, em um único PR.

## Ajuste pedido na etapa 02

O Lighthouse no computador deu CLS 0,176 em `/services`: os 3 cartões reservados, trocados por 11, empurram o rodapé. `LOADING_PLACES` de `service-catalog.tsx`, fora da lista do plano, passa de 3 para `CATALOG_PAGE_SIZE` (12): CLS 0,000 e desempenho 100 nos dois temas. O plano voltou a `aguardando_aprovacao` (`02_construir.md`), sem mudar `aprovado_por` nem `aprovado_em`; o Yvan confirmou o ajuste na conversa em 27/10/2026.

## Testes previstos

Escritos antes do código (TDD), em `tests/validation/catalog.test.ts`:

- `publicServiceQuerySchema accepts no filter and applies page 1 and size 12` — padrão do catálogo (api.md).
- `publicServiceQuerySchema accepts a categoryId UUID, including the md5 ones of the seed` — api.md (UUID sem exigir versão).
- `publicServiceQuerySchema rejects a categoryId that is not a UUID` — 400 em `categoryId`.
- `publicServiceQuerySchema caps pageSize at 50` — RNF008.
- `publicServiceQuerySchema drops unknown fields` — RS013.

As consultas ao banco não têm teste unitário (decisão 0052): vão pelo roteiro local acima, com o `seed-demo.sql`.

## Lacunas na documentação

### L1. `categoryId` de categoria inexistente, inativa ou sem serviço ativo

**Problema.** `rotas.md` diz "Entrada: `categoryId` (opcional)" e que os erros comuns são 400, 401, 403 e 404, mas não diz o que acontece quando o `categoryId` é um UUID válido que não existe, é de categoria inativa ou não tem serviço ativo. O filtro pode ficar velho: a categoria escolhida na tela pode ser desativada pelo painel antes da consulta.

**Opções:**

- [x] **1. 200 com a lista vazia (recomendada).** A rota é pública e só consulta; a tela mostra "Não há serviços disponíveis no momento.", e o visitante troca o filtro. Não revela se a categoria existe nem se está inativa.
- [ ] **2. 404 `NOT_FOUND`.** Distingue "categoria inexistente" de "sem serviços", mas a tela precisa tratar o 404 como vazio, e revela a existência de categoria inativa (RN031).

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `GET /api/public/services`: "Entrada: `categoryId` (opcional)" passa a "Entrada: `categoryId` (opcional, UUID; outro valor: 400 em `categoryId`). Categoria inexistente, inativa ou sem serviço ativo: 200 com a lista vazia."

### L2. Ordem e campos da lista de serviços públicos

**Problema.** `rotas.md` não define a ordem de `GET /api/public/services` (a das categorias é alfabética) e os dois campos que a tela mostra, `description` e `imageUrl`, dependem do tipo de serviço: `description` é obrigatória em principal e complementar (RN006, UC13), e `imageUrl` é `null` sem imagem.

**Opções:**

- [x] **1. Por nome, sem diferenciar maiúsculas, como no painel (recomendada).** Mesma ordem de `GET /api/admin/services` e da demonstração; a paginação é estável com o desempate pelo `id`.
- [ ] **2. Por categoria e depois por nome.** Agrupa visualmente, mas o filtro "Todas" já mostra a categoria em cada cartão e a ordem muda a da #57.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `GET /api/public/services`, Resposta: "**200** lista paginada" passa a "**200** lista paginada, em ordem alfabética do nome (o `id` desempata),".

## Decisões técnicas

- Seguidas: 0055 (a rota construída sai da lista de demonstração, com o aviso da tela), 0052 (consulta ao banco conferida no banco local), 0044 (imagem no Storage, endereço público pelo `image_path`) e o padrão de rota de `api.md` e `backend.md` (rota fina, serviço, repositório).

Nenhuma nova.

## Riscos e dúvidas

- **LCP de `/services`.** A lista é lida pelo navegador depois da hidratação (a #57 fez assim e a issue manda ligar a rota, não mudar a forma). No celular simulado local o LCP passa de 2,5 s; vai ao relatório com a medição do DevTools e o número da pré-visualização. Trazer a primeira página renderizada no servidor seria outra tarefa, que mudaria a #57.
- **Junção interna do PostgREST.** `categories!inner` e `services!inner` com filtros na tabela embutida precisam ser conferidos no banco local (contagens do seed: 11 serviços, 3 categorias); se o supabase-js não tipar bem o filtro, a consulta usa o `returns<...>()` já usado no repositório do painel.
- **Imagem do cartão.** O `ServiceCard` da #57 já usa `next/image` com `sizes`; o `images.remotePatterns` cobre `*.supabase.co`, mas o Supabase local é `127.0.0.1`: se a imagem local não passar pelo `/_next/image`, a conferência do critério da imagem usa o ajuste temporário de `next.config.ts`, sem commit (como na #47).
- **Descrição nula.** O tipo `PublicService.description` é `string`; se o banco tiver principal ou complementar com descrição nula (dado antigo), a rota devolve texto vazio em vez de falhar. A conferência é no seed; o `check` do banco é o que garante a descrição.
- **Home.** Sem código novo: se a verificação achar defeito em `/`, ele entra na lista de arquivos e nas notas e o Yvan confirma antes do PR.

## Fora do escopo

- Agendamento a partir do catálogo (fase 3) e os serviços adicionais no catálogo.
- Renderizar o catálogo no servidor ou guardar em cache a resposta (api.md manda `no-store` em toda resposta).
- A análise do dashboard por IA (#66) e o ajuste de acessibilidade do site inteiro, que o Yvan faz no fim.
