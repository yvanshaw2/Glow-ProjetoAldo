---
issue: 44
titulo: "Serviços no painel: principal, complementar e adicional, com preços e vínculos"
areas: [banco, backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC13, UC14, RF058, RF059, RF060, RF061, RF062, RF063, RF064, RF065, RF066, RN006, RN007, RN008, RN009, RN030, RN031, RN035, RS008, RS010, RS013, RNF002, RNF003, RNF005, RNF008, RNF010, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 18:12 - 25/10/2026
---

# Plano: Serviços no painel: principal, complementar e adicional, com preços e vínculos

## Objetivo

Entregar o UC13 e o UC14 de ponta a ponta: o funcionário com a permissão `services` lista, cadastra, edita, desativa, reativa e exclui serviços na aba "Serviços" de `/admin/services` (RF058 a RF066), pelas rotas de `docs/catalogo/rotas.md`, todas com `requirePermission("services")` (RS008, RS010):

- `GET /api/admin/services`, com `type`, `includeInactive` e `search`: 20 por página, em ordem alfabética, sem o serviço excluído (RNF008, RN030); o serviço de categoria inativa consta (RN031);
- `GET /api/admin/services/:id`: o serviço com `imageUrl`, `prices` (um valor por porte) e os vínculos (`additionalIds` ou `mainServiceIds`), ou 404;
- `POST /api/admin/services`: principal, complementar ou adicional, sempre ativo, gravado com os valores por porte e os vínculos numa só transação; 201; 400 com `fields`; 409 `NAME_IN_USE`;
- `PATCH /api/admin/services/:id`: edita, desativa ou reativa, condicionado ao `updatedAt` (RNF011, decisão 0009); 200; 404; 409 `VERSION_CONFLICT` ou `NAME_IN_USE`;
- `DELETE /api/admin/services/:id`: exclusão lógica (`deleted_at`); 204; 404. Agendamentos e seus itens ficam (RN030).

**A aba deixa de ser demonstração** (orientação do Yvan e decisão 0055): saem de `src/lib/demo/routes.ts` as cinco entradas de `/api/admin/services`; o arquivo `src/lib/demo/admin-catalog.ts` perde as respostas e os dados de serviço e, como nenhum outro módulo o usa, é apagado; sai o `DemoNotice` do topo da aba; o formulário passa a usar o esquema de validação no navegador (critério da issue). A demonstração vem do banco: o `supabase/seed-demo.sql` já tem os serviços, os valores por porte e os vínculos, então **não muda**; quem o carrega é o Yvan (passo dele, no relatório).

**O que depende dessas rotas na mesma tela.** O seletor de categoria já lê as categorias reais (#40); as listas de vínculo do formulário (adicionais do principal, principais do adicional) leem `GET /api/admin/services`, que passa a ser real. O que **continua** em demonstração é só a **imagem** (a rota `POST /api/admin/services/image` é da #47): o campo "Imagem (opcional)" do formulário segue com a prévia local e passa a mostrar o aviso de demonstração dentro dele (L1).

**Migration (a única desta tarefa):** `save_service`, função SQL que grava o serviço, os valores por porte e os vínculos de adicionais numa transação (RNF010, `dados.md`, "Gravações em várias tabelas"; a issue a pede em migration própria). Segue `20261025145632_save_role_function.sql`: `set search_path = ''`, `revoke` de `public`, `anon` e `authenticated`, `grant` ao `service_role` (decisão 0042). **O Yvan a aplica** (`npx supabase db push`); eu só a escrevo e a verifico no banco local. Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/44-services`, criada da `origin/main` (69b5f48, com a #42: PR #114), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/infallible-fermi-020cb0`, pasta `36-regras-do-agendamento-05611e`, herdada e não renomeável) está em 69b5f48, árvore limpa.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondNoContent`, `respondPage`, `requirePermission`, `getServiceClient`, `AppError` (`NOT_FOUND`, `VERSION_CONFLICT`, `NAME_IN_USE`, `VALIDATION_ERROR` com `fields`); em `formats.ts`: `entityNameSchema`, `plainTextSchema(DESCRIPTION_MAX_LENGTH)`, `durationMinutesSchema`, `moneySchema`, `searchTermSchema`; em `params.ts`: `idSchema`, `paginationSchema`, `booleanQuerySchema`, `updatedAtSchema`; constantes `SERVICE_TYPES`, `PRICING_MODES`, `VEHICLE_SIZES`; tipos `AdminService` e `AdminServiceSummary` (`src/shared/api/catalog.ts`, não mudam); no cliente: `apiRequest`, `usePaginatedList`, `PaginatedList`, `useFormFailure`, `FormAlert`, `FormField`, `StepForm`, `ConfirmDialog`.
- Moldes: `repositories/roles.ts` e `services/roles.ts` (função SQL por `rpc`, `null` para versão velha, releitura do registro salvo), `repositories/categories.ts` e `services/catalog.ts` (`PATCH` condicionado ao `updated_at`, `NAME_IN_USE` pelo nome da restrição), `repositories/clients.ts` (`markClientDeleted`), `shared/validation/catalog.ts` (categorias) e `save_role` (migration).
- Já prontos da #63 e mantidos: `ServiceList`, `ServiceCard`, `ServiceActiveButton`, `ServiceTypeFilter`, `ServiceFormDialog`, `ServiceWizard`, `service-data-step`, `service-prices-step`, `service-links-step`, `service-image-field`, e o `ConfirmDialog` de exclusão.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/services` | `type` (`main`, `additional` ou `complementary`), `includeInactive` (`true`/`false`), `search` (até 100 caracteres), `page`, `pageSize` | 200 página de `AdminServiceSummary`, por nome |
| `GET /api/admin/services/:id` | nenhuma | 200 `AdminService`; 404 `NOT_FOUND` (inclusive id que não é UUID e serviço excluído) |
| `POST /api/admin/services` | por `type*`: ver esquemas | 201 `AdminService`; 400 `VALIDATION_ERROR` com `fields`; 409 `NAME_IN_USE` |
| `PATCH /api/admin/services/:id` | os campos do cadastro, `isActive` e `updatedAt*`; ao menos um além de `updatedAt` | 200 `AdminService`; 400; 404; 409 `VERSION_CONFLICT` ou `NAME_IN_USE` |
| `DELETE /api/admin/services/:id` | nenhuma | 204; 404 (inclusive já excluído) |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem `services` ou origem recusada), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500.
- Campos não previstos para o tipo (`id`, `isActive` no `POST`, `deletedAt`, `createdAt`, `imagePath`, `type` no `PATCH`, e os de outro tipo: `categoryId` no adicional, `additionalIds` no complementar…) são descartados (RS013). O tipo não muda depois do cadastro (`dados.md`).
- `startingPrice` é o menor dos quatro valores; `isCategoryActive` é `null` no adicional (RN031). `imageUrl` vem do `image_path` pelo endereço público do bucket `service-images` (sem chamada de rede), ou `null`.

