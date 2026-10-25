---
issue: 39
titulo: "Cargos e permissões no painel"
areas: [backend, banco, frontend, testes]
tipo: funcionalidade
requisitos: [UC21, RF077, RF078, RF082, RF083, RN024, RN025, RN026, RN027, RN035, RS008, RS010, RS011, RS013, RS014, RNF003, RNF004, RNF005, RNF008, RNF010, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 25/10/2026
---

# Plano: Cargos e permissões no painel

## Objetivo

Entregar o UC21 de ponta a ponta: o funcionário com a permissão `staff` cria, edita, desativa e reativa cargos na aba "Cargos" de `/admin/staff`, escolhendo as páginas do painel que cada cargo libera (RF082, RF083, RN025, RN026), pelas rotas:

- `GET /api/admin/roles`, com `includeInactive`, `page` e `pageSize`, em ordem alfabética e 20 por página (RNF008);
- `POST /api/admin/roles`, com `name*`, `description` e `permissionKeys*`, que responde 201 com o cargo ativo;
- `PATCH /api/admin/roles/:id`, com `name`, `description`, `permissionKeys`, `isActive` e o `updatedAt` (RNF011, decisão 0009), que responde 200;
- as três com `requirePermission("staff")` (RS008, RS010); 409 `NAME_IN_USE` para o nome repetido (RN035) e 409 `VERSION_CONFLICT`; o cargo e as permissões são gravados por uma função SQL `save_role`, numa transação (RNF010).

A aba "Cargos" passa a usar as rotas e o banco de verdade: saem da lista de demonstração (`src/lib/demo/routes.ts`) as três entradas, os cargos de `src/lib/demo/staff.ts` e o aviso de demonstração da aba (decisão 0055); a aba ganha o esquema de validação no formulário. O aviso passa a ficar só na aba "Funcionários" (#43). Os cargos de demonstração vêm do banco, pelo `supabase/seed-demo.sql` (P3). O cadastro de funcionário (`StaffRoleStep`, na mesma página) já lê os cargos ativos por `GET /api/admin/roles?pageSize=50`: passa a ler os reais sem mudança. A especificação OpenAPI ganha as três operações.

Efeito sobre o acesso, já pronto e só conferido (RS011): `loadAccount` lê a situação, o cargo e as permissões a cada requisição, e `listStaffPermissions` (`src/server/auth/session.ts`) já devolve nenhuma permissão para o cargo inativo. Não se muda `session.ts` nem `guards.ts`.

Há uma migration (`save_role`), que o Yvan aplica antes da pré-visualização; eu nunca a aplico. Sem dependência nova.

## Base da construção

- Ramificação `feat/39-roles`, criada da `origin/main` (430a408, com a #41: PR #112), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`; o worktree (`claude/confident-bell-bc9d45`) está em 430a408, igual à `origin/main`.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondPage`, `requirePermission`, `getServiceClient`, `AppError` (`NAME_IN_USE`, `VERSION_CONFLICT`, `NOT_FOUND`); em `formats.ts`: `entityNameSchema`, `plainTextSchema`, `optionalFormat`, `DESCRIPTION_MAX_LENGTH`; em `params.ts`: `idSchema`, `paginationSchema`, `booleanQuerySchema`, `updatedAtSchema`; `PERMISSIONS`; no cliente: `apiRequest`, `useApiQuery`, `usePaginatedList`, `useFormFailure`, `FormAlert`, `FormField`, `StepForm`, `ActiveConfirm`, `InactiveSwitch`.
- Moldes: `app/api/admin/categories/`, `server/services/catalog.ts`, `server/repositories/categories.ts` e `shared/validation/catalog.ts` (#40: `PATCH` condicionado ao `updated_at`, `booleanQuerySchema`, `NAME_IN_USE`, `VERSION_CONFLICT`, foco no controle da lista); `save_*` em SQL segue `20261019163437_login_attempt_functions.sql` (`set search_path = ''`, `revoke` de `public`, `anon` e `authenticated`, `grant` ao `service_role`).
- Já prontos da #65 e mantidos: `RoleList`, `RoleCard`, `RoleFormDialog`, `RoleDataStep`, `RolePermissionsStep`, `role-form-values.ts`, com `toRequestBody` já montando o corpo (`name`, `description`, `permissionKeys`) e o `updatedAt` enviado na edição.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/roles` | `includeInactive` (padrão falso), `page`, `pageSize` | 200 página de `id`, `name`, `description` (ou `null`), `permissionKeys` (na ordem de RN025), `isActive`, `updatedAt`, por nome |
| `POST /api/admin/roles` | `name*`, `description`, `permissionKeys*` (ao menos uma) | 201 o cargo, ativo; 400 `VALIDATION_ERROR` com `fields`; 409 `NAME_IN_USE` |
| `PATCH /api/admin/roles/:id` | `name`, `description`, `permissionKeys`, `isActive`, `updatedAt*`; ao menos um campo | 200 o cargo; 400; 404 `NOT_FOUND` (inclusive id que não é UUID); 409 `NAME_IN_USE` ou `VERSION_CONFLICT` |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem a permissão `staff` ou origem recusada), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500.
- Campos não previstos (`id`, `updatedAt` no `POST`, `createdAt`) são descartados (RS013). No `PATCH`, só muda o que veio; `description` vazia vira `null`; `permissionKeys` enviada substitui o conjunto inteiro; chaves repetidas são reduzidas e voltam na ordem de RN025.
- Não há `DELETE`: o cargo é desativado, nunca excluído (RN026, `dados.md`).

### Esquemas (`src/shared/validation/staff.ts`, novo), TDD

| Esquema | Regras |
|---|---|
| `roleInputSchema` (corpo do `POST`) | `name`: `entityNameSchema` (RN035); `description`: opcional, `plainTextSchema(DESCRIPTION_MAX_LENGTH)`, vazia vira `null`; `permissionKeys`: lista de chaves de `PERMISSIONS`, com ao menos uma (RN025), sem repetição e na ordem de RN025; chave desconhecida, lista vazia ou ausente → mensagens de L2, no campo `permissionKeys` |
| `roleUpdateSchema` (corpo do `PATCH`) | os mesmos campos, todos opcionais, mais `isActive` e `updatedAt` obrigatório (`updatedAtSchema`); sem nenhum campo além de `updatedAt` → "Informe ao menos um campo para alterar." (a mensagem da #40); `permissionKeys` enviada precisa ter ao menos uma |
| `roleListQuerySchema` | `paginationSchema(ADMIN_LIST_PAGE_SIZE)` com `includeInactive` (`booleanQuerySchema`, padrão falso) |

O formulário **usa** `roleInputSchema` no navegador, por `zodResolver`, como o de categoria da #40: os campos do formulário são os do esquema, e o critério pede "o esquema de validação no formulário". Saem as regras soltas de `RoleDataStep` e `RolePermissionsStep`, e a mensagem de "nenhuma permissão" passa a ser a do esquema (L2).

### Banco (decisões 0006, 0042; `docs/padroes/banco.md`)

Migration `supabase/migrations/<data>_save_role_function.sql` (`npx supabase migration new save_role_function`), só acrescenta uma função:

```sql
save_role(p_id uuid, p_name text, p_description text, p_is_active boolean,
          p_permission_keys public.permission_key[], p_updated_at timestamptz)
  returns uuid
```

- `p_id` nulo: insere o cargo (ativo ou como vier) e as permissões. `p_id` e `p_updated_at`: `update public.roles … where id = p_id and updated_at = p_updated_at`; se nenhuma linha muda, devolve `null` (cargo inexistente ou versão antiga; o serviço distingue). O `update` roda sempre, então `updated_at` muda pelo gatilho `trg_roles_updated_at` também quando só as permissões mudam (RNF011).
- As permissões do cargo são substituídas: `delete from public.role_permissions where role_id = …` e `insert … select unnest(p_permission_keys)`; lista vazia ou nula → `raise exception` (RN025, a defesa do banco para quem chamar a função fora da API).
- O nome repetido sai como `unique_violation` de `uq_roles_name` (índice de `lower(name)` já existente), que o repositório converte em `NAME_IN_USE`; dois salvamentos ao mesmo tempo nunca gravam os dois.
- `set search_path = ''`, `revoke all … from public, anon, authenticated`, `grant execute … to service_role` (decisão 0042). O serviço mescla o `PATCH` com o cargo atual antes de chamar a função, então ela recebe sempre o conjunto completo; a condição de versão usa o `updatedAt` do cliente, não o lido.
- `docs/equipe/dados.md`: a linha de `save_role` na seção "Gravações em várias tabelas" ganha a assinatura e o retorno.

### Backend (decisões 0003, 0005, 0006, 0010)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/roles/route.ts` | `GET`: guard, `roleListQuerySchema.parse`, `listRoles`, `respondPage`. `POST`: guard, `roleInputSchema.parse(body)`, `createRole`, `respondCreated` |
| Rota | `app/api/admin/roles/[id]/route.ts` | `PATCH`: guard, `idSchema` (inválido → `NOT_FOUND`), `roleUpdateSchema.parse(body)`, `updateRole`, `respondOk` |
| Serviço | `server/services/staff.ts` | módulo `staff` (novo; `listRoles`, `createRole`, `updateRole`); o `updateRole` lê o cargo, mescla, grava e, sem linha gravada, decide `NOT_FOUND` ou `VERSION_CONFLICT`, como o `updateCategory` |
| Repositório | `server/repositories/roles.ts` | `listRoles(includeInactive, page, pageSize)` com `role_permissions(permission_key)` embutido e as chaves na ordem de RN025; `findRole(id)`; `saveRole(...)` por `rpc("save_role")` e releitura; conversão de `uq_roles_name` em `NAME_IN_USE` |

- O tipo `AdminRole` já existe em `src/shared/api/staff.ts` e não muda.
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: aba "Cargos" de `/admin/staff`

Conteúdo, textos e estados já definidos em `docs/equipe/equipe-do-painel.md` (#65); o que muda:

- `role-form-dialog.tsx`: `zodResolver(roleInputSchema)`; sai o comentário de demonstração; `clearErrors()` antes do envio, porque a rota devolve erro em campo que a pessoa já corrigiu (`NAME_IN_USE` em `name`, `fields` em `permissionKeys`); a falha põe o aviso no topo, com o foco, e o erro de `name` leva à etapa 1 (UC21 FE02); o 409 `VERSION_CONFLICT` relê a lista e a janela recebe os dados atuais.
- `role-data-step.tsx` e `role-permissions-step.tsx`: saem as `rules` de demonstração; a mensagem vem do esquema.
- `role-card.tsx`: o texto de desativar muda (L1); com "Exibir inativos" desligado, o cartão desativado sai da lista e o foco vai ao interruptor da lista (`componentes.md`, como o `CategoryCard`), por isso o `RoleList` passa `isInactiveShown` ao cartão.
- `staff-tabs.tsx` e `app/(admin)/admin/staff/page.tsx`: o `DemoNotice` sai da página e entra só na aba "Funcionários", como a #40 fez nos serviços; ele sai de vez na #43.
- `src/lib/demo/routes.ts`: saem `GET`, `POST` e `PATCH` de `/api/admin/roles` e o comentário passa a citar só a #43. `src/lib/demo/staff.ts`: sai `answerAdminRoles`; a lista interna de cargos fica só como dado dos funcionários de demonstração, sem `permissionKeys` nem situação.
- **O que depende dessas rotas na mesma tela.** O cadastro e a edição de funcionário (`StaffRoleStep`) leem os cargos ativos reais; com o banco sem cargo ativo, aparece o aviso "Não há cargo ativo…" e o botão que leva à aba "Cargos" (pré-condição do UC19). A lista de funcionários continua em demonstração (#43), com os cargos de demonstração dela; as duas abas não se misturam. Fora da página nada depende: o efeito nas permissões (critérios 5 e 6) já é o de `loadAccount`.
- **Dados de demonstração vindos do banco.** `supabase/seed-demo.sql` ganha quatro cargos (Gerente, Atendente, Detalhista e Auxiliar, este inativo) com as permissões que `staff.ts` mostrava, ids por `glow_demo_id('role:<nome>')` e `on conflict do nothing`; `seed.sql` não muda (nenhum cargo em produção; o administrador não tem cargo, RN027). Quem carrega o `seed-demo.sql` é o Yvan, pelo SQL Editor (passo dele, listado no relatório).

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/roles` (`listRoles`, `createRole`) e `/api/admin/roles/{id}` (`updateRole`) na tag `staff`, com `sessionCookie`; os esquemas `AdminRole`, `RoleInput` e `RoleUpdate` (e a página); as respostas existentes `NotFound`, `NameInUse`, `VersionConflict`, `ValidationError`, `Unauthenticated`, `PanelForbidden`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado o cargo novo "Recepção", com `dashboard` e `appointments`, quando confirmo, então ele aparece na listagem com as duas permissões (UC21) | Testes de `roleInputSchema` (corpo válido normalizado, ordem de RN025). Local, pelo roteiro: `POST` responde 201 com as duas permissões e `GET` traz o cargo. Na tela: "Novo cargo", nome "Recepção", "Próximo", marcar Dashboard e Agendamentos, "Cadastrar cargo": a janela fecha e o cartão aparece com "2 permissões" e as duas etiquetas |
| Dado o nome vazio, quando avanço, então a mensagem aparece e a etapa das permissões não abre (UC21 FE01) | Testes: nome vazio ou só espaços → "Preencha este campo.". Na tela: "Próximo" com o nome vazio mostra a mensagem no campo, com o foco nele, e a etapa 2 não abre. Local: `POST` sem nome → 400 com `fields.name` |
| Dado um cargo sem nenhuma permissão, quando confirmo, então recebo a mensagem de que o cargo deve conceder ao menos uma permissão, e nada é gravado (UC21 FE03, RN025) | Testes: `[]`, ausente, `null` e chave desconhecida em `permissionKeys` (L2); edição que esvazia as permissões. Local: `POST` e `PATCH` com `[]` → 400 com a mensagem em `fields.permissionKeys` e o `GET` seguinte igual ao anterior; `save_role` chamada direto com lista vazia → erro do banco. Na tela: cadastrar sem marcar nada mostra a mensagem junto às caixas e nada é gravado |
| Dado um nome já usado por outro cargo, quando confirmo, então recebo a mensagem de `NAME_IN_USE` (UC21 FE02, RN035) | Local: `POST` com "Recepção" repetido, também em outra caixa ("recepção"), responde 409 `NAME_IN_USE` ("Já existe um cadastro com este nome.") e `PATCH` renomeando para o de outro cargo também; nada gravado (nem as permissões novas). Na tela: a mensagem aparece no topo da janela, o foco vai ao aviso e a janela volta à etapa 1; ao corrigir o nome e confirmar, grava |
| Dado um cargo com funcionários, quando tiro uma permissão, então, na requisição seguinte, eles deixam de ver a página no painel e recebem 403 na rota dela (UC21 FA01, RS011) | Local, pelo roteiro: o funcionário B (cargo com `appointments` e `clients`) recebe 200 em `GET /api/admin/clients`; o funcionário A (cargo com `staff`) tira `clients` do cargo de B; B recebe 403 `FORBIDDEN` na rota seguinte, `GET /api/auth/me` de B já não traz `clients`, e a página `/admin/clients` volta com o aviso de acesso negado (`proxy.ts`). O `updatedAt` do cargo muda mesmo quando só as permissões mudam |
| Dado um cargo desativado, quando seus funcionários entram, então ficam sem páginas no painel, e a lista de cargos ativos não o traz (UC21 FA02, RN026) | Local: desativar o cargo de B (`PATCH` com `isActive` falso) → `GET /api/admin/roles` sem `includeInactive` não o traz; B entra de novo e `GET /api/auth/me` traz `permissions` vazia, `/admin/*` volta com o aviso e toda rota do painel responde 403; reativar devolve as permissões. Na tela: "Desativar" com a confirmação, o cartão sai da lista e o foco vai ao interruptor "Exibir inativos". O texto da confirmação é o de L1 |
| Dado a opção de exibir inativos, quando a ligo, então os cargos inativos aparecem e podem ser reativados (UC21 FA03) | Local: `GET` com `includeInactive=true` traz o "Auxiliar" do `seed-demo.sql` com `isActive` falso e sem a opção não traz. Na tela: ligar o interruptor mostra o cartão com "Inativo" e o botão "Reativar"; reativar mostra "Ativo" |
| Dado a migration no banco local, quando aplicada, então `save_role` grava o cargo e as permissões numa transação, e `anon` e `authenticated` não a executam (decisão 0042) | Local, `npx supabase db reset` aplica a migration sem erro. Roteiro: `rpc("save_role")` com a chave `anon` e com a de um usuário logado (`authenticated`) → `permission denied`; com a do serviço grava; uma chamada com lista vazia ou com nome repetido não deixa o cargo nem as permissões pela metade (cargo e permissões são lidos antes e depois). Sem `docker exec`: tudo pelo `supabase-js` |

Outros casos, também pelo roteiro de rotas e pelos testes: `PATCH` só com `updatedAt` → 400 "Informe ao menos um campo para alterar."; `updatedAt` antigo → 409 `VERSION_CONFLICT` e nada gravado (nem as permissões); id inexistente e id que não é UUID → 404; `name` de 1 e de 61 caracteres → "Use de 2 a 60 caracteres."; `description` com 501 caracteres → "Use até 500 caracteres."; campos não previstos descartados (`id`, `createdAt`); funcionário sem a permissão `staff`, cliente e sem sessão → 403 e 401, `Origin` ausente → 403, `Content-Type` fora de JSON → 415, nada gravado (RS010); `includeInactive=abc` → 400; paginação de 20.

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, na aba "Cargos" e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto), vazio (banco local só com o `seed.sql`: "Nenhum cargo cadastrado"), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação no formulário (nome vazio, nenhuma permissão), `NAME_IN_USE`, `VERSION_CONFLICT` (duas janelas, a segunda grava depois da primeira: aviso no topo e dados atuais na janela), falha do salvar (500) e de acesso (403);
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, com a janela de duas etapas e a lista de cartões;
- teclado completo: as abas, "Novo cargo", cada caixa de permissão (Espaço), "Próximo", "Voltar", "Cadastrar cargo", "Desativar" e "Reativar", o foco no aviso do topo na falha e voltando ao campo, e o foco no interruptor "Exibir inativos" quando o cartão desativado sai da lista;
- Lighthouse de acessibilidade em `/admin/staff`, na aba "Cargos" (lista, janela da etapa 1 e da etapa 2 com a falha exibida, em `snapshot`), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` com o `seed.sql`, depois o `seed-demo.sql` para os cargos de demonstração. Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois.
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `staff`), funcionário B (cargo com `appointments` e `clients`), um funcionário sem a permissão `staff` e um cliente, criados pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #41 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `make-cookie.mjs`, `lh-*`, `local-env.sh`, `start.sh`, `restart.sh`) e novos para esta tarefa: `verify-roles-api.mjs` (rotas, permissões e `save_role`), `ui-states.mjs`, `ui-flow.mjs` e `ui-keyboard.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` que vem com o Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nas opções do `Select` já abertas no DOM, os roteiros escolhem só as visíveis. Alterações temporárias para os estados (requisição retida, falha, vazio) ficam sem commit e são desfeitas por `git checkout -- src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Pré-visualização e produção**, passo do Yvan, listado no relatório: aplicar a migration (`npx supabase db push`) **antes** de abrir a pré-visualização, carregar o `seed-demo.sql` se quiser os cargos de demonstração, e conferir logado a aba "Cargos" (a pré-visualização usa o banco de produção, decisão 0030; os cargos criados nela são dados reais).

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<data>_save_role_function.sql` | criar: `save_role` |
| `supabase/seed-demo.sql` | alterar: os quatro cargos e o cabeçalho |
| `src/app/api/admin/roles/route.ts` | criar: `GET` e `POST` |
| `src/app/api/admin/roles/[id]/route.ts` | criar: `PATCH` |
| `src/app/api/admin/roles/README.md` e `[id]/README.md` | criar, se a pasta pedir (como `categories/`) |
| `src/server/services/staff.ts` | criar: `listRoles`, `createRole`, `updateRole` |
| `src/server/repositories/roles.ts` | criar |
| `src/shared/validation/staff.ts` | criar: `roleInputSchema`, `roleUpdateSchema`, `roleListQuerySchema` |
| `src/shared/validation/README.md` | alterar: os esquemas novos |
| `src/components/admin/roles/role-form-dialog.tsx` | alterar: `zodResolver`, `clearErrors`, falha |
| `src/components/admin/roles/role-data-step.tsx` | alterar: saem as regras de demonstração |
| `src/components/admin/roles/role-permissions-step.tsx` | alterar: saem as regras de demonstração |
| `src/components/admin/roles/role-card.tsx` | alterar: texto (L1) e foco |
| `src/components/admin/roles/role-list.tsx` | alterar: `isInactiveShown` |
| `src/components/admin/staff/staff-tabs.tsx` | alterar: o aviso só na aba "Funcionários" |
| `src/app/(admin)/admin/staff/page.tsx` | alterar: sai o aviso e o comentário de demonstração |
| `src/lib/demo/routes.ts` | alterar: saem as três entradas de cargos |
| `src/lib/demo/staff.ts` | alterar: sai `answerAdminRoles` |
| `tests/validation/staff.test.ts` | criar: os três esquemas |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/equipe/equipe-do-painel.md` | alterar: sai o parágrafo do aviso para os cargos e o item sobre a rota; entram os textos de L1, L2 e L3 |
| `docs/equipe/RN026-desativacao.md` | alterar (L1) |
| `docs/equipe/dados.md` | alterar: assinatura de `save_role` |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as linhas novas (L2) |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita os esquemas de cargo |
| `docs/plataforma/infraestrutura.md` | alterar só se descrever o conteúdo do `seed-demo.sql` (será conferido) |
| `memoria/tarefas/39-cargos-e-permissoes/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/`, `src/components/admin/roles/`, `src/lib/demo/` e `tests/validation/` já cobrem os arquivos e não mudam (o de `src/lib/demo/` será conferido: se citar `staff.ts`, entra na lista).

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em 430a408 (#41).
- **#42** (clientes), da mesma onda: nenhum arquivo em comum além de `src/lib/demo/routes.ts`, compartilhado; a conferência de conflito é no momento do PR.
- **#43** (funcionários): usa a mesma página; `staff-tabs.tsx` e `page.tsx` (aviso) e `src/lib/demo/staff.ts` (funcionários) também são dela. Ao fim, deixo um comentário na #43 com o que esta tarefa deixou (rotas e o `StaffRoleStep` lendo os cargos reais, o `listRoles` do repositório, `findRole`, o aviso na aba, os ids dos cargos do seed).
- **#44, #46 e as demais** que dependem de cargos: nenhum arquivo em comum.

## Testes previstos

Valores esperados tirados de RN025, RN035, `mensagens-de-validacao.md` e das opções recomendadas de L2. Escritos antes do código e conferidos em vermelho, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/staff.test.ts`, `roleInputSchema`:

- accepts a role with two permissions and keeps the order of RN025: `["appointments", "dashboard"]` → `["dashboard", "appointments"]` ("Recepção", critério 1)
- accepts the six permissions
- drops the repeated permissions
- turns an empty or blank description into null and keeps a filled one
- requires the name: vazio e só espaços → "Preencha este campo."
- rejects a name outside the format of RN035: 1 e 61 caracteres → "Use de 2 a 60 caracteres."
- rejects a description over 500 characters → "Use até 500 caracteres."
- requires at least one permission: `[]`, ausente e `null` → "O cargo deve conceder ao menos uma permissão." em `permissionKeys` (UC21 FE03)
- rejects an unknown permission: `"billing"`, número e `null` na lista → a mensagem de L2
- discards the unknown fields: `id`, `isActive`, `updatedAt`, `createdAt`

`roleUpdateSchema`:

- requires `updatedAt` and keeps it as text (a mesma regra das categorias)
- accepts a single field: só `isActive`, só `name`, só `permissionKeys`
- rejects a body with only `updatedAt` → "Informe ao menos um campo para alterar."
- rejects an empty `permissionKeys` and keeps the other rules of the input
- discards the unknown fields

`roleListQuerySchema`:

- defaults to the active ones, 20 per page, and accepts `includeInactive=true`/`false`
- rejects `includeInactive` that is not true or false e `pageSize` acima de 50

Sem teste automático para rota, serviço, repositório, `save_role` e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Efeito da desativação do cargo sobre os funcionários que já o têm

**Problema.** A documentação diz coisas diferentes. `RN026`: "o cargo desativado não pode ser atribuído a funcionários". `dados.md` (tabela `roles`): "cargo inativo não concede permissões nem pode ser atribuído". O critério da issue (UC21 FA02): "quando seus funcionários entram, então ficam sem páginas no painel". Já `equipe-do-painel.md` e a confirmação da tela (#65) dizem "Os funcionários que já o têm continuam com ele", o que o leitor entende como continuarem com acesso. O código de acesso (`listStaffPermissions`) já concede nenhuma permissão a cargo inativo, e o comentário da #39 pede a decisão.

**Opções:**

- [x] **1. O cargo inativo não concede permissões (recomendada).** Vale `dados.md`, o critério da issue e o código que já existe: os funcionários do cargo ficam sem páginas até receberem outro cargo (que a #43 permite) ou até o cargo ser reativado. Só o texto da confirmação e a RN026 mudam; não há código novo.
- [ ] **2. Os funcionários mantêm as permissões do cargo desativado.** Contraria `dados.md` e o critério 6 da issue, exige mudar `listStaffPermissions` (`session.ts`) e `dados.md`, e deixa o cargo "desativado" valendo só para novas atribuições.

**Texto proposto (opção recomendada):**

- `docs/equipe/RN026-desativacao.md`: "O funcionário desativado não acessa o painel administrativo, e o cargo desativado não pode ser atribuído a funcionários." passa a "O funcionário desativado não acessa o painel administrativo, e o cargo desativado não pode ser atribuído a funcionários nem concede permissões: os funcionários que o têm ficam sem acesso às páginas do painel até receberem outro cargo ou até o cargo ser reativado."
- `docs/equipe/equipe-do-painel.md`, "Desativar e reativar cargo": a descrição passa a "O cargo deixa de poder ser atribuído a funcionários. Os funcionários que o têm ficam sem acesso às páginas do painel até receberem outro cargo ou até você reativá-lo." (a mesma frase no `role-card.tsx`), e o último item (efeito "da rota (#39)") é trocado por "A desativação vale na requisição seguinte dos funcionários do cargo (RS011)."

### L2. Textos de erro da API para as permissões

**Problema.** UC21 FE03 pede "informar que o cargo deve conceder ao menos uma permissão" e a issue repete a mensagem, mas `mensagens-de-validacao.md` não tem a linha, e a tela da #65 usa outro texto ("Selecione ao menos uma permissão."), que a rota (RS013) deve repetir para quem chama sem a tela. Também não há texto para uma chave de permissão que não existe.

**Opções:**

- [x] **1. Um só texto para a tela e para a rota, mais um para a chave desconhecida (recomendada).** "O cargo deve conceder ao menos uma permissão." (a redação do UC21 FE03) em `permissionKeys`, na tela e na rota; "Escolha apenas páginas do painel." para a chave desconhecida. A tela passa a mostrar o texto do esquema, sem regra solta.
- [ ] **2. Dois textos.** A tela mantém "Selecione ao menos uma permissão." e a rota usa a do UC21: dois textos para o mesmo erro, e o esquema compartilhado não serve ao formulário.

**Texto proposto (opção recomendada):**

- `docs/plataforma/mensagens-de-validacao.md`, depois da linha "Nome da empresa, endereço, descrições e termo de busca": duas linhas: "Cargo sem nenhuma permissão | O cargo deve conceder ao menos uma permissão." e "Permissão que não é uma página do painel | Escolha apenas páginas do painel."
- `docs/equipe/equipe-do-painel.md`, "Novo cargo", etapa 2: "Sem nenhuma marcada, o envio indica 'Selecione ao menos uma permissão.' (FE03)." passa a "Sem nenhuma marcada, o envio indica 'O cargo deve conceder ao menos uma permissão.' (FE03)."

### L3. Cargo que o funcionário edita ou desativa e que o próprio funcionário tem

**Problema.** Nada diz o que acontece quando quem edita é do cargo editado: tirar `staff` do próprio cargo, ou desativá-lo, tira a página do próprio funcionário na requisição seguinte (RS011), e o painel depende de alguém com `staff`. `RN027` garante o administrador, que não tem cargo, sempre com todas as permissões.

**Opções:**

- [x] **1. Permitir, sem bloqueio (recomendada).** A conta de administrador (RN027) sempre recupera o acesso; nenhuma regra pede o bloqueio, e a rota não precisa saber o cargo de quem chama. Sem código novo; só se registra a consequência na documentação.
- [ ] **2. Bloquear na rota.** Recusar a retirada de `staff` ou a desativação do cargo de quem chama, com código de erro e mensagem novos, no serviço e na tela; é regra que `docs/` não define e depende de um texto a aprovar.

**Texto proposto (opção recomendada):**

- `docs/equipe/RN027-administrador.md`, no fim do texto: "Por isso o acesso ao painel nunca se perde por completo: se um cargo perde a permissão de funcionários, ou é desativado, o administrador ainda gerencia os cargos e os funcionários." (a retirada da permissão do próprio cargo não é bloqueada).

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js` e migration SQL), 0008 (validação compartilhada), 0009 (concorrência por `updated_at`), 0010 e 0012 (permissões por página e a enumeração `permission_key`), 0022 (exclusão lógica), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos), 0043 (banco local), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `banco.md`, `componentes.md` e `frontend.md`.
- A gravação do cargo e das permissões é uma função SQL chamada por `rpc` (RNF010, `backend.md`), com a migration própria que `banco.md` manda; os parâmetros são definidos aqui, no plano.
- Nenhuma nova.

## Riscos e dúvidas

- **Migration aplicada antes do código publicado.** A função só acrescenta; nada que o código publicado use é removido (`migration.md`, passo 2). Pelo `migration.md`, o Yvan a aplica depois da aprovação do PR e antes da incorporação, e a pré-visualização só funciona com ela aplicada.
- **`rpc` e o tipo `permission_key[]`.** O `supabase-js` envia a lista de textos para o parâmetro de enumeração; é conferido na verificação local (chave desconhecida volta erro do banco, que os esquemas impedem antes).
- **Mensagem do `unique_violation` dentro da função.** O repositório depende de `uq_roles_name` no texto do erro, como o de categorias; conferido no banco local com a função.
- **Releitura depois do `rpc`.** O cargo é lido de novo depois da transação; se outra gravação entrar entre as duas, a resposta traz a dela (o `updatedAt` mais novo), o que a tela trata como o conflito seguinte.
- **Cargo sem funcionário no `seed`.** O `seed-demo.sql` não cria funcionários (precisariam de contas no Auth); os cartões não mostram a quantidade de funcionários, então não faz falta. Os funcionários de demonstração da #43 usam ids de cargo próprios e só valem até a #43.
- **Produção.** Os cargos criados na pré-visualização são dados reais; passo do Yvan, no relatório.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 360 linhas adicionadas (rotas 45, serviço 60, repositório 110, esquemas 70, formulário e cartão 50, ajustes da página 25), contra cerca de 90 removidas (cargos de demonstração e regras soltas), mais a migration (~60 linhas de SQL), cerca de 160 de testes e as especificações.

### P1. Divisão em PRs

- [x] **1. Um PR só (recomendada).** Cerca de 360 linhas em `src/`, abaixo das ~400, com a migration, a tela ligada às rotas e a verificação completa antes de marcar como pronto, `memoria/tarefas/39-…` e "Closes #39".
- [ ] **2. Dois PRs encadeados (API com a migration, e tela).** Como na #40; o primeiro deixaria a tela em demonstração por mais um ciclo de revisão, e a migration seria aplicada antes do segundo.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência da migration e da gravação real.

### P3. Dados de demonstração dos cargos

- [x] **1. Quatro cargos no `seed-demo.sql` (recomendada).** Gerente, Atendente, Detalhista e Auxiliar (inativo), iguais ao que a demonstração mostrava, por `glow_demo_id('role:<nome>')`; a aba abre com a demonstração vinda do banco depois que o Yvan carrega o arquivo. O `seed.sql` não muda.
- [ ] **2. Nenhum cargo de demonstração.** A aba abre vazia em qualquer banco novo e o "Exibir inativos" só aparece depois de a pessoa criar e desativar um cargo; a demonstração do `Exibir inativos` deixa de existir.

### P4. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível do `infraestrutura.md` (se descrever o `seed-demo.sql`) ou de um componente que a conferência do teclado exija.
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Funcionários: lista, cadastro, edição e desativação, e o texto de `EMAIL_IN_USE` do painel (#43); o aviso de demonstração da aba "Funcionários" sai com a #43.
- Excluir cargos (desativar é o que existe, RN026) e contar os funcionários do cargo no cartão (`rotas.md` não tem o campo).
- Bloquear a retirada da permissão `staff` do próprio cargo (L3, opção 2).
- Permissões por ação dentro da página: cada permissão dá acesso completo à página (RN025).
- Dependência nova e registro de decisão.
