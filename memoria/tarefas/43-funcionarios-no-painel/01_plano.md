---
issue: 43
titulo: "Funcionários no painel: cadastrar, editar, desativar e reativar"
areas: [backend, frontend, banco, testes]
tipo: funcionalidade
requisitos: [UC19, UC20, RF077, RF078, RF079, RF080, RF081, RF084, RN022, RN023, RN024, RN026, RN027, RS003, RS004, RS008, RS010, RS011, RS013, RNF002, RNF005, RNF008, RNF011]
status: concluido
aprovado_por: yvan
aprovado_em: 20:15 - 25/10/2026
---

# Plano: Funcionários no painel: cadastrar, editar, desativar e reativar

## Objetivo

Entregar o UC19 e o UC20 de ponta a ponta: o funcionário com a permissão `staff` lista, cadastra, edita, desativa e reativa funcionários na aba "Funcionários" de `/admin/staff`, pelas rotas de `docs/equipe/rotas.md`, todas com `requirePermission("staff")` (RS008, RS010):

- `GET /api/admin/staff`, com `includeInactive`: 20 por página, em ordem alfabética, **sem a conta de administrador** (RN027), com `roleName` e `jobTitle` (ou `null`);
- `POST /api/admin/staff`: cria a conta no Supabase Auth (`createAccount`, e-mail já confirmado, decisões 0015 e 0044), grava o perfil em `staff` com o mesmo `id`, `must_change_password` verdadeiro e o cargo, e remove a conta se o perfil falhar (`backend.md`); 201; 400 com `fields`; 409 `EMAIL_IN_USE`;
- `PATCH /api/admin/staff/:id`: edita (nome, sobrenome, cargo na empresa e cargo do sistema), desativa ou reativa, condicionado ao `updatedAt` (RNF011, decisão 0009); 200; 404; 409 `VERSION_CONFLICT`.

**A aba deixa de ser demonstração** (orientação do Yvan e decisão 0055): saem de `src/lib/demo/routes.ts` as três entradas de `/api/admin/staff`; `src/lib/demo/staff.ts` é apagado (nenhum outro módulo o usa, e os cargos dele têm ids que não existem no banco); sai o `DemoNotice` da aba "Funcionários" (`staff-tabs.tsx`); o formulário passa a usar o esquema de validação no navegador (critério da issue). A demonstração vem do banco: o `supabase/seed-demo.sql` passa a cadastrar funcionários fictícios (L7), e quem o carrega é o Yvan.