### Esquemas (`src/shared/validation/catalog.ts`, que ganha os de serviço), TDD

| Esquema | Regras |
|---|---|
| `serviceInputSchema` (corpo do `POST`), por `type` | **principal e complementar:** `categoryId` (UUID), `name` (`entityNameSchema`), `description` (`plainTextSchema(500)`), `avgDurationMinutes` (`durationMinutesSchema`), `pricingMode`, e conforme ele: `fixed` → `fixedPrice` (`moneySchema`, os `prices` descartados); `by_size` → `prices` com os quatro portes `small`, `medium`, `large` e `extra_large`, cada um `moneySchema` (o `fixedPrice` descartado) (RN009). **Só o principal:** `additionalIds` (UUIDs sem repetição, padrão vazio). **Adicional:** `name`, `avgDurationMinutes`, `fixedPrice` e `mainServiceIds` (UUIDs sem repetição, padrão vazio); sem categoria, descrição, imagem nem `pricingMode`. Mensagens de `mensagens-de-validacao.md` |
| `serviceUpdateSchema` (corpo do `PATCH`) | todos os campos do cadastro opcionais, mais `isActive` e `updatedAt` obrigatório (`updatedAtSchema`); sem nenhum campo além de `updatedAt` → "Informe ao menos um campo para alterar." (a mensagem da #40); `type` descartado |
| `serviceListQuerySchema` | `paginationSchema(ADMIN_LIST_PAGE_SIZE)`, `type` opcional (enumeração de `SERVICE_TYPES`), `includeInactive` (`booleanQuerySchema`, padrão falso) e `search` opcional (`searchTermSchema`; vazio = sem filtro) |

O formulário **usa** o `serviceInputSchema` no navegador (resolvedor próprio do RHF, em `service-form-resolver.ts`): valida o corpo que `toRequestBody` monta e leva cada mensagem ao campo do formulário (`avgDurationMinutes` → `durationMinutes`; `additionalIds` e `mainServiceIds` → `linkedIds`; `prices.<porte>` e `fixedPrice` iguais). Assim há um só esquema para a rota e para a tela, e o `StepForm` continua validando por etapa pela lista `fields` de cada uma. Saem as `rules` de "campo preenchido" e `isPositivePrice` dos componentes.

### Regra pura do `PATCH` (`src/server/rules/services.ts`, novo), TDD

`mergeServiceUpdate(current, update)` devolve o corpo completo de cadastro que resulta de aplicar o `PATCH` ao serviço atual: o que veio troca o que havia; o tipo é o do serviço; trocar a precificação para `fixed` descarta os `prices` e exige o `fixedPrice` (e o contrário para `by_size`); o resto fica como estava. O serviço valida o resultado com o `serviceInputSchema`, de modo que o `PATCH` nunca grava o que o `POST` recusaria (L5). Sem relógio, banco nem rede.

### Backend (decisões 0003, 0005, 0006, 0009, 0010, 0022)

| Camada | Arquivo | Faz |
|---|---|---|
| Migration | `supabase/migrations/<timestamp>_save_service_function.sql` | `save_service` (abaixo) |
| Rota | `app/api/admin/services/route.ts` | `GET`: guard, `serviceListQuerySchema.parse`, `listServices`, `respondPage`. `POST`: guard, `serviceInputSchema.parse(body)`, `createService`, `respondCreated` |
| Rota | `app/api/admin/services/[id]/route.ts` | `GET`, `PATCH`, `DELETE`: guard, `idSchema` (inválido → `NOT_FOUND`), esquema, serviço, `respondOk` / `respondNoContent` |
| Serviço | `server/services/catalog.ts` | passa a ter `listServices`, `getService`, `createService`, `updateService`, `deleteService` |
| Repositório | `server/repositories/services.ts` | novo: `listServices(query)`, `findService(id)` (com valores e vínculos), `findServicesByIds(ids)` (tipo, exclusão), `saveService(id, values, updatedAt)` por `rpc("save_service")`, `markServiceDeleted(id)`; todas as leituras com `deleted_at is null` (RN030); `NAME_IN_USE` pela restrição `uq_services_name` |
| Repositório | `server/repositories/categories.ts` | já tem `findCategory` (usado para conferir a categoria, L2) |

- **`save_service(p_id, p_type, p_category_id, p_name, p_description, p_avg_duration_minutes, p_pricing_mode, p_fixed_price, p_is_active, p_prices jsonb, p_linked_ids uuid[], p_updated_at)`**, devolve o id: sem `p_id`, insere o serviço (tipo e `is_active` informados); com `p_id`, atualiza só se `updated_at = p_updated_at` (e `deleted_at is null`), senão devolve `null` sem escrever, como `save_role`. Em seguida substitui os valores por porte (`service_prices`: apaga e insere os quatro, ou nenhum no valor fixo) e os vínculos (`service_additionals`: do principal, as linhas em que ele é `main_service_id`; do adicional, as em que ele é `additional_service_id`; o complementar não tem). O `image_path` e o tipo nunca são tocados. A conferência dos quatro valores (`trg_service_prices_complete`, adiada ao fim da transação) e a do tipo dos vínculos (`trg_service_additionals_types`) são do banco, então qualquer erro desfaz tudo. O serviço sempre é atualizado, para o `updated_at` mudar também quando só valores ou vínculos mudam.
- **Cadastro** (`createService`): confere a categoria (L2) e os vínculos (L3), grava por `saveService(null, …)` e devolve o serviço relido (`findService`).
- **Edição** (`updateService`): lê o serviço (404 se não há ou foi excluído), `mergeServiceUpdate`, valida o resultado com o `serviceInputSchema` (erro → 400 com `fields`), confere categoria só se ela mudou (L2) e vínculos (L3), grava com o `updatedAt` recebido; `null` → `VERSION_CONFLICT`. Desativar e reativar passam pelo mesmo caminho (corpo só com `isActive` e `updatedAt`).
- **Exclusão** (`deleteService`): marca `deleted_at` (só se ainda nulo; sem linha → 404). O nome fica livre (índice parcial), os vínculos e os valores permanecem na tabela, e as leituras ignoram serviço excluído, inclusive nos vínculos que o outro lado devolve (L3). Sem tabela de agendamento tocada: `appointment_services` guarda a cópia e a chave estrangeira nunca é acionada pela exclusão lógica (RN030, decisão 0011).
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: aba "Serviços" de `/admin/services`

Conteúdo, textos e estados já definidos em `docs/catalogo/servicos-do-painel.md` (#63); o que muda:

- `catalog-tabs.tsx`: sai o `DemoNotice` e o comentário de demonstração da aba "Serviços".
- `service-wizard.tsx`: usa o resolvedor do esquema; `clearErrors()` antes do envio (a rota devolve erro em campo que a pessoa já corrigiu); `NAME_IN_USE` aparece no topo da janela com os dados mantidos e o foco; `VERSION_CONFLICT` relê o serviço e a janela recebe os dados atuais (já ligado a `onConflict`); sai o texto de demonstração do comentário.
- `service-data-step.tsx`, `service-prices-step.tsx`: saem as `rules` de demonstração (`REQUIRED_MESSAGE`, `isPositivePrice`, `DURATION_MESSAGE`…); a mensagem vem do esquema.
- `service-image-field.tsx`: ganha o `DemoNotice` dentro do campo, e o corpo enviado continua sem `imagePath` (L1).
- `service-form-values.ts`: `toRequestBody` mantém o formato atual; o `image` continua só na prévia.
- `service-card.tsx` e `service-active-button.tsx`: sem mudança de comportamento. **Foco depois de desativar ou excluir** (lição da #40 e da #42): quando o cartão sai da lista (desativar sem "Exibir inativos"; excluir), o foco vai ao controle da lista que o trouxe de volta: o interruptor "Exibir inativos" ao desativar (como o `CategoryCard`) e o campo de busca ao excluir (como o `DeleteClientButton`), com o `finalFocus` do `ConfirmDialog` valendo só quando a ação ocorreu (L6).
- `src/lib/demo/routes.ts`: saem as cinco entradas de `/api/admin/services`; o comentário passa a citar só as rotas ainda em demonstração. `src/lib/demo/admin-catalog.ts`: apagado (a #40 já tirou as categorias, e nenhum outro módulo o importa); o `README` de `src/lib/demo/` é conferido.
- `app/(admin)/admin/services/page.tsx`: sai o comentário de demonstração.

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/services` (`listServices`, `createService`) e `/api/admin/services/{id}` (`getService`, `updateService`, `deleteService`) na tag `catalog`, com `sessionCookie`; os esquemas `AdminServiceSummary`, `AdminService`, `ServicePage`, `ServiceInput` (`oneOf` principal/complementar e adicional), `ServiceUpdateInput` e `ServicePrices`; as respostas existentes `NotFound`, `NameInUse`, `VersionConflict`, `ValidationError`, `Unauthenticated`, `PanelForbidden`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`. A rota `/api/admin/services/image` fica para a #47.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado um serviço principal por porte, com os quatro valores e dois adicionais vinculados, quando confirmo, então ele aparece ativo na listagem, com os valores e os vínculos nos detalhes (UC13, RN006, RN009) | Testes de `serviceInputSchema` (principal por porte válido e normalizado; `additionalIds` sem repetição). Local, no banco com a migration: `POST` → 201 com `isActive` verdadeiro, `prices` com os quatro portes, `additionalIds` com os dois; `GET` da lista traz o serviço com `startingPrice` e `GET /:id` traz valores e vínculos; os dois adicionais passam a mostrar o principal em `mainServiceIds`. Na tela: "Novo serviço" → Principal → as três etapas → "Salvar serviço": a janela fecha e o cartão aparece com "A partir de" o menor valor; "Editar" mostra os valores e os adicionais marcados |
| Dado o tipo adicional, quando cadastro, então o formulário pede só nome, duração e valor fixo e oferece o vínculo a principais (UC13 FA01) | Testes de `serviceInputSchema` (adicional sem categoria, descrição, imagem nem `pricingMode`; os campos de principal descartados). Local: `POST` do adicional com `mainServiceIds` → 201 e o vínculo aparece no principal. Na tela: Adicional → uma só etapa "Dados do serviço" com "Nome", "Duração média (minutos)", "Valor fixo" e "Serviços principais vinculados" |
| Dado o tipo complementar, quando cadastro, então não há a etapa de adicionais (UC13 FA02, RN006) | Testes (complementar com `additionalIds` descartado). Local: `POST` com `additionalIds` → 201 e `additionalIds: []`, nada em `service_additionals`. Na tela: Complementar → só "Informações" e "Valores" |
| Dado um valor zero ou negativo, ou um principal sem categoria, quando avanço, então as mensagens aparecem na etapa (UC13 FE01, RN007, RN009) | Testes de `serviceInputSchema`: valor zero, negativo, acima de R$ 99.999,99, com três casas, ausente em um dos quatro portes, principal sem `categoryId`, duração fora de 5 a 2.400, nome e descrição vazios → as mensagens de RN035. Local: o mesmo pela rota → 400 com `fields`. Na tela: "Próximo" fica na etapa com a mensagem no campo e o foco nele; o banco recusa direto (`ck_services_*`, `ck_service_prices_*`) o que a rota deixasse passar, conferido por SQL |
| Dado nenhuma categoria ativa, quando abro o cadastro de principal ou de complementar, então o sistema informa que é preciso cadastrar uma categoria antes (UC13 FE03) | Passo manual no banco local só com o `seed.sql` (sem categorias) e com todas desativadas: "Cadastre uma categoria antes de criar este serviço." e "Ir para as categorias" leva à aba. Local: `POST` com categoria inativa ou inexistente → 400 em `categoryId` (L2) |
| Dado um nome já usado por um serviço não excluído, quando confirmo, então recebo a mensagem de `NAME_IN_USE` (UC13 FE04, RN035) | Local: `POST` com o nome de outro serviço, com a caixa trocada e com espaços sobrando → 409 `NAME_IN_USE`, nada gravado (nem serviço, nem valores, nem vínculos, conferido por SQL); duas gravações ao mesmo tempo, só uma vale; o nome de um serviço **excluído** pode ser usado de novo; `PATCH` para o nome de outro → 409. Na tela: a mensagem no topo da janela, com o foco, e os campos mantidos; trocado o nome, grava |
| Dado um serviço ativo, quando o desativo, então ele só aparece com a opção de exibir inativos, e a reativação o traz de volta (UC14 FA01, FA02, FA03, RN008) | Local: `PATCH` com `{isActive:false, updatedAt}` → 200; a lista sem `includeInactive` não o traz e com `includeInactive=true` traz; `PATCH` com `{isActive:true, updatedAt}` o devolve; valores e vínculos intactos depois das duas trocas. Na tela: "Desativar" (sem confirmação, "Desativando…" sem perder o foco), o cartão sai e o foco vai a "Exibir inativos"; com o interruptor ligado aparece "Inativo" e "Reativar" |
| Dado um serviço com agendamentos, quando o excluo e confirmo, então ele sai da listagem, e os agendamentos continuam com os seus dados (UC14 FA04, RN030) | Local: com o `seed-demo.sql`, `DELETE` de um serviço com agendamentos → 204; some da lista (mesmo com `includeInactive`) e do detalhe (404); `DELETE` e `PATCH` repetidos → 404; as contagens de `appointments` e `appointment_services` e os nomes, tipos, valores e durações copiados não mudam; o nome pode ser usado de novo; os principais que o tinham como adicional deixam de listá-lo em `additionalIds`. Na tela: "Excluir" com a confirmação, o cartão sai e o foco vai à busca |
| Dado um funcionário sem a permissão `services`, quando chama as rotas, então recebe 403 (RS008) | Local, nas cinco operações: funcionário de cargo sem `services` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `services` → 200; `POST` sem `Origin` → 403 e `Content-Type` fora de JSON → 415, nada gravado (RS010). Retirar `services` do cargo muda a resposta na requisição seguinte |

Outros casos, pelo roteiro de rotas, pelo SQL e pelos testes: filtro `type` com cada valor e inválido (400); `search` com `%`, `_` e `\` sem funcionar como curinga e com 101 caracteres (400); `pageSize=100` volta 50 e `page=0` → 400; id inexistente e id que não é UUID → 404; `PATCH` só com `updatedAt` → 400 "Informe ao menos um campo para alterar."; `updatedAt` antigo → 409 `VERSION_CONFLICT` sem gravar nada; `PATCH` que troca a precificação (por porte → fixo e fixo → por porte) deixa os valores certos no banco; `PATCH` com `type` não muda o tipo; vínculos com id inexistente, excluído, do tipo errado ou do próprio serviço → 400 (L3); a falha do banco no meio de `save_service` (valor inválido num porte, vínculo de tipo errado) desfaz o serviço inteiro; campos não previstos descartados; serviço de categoria inativa consta na lista com `isCategoryActive: false` e o cartão mostra "Categoria inativa: oculto para o cliente" (RN031).

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin/services` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto), vazio sem filtro (banco local só com o `seed.sql`: "Nenhum serviço cadastrado") e com busca ou filtro ("Nenhum serviço encontrado"), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação em cada campo e em cada etapa dos três tipos, `NAME_IN_USE`, `VERSION_CONFLICT` (duas janelas, a segunda grava depois da primeira: aviso no topo e dados atuais na janela), falha do salvar, do desativar e do excluir (500) e de acesso (403), lista de vínculos vazia ("Nenhum serviço adicional cadastrado." e "Nenhum serviço principal cadastrado."), sem categoria ativa, e o campo de imagem com o aviso de demonstração;
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, com a lista de cartões (uma coluna, duas a partir de 768 px e três a partir de 1280 px) e a janela nas três etapas;
- teclado completo: "Novo serviço", a escolha do tipo (setas) e "Continuar", cada campo de cada etapa (inclusive o `Select` da categoria, os botões de opção da precificação e as caixas de vínculo), "Próximo", "Voltar", "Salvar serviço", "Cancelar", Esc, "Editar" (Esc devolve o foco a ele), "Desativar", "Excluir" e "Voltar" da confirmação, o foco no aviso do topo na falha e voltando ao campo, o foco em "Exibir inativos" depois de desativar e na busca depois de excluir;
- Lighthouse de acessibilidade em `/admin/services` (navegação) e nos estados em `snapshot` (lista, vazio, janela "Novo serviço" na escolha do tipo, nas três etapas do principal e no adicional, com a falha, edição, confirmação de exclusão), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` (aplica as três migrations existentes e a nova, e o `seed.sql`), depois o `seed-demo.sql` inteiro pelo ajudante `run-sql.mjs` (pacote `pg` só no scratchpad, conexão local padrão) para os serviços, os valores, os vínculos e os agendamentos. Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `services`), funcionário B (cargo sem `services`) e um cliente, pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Função SQL.** Casos de `save_service` pelo `run-sql.mjs`: criação por porte, fixa e adicional; versão velha → `null`; nome repetido → violação de `uq_services_name`; valor que falta e vínculo de tipo errado → a transação inteira desfeita; troca de precificação; `service_role` executa e `anon` e `authenticated` não (`has_function_privilege`).
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #42 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `make-cookie.mjs`, `lh-pages.sh`, `lh-snapshots.mjs`, `lh-summary.mjs`, `local-env.sh`, `start.sh`, `restart.sh`, `cleanup.mjs`, `run-sql.mjs`) e novos para esta tarefa: `verify-services-api.mjs` (rotas, permissões, valores, vínculos, exclusão e contagens), `ui-services.mjs` e `ui-keyboard.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` que vem com o Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nos roteiros de formulário com `Select` ou janela aberta, escolhem-se só as opções visíveis e a janela de cima é a de `data-open` sem `data-nested-dialog-open`, esperando cerca de 1 s depois de abrir. Estados de falha e carregamento por interceptação de requisição do `puppeteer`, sem alterar `src`; a falha do banco dentro de `save_service` por SQL, sem alterar `src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Passos do Yvan** (no relatório): aplicar a migration (`npx supabase db push`) **antes** de conferir a tela na pré-visualização, que usa o banco de produção (decisão 0030); carregar o `seed-demo.sql` no SQL Editor se quiser os serviços de demonstração; e conferir logado, em `/admin/services`, a lista, o cadastro dos três tipos, a edição, a desativação e a exclusão (os serviços criados nela são dados reais).

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<timestamp>_save_service_function.sql` | criar: `save_service`, `revoke` e `grant` |
| `src/app/api/admin/services/route.ts` | criar: `GET` e `POST` |
| `src/app/api/admin/services/[id]/route.ts` | criar: `GET`, `PATCH` e `DELETE` |
| `src/app/api/admin/services/README.md` e `[id]/README.md` | alterar: `[id]` passa a listar `GET`, `PATCH` e `DELETE` (os dois já existem e citam a rota) |
| `src/server/services/catalog.ts` | alterar: os cinco casos de uso de serviço |
| `src/server/repositories/services.ts` | criar |
| `src/server/rules/services.ts` e `src/server/rules/README.md` | criar / alterar: `mergeServiceUpdate` |
| `src/shared/validation/catalog.ts` e `src/shared/validation/README.md` | alterar: `serviceInputSchema`, `serviceUpdateSchema`, `serviceListQuerySchema` |
| `src/components/admin/catalog/catalog-tabs.tsx` | alterar: sai o `DemoNotice` da aba |
| `src/components/admin/catalog/service-wizard.tsx` | alterar: resolvedor, `clearErrors`, falha |
| `src/components/admin/catalog/service-form-resolver.ts` | criar: o resolvedor do esquema (caminho do erro → campo do formulário) |
| `src/components/admin/catalog/service-data-step.tsx`, `service-prices-step.tsx` | alterar: saem as regras de demonstração |
| `src/components/admin/catalog/service-image-field.tsx` | alterar: `DemoNotice` dentro do campo |
| `src/components/admin/catalog/service-card.tsx`, `service-active-button.tsx`, `service-list.tsx` | alterar: foco depois de desativar e de excluir (L6) |
| `src/components/admin/catalog/README.md` | alterar: o resolvedor |
| `src/app/(admin)/admin/services/page.tsx` | alterar: sai o comentário de demonstração |
| `src/lib/demo/routes.ts` | alterar: saem as entradas de `/api/admin/services` |
| `src/lib/demo/admin-catalog.ts` | apagar |
| `src/lib/demo/README.md` | alterar, se citar o catálogo do painel |
| `tests/validation/catalog.test.ts` | alterar: os três esquemas novos |
| `tests/rules/services.test.ts` e `tests/rules/README.md` | criar / alterar: `mergeServiceUpdate` |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/catalogo/servicos-do-painel.md` | alterar: sai o parágrafo do aviso da aba; entram os textos de L1 e L6 |
| `docs/catalogo/rotas.md` | alterar: textos de L1 a L5 |
| `docs/catalogo/UC13-cadastrar-servico.md` | alterar: remissão da regra de categoria e vínculos (L2, L3) |
| `docs/catalogo/dados.md` | alterar: a exclusão e os vínculos (L3) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as duas mensagens novas (L2, L3) |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita os esquemas de serviço, e a tabela, a regra de edição de serviço |
| `memoria/tarefas/44-servicos-no-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/` e `src/components/admin/catalog/` são conferidos na construção: se citarem listas de arquivos, entram aqui. `supabase/seed.sql` e `seed-demo.sql` não mudam. Não há tipo gerado do banco a atualizar.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em 69b5f48 (#42).
- **#43** (funcionários), **#45** (veículos), **#46** (consulta de agendamentos) e **#51** (dashboard): nenhum arquivo em comum além de `src/lib/demo/routes.ts` (cada uma tira as suas entradas); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR.
- **#47** (imagem): usa `findService` e acrescenta o `image_path` por um `update` próprio da tabela `services` (a `save_service` não o toca); troca o campo de imagem do formulário por upload real e tira o aviso de dentro dele. **#48** (catálogo público), **#49** (agendamento pelo painel) e **#107** (agendamento pelo cliente): leem serviços; deixo comentário em cada uma, na etapa 04, com o que existe (repositório, regras de leitura de exclusão e de inativo, `startingPrice`, `save_service`).

## Testes previstos

Valores esperados tirados de RN006, RN007, RN009, RN035, `mensagens-de-validacao.md` e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/catalog.test.ts`, `serviceInputSchema`:

- accepts a main service priced by size and normalizes it: `lavagem completa` → `Lavagem completa`, espaços sobrando removidos, quatro valores
- accepts a main service with a fixed price and discards the `prices`
- accepts a complementary service and discards the `additionalIds`
- accepts an additional service with a fixed price and discards category, description, `pricingMode` and `prices`
- requires the category of a main and of a complementary service: ausente → "Preencha este campo.", fora do formato de UUID → mensagem de categoria
- requires the four prices of a service priced by size, each one in its own path (`prices.small`…)
- rejects a price of zero, negative, over R$ 99.999,99 or with three decimals → "Informe um valor maior que zero e de até R$ 99.999,99."
- rejects a duration under 5 or over 2400 minutes, and a fraction → "Informe a duração em minutos, de 5 a 2.400."
- rejects an empty name, a one-letter name and a name over 60 characters; an empty description and one over 500
- removes repeated ids from `additionalIds` and `mainServiceIds` and rejects an id that is not a UUID
- discards the unknown fields: `id`, `isActive`, `deletedAt`, `imagePath`, `createdAt`

`serviceUpdateSchema`:

- requires `updatedAt` and keeps it as text
- accepts a single field: só `isActive`, só `name`, só `prices`
- rejects a body with only `updatedAt` → "Informe ao menos um campo para alterar."
- discards `type`

`serviceListQuerySchema`:

- defaults to page 1, 20 per page, no type and no inactive services
- accepts each service type and rejects another → mensagem
- trims the search and treats an empty one as no filter; rejects over 100 characters → "Use até 100 caracteres."
- reads `includeInactive` only as `true` or `false`; `pageSize` acima de 50 volta 50

`tests/rules/services.test.ts`, `mergeServiceUpdate`:

- keeps the current values for what did not come (só `isActive`)
- replaces only the fields that came
- switching from size to fixed price drops the `prices` and takes the `fixedPrice` that came
- switching from fixed to size takes the four prices that came and drops the `fixedPrice`
- switching the mode without the new values leaves them missing, so the schema rejects the result
- keeps the type of the service whatever `type` the update carries
- for an additional service, merges `mainServiceIds` and never adds category or description
- keeps the links when they did not come, and replaces them (empty list included) when they did

Sem teste automático para rota, serviço, repositório, função SQL e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Imagem do serviço antes da #47

**Problema.** `rotas.md` põe `imagePath` na entrada do `POST`, e `servicos-do-painel.md` descreve o campo de imagem com a prévia e diz "Na demonstração a imagem só aparece na prévia, e nada é enviado". A issue deixa a imagem para a #47 (`POST /api/admin/services/image`, ainda inexistente). Aceitar um `imagePath` vindo do navegador sem a rota de envio deixaria gravar qualquer caminho (RS015, o servidor não confia no que vem do navegador). Com as rotas reais e o aviso fora da aba, o campo de imagem pareceria funcionar e não gravaria nada.

**Opções:**

- [x] **1. Campo mantido, com o aviso de demonstração dentro dele; `imagePath` fora do corpo até a #47 (recomendada).** O `DemoNotice` entra no campo "Imagem (opcional)" (a orientação de levar o aviso só à parte que fica em demonstração); o `imagePath` é descartado pelos esquemas (RS013); a #47 grava o `image_path` ao enviar o arquivo, por um `update` próprio, sem mudar a `save_service`. O serviço sai com `imageUrl: null`.
- [ ] **2. Esconder o campo até a #47.** Nada de demonstração na tela, mas a #47 precisa devolver o campo e o valor `image` ao formulário, e a prévia, que a #63 entregou pronta, some por um ciclo.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `POST /api/admin/services`: "`imagePath`" sai da entrada, com a nota "A imagem é gravada pela rota de envio (#47); até lá o serviço é cadastrado sem imagem."
- `docs/catalogo/servicos-do-painel.md`: o parágrafo "Enquanto a rota `/api/admin/services` usar os dados de demonstração…" passa a "As rotas `/api/admin/services` são reais. Até a #47, o campo de imagem do formulário mostra o aviso de demonstração: o arquivo escolhido aparece só na prévia, e nada é enviado." (o último trecho do item **Imagem** já diz o mesmo).

### L2. Categoria do serviço no servidor (RN007, RN031)

**Problema.** A documentação diz que o formulário oferece "só as ativas" e que o serviço de categoria inativa continua no painel (RN031), mas não diz o que o servidor faz com `categoryId` inexistente, inativo, ou com um serviço que já tem categoria inativa e é editado. Sem regra, uma requisição direta gravaria serviço novo em categoria inativa, e a edição de um serviço de categoria inativa (por exemplo, para reativá-lo) seria recusada.

**Opções:**

- [x] **1. A categoria precisa existir e estar ativa quando é escolhida; manter a que já é do serviço vale mesmo inativa (recomendada).** No `POST` e no `PATCH` que muda a categoria: inexistente ou inativa → 400 `VALIDATION_ERROR` em `categoryId`. No `PATCH` que não troca a categoria, nada se confere. Consistente com o seletor (só as ativas) e com RN031.
- [ ] **2. Só conferir que existe.** Mais simples, mas permite cadastrar serviço novo já oculto do cliente por categoria inativa, contra o fluxo do UC13 (passo 4) e o seletor.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `POST` e `PATCH`: "`categoryId` precisa ser de uma categoria ativa; na edição, manter a categoria atual vale mesmo que ela esteja inativa (RN031). Categoria inexistente ou inativa: 400 em `categoryId`."
- `docs/plataforma/mensagens-de-validacao.md`, nova linha: "Categoria de serviço inexistente ou inativa | Escolha uma categoria ativa."

### L3. Vínculos de adicionais no servidor e a exclusão

**Problema.** `dados.md` garante no banco o tipo dos dois lados do vínculo, mas não diz o que a rota faz com um id inexistente, excluído ou o do próprio serviço, nem o que acontece com os vínculos quando um serviço é excluído (a exclusão em cascata de `dados.md` só vale para a física). A tela de vínculos já lista os inativos (para o vínculo feito não sumir).

**Opções:**

- [x] **1. Conferir antes de gravar; inativo vale; excluído sai das leituras e os vínculos ficam na tabela (recomendada).** `additionalIds` e `mainServiceIds` só aceitam serviços existentes, não excluídos e do tipo certo (principal ↔ adicional); id fora disso → 400 no campo (`additionalIds` ou `mainServiceIds`). Serviço inativo pode ser vinculado. A exclusão lógica não apaga vínculos nem valores: as leituras (lista de vínculos de `GET /:id`, vínculos que o outro lado devolve) ignoram o serviço excluído, e a próxima gravação do serviço que o tinha vinculado já o deixa de fora. Sem segunda instrução na exclusão.
- [ ] **2. A exclusão também apaga os vínculos do serviço.** A tabela fica limpa, mas a exclusão passa a gravar em duas tabelas e exigiria outra função SQL (RNF010) ou uma segunda instrução fora da transação.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `POST` e `PATCH`: "`additionalIds` (principal) e `mainServiceIds` (adicional) só aceitam serviços existentes, não excluídos e do tipo certo; o inativo pode ser vinculado. Id fora disso: 400 no campo."
- `docs/catalogo/dados.md`, Observações: "A exclusão lógica de um serviço mantém os valores por porte e os vínculos; as leituras ignoram o serviço excluído e o nome fica livre para outro serviço."
- `docs/plataforma/mensagens-de-validacao.md`, nova linha: "Serviço vinculado inexistente, excluído ou do tipo errado | Escolha serviços cadastrados."

### L4. Regra da busca de serviços

**Problema.** `rotas.md` lista o `search` sem dizer onde procura nem como compara; `servicos-do-painel.md` chama o campo "Buscar por nome". A #42 definiu a busca de clientes por palavras.

**Opções:**

- [x] **1. O termo inteiro como trecho do nome, sem diferenciar maiúsculas, com o acento (recomendada).** "lavagem comp" acha "Lavagem completa". `ilike` com o escape de `%`, `_` e `\`, pelo método do `supabase-js` (sem montar cadeia de filtro). Cobre "Buscar por nome" e não exige migration.
- [ ] **2. Cada palavra do termo em qualquer ordem, como a de clientes.** "completa lavagem" também acharia, ao custo de uma função própria de filtro e do seu teste; o nome do serviço tem poucas palavras e o ganho é pequeno.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `GET /api/admin/services`: "`search` procura o termo, sem diferenciar maiúsculas, em qualquer trecho do nome."

### L5. O que o `PATCH` de serviço aceita

**Problema.** `rotas.md` diz que o `PATCH` recebe "os campos do cadastro e `isActive`" e responde 409 só com `NAME_IN_USE`; não diz se o corpo é parcial nem o que ocorre ao trocar a forma de precificação, nem que o tipo é ignorado, nem lista o 404 e o `VERSION_CONFLICT` (estes valem para todas as rotas, no topo do arquivo). A tela envia o corpo inteiro na edição, mas o desativar e o reativar enviam só `isActive` e `updatedAt`.

**Opções:**

- [x] **1. Corpo parcial, mesclado ao serviço atual e validado como o cadastro (recomendada).** O que veio troca o que havia; o resultado precisa ser um cadastro válido do tipo do serviço, senão 400; trocar para valor fixo descarta os valores por porte e exige o `fixedPrice` (e o contrário para por porte); `type` é ignorado. Ao menos um campo além de `updatedAt` (como a #40).
- [ ] **2. Corpo sempre completo.** O desativar e o reativar teriam de reenviar o serviço inteiro (a tela de detalhes dele não está aberta), e a regra de mesclagem some do servidor, mas o cliente da API passa a ter de conhecer o serviço inteiro para mudar uma situação.

**Texto proposto (opção recomendada):**

- `docs/catalogo/rotas.md`, `PATCH /api/admin/services/:id`: "Entrada: `updatedAt*` e, ao menos um, os campos do cadastro e `isActive`. Só o que veio é alterado, e o resultado precisa ser um cadastro válido do tipo do serviço, que não muda. Trocar `pricingMode` exige os valores da nova forma e descarta os da antiga. Resposta: **200** serviço atualizado; 400; 404; 409 `NAME_IN_USE` ou `VERSION_CONFLICT`."

### L6. Foco depois de desativar e de excluir um serviço

**Problema.** Desativado sem "Exibir inativos", ou excluído, o cartão sai da lista e o foco do botão que o acionou se perde no `body`. `componentes.md` manda levar o foco ao controle da lista que traz o item de volta; `servicos-do-painel.md` não diz para onde.

**Opções:**

- [x] **1. Desativar → "Exibir inativos"; excluir → campo de busca; só quando o cartão sai (recomendada).** Os mesmos destinos da categoria e do cliente. Se o cartão continua na lista (inativos exibidos), o foco permanece em "Reativar".
- [ ] **2. Sempre ao botão "Novo serviço".** Existe sempre, mas é uma ação e não o controle que trouxe o cartão.

**Texto proposto (opção recomendada):**

- `docs/catalogo/servicos-do-painel.md`, "Ações do serviço": em **Desativar e reativar**, acrescenta "Se o serviço sai da listagem (sem inativos exibidos), o foco vai ao interruptor 'Exibir inativos'."; em **Excluir**, acrescenta "Com sucesso, a confirmação fecha, a lista é lida de novo e o foco vai ao campo de busca."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js` e migration em SQL), 0008 (validação compartilhada), 0009 (concorrência por `updated_at`), 0010 e 0012 (permissões por página), 0011 (cópia no agendamento), 0022 (exclusão lógica), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos; função só para o `service_role`), 0043 (banco local), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `banco.md`, `componentes.md`, `frontend.md` e `workflows/procedimentos/migration.md`.
- Nenhuma nova. O resolvedor próprio do RHF é uma composição do `zodResolver` que o projeto já usa com o esquema compartilhado (decisão 0008), não uma escolha técnica nova.

## Riscos e dúvidas

- **Migration.** Só o Yvan a aplica. Sem ela aplicada, a aba na pré-visualização responde 500 em gravações (as leituras funcionam); por isso o relatório põe o `db push` como primeiro passo dele, antes de conferir a tela. A migration é conferida no banco local com o `db reset` completo (as três anteriores e a nova), e uma segunda aplicação não é necessária (`create function`, sem `or replace`, como `save_role`).
- **Atomicidade.** O serviço, os quatro valores e os vínculos entram numa transação; as conferências do banco (`trg_service_prices_complete`, adiada ao fim da transação, e `trg_service_additionals_types`) são o que garante os quatro valores e o tipo dos vínculos. Os casos de falha são provocados por SQL e conferidos.
- **Janela de conflito de nome.** A restrição única parcial (`uq_services_name`) decide duas gravações ao mesmo tempo; o `PATCH` para o nome de um serviço excluído é permitido.
- **Lista de vínculos limitada a uma página.** O formulário lê até 50 serviços por tipo (`MAX_PAGE_SIZE`); acima disso, os demais não aparecem para vincular. Para o MVP (dezenas de serviços) basta; fica registrado como limite conhecido no relatório, sem tarefa nova.
- **`search` e `ilike`.** O texto vai ao método `ilike` do `supabase-js` (sem cadeia de filtro), com o escape de `%`, `_` e `\`; conferido no banco local com termos como `%`, `_` e `a,b)`.
- **Serviço de categoria inativa.** Permanece editável e reativável no painel (RN031), e L2 não o impede.
- **Conflito entre duas janelas.** O 409 de `save_service` recarrega o serviço na janela de edição (padrão da #40); conferido com duas janelas.
- **Janela sobre janela.** "Excluir" abre a confirmação sobre a lista; o foco ao fechar é conferido no teclado.
- **Foco depois de excluir.** O `finalFocus` do `ConfirmDialog` vale só quando a ação ocorreu (cancelar devolve o foco ao botão), como no `DeleteClientButton`.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Produção.** Os serviços criados na pré-visualização são dados reais no banco de produção; passo do Yvan, no relatório.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 650 linhas adicionadas (rotas 90, serviço 130, repositório 220, esquemas 130, regra 50, resolvedor 70, ajustes da tela 60), mais cerca de 100 de SQL e cerca de 250 de testes e as especificações, contra cerca de 400 removidas (a demonstração de serviços e as regras soltas dos componentes).

### P1. Divisão em PRs

- [x] **1. Dois PRs encadeados (recomendada).** Como na #40: o primeiro, "Refs #44", com a migration, os esquemas, a regra, o repositório, o serviço, as rotas, a OpenAPI e os testes (cerca de 520 linhas em `src/`), o segundo, "Closes #44", com a tela ligada e a demonstração removida (cerca de 130 adicionadas e 400 removidas). O Yvan aplica a migration entre os dois, e o segundo é conferido já com ela. O plano, as notas e o relatório vão no segundo.
- [ ] **2. Um PR só.** A tela só deixa de ser demonstração com as rotas e a verificação é única, mas o PR passa de 650 linhas em `src/`, bem acima das ~400, e a migration chega junto da tela sem revisão separada.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da função SQL e da exclusão.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível dos README das pastas tocadas, de `infraestrutura.md` (se descrever serviços de demonstração) e de `src/lib/demo/catalog.ts` (do catálogo público, #48, que não muda).
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Imagem do serviço: envio, prévia real, remoção e `image_path` (#47); catálogo público e página inicial (#48); `GET /api/me/bookable-services` e a busca de serviços do agendamento pelo painel (#49 e #107).
- Restaurar serviço excluído, edição em lote e reordenação.
- Busca sem diferenciar acentos, índice de busca e paginação da lista de vínculos.
- Dependência nova e registro de decisão.
