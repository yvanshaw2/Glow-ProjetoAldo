---
issue: 42
titulo: "Clientes pelo painel: listar, buscar, cadastrar, editar e excluir"
areas: [backend, frontend, testes]
tipo: funcionalidade
requisitos: [UC16, UC17, RF069, RF070, RF071, RF072, RF073, RF074, RN022, RN023, RN030, RN035, RS002, RS003, RS004, RS008, RS013, RS014, RNF003, RNF004, RNF005, RNF008, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 13:02 - 25/10/2026
---

# Plano: Clientes pelo painel: listar, buscar, cadastrar, editar e excluir

## Objetivo

Entregar o UC16 e o UC17 de ponta a ponta: o funcionário com a permissão `clients` encontra, cadastra, edita e exclui contas de clientes em `/admin/clients` (RF069 a RF074), pelas rotas de `docs/clientes/rotas.md`, todas com `requirePermission("clients")` (RS008, RS010):

- `GET /api/admin/clients`, com `search`, `page` e `pageSize`: 20 por página, em ordem alfabética pelo nome completo, sem o cliente excluído (RNF008, RN030);
- `GET /api/admin/clients/:id`: o cliente, ou 404;
- `POST /api/admin/clients`, com `email*`, `firstName*`, `lastName*`, `phone*` e `password*`: cria a conta no Supabase Auth (`createAccount`, #24) e o perfil em `clients` com `must_change_password` verdadeiro, e remove a conta se o perfil falhar (RN023, RS004); 201 com o cliente; 409 `EMAIL_IN_USE` (RN022);
- `PATCH /api/admin/clients/:id`, com `firstName`, `lastName`, `phone` e o `updatedAt` (RNF011, decisão 0009): 200; 404; 409 `VERSION_CONFLICT`. O e-mail não muda;
- `DELETE /api/admin/clients/:id`: exclusão lógica (`deleted_at`) e remoção da conta do Supabase Auth, de modo que o cliente perde o acesso e o e-mail fica livre; veículos e agendamentos ficam (RN030); 204.

**A página deixa de ser demonstração** (orientação do Yvan e decisão 0055): saem de `src/lib/demo/routes.ts` as seis entradas de `/api/admin/clients` e `/api/admin/clients/:id` (as de `.../vehicles`, `/api/admin/vehicles/*` ficam, são da #45); sai o aviso da página; os formulários passam a usar os esquemas de validação (critério da issue). A demonstração vem do banco: o `supabase/seed-demo.sql` já tem os 13 clientes (e seus veículos), então **não muda**; quem o carrega é o Yvan (passo dele, no relatório). A especificação OpenAPI ganha as cinco operações.

**O que depende dessas rotas na mesma tela.** A janela de detalhes lê o cliente real e, na seção "Veículos", `GET /api/admin/clients/:id/vehicles`, que continua em demonstração até a #45: com um cliente criado agora, a rota de demonstração devolveria 404 (o cliente não está nos 13 do seed) e a janela mostraria falha. Por isso `answerAdminClientVehicles` passa a responder lista vazia para o cliente que não é do seed, e o aviso de demonstração se muda para dentro da seção "Veículos" (L3). "Cadastrar veículo" e "Editar" de veículo seguem recusados com `NOT_IMPLEMENTED` até a #45.

Sem migration: o cadastro e a exclusão tocam uma tabela do banco cada (a conta do Auth é outro serviço), então não há função SQL (`backend.md`, RNF010 só vale para várias tabelas). Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/42-clients`, criada da `origin/main` (1ed1089, com a #39: PR #113), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/cool-villani-682bef`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em 1ed1089.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondPage`, `requirePermission`, `getServiceClient`, `createAccount`, `AppError` (`EMAIL_IN_USE`, `NOT_FOUND`, `VERSION_CONFLICT`); em `formats.ts`: `personNameSchema`, `emailSchema`, `mobilePhoneSchema`, `passwordSchema`, `searchTermSchema`; em `params.ts`: `idSchema`, `paginationSchema`, `updatedAtSchema`; no cliente: `apiRequest`, `useApiQuery`, `usePaginatedList`, `PaginatedList`, `useFormFailure`, `FormAlert`, `FormField`, `ConfirmDialog`.
- Moldes: `app/api/admin/roles/` e `categories/`, `server/services/roles.ts`, `server/repositories/categories.ts` e `roles.ts`, `shared/validation/staff.ts` (#39 e #40: `PATCH` condicionado ao `updated_at`, `NotFound`, `NameInUse` e `VersionConflict` do OpenAPI, foco no controle da lista quando o cartão sai dela, `useFormFailure`, `clearErrors()` antes do envio) e `register` em `services/auth.ts` (conta primeiro, perfil depois, remoção da conta se o perfil falhar).
- Já prontos da #64 e mantidos: `ClientList`, `ClientCard`, `ClientDetailsDialog`, `ClientFormDialog`, `client-fields.tsx`, `DeleteClientButton`, e o tipo `AdminClient` (`src/shared/api/clients.ts`, não muda).

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/clients` | `search` (até 100 caracteres), `page`, `pageSize` | 200 página de `id`, `firstName`, `lastName`, `email`, `phone` (11 algarismos), `updatedAt`, por nome completo |
| `GET /api/admin/clients/:id` | nenhuma | 200 o cliente; 404 `NOT_FOUND` (inclusive id que não é UUID e cliente excluído) |
| `POST /api/admin/clients` | `email*`, `firstName*`, `lastName*`, `phone*`, `password*` | 201 o cliente; 400 `VALIDATION_ERROR` com `fields`; 409 `EMAIL_IN_USE` |
| `PATCH /api/admin/clients/:id` | `firstName`, `lastName`, `phone`, `updatedAt*`; ao menos um campo | 200 o cliente; 400; 404; 409 `VERSION_CONFLICT` |
| `DELETE /api/admin/clients/:id` | nenhuma | 204; 404 (inclusive já excluído) |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem `clients` ou origem recusada), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500.
- Campos não previstos (`id`, `mustChangePassword`, `deletedAt`, `createdAt`; e `email` e `password` no `PATCH`) são descartados (RS013). O corpo do `POST` nunca devolve a senha. No `PATCH`, só muda o que veio.
- A busca (L4): cada palavra do termo precisa aparecer, sem diferenciar maiúsculas, no nome, no sobrenome, no e-mail ou no telefone (neste, só os algarismos da palavra, então "(82) 90000" e "90000-0001" valem).

### Esquemas (`src/shared/validation/clients.ts`, novo), TDD

| Esquema | Regras |
|---|---|
| `clientInputSchema` (corpo do `POST`) | `email`: `emailSchema`; `firstName` e `lastName`: `personNameSchema`; `phone`: `mobilePhoneSchema` (11 algarismos); `password`: `passwordSchema`; mensagens de `mensagens-de-validacao.md` |
| `clientUpdateSchema` (corpo do `PATCH`) | `firstName`, `lastName` e `phone` opcionais, `updatedAt` obrigatório (`updatedAtSchema`); sem nenhum campo além de `updatedAt` → "Informe ao menos um campo para alterar." (a mensagem da #40); `email` e `password` descartados |
| `clientListQuerySchema` | `paginationSchema(ADMIN_LIST_PAGE_SIZE)` com `search` opcional (`searchTermSchema`; vazio = sem filtro) |

O formulário **usa** os esquemas no navegador, por `zodResolver`, como o de categoria e o de cargo: "Novo cliente" com `clientInputSchema`, "Editar cliente" com `firstName`, `lastName` e `phone` do mesmo esquema (`pick`). Saem as `rules` de "campo preenchido" de `client-fields.tsx`.

### Backend (decisões 0003, 0005, 0006, 0009, 0010)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/clients/route.ts` | `GET`: guard, `clientListQuerySchema.parse`, `listClients`, `respondPage`. `POST`: guard, `clientInputSchema.parse(body)`, `createClient`, `respondCreated` |
| Rota | `app/api/admin/clients/[id]/route.ts` | `GET`, `PATCH`, `DELETE`: guard, `idSchema` (inválido → `NOT_FOUND`), esquema, serviço, `respondOk` / `respondNoContent` (o que `respond.ts` já tiver; conferido na construção) |
| Serviço | `server/services/clients.ts` | módulo `clients` (novo): `listClients`, `getClient`, `createClient`, `updateClient`, `deleteClient` |
| Repositório | `server/repositories/clients.ts` | passa a ter `listClients(search, page, pageSize)`, `findAdminClient(id)`, `updateClient(id, changes, updatedAt)`, `markClientDeleted(id)` e `restoreClient(id)`; `insertClient` ganha `mustChangePassword` (o cadastro público segue com falso); todas as seleções com `deleted_at is null` (RN030) |
| Repositório | `server/repositories/client-search.ts` | função pura que monta o filtro da busca (L4), com o escape de `%`, `_`, `\` e dos caracteres do filtro do PostgREST (vírgula, parênteses, aspas) |
| Autenticação | `server/auth/accounts.ts` | `deleteAccount` trata `user_not_found` como sucesso (a conta já saiu: a repetição da exclusão termina) |
| Erros | `shared/errors/app-error.ts` | `AppErrorDetails` ganha `message` opcional (L1), usado só se a pessoa escolher a opção 1 |

- **Cadastro** (`createClient`): `createAccount` → `insertClient({ mustChangePassword: true })`; se o perfil falhar, a conta é removida e o log registra o `accountId` se a remoção falhar também (a mesma regra e o mesmo ajudante de `register`, `backend.md`). `EMAIL_IN_USE` sai da conta do Auth (cliente, funcionário ou administrador, RN022) ou do índice `uq_clients_email`.
- **Edição** (`updateClient`): lê o cliente (404 se não há), grava com `eq("updated_at", updatedAt)`; sem linha gravada, é `VERSION_CONFLICT`, como o `updateCategory`.
- **Exclusão** (`deleteClient`), L5: marca `deleted_at` (só se ainda for nulo; sem linha, 404) e depois remove a conta do Auth. Marcar primeiro tira o acesso na hora (`loadAccount` só lê cliente não excluído) e o cliente da lista. Se a remoção da conta falhar, o `deleted_at` é desfeito, o erro sobe como 500 e a pessoa tenta de novo; se o desfazer também falhar, o `accountId` vai ao log. O cliente perde o acesso de qualquer forma, e a tentativa de entrar com a conta removida recebe "E-mail ou senha incorretos." do próprio login.
- Veículos e agendamentos ficam: nada deles é tocado, e as chaves estrangeiras para `clients` são `restrict`, que a exclusão lógica nunca aciona (`dados.md`).
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: `/admin/clients`

Conteúdo, textos e estados já definidos em `docs/clientes/clientes-do-painel.md` (#64); o que muda:

- `app/(admin)/admin/clients/page.tsx`: sai o `DemoNotice` e o comentário de demonstração.
- `client-form-dialog.tsx`: `zodResolver`; `clearErrors()` antes do envio, porque a rota devolve erro em campo que a pessoa já corrigiu (`EMAIL_IN_USE` aparece no topo, `fields` junto aos campos); o 409 `VERSION_CONFLICT` relê o cliente e a janela recebe os dados atuais; o `EMAIL_IN_USE` mantém os dados digitados.
- `client-fields.tsx`: saem as regras de demonstração; a mensagem vem do esquema.
- `client-details-dialog.tsx`: o aviso de demonstração entra dentro da seção "Veículos" (L3); depois de excluir, o foco vai ao campo de busca (L2): o `ConfirmDialog` e o diálogo de detalhes recebem o `finalFocus`, como o `CategoryCard` e o `RoleCard`.
- `client-list.tsx` e `components/shared/paginated-list.tsx`: o `PaginatedList` ganha uma propriedade opcional para o campo de busca ser alcançado de fora (L2), sem mudar quem não a usa.
- `src/lib/demo/routes.ts`: saem as entradas de `/api/admin/clients` (`GET` da lista e do detalhe, `POST`, `PATCH`, `DELETE`); o comentário passa a citar só a #45. `src/lib/demo/admin-clients.ts`: saem `answerAdminClients` e `answerAdminClient`, `answerAdminClientVehicles` responde lista vazia para o cliente que não é do seed, e o comentário cita a #45.
- `ClientCard`, `ClientList` (estados vazios, busca com 300 ms, "Limpar filtros") e o restante de `ClientDetailsDialog` já estão prontos e não mudam.

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/clients` (`listClients`, `createClient`) e `/api/admin/clients/{id}` (`getClient`, `updateClient`, `deleteClient`) na tag `clients`, com `sessionCookie`; os esquemas `AdminClient`, `ClientPage`, `ClientInput` e `ClientUpdateInput`; as respostas existentes `NotFound`, `VersionConflict`, `ValidationError`, `Unauthenticated`, `PanelForbidden`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`, mais um `409` de `EMAIL_IN_USE` (a resposta existente do cadastro, se houver, é reaproveitada).

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado e-mail, nome, sobrenome, celular e senha válidos, quando confirmo, então o cliente aparece na listagem, e no primeiro login ele vai a `/set-password` (UC16, RN023, RS004) | Testes de `clientInputSchema` (corpo válido normalizado: nome com iniciais maiúsculas, e-mail em minúsculas, celular só com algarismos). Local, pelo roteiro: `POST` responde 201 sem senha no corpo e `GET` traz o cliente; `login` do cliente novo responde com a troca de senha pendente (`GET /api/auth/me` e `proxy.ts` levam a `/set-password`); trocada a senha, o acesso se completa. Na tela: "Novo cliente", os cinco campos, "Cadastrar cliente": a janela fecha e o cartão aparece na lista |
| Dado um e-mail já usado por um cliente ou por um funcionário, quando confirmo, então recebo a mensagem de `EMAIL_IN_USE`, com os dados mantidos (UC16 FE02, RN022) | Local: `POST` com o e-mail de um cliente e com o de um funcionário (criado pelo `auth.admin.createUser`) e com a caixa trocada responde 409 `EMAIL_IN_USE` com a mensagem de L1, e nada é gravado (nem conta nem perfil, conferido por `listUsers` e `clients`). Na tela: a mensagem no topo da janela, com o foco, e os campos mantidos; trocado o e-mail, grava |
| Dado o termo "silva", quando busco, então a listagem mostra os clientes com o termo no nome, no sobrenome ou no e-mail; sem resultado, aparece o estado vazio (UC17, UC17 FE01) | Testes do filtro da busca (palavras, escape, telefone com e sem máscara). Local: o seed-demo não tem "Silva" (L3 da #64); `souza` traz "Ana Souza", `silva` traz o estado vazio, e um cliente criado pelo roteiro ("Maria Silva", e-mail `msilva@…`) aparece por `silva` no sobrenome e por `msilva` no e-mail; `%` e `_` não funcionam como curinga; `ana souza` acha Ana Souza. Na tela: "Nenhum cliente encontrado" e "Não há clientes para o critério informado.", e "Limpar filtros" leva o foco à busca |
| Dado um cliente, quando altero o celular e confirmo, então o número novo aparece nos detalhes; o e-mail não é editável (UC17) | Testes de `clientUpdateSchema` (campo único, só `updatedAt` recusado, `email` descartado). Local: `PATCH` com `phone` → 200 e `GET` com o número novo; `PATCH` com `email` no corpo não o muda; `updatedAt` antigo → 409 `VERSION_CONFLICT`, nada gravado. Na tela: "Editar dados", o e-mail só leitura, "Salvar alterações": os detalhes mostram o número com a máscara |
| Dado um cliente excluído, quando ele tenta entrar, então recebe "E-mail ou senha incorretos."; ele sai da listagem, e os seus agendamentos continuam (UC17 FA01, RN030) | Local: `DELETE` → 204; `login` do cliente → 401 "E-mail ou senha incorretos." (e a sessão que ele já tinha recebe 401); some de `GET` (lista, detalhe → 404), `PATCH` e `DELETE` repetidos → 404; o e-mail volta a poder ser cadastrado; o cliente do seed-demo com agendamentos é excluído e a contagem de `appointments`, `client_vehicles` e `vehicles` não muda (consulta com a chave do serviço). Falha simulada da remoção da conta → 500 e o `deleted_at` desfeito (L5). Na tela: "Excluir conta" com a confirmação, o cartão sai e o foco vai à busca |
| Dado um funcionário sem a permissão `clients`, quando chama as rotas, então recebe 403 (RS008) | Local, nas cinco operações: funcionário de cargo sem `clients` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `clients` → 200; `POST` sem `Origin` → 403 e `Content-Type` fora de JSON → 415, nada gravado (RS010). Retirar `clients` do cargo do funcionário muda a resposta na requisição seguinte (RS011, já pronto) |

Outros casos, pelo roteiro de rotas e pelos testes: nome, sobrenome, celular, e-mail e senha vazios ou fora do formato → 400 com a mensagem no campo; senha de 7 caracteres, sem maiúscula, sem número ou sem especial; celular fixo ou com DDD inexistente; `PATCH` só com `updatedAt` → 400 "Informe ao menos um campo para alterar."; id inexistente e id que não é UUID → 404; `pageSize=100` volta 50; `page=0` → 400; `search` com 101 caracteres → 400; campos não previstos descartados.

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin/clients` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto), vazio sem busca (banco local só com o `seed.sql`: "Nenhum cliente cadastrado") e com busca, falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação em cada campo do formulário, `EMAIL_IN_USE`, `VERSION_CONFLICT` (duas janelas, a segunda grava depois da primeira: aviso no topo e dados atuais na janela), falha do salvar e do excluir (500) e de acesso (403), a janela de detalhes com a seção "Veículos" de demonstração para um cliente do seed e para um cliente novo (lista vazia);
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, com a lista de cartões (uma coluna e duas a partir de 1280 px) e as janelas;
- teclado completo: "Novo cliente", cada campo, o botão de mostrar a senha, "Cadastrar cliente", "Cancelar", Esc, "Ver detalhes", "Editar dados" (Esc devolve o foco a ele), "Excluir conta" e "Voltar", o foco no aviso do topo na falha e voltando ao campo, e o foco na busca depois de excluir;
- Lighthouse de acessibilidade em `/admin/clients` (navegação) e nos estados em `snapshot` (lista, vazio, janela "Novo cliente" com a falha, detalhes, edição, confirmação de exclusão), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` com o `seed.sql`, depois o `seed-demo.sql` (comando a comando por `supabase db query`, com o ajudante `pg_temp` trocado por função temporária) para os 13 clientes, os veículos e os agendamentos. Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `clients`), funcionário B (cargo sem `clients`) e um cliente, pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #39 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `make-cookie.mjs`, `lh-*`, `local-env.sh`, `start.sh`, `restart.sh`) e novos para esta tarefa: `verify-clients-api.mjs` (rotas, permissões, exclusão e contagens), `ui-states.mjs`, `ui-flow.mjs` e `ui-keyboard.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` que vem com o Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nos roteiros de formulário com `Select` ou janela aberta, escolhem-se só as opções visíveis. Alterações temporárias para os estados (requisição retida, falha, vazio, falha da remoção da conta) ficam sem commit e são desfeitas por `git checkout -- src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Pré-visualização e produção**, passo do Yvan, listado no relatório: carregar o `seed-demo.sql` no SQL Editor se quiser os 13 clientes de demonstração (sem migration nova), e conferir logado, em `/admin/clients`, a lista, o cadastro de um cliente (o primeiro login dele vai a `/set-password`), a edição e a exclusão (a pré-visualização usa o banco de produção, decisão 0030; os clientes criados nela são dados reais e as contas ficam no Auth de produção).

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/clients/route.ts` | criar: `GET` e `POST` |
| `src/app/api/admin/clients/[id]/route.ts` | criar: `GET`, `PATCH` e `DELETE` |
| `src/app/api/admin/clients/README.md` e `[id]/README.md` | criar, se a pasta pedir (como `roles/`) |
| `src/server/services/clients.ts` | criar |
| `src/server/repositories/clients.ts` | alterar: listagem, detalhe, edição, exclusão lógica, `mustChangePassword` |
| `src/server/repositories/client-search.ts` | criar: o filtro da busca |
| `src/server/auth/accounts.ts` | alterar: `deleteAccount` e `user_not_found` |
| `src/shared/errors/app-error.ts` | alterar: `message` opcional (L1) |
| `src/server/http/handler.ts` | alterar (fora da lista inicial, a confirmar): `detail` usa `error.message`, para a mensagem própria de L1 chegar à resposta |
| `src/shared/validation/clients.ts` | criar: `clientInputSchema`, `clientUpdateSchema`, `clientListQuerySchema` |
| `src/shared/validation/README.md` | alterar: os esquemas novos |
| `src/components/admin/clients/client-form-dialog.tsx` | alterar: `zodResolver`, `clearErrors`, falha |
| `src/components/admin/clients/client-fields.tsx` | alterar: saem as regras de demonstração |
| `src/components/admin/clients/client-details-dialog.tsx` | alterar: aviso na seção "Veículos" e foco depois de excluir |
| `src/components/admin/clients/delete-client-button.tsx` | alterar: `finalFocus` |
| `src/components/admin/clients/client-list.tsx` e `src/components/shared/paginated-list.tsx` | não mudaram: o foco vai ao campo de busca por `document.querySelector` (como o `RoleCard`) |
| `src/app/(admin)/admin/clients/page.tsx` | alterar: sai o aviso e o comentário de demonstração |
| `src/lib/demo/routes.ts` | alterar: saem as entradas de `/api/admin/clients` |
| `src/lib/demo/admin-clients.ts` | alterar: saem as duas respostas; veículos de cliente fora do seed → lista vazia |
| `tests/validation/clients.test.ts` | criar: os três esquemas |
| `tests/repositories/client-search.test.ts` e `tests/repositories/README.md` | criar: o filtro da busca (pasta nova, com o README exigido; `tests/README.md` ganha a linha) |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/clientes/clientes-do-painel.md` | alterar: sai o parágrafo do aviso da página; entram os textos de L1, L2, L3 e L4 |
| `docs/clientes/UC17-manter-cliente.md` e `docs/clientes/rotas.md` | alterar: a regra da busca (L4) |
| `docs/clientes/dados.md` | alterar (L5): a ordem da exclusão |
| `docs/plataforma/mensagens-de-validacao.md` | não mudou: a mensagem de L1 está em `docs/clientes/rotas.md` e `clientes-do-painel.md` |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita os esquemas de cliente |
| `memoria/tarefas/42-clientes-no-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/`, `src/components/admin/clients/` e `src/lib/demo/` já cobrem os arquivos e não mudam (o de `src/lib/demo/` será conferido: se citar `admin-clients.ts`, entra na lista). `supabase/seed-demo.sql` e `seed.sql` não mudam.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em 1ed1089 (#39).
- **#43** (funcionários): nenhum arquivo em comum além de `src/lib/demo/routes.ts` e do `app-error.ts` (se L1 = opção 1), compartilhados; a conferência de conflito é no momento do PR.
- **#45** (veículos do cliente): usa `src/lib/demo/routes.ts`, `admin-clients.ts` (a resposta dos veículos), `client-details-dialog.tsx` (o aviso dentro da seção "Veículos") e os componentes de `components/admin/vehicles/`. Ao fim, deixo um comentário na #45 com o que esta tarefa deixou.
- **#46 e #47** (agendamentos do painel): dependem de `findAdminClient`/`listClients` do repositório para a escolha do cliente; deixo comentário nelas com o que existe. A etapa "cliente" do agendamento (`booking-client-step.tsx`) lê a lista de clientes: confiro, antes do PR, se ela usa `/api/admin/clients` (a busca nas consultas acima não achou), e a lista entra nos arquivos se usar.

## Testes previstos

Valores esperados tirados de RN023, RN035, `mensagens-de-validacao.md` e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/clients.test.ts`, `clientInputSchema`:

- accepts a valid client and normalizes it: `maria de souza` → `Maria de Souza`, e-mail em minúsculas, `(82) 99999-8888` → `82999998888`
- requires each of the five fields: vazio e só espaços → "Preencha este campo."
- rejects an invalid e-mail, a landline phone and an unknown area code → as mensagens de RN035
- rejects a password outside RN023/RS003: 7 caracteres, sem maiúscula, sem número, sem caractere especial, mais de 72 bytes → "A senha deve ter de 8 a 72 caracteres, com letra maiúscula, número e caractere especial."
- discards the unknown fields: `id`, `mustChangePassword`, `deletedAt`, `updatedAt`

`clientUpdateSchema`:

- requires `updatedAt` and keeps it as text
- accepts a single field: só `phone`, só `firstName`, só `lastName`
- rejects a body with only `updatedAt` → "Informe ao menos um campo para alterar."
- discards `email` and `password` and keeps the formats of the input

`clientListQuerySchema`:

- defaults to page 1 and 20 per page, and trims the search
- treats an empty search as no filter
- rejects a search over 100 characters → "Use até 100 caracteres." e `pageSize` acima de 50 volta 50

`tests/repositories/client-search.test.ts`:

- splits the term into words and asks each one of the name, last name, e-mail and phone
- uses only the digits of a word for the phone and skips it when the word has none
- escapes `%`, `_` and `\` so they are not wildcards
- keeps commas, parentheses and quotes from changing the filter
- returns no filter for an empty term

Sem teste automático para rota, serviço, repositório e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Mensagem de `EMAIL_IN_USE` no painel (UC16 FE02)

**Problema.** UC16 FE02 pede "informar que já existe um cliente com o e-mail informado", mas o catálogo (`src/shared/errors/catalog.ts`) tem uma só mensagem para `EMAIL_IN_USE`, a do cadastro público: "Este e-mail não pode ser usado. Se você já tem conta, entre com ela." (feita para não confirmar a um visitante que o e-mail existe). No painel, a frase fala com quem quer entrar e não com quem cadastra. O e-mail pode estar em uso por um cliente ou por um funcionário (RN022, o Auth é um só).

**Opções:**

- [x] **1. Texto próprio do painel, pelo serviço (recomendada).** A rota devolve `EMAIL_IN_USE` (mesmo código e status) com a mensagem "Já existe uma conta com este e-mail." — sem dizer se é de cliente ou de funcionário, o que o painel não precisa saber. `AppError` ganha a `message` opcional; o cadastro público e o catálogo ficam iguais. Quem chama é funcionário autenticado, então confirmar que o e-mail existe não expõe o visitante.
- [ ] **2. Manter a mensagem do catálogo.** Sem mudança de código, mas o aviso fala de "entrar com ela" a um funcionário que cadastra um cliente; o texto do UC16 FE02 não é atendido.

**Texto proposto (opção recomendada):**

- `docs/clientes/clientes-do-painel.md`, "Novo cliente": "`EMAIL_IN_USE` (FE02) aparece no topo da janela com a mensagem do catálogo de erros; a rota (#42) define se o painel usa um texto próprio." passa a "`EMAIL_IN_USE` (FE02) aparece no topo da janela com 'Já existe uma conta com este e-mail.', e os dados digitados são mantidos."
- `docs/plataforma/mensagens-de-validacao.md`, nova linha (a seção de e-mail): "E-mail já usado, no cadastro pelo painel | Já existe uma conta com este e-mail."

### L2. Para onde vai o foco depois de excluir o cliente

**Problema.** Excluído o cliente, o cartão sai da lista e a janela de detalhes fecha; o foco do botão "Ver detalhes" some e cai no `body` (a #64 deixou o registro, o comentário da issue pede a decisão). `componentes.md` manda, quando a ação tira da lista o item que abriu o diálogo, levar o foco ao controle da lista que o trouxe de volta (como o interruptor "Exibir inativos"). Aqui o controle da lista é o campo de busca.

**Opções:**

- [x] **1. Foco no campo de busca (recomendada).** É o único controle da lista que sempre existe; o padrão de `componentes.md`. Exige uma referência opcional ao campo no `PaginatedList` (os outros usos não mudam).
- [ ] **2. Foco em "Novo cliente".** Existe sempre também, mas é uma ação e não o controle que trouxe o cartão; quem busca para continuar encontra o campo no ponto errado.

**Texto proposto (opção recomendada):**

- `docs/clientes/clientes-do-painel.md`, "Excluir conta": acrescenta "Com sucesso, a confirmação e os detalhes fecham, a lista é lida de novo e o foco vai ao campo de busca." (substitui o último item da seção).

### L3. O aviso de demonstração e os veículos do cliente

**Problema.** A orientação é tirar o aviso da tela, mas a seção "Veículos" dos detalhes (e "Cadastrar veículo" e "Editar" de veículo) continua em demonstração até a #45. Com o aviso fora da página, o texto dos veículos de demonstração apareceria como real. Além disso, a rota de demonstração dos veículos só conhece os 13 clientes do seed e daria 404 para o cliente criado agora, deixando a janela de detalhes em falha.

**Opções:**

- [x] **1. Aviso só na seção "Veículos" e lista vazia para o cliente fora do seed (recomendada).** O `DemoNotice` sai da página e entra dentro da seção "Veículos" da janela de detalhes, como a #39 fez com a aba "Funcionários"; sai de vez na #45. A demonstração de veículos devolve lista vazia ("Nenhum veículo cadastrado") para o cliente que não é do seed.
- [ ] **2. Manter o aviso no topo da página até a #45.** Mais simples, mas deixa a página com dado real e aviso de demonstração por inteiro e contraria a orientação; a lista vazia para o cliente novo continua necessária.

**Texto proposto (opção recomendada):**

- `docs/clientes/clientes-do-painel.md`: o parágrafo "Enquanto as rotas `/api/admin/clients` e `/api/admin/vehicles` usarem os dados de demonstração…, o aviso de demonstração fica logo abaixo do título da página." passa a "Os clientes vêm das rotas `/api/admin/clients`. Enquanto os veículos do cliente usarem os dados de demonstração de `src/lib/demo/admin-clients.ts` (decisão 0055, até a #45), o aviso de demonstração fica no início da seção 'Veículos' dos detalhes; um cliente que não é do seed mostra 'Nenhum veículo cadastrado'." Na seção "Página", sai "o aviso de demonstração" da lista do que fica abaixo do título.

### L4. Regra da busca de clientes

**Problema.** `rotas.md` diz que `search` "procura no nome, no e-mail e no telefone"; a issue e o UC17 passo 3 falam em nome, sobrenome ou e-mail; `clientes-do-painel.md` diz que o telefone vale com ou sem a máscara. Nada diz como se comparam termos com mais de uma palavra ("ana souza", o nome completo) nem se acento conta. A demonstração (`demoPage`) compara o termo inteiro, sem diferenciar maiúsculas e com o acento.

**Opções:**

- [x] **1. Cada palavra em um dos campos, sem diferenciar maiúsculas, com o acento (recomendada).** O termo é separado em palavras; cada palavra precisa aparecer no nome, no sobrenome, no e-mail ou no telefone (neste, pelos algarismos da palavra). "ana souza" acha Ana Souza; "silva" acha pelo sobrenome; "(82) 90000" e "900000001" acham pelo telefone. Sem migration: é só `ilike` combinado no PostgREST. É um superconjunto do que a demonstração mostrava.
- [ ] **2. Também sem diferenciar acentos.** "araujo" acharia "Araújo". Exige a extensão `unaccent` e uma migration (e a função de busca com o ajuste de privilégios da decisão 0042) — escopo que a issue não prevê.
- [ ] **3. O termo inteiro como um trecho.** Igual à demonstração, mas "ana souza" só acharia se o nome completo fosse comparado como uma coluna calculada, o que exige coluna ou função nova no banco.

**Texto proposto (opção recomendada):**

- `docs/clientes/rotas.md`, `GET /api/admin/clients`: "`search` procura no nome, no e-mail e no telefone." passa a "`search` separa o termo em palavras; cada uma precisa aparecer, sem diferenciar maiúsculas, no nome, no sobrenome, no e-mail ou no telefone (neste, vale com ou sem a máscara)."
- `docs/clientes/UC17-manter-cliente.md`, passo 3: acrescenta a remissão a `rotas.md` para o critério da busca.

### L5. Ordem e falha da exclusão (banco e conta do Auth)

**Problema.** A exclusão faz duas coisas em sistemas diferentes: marca `deleted_at` e remove a conta do Supabase Auth (`dados.md`, Observações). A documentação não diz o que fazer se uma delas falhar. Sem tratamento, a falha na remoção da conta deixaria o cliente "excluído" mas com o e-mail preso no Auth, e o próximo cadastro com ele daria `EMAIL_IN_USE` sem que alguém o veja na lista.

**Opções:**

- [x] **1. Marcar primeiro, remover a conta depois, desfazer a marca se a remoção falhar (recomendada).** O acesso e a lista mudam na hora (`loadAccount` só lê cliente não excluído); se a conta não sai, o `deleted_at` é desfeito e a pessoa vê o erro 500 e tenta de novo (a repetição termina, porque conta já removida conta como sucesso). Se o desfazer também falhar, o `accountId` vai ao log (a regra de `backend.md` para conta sem perfil, ao contrário).
- [ ] **2. Remover a conta primeiro e marcar depois.** Se a marcação falhar, o cliente fica na lista, sem poder entrar e sem conta; a repetição precisa saber que a conta já saiu. Mesma recuperação, com a lista mostrando um cliente sem acesso no intervalo.

**Texto proposto (opção recomendada):**

- `docs/clientes/dados.md`, Observações: acrescenta "A exclusão marca `deleted_at` e depois remove a conta do Supabase Auth; se a remoção falhar, a marca é desfeita e a operação pode ser repetida."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js`), 0008 (validação compartilhada), 0009 (concorrência por `updated_at`), 0010 e 0012 (permissões por página), 0015 e 0044 (conta criada pelo servidor, e-mail confirmado, sem `signUp`), 0022 (exclusão lógica), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos; sem função nova), 0043 (banco local), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `componentes.md` e `frontend.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Conta do Auth e perfil.** A criação e a exclusão envolvem o Auth e uma tabela, sem transação entre os dois; a compensação (remover a conta se o perfil falhar; desfazer a marca se a conta não sair) está em "Backend" e L5, e é conferida no banco local com falhas provocadas por alteração temporária (sem commit).
- **Busca por `ilike` no PostgREST.** O texto vai dentro de um filtro montado como cadeia (`or(...)`): o escape de `%`, `_`, `\`, vírgula, parênteses e aspas é a defesa e tem teste próprio; o resto da consulta usa os métodos do `supabase-js`, sem SQL por concatenação (`repositories/README.md`). Confirmado no banco local com termos como `a,b)`, `%` e `"`.
- **Desempenho da busca.** `ilike '%x%'` varre a tabela; para o MVP (centenas de clientes) basta, sem índice novo.
- **Sessão do cliente excluído.** O JWT dele continua válido até expirar, mas `loadAccount` não acha o perfil e toda rota responde 401; conferido no roteiro.
- **Foco depois de excluir.** O diálogo de detalhes fecha com o de confirmação aberto sobre ele; o `finalFocus` precisa chegar ao campo de busca depois que os dois fecham: conferido no roteiro de teclado.
- **Janela sobre janela.** "Editar dados" e "Excluir conta" abrem sobre os detalhes (padrão da #64); o retorno do foco é conferido no teclado.
- **Demonstração e tela real misturadas.** A seção "Veículos" de um cliente do seed mostra a demonstração (os ids do seed batem com os do banco), a de um cliente novo mostra "Nenhum veículo cadastrado"; as duas são conferidas.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local (3,2 s na #39); é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Produção.** Os clientes criados na pré-visualização são dados reais e criam contas no Auth de produção; passo do Yvan, no relatório.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 430 linhas adicionadas (rotas 70, serviço 90, repositório 130 incluindo o filtro da busca, esquemas 60, conta e erro 20, formulário e detalhes 40, ajustes da lista e da página 20), contra cerca de 80 removidas (respostas de demonstração e regras soltas), mais cerca de 150 de testes e as especificações.

### P1. Divisão em PRs

- [x] **1. Um PR só (recomendada).** Cerca de 430 linhas em `src/`, pouco acima das ~400, mas a tela só fica sem demonstração com as rotas; a verificação completa vale para o conjunto, e o PR leva `memoria/tarefas/42-…` e "Closes #42".
- [ ] **2. Dois PRs encadeados (API; tela).** Como na #40: o primeiro com rotas, serviço, repositório, esquemas, testes e OpenAPI (cerca de 300 linhas), o segundo com a tela ligada, a demonstração removida e "Closes #42" (cerca de 130). A tela fica em demonstração por mais um ciclo de revisão.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da gravação real e da exclusão.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível do `booking-client-step.tsx` (se usar a lista de clientes), do `README` de `src/lib/demo/` e do `infraestrutura.md` (se descrever clientes de demonstração).
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Veículos do cliente: lista real, cadastro, edição e consulta de placa (#45); a seção "Veículos" e os botões dela seguem em demonstração.
- Área do cliente `/profile` e as rotas `/api/me/*` (fase 3).
- Trocar a senha do cliente pelo painel, mostrar a troca de senha pendente e contar agendamentos do cliente (`clientes-do-painel.md`, "Fora da tela").
- Busca sem diferenciar acentos (L4, opção 2), índice de busca e restauração de cliente excluído.
- Dependência nova, migration e registro de decisão.