**O que depende dessas rotas na mesma tela.** O cadastro e a edição leem os cargos ativos reais por `GET /api/admin/roles` (#39), sem mudança. Nada fica em demonstração depois desta tarefa: a tela inteira de `/admin/staff` é real, então `staff-tabs.tsx` não tem mais aviso. Depois da #43, o `DemoNotice` e `src/lib/demo/` continuam existindo para as telas que ainda não têm rota (#45, #46, #51…).

**Migration: nenhuma.** O perfil é uma linha de uma só tabela (`staff`), gravada por `insert` e por `update` condicionado ao `updated_at`, como o cliente (#42); a conta do Auth é criada antes e removida se o `insert` falhar. `dados.md` só pede função SQL para gravação em várias tabelas, e aqui não há. O banco já garante e-mail único em minúsculas, cargo obrigatório fora do administrador e um só administrador. Sem dependência nova nem registro de decisão.

## Base da construção

- Ramificação `feat/43-staff`, criada da `origin/main` (aa16bf8, com a #44: PRs #115 e #116), sem vínculo com a `main`, e `npx -y npm@11.21.1 ci`. O worktree (`claude/zealous-rhodes-1cba1f`, pasta `56-base-da-demonstracao-e6d9a4`, herdada e não renomeável) está em aa16bf8, árvore limpa.
- Contratos usados sem mudança: `handleRoute`, `respondOk`, `respondCreated`, `respondPage`, `requirePermission`, `getServiceClient`, `createAccount` e `deleteAccount` (`server/auth/accounts.ts`), `AppError` (`NOT_FOUND`, `VERSION_CONFLICT`, `EMAIL_IN_USE` com `message` própria, `VALIDATION_ERROR` com `fields`); em `formats.ts`: `personNameSchema`, `emailSchema`, `passwordSchema`, `jobTitleSchema`, `optionalFormat`; em `params.ts`: `idSchema`, `paginationSchema`, `booleanQuerySchema`, `updatedAtSchema`; tipos `AdminStaffMember` e `AdminRole` (`src/shared/api/staff.ts`, não mudam); `findRole` (repositório de cargos, #39); no cliente: `apiRequest`, `usePaginatedList`, `PaginatedList`, `useFormFailure`, `FormAlert`, `FormField`, `StepForm`, `ConfirmDialog`, `InactiveSwitch`.
- Moldes: `services/clients.ts` e `repositories/clients.ts` (`createClient` com conta e perfil, `updateClient` condicionado ao `updated_at`, `NAME`/`EMAIL_IN_USE` pela restrição), `services/roles.ts` e `shared/validation/staff.ts` (cargo), `RoleCard` e `client-form-dialog.tsx` (foco depois de desativar, `zodResolver`, `clearErrors`).
- Já prontos da #65 e mantidos: `StaffList`, `StaffCard`, `StaffFormDialog`, `StaffDataStep`, `StaffRoleStep`, `ActiveConfirm`.

## Como funciona

### Contrato da API

| Rota | Entrada | Resposta |
|---|---|---|
| `GET /api/admin/staff` | `includeInactive` (`true`/`false`), `page`, `pageSize` | 200 página de `AdminStaffMember`, sem o administrador, por nome |
| `POST /api/admin/staff` | `firstName*`, `lastName*`, `email*`, `password*`, `jobTitle`, `roleId*` | 201 `AdminStaffMember` (sempre ativo, troca de senha pendente); 400 com `fields`; 409 `EMAIL_IN_USE` |
| `PATCH /api/admin/staff/:id` | `updatedAt*` e, ao menos um, `firstName`, `lastName`, `jobTitle`, `roleId`, `isActive` | 200 `AdminStaffMember`; 400; 404; 409 `VERSION_CONFLICT` |

- Erros comuns de `api.md`: 400, 401, 403 `FORBIDDEN` (cliente, funcionário sem `staff` ou origem recusada), `ACCOUNT_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`, 413, 415 e 500.
- Campos não previstos são descartados (RS013): `id`, `email` e `password` no `PATCH`, `isActive` no `POST`, `isAdmin`, `mustChangePassword`, `roleName`, `createdAt`.
- `jobTitle` vazio no `POST` grava `null`; no `PATCH`, ausente mantém e vazio apaga. `roleName` vem do cargo ligado (`roles(name)`).

### Esquemas (`src/shared/validation/staff.ts`, que ganha os de funcionário), TDD

| Esquema | Regras |
|---|---|
| `staffInputSchema` (corpo do `POST`) | `firstName` e `lastName` (`personNameSchema`), `email` (`emailSchema`, em minúsculas), `password` (`passwordSchema`, 8 a 72 caracteres com maiúscula, número e especial; RN023), `jobTitle` (`optionalFormat(jobTitleSchema)`, 2 a 60 caracteres), `roleId` (UUID; ausente ou nulo → mensagem da L2). Mensagens de `mensagens-de-validacao.md` |
| `staffEditSchema` (formulário de edição) | `firstName`, `lastName`, `jobTitle`, `roleId` com as mesmas regras; sem e-mail nem senha |
| `staffUpdateSchema` (corpo do `PATCH`) | os quatro campos de edição opcionais, mais `isActive` e `updatedAt` obrigatório (`updatedAtSchema`); sem nenhum campo além de `updatedAt` → "Informe ao menos um campo para alterar."; `jobTitle` vazio = apagar |
| `staffListQuerySchema` | `paginationSchema(ADMIN_LIST_PAGE_SIZE)` e `includeInactive` (`booleanQuerySchema`, padrão falso) |

O formulário **usa** os esquemas no navegador (`zodResolver`, como o do cliente): `staffInputSchema` no cadastro e `staffEditSchema` na edição, de modo que há um só conjunto de regras para a rota e para a tela. Saem as `rules` de "campo preenchido" de `staff-data-step.tsx` e a de `roleId` de `staff-role-step.tsx`.

### Backend (decisões 0003, 0005, 0006, 0008, 0009, 0022)

| Camada | Arquivo | Faz |
|---|---|---|
| Rota | `app/api/admin/staff/route.ts` | `GET`: guard, `staffListQuerySchema.parse`, `listStaff`, `respondPage`. `POST`: guard, `staffInputSchema.parse(body)`, `createStaff`, `respondCreated` |
| Rota | `app/api/admin/staff/[id]/route.ts` | `PATCH`: guard, `idSchema` (inválido → `NOT_FOUND`), `staffUpdateSchema.parse`, `updateStaff`, `respondOk` |
| Serviço | `server/services/staff.ts` | novo: `listStaff`, `createStaff`, `updateStaff` |
| Repositório | `server/repositories/staff.ts` | já tem `findStaffAccount` e `clearStaffPasswordChange`; ganha `listStaff(includeInactive, page, pageSize)`, `findStaffMember(id)`, `insertStaff(...)` e `updateStaff(id, changes, updatedAt)`; todas as leituras com `is_admin = false` (RN027) |

- **Cadastro** (`createStaff`): confere o cargo (L2) **antes** de criar a conta; `createAccount`; `insertStaff` com o `id` da conta, `must_change_password` verdadeiro e `is_active` verdadeiro; se o `insert` falhar, `deleteAccount` (e, se a remoção falhar também, o `id` vai ao registro, como `createClient`); devolve o funcionário relido. `EMAIL_IN_USE` do Auth ou da restrição `uq_staff_email` sai com a mensagem do painel (L1).
- **Edição** (`updateStaff`): lê o funcionário (404 se não há ou se é o administrador, L3); se `roleId` mudou, confere o cargo (L2); grava com `update ... eq("updated_at", updatedAt)`; sem linha → `VERSION_CONFLICT`. Desativar e reativar passam pelo mesmo caminho (corpo só com `isActive` e `updatedAt`).
- **Efeito imediato (RS011).** Nada novo a escrever: o guard de `requireUser` lê `staff`, o cargo e as permissões a cada requisição (`findStaffAccount`); desativar o funcionário ou trocar o cargo vale na requisição seguinte dele. É o que o roteiro de rotas confere.
- Sem registro de negócio próprio: o tratamento único já grava a requisição com o usuário (RS014).

### Tela: aba "Funcionários" de `/admin/staff`

Conteúdo, textos e estados já definidos em `docs/equipe/equipe-do-painel.md` (#65); o que muda:

- `staff-tabs.tsx`: sai o `DemoNotice` da aba (e o import).
- `staff-form-dialog.tsx`: `zodResolver` do esquema (cadastro e edição), `clearErrors()` antes do envio, `EMAIL_IN_USE` e demais falhas no topo da janela com os dados mantidos; `EMAIL_IN_USE` leva à etapa 1 com o foco no aviso (UC19 FE02); `VERSION_CONFLICT` relê a lista e a janela recebe os dados atuais (já ligado a `onConflict`); sai o texto de demonstração do comentário.
- `staff-data-step.tsx`, `staff-role-step.tsx`, `staff-form-values.ts`: saem as regras de demonstração; a mensagem vem do esquema.
- `staff-card.tsx` e `active-confirm.tsx`: **foco depois de desativar** (lição da #39, #40 e #44): com "Exibir inativos" desligado, o cartão desativado sai da lista, e o foco vai ao interruptor "Exibir inativos" (`finalFocus` do `ConfirmDialog` que só vale quando a ação ocorreu); `VERSION_CONFLICT` na confirmação relê a lista (L8). O `StaffList` passa ao cartão se os inativos estão à mostra, como o `RoleList` faz.
- `src/lib/demo/routes.ts`: saem as três entradas de `/api/admin/staff`. `src/lib/demo/staff.ts`: apagado. `src/lib/demo/README.md` é conferido.
- `app/(admin)/admin/staff/page.tsx`: sai o comentário de demonstração, se houver.

### Dados de demonstração (`supabase/seed-demo.sql`)

Cinco funcionários fictícios, com ids por `glow_demo_id('staff:<e-mail>')` e e-mails em `example.com`: três ativos nos cargos Gerente, Atendente e Detalhista, um com descrição de cargo, e um inativo. Cada um é uma linha em `auth.users` sem senha (ninguém entra com ela) e a linha de `staff` correspondente, com `on conflict do nothing`, como o resto do arquivo. Detalhes e alternativa na L7.

### Especificação OpenAPI (`docs/plataforma/openapi.yaml`)

No mesmo PR das rotas (`api.md`): `/api/admin/staff` (`listStaff`, `createStaff`) e `/api/admin/staff/{id}` (`updateStaff`) na tag `staff`, com `sessionCookie`; os esquemas `AdminStaffMember`, `StaffPage`, `StaffInput` e `StaffUpdateInput`; as respostas existentes `NotFound`, `VersionConflict`, `ValidationError`, `Unauthenticated`, `PanelForbidden`, `ForbiddenOrigin`, `UnsupportedMediaType`, `PayloadTooLarge` e `InternalError`; o 409 `EMAIL_IN_USE` descrito como no `POST` de clientes.

## Critérios de aceitação e verificação

| Critério (Dado, Quando, Então) | Verificação |
|---|---|
| Dado nome, sobrenome, e-mail, senha inicial e um cargo ativo, quando confirmo, então o funcionário aparece na listagem; no primeiro login, ele vai a `/set-password` e depois à primeira página do cargo (UC19, RN023, RN024) | Testes de `staffInputSchema` (corpo válido normalizado: e-mail em minúsculas, nome com inicial maiúscula, `jobTitle` vazio → `null`). Local: `POST` → 201 com `isActive` verdadeiro, `roleName` e sem senha na resposta; a linha de `staff` tem o mesmo `id` da conta e `must_change_password` verdadeiro (SQL); o `GET` o traz. Na tela: "Novo funcionário" → duas etapas → "Cadastrar funcionário": a janela fecha e o cartão aparece. Entrando com a conta nova no navegador: vai a `/set-password`, troca a senha e cai na primeira página do cargo (RS004) |
| Dado dados inválidos na primeira etapa, quando avanço, então as mensagens aparecem, e a etapa do cargo não abre (UC19 FE01) | Testes de `staffInputSchema`: nome e sobrenome vazios ou com número, e-mail sem arroba, senha curta, sem maiúscula, sem número, sem especial, com 73 caracteres, `jobTitle` de uma letra e de 61 → as mensagens de RN035. Local: o mesmo pela rota → 400 com `fields`. Na tela: "Próximo" fica na etapa 1 com a mensagem em cada campo e o foco no primeiro com erro |
| Dado um e-mail já usado, quando confirmo, então recebo a mensagem de `EMAIL_IN_USE` (UC19 FE02, RN022) | Local: `POST` com o e-mail de outro funcionário, com o de um cliente, com o do administrador, com a caixa trocada e com espaços sobrando → 409 `EMAIL_IN_USE`, nada gravado (nem conta no Auth, nem linha em `staff`, conferido por SQL e pela API do Auth). Falha do `insert` depois da conta criada (provocada por SQL, p. ex. restrição temporária no banco local) → a conta é removida. Na tela: o aviso do topo com a mensagem do painel, a janela volta à etapa 1 e os dados ficam |
| Dado a etapa do cargo, quando ela abre, então só os cargos ativos aparecem (RN026) | Local: `POST` com cargo inativo ou inexistente → 400 em `roleId` (L2), nada gravado. Na tela, com o `seed-demo.sql` (cargo Auxiliar inativo): a etapa lista Gerente, Atendente e Detalhista; sem cargo ativo, o aviso e "Ir para Cargos". Na edição, o cargo atual inativo aparece marcado com "(inativo)" e pode ser mantido |
| Dado a listagem, quando a abro, então a conta do administrador não aparece (UC20, RN027) | Local: `GET` com e sem `includeInactive` não traz a conta com `is_admin`; `PATCH` no `id` do administrador → 404 e nada muda (L3). Na tela: a lista não traz "Administrador Glow" |
| Dado um funcionário com a sessão aberta, quando o desativo, então, na requisição seguinte, ele perde o acesso ao painel, e a listagem só o mostra com a opção de exibir inativos (UC20 FA01, FA02, RN026, RS011) | Local: com a sessão do funcionário B aberta (cookie), `PATCH {isActive:false, updatedAt}` → 200; a próxima requisição de B ao painel e à API → 403 `ACCOUNT_INACTIVE`; a lista sem `includeInactive` não o traz, com `true` traz; `PATCH` de reativação devolve o acesso na requisição seguinte. Na tela: "Desativar" com a confirmação, o cartão sai e o foco vai a "Exibir inativos"; ligado, aparece "Inativo" e "Reativar" |
| Dado um funcionário, quando troco o cargo dele, então, na carga seguinte, o painel dele mostra só as páginas do cargo novo (RS011) | Local: `PATCH {roleId}` de B de um cargo com `clients` para um sem → o menu e as páginas de B mudam na carga seguinte e `/api/admin/clients` passa a 403; sem alterar nada além do cargo e do `updated_at`. Na tela: "Editar" → etapa do cargo → "Salvar alterações" |
| Dado um funcionário sem a permissão `staff`, quando chama as rotas, então recebe 403 (RS008) | Local, nas três operações: funcionário de cargo sem `staff` e cliente → 403 `FORBIDDEN`; sem sessão → 401; funcionário com `staff` → 200; `POST` sem `Origin` → 403 e `Content-Type` fora de JSON → 415, nada gravado (RS010). Retirar `staff` do cargo muda a resposta na requisição seguinte |

Outros casos, pelo roteiro de rotas, pelo SQL e pelos testes: `PATCH` só com `updatedAt` → 400 "Informe ao menos um campo para alterar."; `updatedAt` antigo → 409 `VERSION_CONFLICT` sem gravar nada; duas gravações do mesmo e-mail ao mesmo tempo, só uma vale; `email`, `password`, `id` e `isAdmin` no `PATCH` descartados; `pageSize=100` volta 50 e `page=0` → 400; id inexistente e id que não é UUID → 404; `jobTitle` vazio apaga e ausente mantém; funcionário de cargo inativo consta na lista com o nome do cargo; a senha nunca aparece em resposta, registro ou erro (RS003).

Também, pela seção "Interface" de `workflows/procedimentos/testes.md`, em `/admin/staff` e antes de marcar o PR como pronto (tudo isto é feito, nenhum item sobra para o relatório):

- carregamento (requisição retida: esqueleto), vazio (banco local só com o `seed.sql`: "Nenhum funcionário cadastrado"), falha da leitura (rota fora do ar: aviso com "Tentar novamente"), sucesso, falha de validação em cada campo e em cada etapa do cadastro e da edição, `EMAIL_IN_USE`, `VERSION_CONFLICT` (duas janelas, a segunda grava depois da primeira: aviso no topo e dados atuais na janela; e na confirmação de desativar), falha do salvar e do desativar (500) e de acesso (403), cargos em carregamento, com falha e sem cargo ativo;
- 360 × 800 primeiro e 1440 × 900, nos temas claro e escuro, sem transbordar, com a lista de cartões (uma coluna, duas a partir de 768 px e três a partir de 1280 px) e a janela nas duas etapas;
- teclado completo: "Novo funcionário", cada campo da etapa 1 (inclusive o botão de mostrar a senha), "Próximo", os botões de opção do cargo, "Voltar", "Cadastrar funcionário", "Cancelar", Esc, "Editar" (Esc devolve o foco a ele), "Desativar" e "Voltar" da confirmação, o foco no aviso do topo na falha e voltando ao campo, o foco em "Exibir inativos" depois de desativar;
- Lighthouse de acessibilidade em `/admin/staff` (navegação) e nos estados em `snapshot` (lista, vazio, janela "Novo funcionário" nas duas etapas, com a falha, edição, confirmação de desativar), celular e computador, claro e escuro, sem auditoria reprovada; e o LCP e o CLS do celular medidos, com o resultado no relatório.

### Como a verificação local é feita

- **Banco local.** Docker Desktop, `npx supabase start` e `npx supabase db reset` (aplica as quatro migrations existentes e o `seed.sql`), depois o `seed-demo.sql` inteiro pelo ajudante `run-sql.mjs` (pacote `pg` só no scratchpad, conexão local padrão). Nunca `--linked` nem `--db-url` (decisão 0043); nunca `docker inspect`, `docker exec` nem `docker compose config`; nunca ler `.env*`. O `db reset` apaga as contas: o admin e os usuários de teste são recriados depois (`fresh.sh`).
- **Contas de teste**, só no banco local: o admin por `make-admin.mjs`; funcionário A (cargo com `staff`), funcionário B (cargo sem `staff`, com `clients`) e um cliente, pelo `auth.admin.createUser`; as senhas são geradas pelo roteiro, ficam em arquivo do scratchpad e nunca são exibidas.
- **Aplicação.** `npx next build` e `npx next start` numa porta livre, com as variáveis do banco local passadas ao processo sem exibi-las nem gravá-las; cada mudança é conferida com um novo build, porque o `next dev` responde 500 nesta máquina.
- **Roteiros** no scratchpad, recriados a partir dos da #44 (`helpers.mjs`, `browser.mjs`, `make-admin.mjs`, `make-users.mjs`, `make-cookie.mjs`, `lh-pages.sh`, `lh-snapshots`, `lh-summary.mjs`, `local-env.sh`, `start.sh`, `restart.sh`, `fresh.sh`, `cleanup.mjs`, `run-sql.mjs`) e novos para esta tarefa: `verify-staff-api.mjs` (rotas, permissões, efeito imediato, e-mail em uso e remoção da conta), `ui-staff.mjs` e `ui-keyboard-staff.mjs`, num Chrome sem interface controlado pelo `puppeteer-core` do Lighthouse, porque o painel do navegador do app oculto trava o foco do Base UI. Nos roteiros de formulário com `Select` ou janela aberta, escolhem-se só as opções visíveis e a janela de cima é a de `data-open` sem `data-nested-dialog-open`, esperando cerca de 1 s depois de abrir. Estados de falha e carregamento por interceptação de requisição do `puppeteer`, sem alterar `src`.
- **Verificações automáticas.** `npm run check` sem erros nem avisos, `npx next build` e `npm audit --omit=dev --audit-level=high`.
- **Encerramento.** `next start` encerrado por PID e `npx supabase stop`.
- **Passos do Yvan** (no relatório): carregar o `seed-demo.sql` no SQL Editor para ver os funcionários de demonstração; e conferir logado, em `/admin/staff`, a lista, o cadastro, a edição, a desativação e a reativação (os funcionários criados nela são contas reais no Auth de produção). Não há migration a aplicar.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/api/admin/staff/route.ts` | criar: `GET` e `POST` |
| `src/app/api/admin/staff/[id]/route.ts` | criar: `PATCH` |
| `src/app/api/admin/staff/README.md` e `[id]/README.md` | criar / alterar, se as pastas pedirem (as pastas de rota têm README) |
| `src/server/services/staff.ts` | criar: `listStaff`, `createStaff`, `updateStaff` |
| `src/server/repositories/staff.ts` | alterar: listagem, leitura, `insert` e `update` condicionado ao `updated_at` |
| `src/shared/validation/staff.ts` e `src/shared/validation/README.md` | alterar: `staffInputSchema`, `staffEditSchema`, `staffUpdateSchema`, `staffListQuerySchema` |
| `src/components/admin/staff/staff-tabs.tsx` | alterar: sai o `DemoNotice` |
| `src/components/admin/staff/staff-form-dialog.tsx` | alterar: `zodResolver`, `clearErrors`, falha |
| `src/components/admin/staff/staff-data-step.tsx`, `staff-role-step.tsx`, `staff-form-values.ts` | alterar: saem as regras de demonstração |
| `src/components/admin/staff/staff-card.tsx`, `staff-list.tsx`, `src/components/shared/active-confirm.tsx` | alterar: foco depois de desativar e conflito de versão |
| `src/components/shared/step-form.tsx` | alterar: o foco da etapa nova não tira o foco do aviso de falha (arquivo fora da lista original, ver `notas.md`) |
| `src/components/admin/staff/README.md` | alterar, se citar lista de arquivos |
| `src/lib/demo/routes.ts` | alterar: saem as entradas de `/api/admin/staff` |
| `src/lib/demo/staff.ts` | apagar |
| `src/lib/demo/README.md` | alterar, se citar funcionários |
| `src/app/(admin)/admin/staff/page.tsx` | alterar, se tiver comentário de demonstração |
| `supabase/seed-demo.sql` | alterar: os funcionários de demonstração (L7) |
| `tests/validation/staff.test.ts` | alterar: os quatro esquemas novos |
| `docs/plataforma/openapi.yaml` | alterar |
| `docs/equipe/equipe-do-painel.md` | alterar: sai o parágrafo do aviso da aba e a seção de dados de demonstração dos funcionários; entram os textos de L1, L2, L7 e L8 |
| `docs/equipe/rotas.md` | alterar: textos de L1 a L4 |
| `docs/equipe/dados.md` | alterar: observação da conta de demonstração (L7) |
| `docs/plataforma/mensagens-de-validacao.md` | alterar: as duas mensagens de cargo (L2) |
| `docs/plataforma/infraestrutura.md` | alterar: o `seed-demo.sql` passa a incluir funcionários (L7) |
| `docs/padroes/testes.md` | alterar: a linha "Validação e formatos" cita o funcionário do painel |
| `memoria/tarefas/43-funcionarios-no-painel/` | `01_plano.md`, `notas.md` e, na etapa 03, `02_relatorio.md` |

Os README de `src/server/services/`, `src/server/repositories/` e `src/components/admin/staff/` são conferidos na construção: se citarem listas de arquivos, entram aqui. Não há migration, tipo gerado do banco nem `seed.sql` a alterar.

### Em comum com outras tarefas em andamento

- Nenhum PR aberto até aqui; a `main` está em aa16bf8 (#44).
- **#45** (veículos), **#46** (consulta de agendamentos) e **#51** (dashboard): nenhum arquivo em comum além de `src/lib/demo/routes.ts` (cada uma tira as suas entradas) e do `supabase/seed-demo.sql` (a #43 acrescenta um bloco de funcionários, sem tocar nos outros); o conflito, se houver, é de linhas vizinhas e é conferido no momento do PR.
- Etapa 04: comentário nas issues que dependem de funcionários (agendamento pelo painel #49, que grava `created_by_staff_id`, e as telas que mostram quem fez o quê) com o que a tarefa deixou: repositório, `findStaffMember`, os funcionários do `seed-demo.sql` e a regra de cargo ativo.

## Testes previstos

Valores esperados tirados de RN022, RN023, RN024, RN035, `mensagens-de-validacao.md` e das opções recomendadas. Escritos antes do código e vistos falhar, num commit próprio (decisões 0035 e 0052). Sem banco, servidor, navegador ou rede.

`tests/validation/staff.test.ts`, `staffInputSchema`:

- accepts a staff member and normalizes it: `maria` → `Maria`, e-mail em minúsculas e sem espaços nas pontas, `jobTitle` com inicial maiúscula
- turns an empty or absent `jobTitle` into `null`
- requires first name, last name, e-mail, password and role, each in its own path → "Preencha este campo."
- rejects an e-mail without `@`, with spaces inside or over 254 characters → mensagem de e-mail
- rejects a password under 8 or over 72 characters, and one without an uppercase letter, a digit or a special character → "A senha deve ter de 8 a 72 caracteres, com letra maiúscula, número e caractere especial."
- rejects a name with digits and one over the length of RN035 → mensagem de nome
- rejects a `jobTitle` of one letter and one of 61 characters
- rejects a `roleId` that is not a UUID, and a `null` one → mensagem da L2
- discards the unknown fields: `id`, `isActive`, `isAdmin`, `mustChangePassword`, `roleName`

`staffEditSchema`:

- accepts first name, last name, `jobTitle` and role, and discards the e-mail and the password
- requires first name, last name and role; keeps `jobTitle` optional

`staffUpdateSchema`:

- requires `updatedAt` and keeps it as text
- accepts a single field: só `isActive`, só `roleId`, só `firstName`
- rejects a body with only `updatedAt` → "Informe ao menos um campo para alterar."
- treats an empty `jobTitle` as erasing it and an absent one as unchanged
- discards `email`, `password`, `id` and `isAdmin`

`staffListQuerySchema`:

- defaults to page 1, 20 per page and no inactive staff
- reads `includeInactive` only as `true` or `false`; `pageSize` acima de 50 volta 50; `page=0` rejeitado

Sem teste automático para rota, serviço, repositório, semente e telas (decisão 0052): estão nos critérios acima, pelos roteiros e pelos passos de tela.

## Lacunas na documentação

Cada lacuna traz o problema, as opções com a consequência de cada uma e o texto que entra na documentação. Marque com `x` a opção escolhida. O texto proposto corresponde à opção recomendada; se escolher outra, ele é refeito antes da construção.

### L1. Mensagem de `EMAIL_IN_USE` no painel

**Problema.** A mensagem do catálogo, "Este e-mail não pode ser usado. Se você já tem conta, entre com ela.", foi escrita para o cadastro público, para não revelar se o e-mail existe. No painel, quem cadastra é um funcionário autorizado, e o UC19 FE02 pede "informar o conflito". A #42 resolveu o mesmo caso para clientes com um texto próprio.

**Opções:**

- [x] **1. Texto próprio do painel, o mesmo do cadastro de cliente (recomendada).** "Já existe uma conta com este e-mail." na `AppError` do `POST` (a `message` própria opcional já existe). Informa o conflito como o UC19 pede e fica igual ao cliente.
- [ ] **2. A mensagem do catálogo.** Sem texto novo, mas o aviso manda "entrar com a conta", o que não tem sentido para quem cadastra outra pessoa.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `POST /api/admin/staff`: "409 `EMAIL_IN_USE` com a mensagem 'Já existe uma conta com este e-mail.'; o e-mail vale entre clientes, funcionários e o administrador (RN022)."
- `docs/equipe/equipe-do-painel.md`, "Novo funcionário": a frase que remete ao catálogo passa a "`EMAIL_IN_USE` usa 'Já existe uma conta com este e-mail.' no topo da janela, e a janela volta à etapa 1 com os dados mantidos."

### L2. Cargo do funcionário no servidor (RN024, RN026)

**Problema.** A documentação diz que a etapa do cargo oferece "só os ativos" e que o cargo atual inativo continua aparecendo na edição, mas não diz o que o servidor faz com `roleId` inexistente ou inativo, nem com a edição de quem já tem cargo inativo, nem a mensagem para o cargo ausente. Sem regra, uma requisição direta atribuiria cargo inativo, e a edição do nome de um funcionário de cargo inativo seria recusada.

**Opções:**

- [x] **1. O cargo precisa existir e estar ativo quando é escolhido; manter o atual vale mesmo inativo (recomendada).** No `POST` e no `PATCH` que muda o cargo: inexistente ou inativo → 400 `VALIDATION_ERROR` em `roleId`. No `PATCH` que não troca o cargo, ou que reenvia o atual, nada se confere. Cargo ausente: "Escolha o cargo do sistema." (a legenda da etapa).
- [ ] **2. Só conferir que existe.** Mais simples, mas permite atribuir cargo que não concede permissões, contra a RN026 atualizada e a etapa do cargo.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `POST` e `PATCH`: "`roleId` precisa ser de um cargo ativo; na edição, manter o cargo atual vale mesmo que ele esteja inativo (RN026). Cargo inexistente ou inativo: 400 em `roleId`."
- `docs/plataforma/mensagens-de-validacao.md`, duas linhas novas: "Cargo do funcionário ausente | Escolha o cargo do sistema." e "Cargo inexistente ou inativo | Escolha um cargo ativo."

### L3. Conta de administrador no `PATCH` (RN027)

**Problema.** `rotas.md` diz que a listagem não traz o administrador e a RN027 diz que ele "não pode ser editado nem desativado pelos funcionários", mas não diz a resposta de um `PATCH` com o `id` dele (a rota recebe qualquer UUID), nem o que o `PATCH` faz com `email`, `password` e `id`.

**Opções:**

- [x] **1. 404, como se a conta não existisse; `email`, `password` e `id` descartados (recomendada).** Não revela que o `id` é o do administrador e segue o padrão de `api.md` para o que o painel não enxerga. O e-mail e a senha não mudam por esta rota (a tela já diz "O e-mail de acesso não pode ser alterado.").
- [ ] **2. 403 `FORBIDDEN`.** Diz que a conta existe e é protegida, o que a RN027 evita ao esconder o administrador das listagens.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `PATCH /api/admin/staff/:id`: "A conta de administrador responde 404, como um id que não existe (RN027). `email`, `password` e `id` não são alterados por esta rota e são descartados."

### L4. O que o `PATCH` de funcionário aceita

**Problema.** `rotas.md` diz que o `PATCH` recebe `firstName, lastName, jobTitle, roleId, isActive`, sem dizer se o corpo é parcial, nem o que fazer com `jobTitle` vazio, e só cita o `VERSION_CONFLICT` no topo. A tela envia os quatro campos na edição e só `isActive` ao desativar e reativar.

**Opções:**

- [x] **1. Corpo parcial, mesclado ao funcionário atual (recomendada).** O que veio troca o que havia; `jobTitle` vazio apaga e ausente mantém; ao menos um campo além de `updatedAt` (como a #40, a #42 e a #44). Desativar e reativar não precisam reenviar o cadastro.
- [ ] **2. Corpo sempre completo.** O desativar e o reativar teriam de reenviar nome, sobrenome, cargo e descrição, e o cliente da API passa a ter de conhecer o funcionário inteiro para mudar uma situação.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `PATCH /api/admin/staff/:id`: "Entrada: `updatedAt*` e, ao menos um, `firstName`, `lastName`, `jobTitle`, `roleId` e `isActive`. Só o que veio é alterado; `jobTitle` vazio apaga a descrição. Resposta: **200** o funcionário, com os campos da lista; 400; 404; 409 `VERSION_CONFLICT`."

### L5. Ordem "pelo nome completo" na listagem

**Problema.** `rotas.md` pede a ordem alfabética "pelo nome completo", mas a tabela guarda nome e sobrenome em colunas separadas, e o PostgREST não ordena por expressão. Ordenar por nome e depois por sobrenome difere do nome completo só quando um nome é prefixo do outro ("Ana Souza" antes de "Ana Maria Lima"). A #42 usou nome, sobrenome e `id` para os clientes.

**Opções:**

- [x] **1. Nome, sobrenome e `id` (recomendada).** Igual ao cliente, sem migration; a diferença para o nome completo só aparece no caso do prefixo e é inofensiva para a leitura da lista.
- [ ] **2. Nome completo exato.** Exige uma coluna gerada ou uma visão no banco (migration, aplicada pelo Yvan), para um ganho de ordem em casos raros.

**Texto proposto (opção recomendada):**

- `docs/equipe/rotas.md`, `GET /api/admin/staff`: "em ordem alfabética pelo nome e, em seguida, pelo sobrenome."

### L6. Funcionário que desativa ou muda o cargo da própria conta

**Problema.** A documentação não diz se o funcionário pode desativar a si mesmo ou tirar de si a permissão `staff` pelo cargo. Se puder, perde o acesso na requisição seguinte; o administrador (RN027) sempre consegue recuperá-lo, porque ele gerencia funcionários e cargos mesmo sem cargo.

**Opções:**

- [x] **1. Permitir, sem regra nova (recomendada).** A RN027 já garante a recuperação, a confirmação da tela avisa que o funcionário perde o acesso, e nada precisa ser inventado.
- [ ] **2. Recusar a desativação da própria conta.** Evita o engano, mas cria regra e código de erro que a documentação não tem (400 em `isActive` com texto novo), e o PATCH passa a depender de quem pede.

**Texto proposto (opção recomendada):**

- `docs/equipe/UC20-manter-funcionarios.md`: nenhuma mudança; a decisão fica registrada em `01_plano.md` e `notas.md`. Se escolher a opção 2, o texto da regra entra em `rotas.md` e em `mensagens-de-validacao.md` antes da construção.

### L7. Funcionários de demonstração no banco

**Problema.** A orientação é que a demonstração venha do banco. A tabela `staff` tem chave estrangeira para `auth.users` (`fk_staff_id`), e o `seed-demo.sql` hoje só tem cargos, catálogo, clientes e agendamentos; `infraestrutura.md` o descreve como "cargos, catálogo e dashboard". Sem funcionários no banco, a lista de `/admin/staff` aparece vazia e a demonstração depende de cadastrar à mão.

**Opções:**

- [x] **1. O `seed-demo.sql` cria cinco funcionários fictícios, com a linha em `auth.users` sem senha (recomendada).** Ids por `glow_demo_id('staff:<e-mail>')`, e-mails em `example.com`, `on conflict do nothing`, como o resto do arquivo; ninguém entra com essas contas (sem senha e sem identidade de login), e elas aparecem na lista, no cartão e nos filtros. A inserção em `auth.users` roda no SQL Editor (papel `postgres`) e no banco local (`run-sql.mjs`); o comportamento é conferido nos dois antes do PR.
- [ ] **2. Sem funcionários no seed; a demonstração é cadastrada pela tela.** Não toca em `auth.users` por SQL, mas a lista abre vazia e o Yvan cadastra cada conta de produção à mão para a apresentação.
- [ ] **3. Um script em `supabase/scripts/` que cria as contas pela API de administração do Auth.** Contas com senha reais (útil para testar login), mas exige a chave de serviço fora do SQL Editor e um passo a mais para a demonstração.

**Texto proposto (opção recomendada):**

- `docs/equipe/equipe-do-painel.md`, "Dados de demonstração": "Os cargos e os funcionários de demonstração vêm do banco, do `seed-demo.sql`. Os funcionários são fictícios e ficam em contas do Auth sem senha: aparecem no painel e ninguém entra com eles."
- `docs/equipe/dados.md`, Observações: "As contas de funcionário de demonstração do `seed-demo.sql` existem em `auth.users` sem senha."
- `docs/plataforma/infraestrutura.md`: "dados fictícios de demonstração para os cargos, os funcionários, o catálogo e o dashboard".

### L8. Foco depois de desativar um funcionário

**Problema.** Desativado sem "Exibir inativos", o cartão sai da lista e o foco do botão que o acionou se perde no `body` (a #65 deixou isso anotado). `componentes.md` manda levar o foco ao controle da lista que traz o item de volta; `equipe-do-painel.md` define o destino só para o cargo.

**Opções:**

- [x] **1. Desativar → "Exibir inativos"; só quando o cartão sai (recomendada).** O mesmo destino do cargo, da categoria e do serviço. Se o cartão continua na lista (inativos exibidos), o foco permanece no botão.
- [ ] **2. Sempre ao botão "Novo funcionário".** Existe sempre, mas é uma ação e não o controle que trouxe o cartão.

**Texto proposto (opção recomendada):**

- `docs/equipe/equipe-do-painel.md`, "Desativar e reativar funcionário": acrescenta "Com o interruptor 'Exibir inativos' desligado, o cartão desativado sai da lista e o foco vai ao interruptor."

## Decisões técnicas

- Seguidas: 0003 (backend em camadas), 0005 (autorização na API), 0006 (`supabase-js`), 0008 (validação compartilhada), 0009 (concorrência por `updated_at`), 0010 e 0012 (permissões por página), 0015 (sem envio de e-mails), 0022 (exclusão lógica; funcionário só se desativa), 0025 (erros RFC 9457), 0027 (React Hook Form), 0035 e 0052 (testes), 0042 (banco sem privilégios públicos), 0043 (banco local), 0044 (preparação do Supabase sem painel), 0049 (shadcn sobre Base UI) e 0055 (telas de demonstração), mais `backend.md`, `api.md`, `banco.md`, `componentes.md`, `frontend.md` e `testes.md`.
- Nenhuma nova.

## Riscos e dúvidas

- **Conta sem perfil.** O cadastro tem duas gravações (Auth e `staff`) que não cabem numa transação; se o `insert` falha, a conta é removida, e, se a remoção também falha, o `id` vai ao registro para limpeza manual (`backend.md`). O caso é provocado por SQL no banco local e conferido.
- **Senha inicial.** Chega no corpo do `POST` e vai direto ao Auth; nunca é gravada em `staff`, registrada nem devolvida (RS003). Conferido nos registros do roteiro.
- **E-mail em corrida.** Duas gravações do mesmo e-mail ao mesmo tempo: o Auth e `uq_staff_email` decidem; a que perde recebe `EMAIL_IN_USE` e, se já criou a conta, a remove.
- **Funcionários do `seed-demo.sql`.** A inserção direta em `auth.users` depende do esquema do Auth da versão do Supabase; é conferida no banco local e, depois, no SQL Editor pelo Yvan (passo dele). Se falhar na produção, a L7 cai para a opção 2 ou 3 sem mexer nas rotas.
- **Efeito imediato.** Vale porque o guard lê o banco a cada requisição; se uma tarefa futura guardar permissões em cache ou no token, esta verificação precisa ser repetida.
- **Conflito entre duas janelas.** O 409 recarrega o funcionário na janela de edição (padrão da #39 e da #44); conferido com duas janelas e na confirmação de desativar.
- **Janela sobre janela.** "Desativar" abre a confirmação sobre a lista; o foco ao fechar é conferido no teclado. O `finalFocus` vale só quando a ação ocorreu.
- **Limite de 50 cargos.** A etapa do cargo lê até 50 cargos ativos (`MAX_PAGE_SIZE`); acima disso os demais não aparecem. Para o MVP basta; fica registrado como limite conhecido no relatório.
- **LCP do celular.** Nas telas anteriores ficou acima dos 2,5 s de `frontend.md` no Lighthouse local; é medido de novo e levado ao relatório, com a conferência na pré-visualização da Vercel como passo do Yvan.
- **Produção.** Os funcionários criados na pré-visualização são contas reais no Auth e no banco de produção; passo do Yvan, no relatório.

## Divisão em PRs e pontos à parte

O total previsto em `src/` é de cerca de 520 linhas adicionadas (rotas 60, serviço 110, repositório 130, esquemas 110, resolvedor e ajustes da tela 110), mais cerca de 60 de SQL do seed e cerca de 200 de testes e as especificações, contra cerca de 200 removidas (a demonstração de funcionários e as regras soltas dos componentes).

### P1. Divisão em PRs

- [x] **1. Dois PRs encadeados (recomendada).** Como na #40 e na #44: o primeiro, "Refs #43", com os esquemas, o repositório, o serviço, as rotas, a OpenAPI e os testes (cerca de 340 linhas em `src/`), o segundo, "Closes #43", com a tela ligada, a demonstração removida e o `seed-demo.sql` (cerca de 180 adicionadas e 200 removidas). Sem migration, o Yvan não precisa aplicar nada entre os dois. O plano, as notas e o relatório vão no segundo.
- [ ] **2. Um PR só.** A tela só deixa de ser demonstração com as rotas e a verificação é única, mas o PR passa de 500 linhas em `src/`, acima das ~400.

### P2. Ambiente de verificação

- [x] **1. Como nas tarefas anteriores (recomendada).** O descrito em "Como a verificação local é feita": banco local, `next build` e `next start`, roteiros no scratchpad, `puppeteer-core` e Lighthouse.
- [ ] **2. Só no navegador do app, sem Lighthouse nem banco local.** Deixaria sem medida o que o plano promete e sem a conferência do efeito imediato da desativação e da remoção da conta.

### P3. Arquivos fora da lista

- [x] **1. Seguir a lista acima e, se algo mais for preciso, anotar nas notas, acrescentar à lista e pedir sua confirmação antes de commitar (recomendada).** É o caso possível dos README das pastas tocadas e de `supabase/README.md` (se descrever o `seed-demo.sql`).
- [ ] **2. Alterar sem avisar.** Perde a conferência de outra tarefa em andamento no mesmo arquivo.

## Fora do escopo

- Alteração da própria senha fora do primeiro acesso (a issue), redefinição da senha de outro funcionário e troca do e-mail de acesso.
- Exclusão de funcionário (só se desativa, RN026), busca na lista, edição em lote e reordenação.
- Cargos (#39, concluída) e o agendamento criado pelo painel (#49).
- Dependência nova e registro de decisão.
