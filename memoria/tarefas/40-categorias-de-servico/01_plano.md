---
issue: 40
titulo: "Categorias de serviço no painel"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC15, RF057, RF067, RF068, RN031, RN035, RS008, RS010, RS013, RS014, RNF003, RNF004, RNF005, RNF008, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 24/10/2026
---

# Plano: Categorias de serviço no painel

## Objetivo

Entregar o UC15 de ponta a ponta: o funcionário com a permissão `services` cria, edita, desativa e reativa as categorias na aba "Categorias" de `/admin/services` (RF057, RF067, RF068, RN031), pelas rotas:

- `GET /api/admin/categories`, com `includeInactive`, `page` e `pageSize`, em ordem alfabética e 20 por página (RNF008);
- `POST /api/admin/categories`, com `name*` e `description*`, que responde 201 com a categoria ativa;
- `PATCH /api/admin/categories/:id`, com `name`, `description`, `isActive` e o `updatedAt` (RNF011, decisão 0009), que responde 200;
- as três com `requirePermission("services")` (RS008, RS010), e o 409 `NAME_IN_USE` para o nome repetido (RN035).

A aba "Categorias" passa a usar as rotas: sai da lista de demonstração (`src/lib/demo/routes.ts`, decisão 0055), ganha o esquema de validação no formulário e perde o aviso de demonstração; a aba "Serviços" continua com os dados de demonstração e com o aviso, que passa a ficar no topo dela (#44). A especificação OpenAPI ganha as três operações.

Não há migration nem dependência nova: `categories` já existe na migration inicial, com `uq_categories_name` (`lower(name)`), o gatilho de `updated_at` e a exclusão física bloqueada por `services.category_id`. O `seed.sql` não cria categorias (só o `seed-demo.sql`), então o banco de produção começa sem nenhuma.

## Base da construção

- Ramificação `feat/40-categories`, criada da `origin/main` (18192be, com a #65), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`; o worktree está em 18192be.
- Contratos usados sem mudança:
  - `handleRoute` (`src/server/http/handler.ts`), `respondOk`, `respondCreated` e `respondPage` (`respond.ts`), `requirePermission` (`guards.ts`), `getServiceClient`, `AppError` e o código `NAME_IN_USE` e `VERSION_CONFLICT` do catálogo de erros;
  - em `src/shared/validation/formats.ts`, já testados: `entityNameSchema` (2 a 60 caracteres, inicial maiúscula), `plainTextSchema` com `DESCRIPTION_MAX_LENGTH` (500) e `searchTermSchema`; em `params.ts`: `idSchema`, `paginationSchema` e `updatedAtSchema`;
  - `ADMIN_LIST_PAGE_SIZE` (20) e `MAX_PAGE_SIZE` (50), `AdminCategory` e `Page` (`src/shared/api/`);
  - no cliente: `apiRequest`, `ApiError`, `usePaginatedList`, `useFormFailure`, `ConfirmDialog`, `FormAlert`, `FormField`, `SubmitButton`, `InactiveSwitch` e `PaginatedList`;
  - o molde de rota, serviço e repositório da #37 (`settings/company`, `services/settings.ts`, `repositories/business-settings.ts`), com a atualização condicionada ao `updated_at` numa única instrução.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/categories` | `includeInactive` (`true` ou `false`, padrão `false`), `page`, `pageSize` | 200 `Page<AdminCategory>`: `id`, `name`, `description`, `isActive` e `updatedAt`, por nome, 20 por página |
| `POST /api/admin/categories` | `name*`, `description*` | 201 `AdminCategory`, ativa; 409 `NAME_IN_USE` |
| `PATCH /api/admin/categories/:id` | `updatedAt*` e ao menos um entre `name`, `description` e `isActive` (L1) | 200 `AdminCategory` com o `updatedAt` novo; 404 `NOT_FOUND`; 409 `NAME_IN_USE` ou `VERSION_CONFLICT` |

- Erros comuns de `api.md`: 400 `VALIDATION_ERROR` (com a mensagem de cada campo em `fields`), 401, 403 `FORBIDDEN` (cliente, funcionário sem a permissão `services` ou origem recusada), `ACCOUNT_INACTIVE` e `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500. Id que não é UUID responde o mesmo 404 do registro inexistente.
- Campos não previstos são descartados (RS013); `id`, `createdAt` e `isActive` na criação nunca são aceitos: a categoria nasce ativa.
- O `PATCH` só altera o que veio. Desativar e reativar são o `PATCH` com `isActive` (a categoria não tem exclusão, RN030). Os serviços da categoria inativa continuam no painel (RN031); o efeito no catálogo público é da #48.

### Esquemas (`src/shared/validation/`), TDD

- `params.ts`, novo `booleanQuerySchema`: o texto `true` ou `false` da consulta vira booleano; outro valor responde "Informe true ou false." (L3). Vale para o `includeInactive` de todas as listagens do painel (#44, #39, #43).
- `catalog.ts`, novo:

| Esquema | Campos |
|---|---|
| `categoryInputSchema` (corpo do `POST` e valores do formulário) | `name`: `entityNameSchema`; `description`: `plainTextSchema(DESCRIPTION_MAX_LENGTH)` |
| `categoryUpdateSchema` (corpo do `PATCH`) | `name` e `description` opcionais, com os mesmos formatos; `isActive`: booleano; `updatedAt`: `updatedAtSchema`; recusa o corpo sem nenhum dos três primeiros (L1) |
| `categoryListQuerySchema` | `paginationSchema(ADMIN_LIST_PAGE_SIZE)` e `includeInactive`: `booleanQuerySchema`, padrão `false` |

  O formulário usa o `categoryInputSchema` pelo `zodResolver`, como o da #37 (decisão 0008), no lugar da conferência manual de "Preencha este campo."; a mensagem é a mesma.

### Backend (decisões 0003, 0005, 0006 e 0042)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/categories/route.ts` | `GET`: guard, `categoryListQuerySchema.parse` da consulta, `listCategories`, `respondPage`. `POST`: guard, `categoryInputSchema.parse(body)`, `createCategory`, `respondCreated` |
| Rota | `app/api/admin/categories/[id]/route.ts` | `PATCH`: guard, `idSchema` (inválido → `NOT_FOUND`), `categoryUpdateSchema.parse(body)`, `updateCategory`, `respondOk` |
| Serviço | `server/services/catalog.ts` | módulo `catalog` de `backend.md`; agora `listCategories`, `createCategory` e `updateCategory`. No `PATCH`, sem linha devolvida, lê a categoria: não existe → `NOT_FOUND`; existe → `VERSION_CONFLICT` |
| Repositório | `server/repositories/categories.ts` | `listCategories(includeInactive, page, pageSize)` com uma consulta e `count: "exact"`, ordenada por `name`; `findCategory`; `insertCategory`; `updateCategory(id, valores, updatedAt)`: um único `update ... eq("id").eq("updated_at").select()`, que devolve a linha nova ou `null`. A violação `23505` de `uq_categories_name` vira `AppError("NAME_IN_USE")`; o detalhe técnico fica só no registro |

- O `updated_at` novo vem do gatilho `trg_categories_updated_at`, e a `updatedAt` volta como o banco a escreveu.
- Sem linha de registro própria para a categoria: `backend.md` não a lista entre os eventos de negócio, e o tratamento único já grava a requisição com o usuário. O conflito de versão é `warn`.

### Tela: aba "Categorias" de `/admin/services`

Conteúdo, textos e estados já definidos em `docs/catalogo/servicos-do-painel.md` (#63); o que muda:

- `category-form-dialog.tsx`: `zodResolver(categoryInputSchema)`; na falha, `useFormFailure` põe as mensagens de `fields` junto aos campos e o `detail` no `FormAlert` do topo, com o foco; os dados digitados continuam (UC15 FE01 e FE02). No 409 `VERSION_CONFLICT`, o aviso fica no topo e o formulário passa a mostrar os dados atuais da categoria, trocando o que foi digitado (`componentes.md`, Formulários).
- `category-card.tsx`: o `PATCH` de `isActive` leva o `updatedAt` do cartão; no 409 `VERSION_CONFLICT`, a lista é lida de novo e a confirmação continua aberta com o aviso, já refletindo a situação atual (L2).
- `catalog-tabs.tsx` e `page.tsx`: o `DemoNotice` sai da página e passa ao topo do painel da aba "Serviços" (`componentes.md`: "no topo do painel da aba"); a aba "Categorias" fica sem ele.
- `routes.ts` e `admin-catalog.ts`: saem as entradas `GET`, `POST` e `PATCH` de categorias e `answerAdminCategories`; a lista fixa `CATEGORIES` fica, porque os serviços de demonstração a usam.
- O seletor "Categoria" do formulário de serviço (`service-data-step.tsx`) já lê `GET /api/admin/categories` e passa a mostrar as categorias reais, só as ativas; sem nenhuma, o formulário diz "Cadastre uma categoria antes de criar este serviço.". Nada muda no arquivo. A aba "Serviços" segue com as categorias de demonstração nos cartões (#44).

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`):

- a tag `catalog` ("Serviços e categorias do painel, com a permissão `services`");
- os caminhos `/api/admin/categories` (`listCategories` e `createCategory`) e `/api/admin/categories/{id}` (`updateCategory`), com `sessionCookie`;
- os esquemas `AdminCategory`, `CategoryInput`, `CategoryUpdateInput` e `CategoryPage`;
- as respostas reutilizáveis novas `NotFound` e `NameInUse`, ao lado de `Unauthenticated`, `PanelForbidden` e `VersionConflict`, que a #37 já criou.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado nome e descrição válidos, quando confirmo, então a categoria aparece ativa na listagem (UC15) | Testes de `categoryInputSchema` (normalização e formatos). Local, pelo roteiro: `POST` responde 201 com `isActive: true` e o `GET` seguinte a traz. Na tela: "Nova categoria", "Lavagem" e uma descrição, "Salvar": a janela fecha, o cartão aparece com a etiqueta "Ativa" |
| Dado um nome já usado, quando confirmo, então recebo a mensagem de `NAME_IN_USE`, com os dados mantidos (UC15 FE02, RN035) | Local, pelo roteiro: o `POST` de "lavagem" (caixa diferente) responde 409 `NAME_IN_USE`, o `PATCH` de outra categoria para esse nome também, e o `PATCH` da própria categoria com o mesmo nome em outra caixa responde 200. Na tela: a janela fica aberta com o aviso "Já existe um cadastro com este nome." no topo, com o foco, e os campos como digitados |
| Dado a descrição vazia, quando confirmo, então a mensagem aparece junto ao campo, com os dados mantidos (UC15 FE01) | Testes de `categoryInputSchema` (vazio, só espaços e ausente → "Preencha este campo."). Local: o `POST` sem descrição responde 400 com `fields.description`. Na tela: nome e descrição vazios, "Salvar": as duas mensagens junto aos campos já no primeiro envio, sem nenhuma requisição |
| Dado uma categoria, quando altero o nome e confirmo, então a listagem mostra o nome novo (UC15 FA01) | Testes de `categoryUpdateSchema`. Local: o `PATCH` com o nome novo e o `updatedAt` lido responde 200 com o `updatedAt` novo, e o `GET` mostra o nome. Na tela: "Editar", novo nome, "Salvar": o cartão mostra o nome novo, e o foco volta a "Editar". O conflito: com duas páginas abertas, a segunda a gravar recebe o aviso de `VERSION_CONFLICT` com os dados atuais no formulário; pelo roteiro, o `PATCH` com o `updatedAt` antigo responde 409, nada muda, e o registro do `next start` tem a linha `warn` |
| Dado uma categoria ativa, quando a desativo e confirmo, então ela só aparece com a opção de exibir inativas e pode ser reativada (UC15 FA02, FA03, RN031) | Testes de `booleanQuerySchema` e de `categoryListQuerySchema`. Local: o `PATCH` de `isActive: false` responde 200; o `GET` padrão não a traz, o `GET?includeInactive=true` traz com `isActive: false`; o `PATCH` de `isActive: true` a devolve à lista padrão. Na tela: "Desativar", "Desativar categoria": o cartão some; "Exibir inativos" o mostra com "Inativa" e "Reativar"; "Reativar categoria" o devolve com "Ativa". Os serviços da categoria inativa seguem na aba "Serviços" (RN031) |
| Dado um funcionário sem a permissão `services`, quando chama as rotas, então recebe 403 (RS008) | Local, pelo roteiro: o funcionário de um cargo sem `services` e o cliente de teste recebem 403 `FORBIDDEN` nas três rotas (RS010); sem sessão, 401 `UNAUTHENTICATED`; `POST` e `PATCH` sem `Origin`, 403; `Content-Type` diferente de JSON, 415; nada é gravado. Na tela, o funcionário sem a permissão que abre `/admin/services` volta com o aviso de acesso negado (`proxy.ts`) |

Outros casos do UC15 e da API, também pelo roteiro: `PATCH` sem nenhum dos três campos → 400 (L1); `PATCH` de id inexistente e de id que não é UUID → 404; nome de 1 e de 61 caracteres e descrição de 501 → 400 com a mensagem do campo; `includeInactive=abc` → 400; `pageSize=100` → 50; campos não previstos descartados (`isActive: false` no `POST` não cria a categoria inativa); o `updatedAt` ausente → 400 "Atualize a página e tente novamente.".

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, na aba "Categorias" e antes de marcar o último PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto dos cartões), vazio (banco recém-criado: "Nenhuma categoria cadastrada"), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, nome repetido, campos vazios e conflito 409, na janela e na confirmação (L2);
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar;
- teclado completo: a aba, "Nova categoria", a janela (foco no primeiro campo, ordem dos campos, Enter envia, Esc fecha, foco de volta ao gatilho), a confirmação (foco em "Voltar", foco de volta ao botão do cartão) e o interruptor "Exibir inativos";
- Lighthouse de acessibilidade em `/admin/services`, na aba "Categorias" (a navegação e os estados com a janela e a confirmação abertas, em `snapshot`), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` com o `seed.sql` (sem categorias, o que dá o estado vazio) e, para a paginação, categorias criadas pelo próprio roteiro. Nunca `--linked` nem `--db-url` (decisão 0043).
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; um funcionário de cargo com `services`, um de cargo sem ela e um cliente, criados pelo `auth.admin.createUser` e pela chave de serviço do banco local; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las no repositório; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos de `61-scripts-de-verificacao/` e dos da #65 (`helpers.mjs`, `verify-category.mjs`, `verify-keyboard.mjs`, `verify-states.mjs`, `lh-*`), com os caminhos deste worktree: `verify-categories-api.mjs` (rotas) e os de tela, num Chrome sem interface controlado pelo `puppeteer-core` que vem com o Lighthouse 13.5.0, porque o painel do navegador do app oculto trava o foco do Base UI. Alterações temporárias para os estados (requisição retida, falha) ficam sem commit e são desfeitas por `git checkout -- src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Pré-visualização e produção**, passo do Yvan, listado no relatório: o banco de produção não tem categorias; criar uma na pré-visualização grava no banco real (decisão 0030). **Ponto para a aprovação:** criar as categorias reais da empresa ou gravar e desativar as de teste.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/categories/route.ts` | criar: `GET` e `POST` |
| `src/app/api/admin/categories/[id]/route.ts` | criar: `PATCH` |
| `src/server/services/catalog.ts` | criar |
| `src/server/repositories/categories.ts` | criar |
| `src/shared/validation/catalog.ts` | criar |
| `src/shared/validation/params.ts` | alterar: `booleanQuerySchema` |
| `src/shared/validation/README.md` | alterar: o esquema de `catalog.ts` e o booleano da consulta |
| `src/components/admin/catalog/category-form-dialog.tsx` | alterar: esquema, conflito de versão |
| `src/components/admin/catalog/category-card.tsx` | alterar: conflito de versão na confirmação |
| `src/components/admin/catalog/catalog-tabs.tsx` | alterar: o aviso de demonstração no painel "Serviços" |
| `src/components/admin/catalog/category-list.tsx` | alterar: passa ao cartão se os inativos aparecem (foco após desativar; fora da lista aprovada, ver `notas.md`) |
| `src/app/(admin)/admin/services/page.tsx` | alterar: sai o `DemoNotice` |
| `src/lib/demo/routes.ts`, `src/lib/demo/admin-catalog.ts` | alterar: saem as rotas e a resposta de categorias |
| `tests/validation/catalog.test.ts` | criar |
| `tests/validation/params.test.ts` | alterar |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/catalogo/rotas.md` | alterar (L1) |
| `docs/catalogo/servicos-do-painel.md` | alterar: o aviso só na aba "Serviços" e a confirmação com conflito (L2) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: a linha do valor booleano da consulta (L3) |
| `docs/padroes/testes.md` | alterar: a tabela "Validação e formatos" cita o esquema de categoria e o booleano da consulta |
| `memoria/tarefas/40-categorias-de-servico/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/app/api/admin/categories/` (e de `[id]/`), `src/server/services/`, `src/server/repositories/`, `src/components/admin/catalog/`, `src/lib/demo/` e `tests/validation/` já cobrem os arquivos e não mudam. O `README.md` de `categories/` lista `GET, POST` e o de `[id]/` já trata o `PATCH`.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em 18192be.
- **#44** (serviços): reutiliza `server/services/catalog.ts`, `booleanQuerySchema` e o padrão de `NAME_IN_USE` e `VERSION_CONFLICT`; tira da lista de demonstração as rotas de serviços e o `CATEGORIES` de demonstração, e deve passar a ler as categorias reais nos cartões.
- **#48** (catálogo público): lê `categories` pelo repositório; o efeito da categoria inativa no catálogo e no agendamento (RN031) é dela.
- Ao fim, deixo um comentário na #44 e na #48 com o que esta tarefa deixou para elas.

## Testes previstos

Valores esperados tirados de RN035, de `mensagens-de-validacao.md` e da opção recomendada de L1. Escritos antes do código e conferidos em vermelho, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/params.test.ts`, `booleanQuerySchema`:

- accepts the texts true and false: "true" → `true`, "false" → `false`
- rejects any other text: "", "1", "yes" e "True" → "Informe true ou false."

`tests/validation/catalog.test.ts`, `categoryInputSchema`:

- normalizes the name and the description: "  lavagem   simples " → "Lavagem simples"; a descrição com tabulação e quebra de linha vira uma linha só, sem espaços repetidos (RN035)
- requires the name and the description: "", "   " e ausente → "Preencha este campo."
- rejects a name of one or of 61 characters → "Use de 2 a 60 caracteres."; aceita 2 e 60
- rejects a description of 501 characters → "Use até 500 caracteres."; aceita 500
- discards the fields that are not expected: `isActive`, `id` e `updatedAt` no corpo não saem no resultado (RS013)

`tests/validation/catalog.test.ts`, `categoryUpdateSchema`:

- accepts one field with the version: só `isActive`, só `name` ou só `description`, cada um com o `updatedAt`
- applies the formats of the category to the fields sent: "  polimento  " → "Polimento"; nome vazio enviado → "Preencha este campo."
- requires the version: `updatedAt` ausente, "" ou "abc" → "Atualize a página e tente novamente."
- rejects a body with no field to change: só o `updatedAt` → recusado (L1)
- discards the fields that are not expected

`tests/validation/catalog.test.ts`, `categoryListQuerySchema`:

- uses the first page of 20 and no inactive ones when the query is empty
- reads the inactive flag and the page: `includeInactive=true&page=2&pageSize=10`
- limits the page size to 50 and discards unknown parameters
- rejects an invalid flag or page: `includeInactive=abc`, `page=0` → as mensagens de `mensagens-de-validacao.md`

Sem teste automático para rota, serviço, repositório e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. `PATCH` de categoria sem nenhum campo para alterar

**Problema.** `rotas.md` lista `name, description, isActive` no `PATCH` e `api.md` exige o `updatedAt`, mas nenhum diz o que acontece com o corpo que traz só o `updatedAt`. A tela nunca o envia; a rota direta pode. O erro de um corpo inteiro, sem campo, sai como 400 sem `fields`, com "Confira os campos destacados." e nada destacado.

**Opções:**

- [x] **1. Recusar com 400 `VALIDATION_ERROR` (recomendada).** O esquema exige ao menos um dos três campos. Nada é gravado e o `updated_at` não muda sem motivo (RNF011).
- [ ] **2. Aceitar e devolver a categoria sem alteração.** Uma segunda ramificação no serviço e um `GET` escondido num `PATCH`; esconde o erro de quem chama.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `PATCH /api/admin/categories/:id`: "Entrada: `name, description, isActive`" passa a "Entrada: `name`, `description` e `isActive`, ao menos um deles". Resposta: "**200** categoria atualizada; 404; 409 `NAME_IN_USE`" passa a "**200** categoria atualizada; 400 sem nenhum dos campos; 404 id inexistente; 409 `NAME_IN_USE`".

### L2. Conflito de versão na confirmação de desativar ou reativar

**Problema.** `componentes.md` (Formulários) define o 409 `VERSION_CONFLICT` só para o formulário que recarrega o registro, e `servicos-do-painel.md` define o das ações do serviço só como "a falha aparece". Para a confirmação de desativar e reativar a categoria (UC15 FA02), com o `updatedAt` do cartão antigo, nada diz se o cartão é lido de novo.

**Opções:**

- [x] **1. Aviso dentro da confirmação e lista lida de novo (recomendada).** A confirmação continua aberta com o aviso "Estes dados foram alterados por outra pessoa. Confira os dados atualizados e tente novamente.", e o cartão, lido de novo, mostra a situação atual: o título e o texto da confirmação passam a falar da ação que cabe agora. Quem confirma de novo age sobre o que viu.
- [ ] **2. Só o aviso, sem reler.** A confirmação segue com o `updatedAt` antigo e falha a cada tentativa, até a pessoa fechar e recarregar a página.

**Texto proposto (opção recomendada):**

- `docs/catalogo/servicos-do-painel.md`, seção "Estados", depois de "A falha de uma gravação aparece no topo da janela ou da confirmação, com a mensagem da API.": "No 409 `VERSION_CONFLICT` de uma categoria, a janela de edição mostra o aviso no topo e passa a ter os dados atuais, e a confirmação de desativar ou reativar mantém o aviso e passa a refletir a situação atual da categoria, já lida de novo."
- `docs/catalogo/servicos-do-painel.md`, parágrafo logo abaixo do título da seção "Página": "Enquanto as rotas `/api/admin/services` e `/api/admin/categories` usarem os dados de demonstração..." passa a "Enquanto a rota `/api/admin/services` usar os dados de demonstração de `src/lib/demo/admin-catalog.ts` (decisão 0055), o aviso de demonstração fica no topo da aba "Serviços"."

### L3. Mensagem do filtro `includeInactive` inválido

**Problema.** `api.md` diz que filtros só aceitam os valores previstos, e `mensagens-de-validacao.md` não tem texto para um valor booleano de consulta fora de `true` e `false`. Só quem monta a URL à mão chega a vê-lo.

**Opções:**

- [x] **1. Nova linha "Valor verdadeiro ou falso da consulta": "Informe true ou false." (recomendada).** Vale para todo filtro booleano das listagens (#44, #39, #43).
- [ ] **2. Ignorar o valor inválido e usar o padrão.** Esconde o erro de quem chama e contraria "só aceitam os valores previstos".

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, depois da linha de `page` e `pageSize`: nova linha "| Filtro de verdadeiro ou falso (`includeInactive`) | Informe true ou false. |".

## Decisões técnicas

- Seguidas: 0002 (API em rotas do Next.js), 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js` e migration SQL), 0008 (validação compartilhada), 0009 (concorrência otimista), 0010 (permissões por página), 0022 (exclusão lógica: a categoria só é desativada), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `componentes.md` e `frontend.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Ordem alfabética no banco.** O `GET` ordena por `name` no PostgreSQL, e a ordem de nomes com acento e caixa depende da colocação do banco (a de demonstração usa `localeCompare` em pt-BR). É conferida no banco local com "Água", "Lavagem" e "Álcool"; se destoar da ordem esperada, o plano volta a você com a opção de ordenar por `lower(name)` num trecho do repositório.
- **Janela de categoria e `mode: "onTouched"`.** Na #64 e na #65 o primeiro envio indicou só o primeiro campo vazio com esse modo. O formulário passa a usar o `zodResolver` com o mesmo modo da #37; a conferência do primeiro envio com os dois campos vazios é um passo da verificação, e o ajuste do `mode` entra no mesmo arquivo, já na lista.
- **Mensagem de `NAME_IN_USE`.** O catálogo diz "Já existe um cadastro com este nome.", que não pede outro nome como o UC15 FE02; a tela mostra a mensagem do catálogo no topo da janela, como a da #65 anotou para os cargos. Mudar o texto é decisão do catálogo, não desta tarefa.
- **Telas inconsistentes até a #44.** A aba "Serviços" segue com as categorias de demonstração nos cartões; as categorias criadas aqui aparecem no seletor do formulário de serviço, mas o envio dele responde `NOT_IMPLEMENTED`. O aviso de demonstração da aba deixa isso claro.
- **Produção sem categorias.** O `seed.sql` não cria categorias; até alguém criar, o formulário de serviço (quando ligado) pede o cadastro antes. Registrado no relatório.
- **Corrida entre dois nomes iguais.** A unicidade é garantida pelo índice do banco, não por uma conferência antes da gravação: as duas gravações simultâneas resultam em uma 201 e uma 409.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 420 linhas (rotas e serviço ~190, repositório ~110, esquemas ~60, tela ~60), mais ~220 de testes e as especificações.

### P1. Divisão em PRs

- [x] **1. Dois PRs encadeados (recomendada).**
  - **PR 1 – API:** testes e esquemas, repositório, serviço, as duas rotas, `openapi.yaml`, `rotas.md` (L1), `mensagens-de-validacao.md` e `testes.md` (~290 linhas em `src/`). Verificado pelo roteiro de rotas; a tela segue em demonstração, porque o `apiRequest` ainda acha as rotas na lista.
  - **PR 2 – tela:** a aba ligada às rotas, a lista de demonstração, o aviso e `servicos-do-painel.md` (L2) (~130 linhas), com `memoria/tarefas/40-…` e "Closes #40". Verificação de tela completa antes de marcar como pronto.
- [ ] **2. Um PR só.** Cerca de 420 linhas de `src/` e as telas, no limite do que se revisa de uma vez.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse 13.5.0.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da gravação real.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível do ajuste do `mode` de `category-form-dialog.tsx` (já listado) ou de um componente que a conferência do teclado exija.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Serviços (`/api/admin/services`, #44) e a imagem do serviço (#47).
- O efeito da categoria inativa no catálogo público e no agendamento (RN031), que é da #48; aqui só a categoria muda de situação, e os serviços dela seguem no painel.
- Exclusão de categoria: não existe (RN030, `dados.md`).
- Busca de categorias e ordenação escolhida pela pessoa: sem requisito em `docs/catalogo/`.
- Migration, dependência nova e registro de decisão.
- Texto próprio para `NAME_IN_USE` no painel (ver riscos).
