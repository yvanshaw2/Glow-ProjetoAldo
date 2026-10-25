---
issue: 39
pull_request: 113
---

# Relatório: Cargos e permissões no painel

Em um PR só (`Closes #39`), como aprovado em P1. O plano passou a `concluido` neste PR.

## O que foi feito

- **Rotas** `GET`, `POST` e `PATCH /api/admin/roles[/:id]`, com `requirePermission("staff")` (UC21, RF077, RF078, RF082, RF083, RN025, RN026, RS008, RS010, RS011): cargos por nome, 20 por página, com as permissões na ordem de RN025; `POST` responde 201 com o cargo ativo; `PATCH` altera só o que veio, condicionado ao `updatedAt` (RNF011, decisão 0009), com 404, 409 `NAME_IN_USE` e 409 `VERSION_CONFLICT`.
- **Migration** `20261025145632_save_role_function.sql`: a função `save_role` grava o cargo e as permissões numa transação, recusa lista vazia, devolve nulo para versão antiga e só o `service_role` a executa (decisão 0042).
- **Esquemas** `roleInputSchema`, `roleUpdateSchema` e `roleListQuerySchema` (`src/shared/validation/staff.ts`), usados pelas rotas e pelo formulário.
- **Aba "Cargos"** ligada ao banco: saem as três entradas de `src/lib/demo/routes.ts`, os cargos de demonstração e o aviso da aba (o aviso fica só na aba "Funcionários", até a #43); o formulário usa o esquema; `NAME_IN_USE` leva à etapa 1; o cartão desativado sai da lista e o foco vai ao interruptor "Exibir inativos"; `VERSION_CONFLICT` relê a lista. O cadastro de funcionário lê os cargos ativos reais.
- **Demonstração pelo banco:** quatro cargos (Gerente, Atendente, Detalhista e o inativo Auxiliar) no `supabase/seed-demo.sql`.
- **Especificação OpenAPI** das três operações.

## Arquivos alterados

- `supabase/migrations/20261025145632_save_role_function.sql` (novo) e `supabase/seed-demo.sql`.
- `src/app/api/admin/roles/route.ts` e `[id]/route.ts` (novos); `src/server/services/roles.ts` e `src/server/repositories/roles.ts` (novos).
- `src/shared/validation/staff.ts` (novo) e o `README.md` da pasta.
- `src/components/admin/roles/`: `role-form-dialog.tsx`, `role-data-step.tsx`, `role-permissions-step.tsx`, `role-form-values.ts`, `role-card.tsx` e `role-list.tsx`; `src/components/admin/staff/staff-tabs.tsx` e `src/app/(admin)/admin/staff/page.tsx`.
- `src/lib/demo/routes.ts` e `src/lib/demo/staff.ts` (sai `answerAdminRoles`).
- `tests/validation/staff.test.ts` (novo).
- `docs/plataforma/openapi.yaml`, `docs/plataforma/mensagens-de-validacao.md`, `docs/plataforma/infraestrutura.md`, `docs/equipe/equipe-do-painel.md`, `RN026-desativacao.md`, `RN027-administrador.md`, `dados.md` e `docs/padroes/testes.md`.

Desvios dos arquivos do plano (ver `notas.md`): o serviço é `roles.ts` (não `staff.ts`); o `RoleCard` usa o `ConfirmDialog` direto; `NAME_IN_USE` também aparece junto ao campo "Nome".

## Testes executados

- `npm run check`: sem erros nem avisos (479 testes, 20 novos de esquemas, escritos antes do código e vistos falhar, em commit próprio) e `npx next build`.
- `npm audit --omit=dev --audit-level=high`: sem vulnerabilidade alta; uma moderada, dependência indireta que esta tarefa não alterou.
- **Rotas e `save_role`**, no banco local (`db reset` aplica a migration, admin, três funcionários e um cliente, `next start` na porta 3039), pelo roteiro `verify-roles-api.mjs`, tudo certo:
  - 401 sem sessão, 403 para o funcionário sem `staff` e para o cliente nos três métodos, 200 para o funcionário com `staff`; `POST` sem `Origin` 403; `text/plain` 415; `no-store`; nada gravado pelas chamadas recusadas;
  - critério 1: "Recepção" com `appointments` e `dashboard` (e uma repetida, `isActive` e `id` no corpo): 201 ativo, nome normalizado, permissões na ordem de RN025 e listado; descrição ausente vira `null`;
  - critérios 2 e 3: nome vazio e nome curto, descrição longa; `permissionKeys` vazia, ausente, `null` e com chave desconhecida: 400 com a mensagem no campo; `PATCH` com lista vazia: 400; nada gravado e versão igual;
  - critério 4: nome repetido em outra caixa, no `POST` e no `PATCH`: 409 `NAME_IN_USE`, e o `PATCH` que falhou não muda permissões nem versão; o próprio nome em outra caixa: 200;
  - edição: só permissões (versão muda, nome e descrição mantidos), `updatedAt` antigo 409 `VERSION_CONFLICT` sem mudar nada (permissões incluídas), descrição vazia apaga, sem campo e sem `updatedAt` 400, id inexistente e que não é UUID 404;
  - critérios 5 e 6: o funcionário B (cargo `services` e `settings`) recebe 200 em `GET /api/admin/categories`; o funcionário A tira `services` do cargo dele; na requisição seguinte, com a mesma sessão, B recebe 403 `FORBIDDEN`, `/api/auth/me` traz só `settings` e `/admin/services` redireciona; A desativa o cargo: a lista de ativos não o traz, `includeInactive=true` traz, B entra de novo com `permissions` vazia, recebe 403 na rota de `settings` e é redirecionado de `/admin/settings`; reativar devolve as permissões;
  - `includeInactive=abc` 400, `pageSize=100` volta 50, paginação;
  - critério 8: `anon` e `authenticated` recebem `permission denied` em `save_role`; com a chave do serviço grava o cargo e as permissões numa chamada; lista vazia, nome repetido (`uq_roles_name`) e versão antiga não deixam cargo nem permissão pela metade. O bloco de cargos do `seed-demo.sql` rodou sem erro.
- **Telas** (Chrome sem interface com o `puppeteer-core` do Lighthouse, `next start` local), em 360 × 800 claro e 1440 × 900 escuro, tudo certo:
  - **Estados:** carregamento (esqueleto, requisição retida), falha da leitura com "Tentar novamente" e releitura, vazio ("Nenhum cargo cadastrado"), falha 500 do salvar (aviso no topo, com o foco, janela aberta e a permissão marcada mantida), acesso negado (o funcionário sem `staff` que abre `/admin/staff` vai à página dele com "Você não tem permissão para acessar essa página."), sem aviso de demonstração na aba "Cargos" e com ele na aba "Funcionários", sem transbordo horizontal;
  - **Fluxos** (`ui-flow.mjs`): os cargos de demonstração vindos do banco, sem o inativo; FE01 (nome vazio: mensagem, foco no campo, etapa 2 não abre); FE03 (nenhuma permissão: mensagem junto às caixas, nada gravado, some ao marcar); criar com duas permissões; FE02 (nome repetido: aviso no topo e junto ao campo, volta à etapa 1, o nome corrigido grava e mantém a permissão marcada); editar tirando uma permissão; desativar com a confirmação do texto de L1 (o cartão sai e o foco vai ao interruptor); "Exibir inativos" mostra "Auxiliar" e o cartão desativado com "Inativo" e "Reativar"; reativar; `VERSION_CONFLICT` com duas janelas (aviso no topo, e a janela mostra o nome gravado pela outra);
  - **Cadastro de funcionário:** a etapa de cargo lista os cargos ativos reais e não o inativo; sem cargo ativo, "Não há cargo ativo…" e "Ir para Cargos";
  - **Teclado** (`ui-keyboard.mjs`, 360 e 1440): setas e Enter nas abas, Tab até "Novo cargo", Enter abre a janela com o foco dentro, Enter no nome vai à etapa 2 (foco no título), Espaço marca a caixa, Espaço em "Cadastrar cargo" grava, o foco volta a "Novo cargo", Esc fecha a edição e devolve o foco a "Editar", a confirmação abre em "Voltar", o foco vai ao interruptor "Exibir inativos" depois de desativar, Espaço o liga, e reativar devolve o foco ao botão do cartão;
  - **Lighthouse 13.5.0 de acessibilidade:** 1,0 nas quatro combinações de `/admin/staff` (navegação) e 1,0 nas 44 capturas de estado (11 estados nas quatro combinações: aba "Funcionários", aba "Cargos", com inativos, falha da leitura, vazio, janela da etapa 1 e da etapa 2, as duas com a falha de validação, edição e confirmação de desativar);
  - **Desempenho (navegação, `next start` local, aba "Funcionários" que abre por padrão):** celular LCP 3,2 s, CLS 0, TBT de 110 a 120 ms, desempenho 0,92; computador LCP 0,7 s, CLS 0, desempenho 1,0. O LCP do celular fica acima dos 2,5 s de `frontend.md`, como nas telas anteriores; a conferência na pré-visualização da Vercel é passo do Yvan.
- Ambiente local encerrado (`next start` parado, `npx supabase stop`, credenciais e cookie apagados).

## Documentação atualizada

- Módulos: `docs/plataforma/openapi.yaml` (os três caminhos e os esquemas `AdminRole`, `RolePage`, `RoleInput`, `RoleUpdateInput` e `PermissionKey`), `docs/equipe/equipe-do-painel.md`, `RN026-desativacao.md`, `RN027-administrador.md`, `dados.md` (assinatura de `save_role`), `docs/plataforma/mensagens-de-validacao.md`, `docs/plataforma/infraestrutura.md` e `docs/padroes/testes.md`.
- Lacunas resolvidas: L1 → opção 1 (o cargo inativo não concede permissões) → `RN026-desativacao.md` e `equipe-do-painel.md`; L2 → opção 1 (um só texto, "O cargo deve conceder ao menos uma permissão.", e "Escolha apenas páginas do painel.") → `mensagens-de-validacao.md` e `equipe-do-painel.md`; L3 → opção 1 (sem bloqueio; o administrador recupera o acesso) → `RN027-administrador.md`.
- Decisões: nenhuma.
- Documentos formais a atualizar (pela #67): Arquitetura de Software, Apêndice A (`/api/admin/roles`: `fields.permissionKeys` e os 409) e a seção de dados (`save_role` com a assinatura e a regra de versão); Análise do Sistema, RN026 (o cargo desativado também não concede permissões) e RN027 (o acesso nunca se perde por completo).

## Pendências

- **Passo do Yvan:** aplicar a migration (`npx supabase db push`, depois da aprovação do PR e antes da incorporação, `migration.md`) e comentar no PR; a pré-visualização só funciona com ela aplicada. Carregar o bloco de cargos do `seed-demo.sql` no SQL Editor, se quiser os cargos de demonstração em produção.
- **Passo do Yvan:** conferir `/admin/staff`, na aba "Cargos", em produção, logado como administrador, depois da incorporação. Os cargos criados nela são dados reais (decisão 0030).
- LCP do celular de `/admin/staff` em 3,2 s no Lighthouse local (limite de 2,5 s em `frontend.md`): medir na pré-visualização da Vercel.
- A lista e a edição de funcionários seguem em demonstração (#43), com os cargos de demonstração dela (ids que não existem no banco); a #43 troca por dados reais e tira o aviso da aba "Funcionários".
